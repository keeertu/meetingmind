import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';

const BASE_URL = import.meta.env.VITE_API_URL || 'https://mexwfgzor2.execute-api.us-east-1.amazonaws.com/prod';

/* ─── Auth helpers ────────────────────────────────────────────────────────── */

// forceRefresh: true ensures we never send an expired token
const getAuthToken = async () => {
  try {
    const session = await fetchAuthSession({ forceRefresh: true });
    const token = session.tokens?.idToken?.toString() ?? null;
    if (!token) console.warn('getAuthToken: idToken is null', session);
    return token;
  } catch (err) {
    console.error('getAuthToken error:', err);
    return null;
  }
};

const getUserId = async () => {
  try {
    const user = await getCurrentUser();
    return user.userId;
  } catch (err) {
    console.error('getUserId error:', err);
    return null;
  }
};

export { getUserId, getAuthToken };

/* ─── Header builders ─────────────────────────────────────────────────────── */

// JSON requests — throws immediately if no token so we get a clear error
const authHeaders = async (extra = {}) => {
  const token = await getAuthToken();
  if (!token) throw new Error('Unauthorized — no valid session token');
  return {
    'Content-Type': 'application/json',
    Authorization: token, // API GW Cognito authorizer wants bare token, not "Bearer ..."
    ...extra,
  };
};

// Multipart uploads — no Content-Type so browser sets multipart boundary
const authHeadersMultipart = async () => {
  const token = await getAuthToken();
  if (!token) throw new Error('Unauthorized — no valid session token');
  return { Authorization: token };
};

/* ─── Response checker ────────────────────────────────────────────────────── */

const checkResponse = async (res, label) => {
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    console.error(`${label} failed [${res.status}]:`, text);
    throw new Error(res.status === 401 ? 'Unauthorized' : text || `${label} failed`);
  }
  return res.json();
};

/* ─── API client ──────────────────────────────────────────────────────────── */

export const api = {
  /* Profile ---------------------------------------------------------------- */
  async getProfile() {
    const res = await fetch(`${BASE_URL}/profile`, {
      headers: await authHeaders(),
    });
    return checkResponse(res, 'getProfile');
  },

  async saveProfile(data) {
    const payload = { ...data };
    delete payload.userId; // server extracts userId from the JWT
    const res = await fetch(`${BASE_URL}/profile`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(payload),
    });
    return checkResponse(res, 'saveProfile');
  },

  /* Meetings --------------------------------------------------------------- */
  async getMeetings() {
    const res = await fetch(`${BASE_URL}/meetings`, {
      headers: await authHeaders(),
    });
    const data = await checkResponse(res, 'getMeetings');
    return Array.isArray(data) ? data : (data.meetings ?? []);
  },

  async getMeeting(meetingId) {
    const userId = await getUserId();
    const res = await fetch(`${BASE_URL}/meetings/${meetingId}?userId=${userId}`, {
      headers: await authHeaders(),
    });
    return checkResponse(res, 'getMeeting');
  },

  async getMeetingStatus(meetingId) {
    const userId = await getUserId();
    const res = await fetch(`${BASE_URL}/meetings/${meetingId}/status?userId=${userId}`, {
      headers: await authHeaders(),
    });
    return checkResponse(res, 'getMeetingStatus');
  },

  async uploadMeeting(file, title) {
    const userId = await getUserId();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', userId);
    formData.append('title', title || file.name);

    const res = await fetch(`${BASE_URL}/meetings/upload`, {
      method: 'POST',
      headers: await authHeadersMultipart(),
      body: formData,
    });
    return checkResponse(res, 'uploadMeeting');
  },

  async uploadMeetingPresigned(file, title) {
    const userId = await getUserId();

    // Step 1: get presigned S3 URL from backend
    const urlRes = await fetch(`${BASE_URL}/meetings/upload-url`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ userId, filename: file.name, title: title || file.name }),
    });
    const { presignedUrl, meetingId, s3Key, contentType } =
      await checkResponse(urlRes, 'getPresignedUrl');

    // Step 2: PUT directly to S3 — NO Authorization header, presigned URL handles auth
    const s3Res = await fetch(presignedUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': contentType || file.type || 'audio/wav' },
    });
    if (!s3Res.ok) {
      const text = await s3Res.text().catch(() => '');
      throw new Error(`S3 upload failed [${s3Res.status}]: ${text}`);
    }

    // Step 3: tell backend to start transcription + analysis
    const processRes = await fetch(`${BASE_URL}/meetings/process`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ userId, meetingId, s3Key, title: title || file.name }),
    });
    await checkResponse(processRes, 'processMeeting');

    return { meetingId };
  },

  async analyzeMeeting(meetingId) {
    const userId = await getUserId();
    const res = await fetch(`${BASE_URL}/meetings/${meetingId}/analyze`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ userId }),
    });
    return checkResponse(res, 'analyzeMeeting');
  },

  async chatWithMeeting(meetingId, question) {
    const userId = await getUserId();
    const res = await fetch(`${BASE_URL}/meetings/${meetingId}/chat`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ userId, question }),
    });
    return checkResponse(res, 'chatWithMeeting');
  },
};

export default api;