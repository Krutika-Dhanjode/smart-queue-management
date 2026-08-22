import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || `http://${window.location.hostname}:5002/api`;

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  registerAdmin: (data) => api.post('/auth/register-admin', data),
  verifyOTP: (data) => api.post('/auth/verify-otp', data),
  resendOTP: (data) => api.post('/auth/resend-otp', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
};

export const queueAPI = {
  create: (data) => api.post('/queues', data),
  getAdminQueues: () => api.get('/queues/admin'),
  getQueue: (publicCode) => api.get(`/queues/${publicCode}`),
  getQueueWithTypes: (queueId) => api.get(`/queues/${queueId}/types`),
  getSubQueueByCode: (subCode) => api.get(`/queues/sub/${subCode}`),
  joinQueue: (publicCode, data) => api.post(`/queues/join/${publicCode}`, data),
  joinBySubCode: (subCode, data) => api.post(`/queues/join-sub/${subCode}`, data),
  joinByAdminCode: (data) => api.post('/queues/admin-access', data),
  joinBySubAdminCode: (data) => api.post('/queues/sub-admin-access', data),
  getPosition: (memberId) => api.get(`/queues/member/${memberId}/position`),
  getMembersByType: (queueTypeId) => api.get(`/queues/${queueTypeId}/members`),
  serveToken: (queueTypeId, memberId) => api.post(`/queues/${queueTypeId}/members/${memberId}/serve`),
  completeToken: (queueTypeId, memberId) => api.post(`/queues/${queueTypeId}/members/${memberId}/complete`),
  skipToken: (queueTypeId, memberId) => api.post(`/queues/${queueTypeId}/members/${memberId}/skip`),
  undoServe: (queueTypeId, memberId) => api.post(`/queues/${queueTypeId}/members/${memberId}/undo-serve`),
  removeToken: (queueTypeId, memberId) => api.post(`/queues/${queueTypeId}/members/${memberId}/remove`),
  leaveQueue: (memberId) => api.post(`/queues/member/${memberId}/leave`),
  startBreak: (queueId, data) => api.post(`/queues/${queueId}/break`, data),
  endBreak: (queueId) => api.post(`/queues/${queueId}/resume`),
  endQueue: (queueId) => api.post(`/queues/${queueId}/end`),
  getAnalytics: (queueTypeId) => api.get(`/queues/${queueTypeId}/analytics`),
  getCompletedMembers: (queueTypeId) => api.get(`/queues/${queueTypeId}/completed`),
  getRejectedMembers: (queueTypeId) => api.get(`/queues/${queueTypeId}/rejected`),
  getPublicSubQueueInfo: (subCode) => api.get(`/queues/public/sub/${subCode}`),
  getPublicQueueInfo: (publicCode) => api.get(`/queues/public/${publicCode}`),
  skipSelf: (memberId, data) => api.post(`/queues/member/${memberId}/skip-self`, data),
  getMemberStatus: (memberId) => api.get(`/queues/member/${memberId}/status`),
  addSubQueue: (queueId, data) => api.post(`/queues/${queueId}/sub-queues`, data),
  deleteQueue: (queueId) => api.delete(`/queues/${queueId}`),
};

export const queueSettingsAPI = {
  getSettings: (queueId) => api.get(`/queue-settings/${queueId}/settings`),
  updateSettings: (queueId, data) => api.put(`/queue-settings/${queueId}/settings`, data),
  getCustomFields: (queueId) => api.get(`/queue-settings/${queueId}/custom-fields`),
  addCustomField: (queueId, data) => api.post(`/queue-settings/${queueId}/custom-fields`, data),
  updateCustomField: (fieldId, data) => api.put(`/queue-settings/custom-fields/${fieldId}`, data),
  deleteCustomField: (fieldId) => api.delete(`/queue-settings/custom-fields/${fieldId}`),
  bulkCreateCustomFields: (queueId, fields) => api.post(`/queue-settings/${queueId}/custom-fields/bulk`, { fields }),
  uploadEligibility: (queueId, formData) => api.post(`/queue-settings/${queueId}/eligibility/upload`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getEligibilityInfo: (queueId) => api.get(`/queue-settings/${queueId}/eligibility/info`),
  removeEligibility: (queueId) => api.delete(`/queue-settings/${queueId}/eligibility`),
  checkEligibility: (queueId, data) => api.post(`/queue-settings/${queueId}/eligibility/check`, data),
  addDocRequirement: (queueId, formData) => api.post(`/queue-settings/${queueId}/doc-requirements`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updateDocRequirement: (requirementId, formData) => api.put(`/queue-settings/doc-requirements/${requirementId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteDocRequirement: (requirementId) => api.delete(`/queue-settings/doc-requirements/${requirementId}`),
  checkJoinRequirements: (queueId, data) => api.post(`/queue-settings/${queueId}/check-join`, data),
};

export const documentAPI = {
  addRequirement: (queueId, data) => api.post(`/documents/${queueId}/requirements`, data),
  getRequirements: (queueId) => api.get(`/documents/${queueId}/requirements`),
  updateRequirement: (requirementId, data) => api.put(`/documents/requirements/${requirementId}`, data),
  deleteRequirement: (requirementId) => api.delete(`/documents/requirements/${requirementId}`),
  uploadDocument: (queueMemberId, documentRequirementId, formData) =>
    api.post(`/documents/${queueMemberId}/documents/${documentRequirementId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getDocuments: (queueMemberId) => api.get(`/documents/${queueMemberId}/documents`),
  checkDocuments: (queueMemberId) => api.get(`/documents/${queueMemberId}/documents/check`),
  verifyDocument: (documentId, data) => api.post(`/documents/documents/${documentId}/verify`, data),
};

export const eligibilityAPI = {
  upload: (queueId, formData) =>
    api.post(`/eligibility/${queueId}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  check: (queueId, data) => api.post(`/eligibility/${queueId}/check`, data),
  getRecords: (queueId) => api.get(`/eligibility/${queueId}/records`),
  deleteRecords: (queueId) => api.delete(`/eligibility/${queueId}/records`),
};

export const analyticsAPI = {
  getQueueAnalytics: (queueTypeId) => api.get(`/analytics/${queueTypeId}`),
  getHourlyStats: (queueTypeId) => api.get(`/analytics/${queueTypeId}/hourly`),
  getStatusDistribution: (queueTypeId) => api.get(`/analytics/${queueTypeId}/distribution`),
  getDailyStats: (queueId) => api.get(`/analytics/queue/${queueId}/daily`),
};

export const notificationAPI = {
  getNotifications: () => api.get('/notifications'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markRead: (notificationId) => api.post(`/notifications/${notificationId}/read`),
  markAllRead: () => api.post('/notifications/read-all'),
};

export const predictionAPI = {
  getWaitTime: (queueTypeId, params) => api.get(`/predictions/${queueTypeId}`, { params }),
};

export default api;
