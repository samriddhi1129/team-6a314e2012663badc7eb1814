// frontend/src/services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor – attach token
api.interceptors.request.use(
  (config) => {
    // Read token from persisted store
    try {
      const stored = JSON.parse(localStorage.getItem('vicharanshala-auth') || '{}');
      const token = stored?.state?.accessToken;
      if (token) config.headers.Authorization = `Bearer ${token}`;
    } catch {}
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor – handle 401 refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const stored = JSON.parse(localStorage.getItem('vicharanshala-auth') || '{}');
        const refreshToken = stored?.state?.refreshToken;
        if (refreshToken) {
          const { data } = await axios.post('/api/auth/refresh', { refreshToken });
          const newToken = data.data.accessToken;

          // Update persisted store
          stored.state.accessToken = newToken;
          localStorage.setItem('vicharanshala-auth', JSON.stringify(stored));

          original.headers.Authorization = `Bearer ${newToken}`;
          return api(original);
        }
      } catch {
        // Refresh failed – clear auth
        localStorage.removeItem('vicharanshala-auth');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// ---- Convenience service objects ----

export const authService = {
  register:       (data) => api.post('/auth/register', data),
  login:          (data) => api.post('/auth/login', data),
  logout:         ()     => Promise.resolve(),
  verifyEmail:    (token) => api.post('/auth/verify-email', { token }),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword:  (data)  => api.post('/auth/reset-password', data),
  getMe:          ()      => api.get('/auth/me'),
};

export const questionService = {
  getAll:     (params) => api.get('/questions', { params }),
  getOne:     (id)     => api.get(`/questions/${id}`),
  create:     (data)   => api.post('/questions', data),
  update:     (id, d)  => api.put(`/questions/${id}`, d),
  delete:     (id)     => api.delete(`/questions/${id}`),
  vote:       (id, t)  => api.post(`/questions/${id}/vote`, { vote_type: t }),
  bookmark:   (id)     => api.post(`/questions/${id}/bookmark`),
  trending:   ()       => api.get('/questions/trending'),
  similar:    (q)      => api.get('/questions/search/similar', { params: { q } }),
};

export const answerService = {
  getAll:    (qId)    => api.get(`/questions/${qId}/answers`),
  create:    (qId, d) => api.post(`/questions/${qId}/answers`, d),
  update:    (id, d)  => api.put(`/answers/${id}`, d),
  delete:    (id)     => api.delete(`/answers/${id}`),
  accept:    (id)     => api.post(`/answers/${id}/accept`),
  vote:      (id, t)  => api.post(`/answers/${id}/vote`, { vote_type: t }),
  validate:  (id)     => api.post(`/answers/${id}/validate`),
};

export const categoryService = {
  getAll: ()           => api.get('/categories'),
  getTags: (p)         => api.get('/tags', { params: p }),
  createTag: (d)       => api.post('/tags', d),
};

export const commentService = {
  get:    (p) => api.get('/comments', { params: p }),
  create: (d) => api.post('/comments', d),
};

export const userService = {
  getProfile:           (username) => api.get(`/users/${username}/profile`),
  updateProfile:        (d)        => api.put('/users/profile', d),
  getLeaderboard:       (p)        => api.get('/users/leaderboard', { params: p }),
  getNotifications:     (p)        => api.get('/users/notifications', { params: p }),
  markNotificationsRead:(ids)      => api.put('/users/notifications/read', { ids }),
  getBookmarks:         ()         => api.get('/users/bookmarks'),
};

export const analyticsService = {
  getOverview:      () => api.get('/analytics/overview'),
  getHeatmap:       () => api.get('/analytics/heatmap'),
  getActivity:      (p) => api.get('/analytics/activity', { params: p }),
  getKnowledgeGraph:() => api.get('/analytics/knowledge-graph'),
  getResearchMap:   () => api.get('/analytics/research-map'),
};

export const adminService = {
  getUsers:       (p) => api.get('/admin/users', { params: p }),
  updateUser:     (id, d) => api.put(`/admin/users/${id}/status`, d),
  getReports:     (p) => api.get('/admin/reports', { params: p }),
};
