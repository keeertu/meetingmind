const BASE_URL = import.meta.env.VITE_API_URL || 'https://mexwfgzor2.execute-api.us-east-1.amazonaws.com/prod';

const getUserId = () => {
  let userId = localStorage.getItem('meetingmind_user_id');
  
  // Handle cases where localStorage returns null, "null", or "undefined" as strings
  if (!userId || userId === 'null' || userId === 'undefined' || userId.trim() === '') {
    // Try to get from sessionStorage as backup
    userId = sessionStorage.getItem('meetingmind_user_id');
    
    if (!userId || userId === 'null' || userId === 'undefined' || userId.trim() === '') {
      // Generate new userId
      userId = 'user_' + Math.random().toString(36).substr(2, 9);
      console.log('Generated new userId:', userId);
      
      // Store in both localStorage and sessionStorage
      try {
        localStorage.setItem('meetingmind_user_id', userId);
        sessionStorage.setItem('meetingmind_user_id', userId);
      } catch (e) {
        console.warn('Failed to save userId to storage:', e);
      }
    } else {
      console.log('Recovered userId from sessionStorage:', userId);
      // Restore to localStorage
      try {
        localStorage.setItem('meetingmind_user_id', userId);
      } catch (e) {
        console.warn('Failed to restore userId to localStorage:', e);
      }
    }
  } else {
    console.log('Using existing userId:', userId);
    // Ensure it's also in sessionStorage
    try {
      sessionStorage.setItem('meetingmind_user_id', userId);
    } catch (e) {
      console.warn('Failed to backup userId to sessionStorage:', e);
    }
  }
  
  return userId;
};

// Don't export USER_ID as a constant - call getUserId() each time to ensure it's fresh
export { getUserId };

// Helper function to manually set userId (for recovery purposes)
export const setUserId = (userId) => {
  if (!userId || typeof userId !== 'string') {
    throw new Error('Invalid userId provided');
  }
  
  try {
    localStorage.setItem('meetingmind_user_id', userId);
    sessionStorage.setItem('meetingmind_user_id', userId);
    console.log('Manually set userId:', userId);
    return true;
  } catch (e) {
    console.error('Failed to set userId:', e);
    return false;
  }
};

// Helper function to get current userId without generating a new one
export const getCurrentUserId = () => {
  return localStorage.getItem('meetingmind_user_id') || sessionStorage.getItem('meetingmind_user_id') || null;
};

export const api = {
  // Profile
  async getProfile() {
    const userId = getUserId();
    const res = await fetch(`${BASE_URL}/profile/${userId}`);
    if (!res.ok) throw new Error('Profile not found');
    return res.json();
  },

  async saveProfile(data) {
    const userId = getUserId();
    console.log("API saveProfile called with:", data);
    const payload = { userId, ...data };
    console.log("Sending payload:", payload);
    
    const res = await fetch(`${BASE_URL}/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error("Profile save failed:", errorText);
      throw new Error(errorText || 'Failed to save profile');
    }
    
    return res.json();
  },

  // Meetings
  async getMeetings() {
    const userId = getUserId();
    console.log('Fetching meetings for userId:', userId);
    const res = await fetch(`${BASE_URL}/meetings?userId=${userId}`);
    if (!res.ok) {
      console.error('Failed to fetch meetings. Status:', res.status);
      throw new Error('Failed to fetch meetings');
    }
    const data = await res.json();
    console.log('Received meetings data:', data);
    
    // Handle both array response and object with meetings property
    const meetings = Array.isArray(data) ? data : (data.meetings || []);
    console.log('Processed meetings:', meetings);
    return meetings;
  },

  async getMeeting(meetingId) {
    const userId = getUserId();
    const res = await fetch(`${BASE_URL}/meetings/${meetingId}?userId=${userId}`);
    if (!res.ok) throw new Error('Meeting not found');
    return res.json();
  },

  async getMeetingStatus(meetingId) {
    const userId = getUserId();
    const res = await fetch(`${BASE_URL}/meetings/${meetingId}/status?userId=${userId}`);
    if (!res.ok) throw new Error('Failed to get status');
    return res.json();
  },

  async uploadMeeting(file, title) {
    const userId = getUserId();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', userId);
    formData.append('title', title || file.name);

    const res = await fetch(`${BASE_URL}/meetings/upload`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) throw new Error('Upload failed');
    return res.json();
  },

  async uploadMeetingPresigned(file, title) {
    const userId = getUserId();
    // Step 1: Get presigned URL from backend
    const urlRes = await fetch(`${BASE_URL}/meetings/upload-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
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
        userId,
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
    const userId = getUserId();
    const res = await fetch(`${BASE_URL}/meetings/${meetingId}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    if (!res.ok) throw new Error('Analysis failed');
    return res.json();
  },

  async chatWithMeeting(meetingId, question) {
    const userId = getUserId();
    const res = await fetch(`${BASE_URL}/meetings/${meetingId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        question
      })
    });
    if (!res.ok) throw new Error('Chat failed');
    return res.json();
  }
};

export default api;
