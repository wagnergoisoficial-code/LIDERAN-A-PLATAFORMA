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

  // Posts
  createPost: (data: any) => 
    fetch(`${BASE_URL}/posts`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),

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
    }).then(handleResponse)
};
