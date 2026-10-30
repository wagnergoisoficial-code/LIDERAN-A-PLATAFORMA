/**
 * API Service following the Youth Church Portal integration guide
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

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

// Sessão expirada ou inválida: limpa os dados e volta ao login
const endSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  if (!window.location.pathname.startsWith('/login')) window.location.href = '/login';
};

const handleResponse = async (response: Response) => {
  let data: any = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    if (response.status === 401 && localStorage.getItem(TOKEN_KEY)) endSession();
    throw {
      message: data?.message || data?.error || 'Ocorreu um erro na requisição',
      statusCode: response.status,
      data
    };
  }
  return data;
};

const request = (path: string, init: RequestInit = {}) =>
  fetch(`${BASE_URL}${path}`, { headers: getHeaders(), ...init })
    .catch(() => { throw { message: 'Não foi possível conectar ao servidor', statusCode: 0 }; })
    .then(handleResponse);

export const api = {
  // Auth
  register: (data: any) => 
    request(`/auth/register`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  login: (data: any) => 
    request(`/auth/login`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Dados atuais do utilizador + token renovado
  me: () =>
    request('/auth/me'),

  // Users
  getUsers: () => 
    request(`/users`),

  getUser: (id: string) => 
    request(`/users/${id}`),

  getUserProfile: (id: string) =>
    request(`/users/${id}`),

  updateUserProfile: (data: any) =>
    request(`/users/profile`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  uploadProfileImage: (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    return request(`/users/profile/avatar`, {
      method: 'PUT',
      headers: getHeadersWithoutContentType(),
      body: formData
    });
  },

  createUser: (data: any) =>
    request(`/users`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Social Links
  addSocialLink: (data: any) =>
    request(`/users/social-links`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  getSocialLinks: (userId: string) =>
    request(`/users/${userId}/social-links`),

  removeSocialLink: (linkId: string) =>
    request(`/users/social-links/${linkId}`, {
      method: 'DELETE',
    }),

  // Achievements
  getAchievements: (userId: string) =>
    request(`/users/${userId}/achievements`),

  // Block Users
  blockUser: (blockedId: string) =>
    request(`/users/block/${blockedId}`, {
      method: 'POST',
    }),

  unblockUser: (blockedId: string) =>
    request(`/users/block/${blockedId}`, {
      method: 'DELETE',
    }),

  getBlockedUsers: () =>
    request(`/users/blocked`),

  // Posts
  createPost: (data: any, imageFile?: File) => {
    if (imageFile) {
      // Use FormData for multipart upload
      const formData = new FormData();
      formData.append('content', data.content || '');
      formData.append('image', imageFile);

      return request(`/posts`, {
        method: 'POST',
        headers: getHeadersWithoutContentType(),
        body: formData
      });
    } else {
      // Use JSON for text-only posts
      return request(`/posts`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
    }
  },

  getPosts: () => 
    request(`/posts`),

  addComment: (postId: string, data: any) => 
    request(`/posts/${postId}/comment`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  deletePost: (postId: string) =>
    request(`/posts/${postId}`, { method: 'DELETE' }),

  deleteComment: (postId: string, commentId: string) =>
    request(`/posts/${postId}/comments/${commentId}`, { method: 'DELETE' }),

  // Devotionals
  createDevotional: (data: any) => 
    request(`/devotionals`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  getDevotionals: () => 
    request(`/devotionals`),

  markDevotionalInactive: (devotionalId: string) =>
    request(`/devotionals/${devotionalId}/inactive`, {
      method: 'PUT',
    }),

  reactivateDevotional: (devotionalId: string) =>
    request(`/devotionals/${devotionalId}/reactivate`, {
      method: 'PUT',
    }),

  deleteDevotional: (devotionalId: string) =>
    request(`/devotionals/${devotionalId}`, { method: 'DELETE' }),

  // Churches/Communities
  createChurch: (data: any) =>
    request(`/churches`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  getChurch: (churchId: string) =>
    request(`/churches/${churchId}`),

  getMyChurches: () =>
    request(`/churches/leader/my-churches`),

  activateChurch: (churchId: string) =>
    request(`/churches/${churchId}/activate`, { method: 'POST' }),

  updateChurch: (churchId: string, data: any) =>
    request(`/churches/${churchId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  deleteChurch: (churchId: string) =>
    request(`/churches/${churchId}`, {
      method: 'DELETE',
    }),

  getChurchMembers: (churchId: string) =>
    request(`/churches/${churchId}/members`),

  registerMemberInChurch: (data: any) =>
    request(`/auth/register-member`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  updateChurchMember: (churchId: string, memberId: string, data: any) =>
    request(`/churches/${churchId}/members/${memberId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  removeMemberFromChurch: (churchId: string, memberId: string) =>
    request(`/churches/${churchId}/members/${memberId}`, {
      method: 'DELETE',
    }),

  getChurchMemberStats: (churchId: string) =>
    request(`/churches/${churchId}/member-stats`),

  // Chat
  getMessages: (limit: number = 50, lastMessageId?: string) => {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (lastMessageId) {
      params.append('lastMessageId', lastMessageId);
    }
    return request(`/chat/messages?${params}`);
  },

  sendMessage: (content: string) =>
    request(`/chat/messages`, {
      method: 'POST',
      body: JSON.stringify({ content })
    }),

  deleteMessage: (messageId: string) =>
    request(`/chat/messages/${messageId}`, {
      method: 'DELETE',
    }),

  // Post Reactions
  reactToPost: (postId: string, type: string) =>
    request(`/posts/${postId}/react`, {
      method: 'POST',
      body: JSON.stringify({ type })
    }),

  removeReaction: (postId: string, type: string) =>
    request(`/posts/${postId}/react`, {
      method: 'DELETE',
      body: JSON.stringify({ type })
    }),

  pinPost: (postId: string, isPinned: boolean) =>
    request(`/posts/${postId}/pin`, {
      method: 'PATCH',
      body: JSON.stringify({ isPinned })
    }),

  // Events
  getEvents: () =>
    request(`/events`),

  createEvent: (data: any) =>
    request(`/events`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  updateEvent: (id: string, data: any) =>
    request(`/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  deleteEvent: (id: string) =>
    request(`/events/${id}`, {
      method: 'DELETE',
    }),

  rsvpEvent: (id: string, status: string) =>
    request(`/events/${id}/rsvp`, {
      method: 'POST',
      body: JSON.stringify({ status })
    }),

  // Prayer Requests
  getPrayerRequests: () =>
    request(`/prayers`),

  createPrayerRequest: (data: any) =>
    request(`/prayers`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  prayForRequest: (id: string) =>
    request(`/prayers/${id}/pray`, {
      method: 'POST',
    }),

  unprayForRequest: (id: string) =>
    request(`/prayers/${id}/pray`, {
      method: 'DELETE',
    }),

  markPrayerAnswered: (id: string) =>
    request(`/prayers/${id}/answered`, {
      method: 'PATCH',
    }),

  deletePrayerRequest: (id: string) =>
    request(`/prayers/${id}`, {
      method: 'DELETE',
    }),

  // Polls
  getPolls: () =>
    request(`/polls`),

  createPoll: (data: any) =>
    request(`/polls`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  votePoll: (pollId: string, optionId: string) =>
    request(`/polls/${pollId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ optionId })
    }),

  deletePoll: (id: string) =>
    request(`/polls/${id}`, {
      method: 'DELETE',
    }),

  // Notifications
  getNotifications: () =>
    request(`/notifications`),

  markNotificationRead: (id: string) =>
    request(`/notifications/${id}/read`, {
      method: 'PATCH',
    }),

  markAllNotificationsRead: () =>
    request(`/notifications/read-all`, {
      method: 'PATCH',
    }),

  // Sermons
  getSermons: () =>
    request(`/sermons`),

  createSermon: (data: any) =>
    request(`/sermons`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  updateSermon: (id: string, data: any) =>
    request(`/sermons/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  deleteSermon: (id: string) =>
    request(`/sermons/${id}`, {
      method: 'DELETE',
    }),

  // Groups / Células
  getGroups: () =>
    request(`/groups`),

  createGroup: (data: any) =>
    request(`/groups`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  updateGroup: (id: string, data: any) =>
    request(`/groups/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  deleteGroup: (id: string) =>
    request(`/groups/${id}`, {
      method: 'DELETE',
    }),

  joinGroup: (id: string) =>
    request(`/groups/${id}/join`, {
      method: 'POST',
    }),

  leaveGroup: (id: string) =>
    request(`/groups/${id}/leave`, {
      method: 'POST',
    }),

  // Devotional Likes
  likeDevotional: (id: string) =>
    request(`/devotionals/${id}/like`, {
      method: 'POST',
    }),

  // Search
  search: (q: string) =>
    request(`/search?q=${encodeURIComponent(q)}`),
};
