const DEFAULT_BACKEND_URL = 'https://auction-websit.onrender.com';

const getApiBaseUrl = () => {
  if ((import.meta as any).env?.VITE_API_URL) {
    return (import.meta as any).env.VITE_API_URL;
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:5000/api';
    }
    if (host.endsWith('netlify.app') || host.endsWith('vercel.app')) {
      return `${DEFAULT_BACKEND_URL}/api`;
    }
  }
  return '/api';
};

export const API_BASE_URL = getApiBaseUrl();

export const fetchAPI = async (endpoint: string, options: RequestInit = {}) => {
  const adminToken = localStorage.getItem('admin_token');
  const teamToken = localStorage.getItem('team_token');
  const token = endpoint.startsWith('/admin') ? (adminToken || teamToken) : (teamToken || adminToken);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'API request failed.');
  }

  return data;
};
