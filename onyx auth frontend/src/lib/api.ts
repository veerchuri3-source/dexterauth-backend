import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://dexterauth.onrender.com/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 8000, // Aggressive 8s timeout to instantly drop stalled MTU connections
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('dev_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Aggressive Network Resilience Interceptor (Like Google/Facebook)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    
    // Auto-Retry Logic for Network Drops/Timeouts (MTU failures)
    if (!error.response && config && (!config._retryCount || config._retryCount < 3)) {
      config._retryCount = (config._retryCount || 0) + 1;
      // Backoff slightly before forcing a new connection
      await new Promise(resolve => setTimeout(resolve, 500 * config._retryCount));
      return api(config);
    }

    if (error.response && error.response.status === 401) {
      localStorage.removeItem('dev_token');
      // Only redirect if not already on login/register to prevent loops
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const devApi = {
  getPublicPlatformSettings: async () => {
    const response = await api.get('/dev/platform/public');
    return response.data;
  },
  getPublicStats: async () => {
    const response = await api.get('/dev/platform/stats');
    return response.data;
  },
  getChangelog: async () => {
    const response = await api.get('/dev/changelog');
    return response.data;
  },
  getSystemHealth: async () => {
    try {
      const response = await api.get('/dev/health');
      return response.data;
    } catch (e: any) {
      if (e.response?.status === 429) {
        return { status: "rate_limited", error: "Too many requests. Please try again later." };
      }
      if (e.response && e.response.data && typeof e.response.data === 'object') {
        return e.response.data;
      }
      return { status: "error", database: "disconnected", error: e.message };
    }
  },
  login: async (username: string, password: string, turnstileToken?: string) => {
    const response = await api.post('/dev/login', { username, password, turnstileToken });
    return response.data;
  },
  googleLogin: async (idToken: string) => {
    const response = await api.post('/dev/auth/google', { idToken });
    return response.data;
  },
  logout: async () => {
    const response = await api.post('/dev/logout');
    return response.data;
  },
  register: async (email: string, username: string, password: string, turnstileToken?: string, avatarUrl?: string) => {
    const avatar = avatarUrl || (email ? `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(email || username)}` : undefined);
    const response = await api.post('/dev/register/init', { email, username, password, turnstileToken, avatar_url: avatar });
    return response.data;
  },
  verifyRegistration: async (email: string, otp: string, avatarUrl?: string) => {
    const avatar = avatarUrl || (email ? `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(email)}` : undefined);
    const response = await api.post('/dev/register/verify', { email, otp, avatar_url: avatar });
    return response.data;
  },
  forgotPassword: async (email: string, turnstileToken?: string) => {
    const response = await api.post('/dev/password/forgot', { email, turnstileToken });
    return response.data;
  },
  resetPassword: async (email: string, otp: string, newPassword: string) => {
    const response = await api.post('/dev/password/reset', { email, otp, newPassword });
    return response.data;
  },
  getMe: async () => {
    const response = await api.get('/dev/me');
    return response.data;
  },
  createCheckoutSession: async (plan: string, billingPeriod?: string) => {
    const response = await api.post('/dev/payments/create-session', { plan, billingPeriod });
    return response.data;
  },
  createPortalSession: async () => {
    const response = await api.post('/dev/payments/portal');
    return response.data;
  },
  binanceVerifyPayment: async (orderId: string, plan: string, billingPeriod?: string) => {
    const response = await api.post('/dev/payments/binance-verify', { orderId, plan, billingPeriod });
    return response.data;
  },
  upiVerifyPayment: async (utr: string, plan: string, billingPeriod?: string) => {
    const response = await api.post('/dev/payments/upi-verify', { utr, plan, billingPeriod });
    return response.data;
  },
  createRazorpayOrder: async (plan: string, billingPeriod?: string) => {
    const response = await api.post('/dev/payments/razorpay/create-order', { plan, billingPeriod });
    return response.data;
  },
  verifyRazorpayPayment: async (payload: {
    plan: string;
    billingPeriod?: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }) => {
    const response = await api.post('/dev/payments/razorpay/verify', payload);
    return response.data;
  },
  getPaymentHistory: async () => {
    const response = await api.get('/dev/payments/history');
    return response.data;
  },
  updateMe: async (data: any) => {
    const response = await api.put('/dev/me', data);
    return response.data;
  },
  deleteProfile: async (password: string) => {
    const response = await api.delete('/dev/profile', { data: { password } });
    return response.data;
  },
  getDiscordLoginUrl: async () => {
    const response = await api.get('/dev/auth/discord/login-url');
    return response.data;
  },
  getDiscordAuthUrl: async () => {
    const response = await api.get('/dev/auth/discord/url');
    return response.data;
  },
  getDiscordProfile: async () => {
    const response = await api.get('/dev/auth/discord/profile');
    return response.data;
  },
  unlinkDiscord: async () => {
    const response = await api.delete('/dev/auth/discord/link');
    return response.data;
  },
  updateDiscordPermissions: async (permissions: any) => {
    const response = await api.put('/dev/auth/discord/permissions', permissions);
    return response.data;
  },
  getApps: async () => {
    const response = await api.get('/dev/apps');
    return response.data;
  },
  getApp: async (id: string) => {
    const response = await api.get(`/dev/apps/${id}`);
    return response.data;
  },
  createApp: async (name: string, version: string) => {
    const response = await api.post('/dev/apps', { name, version });
    return response.data;
  },
  updateApp: async (id: string, data: any) => {
    const response = await api.put(`/dev/apps/${id}`, data);
    return response.data;
  },
  testWebhook: async (id: string, webhookUrl?: string, webhookUsername?: string, webhookAvatar?: string) => {
    const response = await api.post(`/dev/apps/${id}/webhook/test`, {
      webhook_url: webhookUrl,
      webhook_username: webhookUsername,
      webhook_avatar: webhookAvatar
    });
    return response.data;
  },
  generateLicenses: async (appId: string, amount: number, mask: string, lowercaseLetters: boolean, capitalLetters: boolean, level: string, note: string, expiry: number, duration: number) => {
    const response = await api.post('/dev/licenses/generate', { 
      app_id: appId, amount, mask, lowercaseLetters, capitalLetters, level, note, expiry, duration 
    });
    return response.data;
  },
  getLicenses: async (appId: string) => {
    const response = await api.get(`/dev/licenses?appId=${appId}`);
    return response.data;
  },
  updateLicense: async (id: string, data: any) => {
    const response = await api.put(`/dev/licenses/${id}`, data);
    return response.data;
  },
  deleteLicense: async (id: string) => {
    const response = await api.delete(`/dev/licenses/${id}`);
    return response.data;
  },
  deleteUsedLicenses: async (appId: string) => {
    const response = await api.delete(`/dev/apps/${appId}/licenses/used`);
    return response.data;
  },
  deleteUnusedLicenses: async (appId: string) => {
    const response = await api.delete(`/dev/apps/${appId}/licenses/unused`);
    return response.data;
  },
  addTimeToUnusedLicenses: async (appId: string, time_to_add: number) => {
    const response = await api.post(`/dev/apps/${appId}/licenses/add-time`, { time_to_add });
    return response.data;
  },
  getUsers: async (appId: string) => {
    const response = await api.get(`/dev/users?appId=${appId}`);
    return response.data;
  },
  createUser: async (appId: string, data: any) => {
    const response = await api.post(`/dev/users`, { appId, ...data });
    return response.data;
  },
  updateUser: async (id: string, data: any) => {
    const response = await api.put(`/dev/users/${id}`, data);
    return response.data;
  },
  deleteUser: async (id: string) => {
    const response = await api.delete(`/dev/users/${id}`);
    return response.data;
  },
  deleteAllUsers: async (appId: string) => {
    const response = await api.delete(`/dev/apps/${appId}/users/all`);
    return response.data;
  },
  deleteExpiredUsers: async (appId: string) => {
    const response = await api.delete(`/dev/apps/${appId}/users/expired`);
    return response.data;
  },
  resetUserHwid: async (userId: string) => {
    const response = await api.post(`/dev/users/${userId}/reset-hwid`);
    return response.data;
  },
  resetAllUserHwids: async (appId: string) => {
    const response = await api.post(`/dev/apps/${appId}/users/reset-hwids`);
    return response.data;
  },
  bulkAddUserTime: async (appId: string, userIds: string[], seconds: number) => {
    const response = await api.post(`/dev/apps/${appId}/users/bulk-time`, { userIds, seconds });
    return response.data;
  },
  bulkSubtractUserTime: async (appId: string, userIds: string[], seconds: number) => {
    const response = await api.post(`/dev/apps/${appId}/users/subtract-time`, { userIds, seconds });
    return response.data;
  },
  importUsers: async (appId: string, data: any) => {
    const response = await api.post(`/dev/apps/${appId}/users/import`, data);
    return response.data;
  },
  deleteApp: async (appId: string) => {
    const response = await api.delete(`/dev/apps/${appId}`);
    return response.data;
  },
  
  getHashes: async (appId: string) => {
    const response = await api.get(`/dev/apps/${appId}/hashes`);
    return response.data;
  },
  addHash: async (appId: string, hash_value: string) => {
    const response = await api.post(`/dev/apps/${appId}/hashes`, { hash_value });
    return response.data;
  },
  deleteHash: async (appId: string, hashId: string) => {
    const response = await api.delete(`/dev/apps/${appId}/hashes/${hashId}`);
    return response.data;
  },
  resetHashes: async (appId: string) => {
    const response = await api.delete(`/dev/apps/${appId}/hashes/reset`);
    return response.data;
  },
  
  getTokens: async (appId: string) => {
    const response = await api.get(`/dev/tokens?appId=${appId}`);
    return response.data;
  },
  createToken: async (appId: string, data: any) => {
    const response = await api.post(`/dev/tokens`, { app_id: appId, ...data });
    return response.data;
  },
  updateToken: async (id: string, data: any) => {
    const response = await api.put(`/dev/tokens/${id}`, data);
    return response.data;
  },
  deleteToken: async (id: string) => {
    const response = await api.delete(`/dev/tokens/${id}`);
    return response.data;
  },

  getSubscriptions: async (appId: string) => {
    const response = await api.get(`/dev/subscriptions?appId=${appId}`);
    return response.data;
  },
  createSubscription: async (appId: string, data: any) => {
    const response = await api.post(`/dev/subscriptions`, { app_id: appId, ...data });
    return response.data;
  },
  updateSubscription: async (id: string, data: any) => {
    const response = await api.put(`/dev/subscriptions/${id}`, data);
    return response.data;
  },
  deleteSubscription: async (id: string) => {
    const response = await api.delete(`/dev/subscriptions/${id}`);
    return response.data;
  },

  getSessions: async (appId: string) => {
    const response = await api.get(`/dev/sessions?appId=${appId}`);
    return response.data;
  },
  deleteSession: async (id: string) => {
    const response = await api.delete(`/dev/sessions/${id}`);
    return response.data;
  },

  getTeamMembers: async (appId?: string) => {
    const response = await api.get('/dev/team', { params: appId ? { appId } : undefined });
    return response.data;
  },
  createTeamMember: async (data: any) => {
    const response = await api.post('/dev/team', data);
    return response.data;
  },
  updateTeamMember: (id: string, data: any) => api.put(`/dev/team/${id}`, data).then(res => res.data),
  deleteTeamMember: (id: string, appId?: string) => api.delete(`/dev/team/${id}`, { params: appId ? { appId } : undefined }).then(res => res.data),

  getChatMessages: (appId: string) => api.get(`/dev/apps/${appId}/chat`).then(res => res.data),
  sendChatMessage: (appId: string, content: string) => api.post(`/dev/apps/${appId}/chat`, { content }).then(res => res.data),

  getOverviewStats: async (appId: string) => {
    const response = await api.get(`/dev/overview?appId=${appId}`);
    return response.data;
  },
  getNotifications: async () => {
    const response = await api.get('/dev/notifications');
    return response.data;
  },
  markNotificationsAsSeen: async () => {
    const response = await api.post('/dev/notifications/seen');
    return response.data;
  },
  verifyUser: async (query: string, appId?: string, mode: 'invite' | 'signup' = 'invite', signal?: AbortSignal) => {
    const response = await api.post('/dev/verify-user', { query, appId, mode }, { signal });
    return response.data;
  },
  inviteUser: async (payload: any) => {
    const response = await api.post('/dev/team/invite', payload);
    return response.data;
  },
  respondToInvitation: async (invitationId: string, accept: boolean) => {
    const response = await api.post('/dev/team/invite/respond', { invitationId, accept });
    return response.data;
  },
  leaveTeam: async (appId: string) => {
    const response = await api.post('/dev/team/leave', { appId });
    return response.data;
  },
  // Sent invitations (for the inviter to see pending/rejected)
  getSentInvitations: async () => {
    const response = await api.get('/dev/team/invitations');
    return response.data;
  },
  cancelInvitation: async (id: string) => {
    const response = await api.delete(`/dev/team/invitations/${id}`);
    return response.data;
  },
  resendInvitation: async (id: string) => {
    const response = await api.post(`/dev/team/invitations/${id}/resend`);
    return response.data;
  },
  // Variables Management API
  getGlobalVariables: async (appId: string) => {
    const response = await api.get(`/dev/apps/${appId}/variables/global`);
    return response.data;
  },
  createGlobalVariable: async (appId: string, payload: { name: string; data: string; is_authenticated?: boolean }) => {
    const response = await api.post(`/dev/apps/${appId}/variables/global`, payload);
    return response.data;
  },
  updateGlobalVariable: async (appId: string, varId: string, payload: { name?: string; data?: string; is_authenticated?: boolean }) => {
    const response = await api.put(`/dev/apps/${appId}/variables/global/${varId}`, payload);
    return response.data;
  },
  deleteGlobalVariable: async (appId: string, varId: string) => {
    const response = await api.delete(`/dev/apps/${appId}/variables/global/${varId}`);
    return response.data;
  },

  getUserVariables: async (appId: string) => {
    const response = await api.get(`/dev/apps/${appId}/variables/user`);
    return response.data;
  },
  createUserVariable: async (appId: string, payload: { user_id?: string | null; name: string; data: string; is_readonly?: boolean }) => {
    const response = await api.post(`/dev/apps/${appId}/variables/user`, payload);
    return response.data;
  },
  updateUserVariable: async (appId: string, varId: string, payload: { name?: string; data?: string; is_readonly?: boolean }) => {
    const response = await api.put(`/dev/apps/${appId}/variables/user/${varId}`, payload);
    return response.data;
  },
  deleteUserVariable: async (appId: string, varId: string) => {
    const response = await api.delete(`/dev/apps/${appId}/variables/user/${varId}`);
    return response.data;
  },

  // Files Management API
  getFiles: async (appId: string) => {
    const response = await api.get(`/dev/apps/${appId}/files`);
    return response.data;
  },
  createFile: async (appId: string, payload: { name: string; download_url: string; version_tag?: string; is_latest_release?: boolean; is_authenticated?: boolean; tags?: string[] }) => {
    const response = await api.post(`/dev/apps/${appId}/files`, payload);
    return response.data;
  },
  updateFile: async (appId: string, fileId: string, payload: { name?: string; download_url?: string; version_tag?: string; is_latest_release?: boolean; is_authenticated?: boolean; tags?: string[] }) => {
    const response = await api.put(`/dev/apps/${appId}/files/${fileId}`, payload);
    return response.data;
  },
  setLatestReleaseFile: async (appId: string, fileId: string) => {
    const response = await api.post(`/dev/apps/${appId}/files/${fileId}/set-latest`);
    return response.data;
  },
  deleteFile: async (appId: string, fileId: string) => {
    const response = await api.delete(`/dev/apps/${appId}/files/${fileId}`);
    return response.data;
  },
  uploadFile: async (appId: string, formData: FormData, onProgress?: (percent: number) => void) => {
    const response = await api.post(`/dev/apps/${appId}/files/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && progressEvent.total > 0) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress?.(percent);
        }
      },
    });
    return response.data;
  },
};

export const adminApi = {
  getOverview: async (limit = 50, offset = 0, search = '', plan = '') => {
    const response = await api.get('/admin/overview', {
      params: { limit, offset, search, plan }
    });
    return response.data;
  },
  getAdminTeam: async (id: string) => {
    const response = await api.get(`/admin/${id}/team`);
    return response.data;
  },
  pauseAdmin: async (id: string) => {
    const response = await api.post(`/admin/${id}/pause`);
    return response.data;
  },
  resumeAdmin: async (id: string) => {
    const res = await api.post(`/admin/${id}/resume`);
    return res.data;
  },
  linkCloudflare: async (token: string, domain: string, targetIp: string, targetPort: number) => {
    const res = await api.post('/admin/cloudflare/link', { token, domain, targetIp, targetPort });
    return res.data;
  },
  unlinkCloudflare: async () => {
    const res = await api.post('/admin/cloudflare/unlink');
    return res.data;
  },
  wipeAdmin: async (id: string) => {
    const response = await api.delete(`/admin/${id}/wipe`);
    return response.data;
  },
  getSettings: async () => {
    const response = await api.get('/admin/settings');
    return response.data;
  },
  updateSettings: async (settings: any) => {
    const response = await api.post('/admin/settings', settings);
    return response.data;
  },
  updateAdminRole: async (id: string, role: string, plan: string, badges?: string[], planExpiresAt?: string | null) => {
    const response = await api.put(`/admin/${id}/role`, { role, plan, badges, plan_expires_at: planExpiresAt ?? null });
    return response.data;
  },

  createAnnouncement: async (title: string, content: string, type: string) => {
    const res = await api.post('/admin/announcements', { title, content, type });
    return res.data;
  },
  deleteAnnouncement: async (id: string) => {
    const response = await api.delete(`/admin/announcements/${id}`);
    return response.data;
  },
  getChangelog: async () => {
    const response = await api.get('/admin/changelog');
    return response.data;
  },
  createChangelog: async (entry: any) => {
    const response = await api.post('/admin/changelog', entry);
    return response.data;
  },
  updateChangelog: async (id: string, entry: any) => {
    const response = await api.put(`/admin/changelog/${id}`, entry);
    return response.data;
  },
  deleteChangelog: async (id: string) => {
    const response = await api.delete(`/admin/changelog/${id}`);
    return response.data;
  },
  impersonateUser: async (id: string) => {
    const response = await api.post(`/admin/${id}/impersonate`);
    return response.data;
  }
};
