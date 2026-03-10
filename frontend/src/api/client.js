const BASE_URL = 'https://mexwfgzor2.execute-api.us-east-1.amazonaws.com/prod';
const USER_ID = 'demo-user';

export const api = {
  // Profile
  async getProfile() {
    const res = await fetch(`${BASE_URL}/profile/${USER_ID}`);
    if (!res.ok) throw new Error('Profile not found');
    return res.json();
  },

  async saveProfile(data) {
    const res = await fetch(`${BASE_URL}/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: USER_ID, ...data })
    });
    if (!res.ok) throw new Error('Failed to save profile');
    return res.json();
  },

  // Meetings
  async getMeetings() {
    const res = await fetch(`${BASE_URL}/meetings?userId=${USER_ID}`);
    if (!res.ok) throw new Error('Failed to fetch meetings');
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  },

  async getMeeting(meetingId) {
    const res = await fetch(`${BASE_URL}/meetings/${meetingId}`);
    if (!res.ok) throw new Error('Meeting not found');
    return res.json();
  },

  async getMeetingStatus(meetingId) {
    const res = await fetch(`${BASE_URL}/meetings/${meetingId}/status`);
    if (!res.ok) throw new Error('Failed to get status');
    return res.json();
  },

  async uploadMeeting(file, title) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', USER_ID);
    formData.append('title', title || file.name);

    const res = await fetch(`${BASE_URL}/meetings/upload`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) throw new Error('Upload failed');
    return res.json();
  },

  async uploadMeetingPresigned(file, title) {
    // Step 1: Get presigned URL from backend
    const urlRes = await fetch(`${BASE_URL}/meetings/upload-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: USER_ID,
        filename: file.name,
        title: title || file.name
      })
    });

    if (!urlRes.ok) {
      const err = await urlRes.json();
      throw new Error(err.error || 'Failed to get upload URL');
    }

    const { presignedUrl, meetingId, s3Key, contentType } = await urlRes.json();

    // Step 2: Upload directly to S3 (no API Gateway)
    const s3Res = await fetch(presignedUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': contentType || 'audio/wav' }
    });

    if (!s3Res.ok) {
      throw new Error('Direct S3 upload failed');
    }

    // Step 3: Tell backend to start processing
    const processRes = await fetch(`${BASE_URL}/meetings/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: USER_ID,
        meetingId,
        s3Key,
        title: title || file.name
      })
    });

    if (!processRes.ok) {
      const err = await processRes.json();
      throw new Error(err.error || 'Failed to start processing');
    }

    return { meetingId };
  },

  async analyzeMeeting(meetingId) {
    const res = await fetch(`${BASE_URL}/meetings/${meetingId}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: USER_ID })
    });
    if (!res.ok) throw new Error('Analysis failed');
    return res.json();
  },

  async chatWithMeeting(meetingId, question) {
    const res = await fetch(`${BASE_URL}/meetings/${meetingId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: USER_ID,
        question
      })
    });
    if (!res.ok) throw new Error('Chat failed');
    return res.json();
  }
};

export default api;
