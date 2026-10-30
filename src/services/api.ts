/**
 * API Service following the Youth Church Portal integration guide
 */

const BASE_URL = 'http://localhost:3000/api';

export const TOKEN_KEY = 'auth_token';
export const USER_KEY = 'auth_user';

const getHeaders = () => {
  const token = localStorage.getItem(TOKEN_KEY);
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

const getHeadersWithoutContentType = () => {
  const token = localStorage.getItem(TOKEN_KEY);
  return {
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

const handleResponse = async (response: Response) => {
  const data = await response.json();
  if (!response.ok) {
    throw {
      message: data.message || 'Ocorreu um erro na requisição',
      statusCode: response.status,
      data: data
    };
  }
  return data;
};

export const api = {
  // Auth
  register: (data: any) => 
    fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),

  login: (data: any) => 
    fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),

  // Users
  getUsers: () => 
    fetch(`${BASE_URL}/users`, {
      headers: getHeaders()
    }).then(handleResponse),

  getUser: (id: string) => 
    fetch(`${BASE_URL}/users/${id}`, {
      headers: getHeaders()
    }).then(handleResponse),

  getUserProfile: (id: string) =>
    fetch(`${BASE_URL}/users/${id}`, {
      headers: getHeaders()
    }).then(handleResponse),

  updateUserProfile: (data: any) =>
    fetch(`${BASE_URL}/users/profile`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),

  uploadProfileImage: (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    return fetch(`${BASE_URL}/users/profile/avatar`, {
      method: 'PUT',
      headers: getHeadersWithoutContentType(),
      body: formData
    }).then(handleResponse);
  },

  createUser: (data: any) =>
    fetch(`${BASE_URL}/users`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),

  // Social Links
  addSocialLink: (data: any) =>
    fetch(`${BASE_URL}/users/social-links`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),

  getSocialLinks: (userId: string) =>
    fetch(`${BASE_URL}/users/${userId}/social-links`, {
      headers: getHeaders()
    }).then(handleResponse),

  removeSocialLink: (linkId: string) =>
    fetch(`${BASE_URL}/users/social-links/${linkId}`, {
      method: 'DELETE',
      headers: getHeaders()
    }).then(handleResponse),

  // Achievements
  getAchievements: (userId: string) =>
    fetch(`${BASE_URL}/users/${userId}/achievements`, {
      headers: getHeaders()
    }).then(handleResponse),

  // Block Users
  blockUser: (blockedId: string) =>
    fetch(`${BASE_URL}/users/block/${blockedId}`, {
      method: 'POST',
      headers: getHeaders()
    }).then(handleResponse),

  unblockUser: (blockedId: string) =>
    fetch(`${BASE_URL}/users/block/${blockedId}`, {
      method: 'DELETE',
      headers: getHeaders()
    }).then(handleResponse),

  getBlockedUsers: () =>
    fetch(`${BASE_URL}/users/blocked`, {
      headers: getHeaders()
    }).then(handleResponse),

  // Posts
  createPost: (data: any, imageFile?: File) => {
    if (imageFile) {
      // Use FormData for multipart upload
      const formData = new FormData();
      formData.append('content', data.content || '');
      formData.append('image', imageFile);

      return fetch(`${BASE_URL}/posts`, {
        method: 'POST',
        headers: getHeadersWithoutContentType(),
        body: formData
      }).then(handleResponse);
    } else {
      // Use JSON for text-only posts
      return fetch(`${BASE_URL}/posts`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
      }).then(handleResponse);
    }
  },

  getPosts: () => 
    fetch(`${BASE_URL}/posts`, {
      headers: getHeaders()
    }).then(handleResponse),

  addComment: (postId: string, data: any) => 
    fetch(`${BASE_URL}/posts/${postId}/comment`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),

  // Devotionals
  createDevotional: (data: any) => 
    fetch(`${BASE_URL}/devotionals`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),

  getDevotionals: () => 
    fetch(`${BASE_URL}/devotionals`, {
      headers: getHeaders()
    }).then(handleResponse),

  markDevotionalInactive: (devotionalId: string) =>
    fetch(`${BASE_URL}/devotionals/${devotionalId}/inactive`, {
      method: 'PUT',
      headers: getHeaders()
    }).then(handleResponse),

  reactivateDevotional: (devotionalId: string) =>
    fetch(`${BASE_URL}/devotionals/${devotionalId}/reactivate`, {
      method: 'PUT',
      headers: getHeaders()
    }).then(handleResponse),

  // Churches/Communities
  createChurch: (data: any) =>
    fetch(`${BASE_URL}/churches`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),

  getChurch: (churchId: string) =>
    fetch(`${BASE_URL}/churches/${churchId}`, {
      headers: getHeaders()
    }).then(handleResponse),

  getMyChurches: () =>
    fetch(`${BASE_URL}/churches/leader/my-churches`, {
      headers: getHeaders()
    }).then(handleResponse),

  updateChurch: (churchId: string, data: any) =>
    fetch(`${BASE_URL}/churches/${churchId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),

  deleteChurch: (churchId: string) =>
    fetch(`${BASE_URL}/churches/${churchId}`, {
      method: 'DELETE',
      headers: getHeaders()
    }).then(handleResponse),

  getChurchMembers: (churchId: string) =>
    fetch(`${BASE_URL}/churches/${churchId}/members`, {
      headers: getHeaders()
    }).then(handleResponse),

  registerMemberInChurch: (data: any) =>
    fetch(`${BASE_URL}/auth/register-member`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),

  updateChurchMember: (churchId: string, memberId: string, data: any) =>
    fetch(`${BASE_URL}/churches/${churchId}/members/${memberId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),

  removeMemberFromChurch: (churchId: string, memberId: string) =>
    fetch(`${BASE_URL}/churches/${churchId}/members/${memberId}`, {
      method: 'DELETE',
      headers: getHeaders()
    }).then(handleResponse),

  getChurchMemberStats: (churchId: string) =>
    fetch(`${BASE_URL}/churches/${churchId}/member-stats`, {
      headers: getHeaders()
    }).then(handleResponse),

  // Chat
  getMessages: (limit: number = 50, lastMessageId?: string) => {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (lastMessageId) {
      params.append('lastMessageId', lastMessageId);
    }
    return fetch(`${BASE_URL}/chat/messages?${params}`, {
      headers: getHeaders()
    }).then(handleResponse);
  },

  sendMessage: (content: string) =>
    fetch(`${BASE_URL}/chat/messages`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ content })
    }).then(handleResponse),

  deleteMessage: (messageId: string) =>
    fetch(`${BASE_URL}/chat/messages/${messageId}`, {
      method: 'DELETE',
      headers: getHeaders()
    }).then(handleResponse),

  // Post Reactions
  reactToPost: (postId: string, type: string) =>
    fetch(`${BASE_URL}/posts/${postId}/react`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ type })
    }).then(handleResponse),

  removeReaction: (postId: string, type: string) =>
    fetch(`${BASE_URL}/posts/${postId}/react`, {
      method: 'DELETE',
      headers: getHeaders(),
      body: JSON.stringify({ type })
    }).then(handleResponse),

  pinPost: (postId: string, isPinned: boolean) =>
    fetch(`${BASE_URL}/posts/${postId}/pin`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ isPinned })
    }).then(handleResponse),

  // Events
  getEvents: () =>
    fetch(`${BASE_URL}/events`, { headers: getHeaders() }).then(handleResponse),

  createEvent: (data: any) =>
    fetch(`${BASE_URL}/events`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),

  updateEvent: (id: string, data: any) =>
    fetch(`${BASE_URL}/events/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),

  deleteEvent: (id: string) =>
    fetch(`${BASE_URL}/events/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    }).then(handleResponse),

  rsvpEvent: (id: string, status: string) =>
    fetch(`${BASE_URL}/events/${id}/rsvp`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ status })
    }).then(handleResponse),

  // Prayer Requests
  getPrayerRequests: () =>
    fetch(`${BASE_URL}/prayers`, { headers: getHeaders() }).then(handleResponse),

  createPrayerRequest: (data: any) =>
    fetch(`${BASE_URL}/prayers`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),

  prayForRequest: (id: string) =>
    fetch(`${BASE_URL}/prayers/${id}/pray`, {
      method: 'POST',
      headers: getHeaders()
    }).then(handleResponse),

  unprayForRequest: (id: string) =>
    fetch(`${BASE_URL}/prayers/${id}/pray`, {
      method: 'DELETE',
      headers: getHeaders()
    }).then(handleResponse),

  markPrayerAnswered: (id: string) =>
    fetch(`${BASE_URL}/prayers/${id}/answered`, {
      method: 'PATCH',
      headers: getHeaders()
    }).then(handleResponse),

  deletePrayerRequest: (id: string) =>
    fetch(`${BASE_URL}/prayers/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    }).then(handleResponse),

  // Polls
  getPolls: () =>
    fetch(`${BASE_URL}/polls`, { headers: getHeaders() }).then(handleResponse),

  createPoll: (data: any) =>
    fetch(`${BASE_URL}/polls`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),

  votePoll: (pollId: string, optionId: string) =>
    fetch(`${BASE_URL}/polls/${pollId}/vote`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ optionId })
    }).then(handleResponse),

  deletePoll: (id: string) =>
    fetch(`${BASE_URL}/polls/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    }).then(handleResponse),

  // Notifications
  getNotifications: () =>
    fetch(`${BASE_URL}/notifications`, { headers: getHeaders() }).then(handleResponse),

  markNotificationRead: (id: string) =>
    fetch(`${BASE_URL}/notifications/${id}/read`, {
      method: 'PATCH',
      headers: getHeaders()
    }).then(handleResponse),

  markAllNotificationsRead: () =>
    fetch(`${BASE_URL}/notifications/read-all`, {
      method: 'PATCH',
      headers: getHeaders()
    }).then(handleResponse),

  // Sermons
  getSermons: () =>
    fetch(`${BASE_URL}/sermons`, { headers: getHeaders() }).then(handleResponse),

  createSermon: (data: any) =>
    fetch(`${BASE_URL}/sermons`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),

  updateSermon: (id: string, data: any) =>
    fetch(`${BASE_URL}/sermons/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),

  deleteSermon: (id: string) =>
    fetch(`${BASE_URL}/sermons/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    }).then(handleResponse),

  // Groups / Células
  getGroups: () =>
    fetch(`${BASE_URL}/groups`, { headers: getHeaders() }).then(handleResponse),

  createGroup: (data: any) =>
    fetch(`${BASE_URL}/groups`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),

  updateGroup: (id: string, data: any) =>
    fetch(`${BASE_URL}/groups/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),

  deleteGroup: (id: string) =>
    fetch(`${BASE_URL}/groups/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    }).then(handleResponse),

  joinGroup: (id: string) =>
    fetch(`${BASE_URL}/groups/${id}/join`, {
      method: 'POST',
      headers: getHeaders()
    }).then(handleResponse),

  leaveGroup: (id: string) =>
    fetch(`${BASE_URL}/groups/${id}/leave`, {
      method: 'POST',
      headers: getHeaders()
    }).then(handleResponse),

  // Devotional Likes
  likeDevotional: (id: string) =>
    fetch(`${BASE_URL}/devotionals/${id}/like`, {
      method: 'POST',
      headers: getHeaders()
    }).then(handleResponse),

  // Search
  search: (q: string) =>
    fetch(`${BASE_URL}/search?q=${encodeURIComponent(q)}`, {
      headers: getHeaders()
    }).then(handleResponse),
};
