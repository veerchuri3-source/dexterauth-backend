import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/customer` : 'https://dexterauth.onrender.com/api/v1/customer';

// Create a resilient axios instance for the Customer API
const resilientAxios = axios.create({ timeout: 8000 });

// Aggressive Network Resilience Interceptor
resilientAxios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    if (!error.response && config && (!config._retryCount || config._retryCount < 3)) {
      config._retryCount = (config._retryCount || 0) + 1;
      await new Promise(resolve => setTimeout(resolve, 500 * config._retryCount));
      return resilientAxios(config);
    }
    return Promise.reject(error);
  }
);

// Tokens for customers are stored separately from developer tokens.
const getCustomerToken = () => localStorage.getItem('customer_token');

export const customerApi = {
    // 1. Initial Lookup
    lookupApp: async (ownerUsername: string, appName: string) => {
        const res = await resilientAxios.get(`${BASE_URL}/lookup-app`, {
            params: { ownerUsername, appName }
        });
        return res.data;
    },

    // 2. Authentication
    loginUser: async (appId: string, payload: any) => {
        const res = await resilientAxios.post(`${BASE_URL}/login`, { app_id: appId, ...payload });
        return res.data;
    },

    loginLicense: async (appId: string, payload: any) => {
        const res = await resilientAxios.post(`${BASE_URL}/login-license`, { app_id: appId, ...payload });
        return res.data;
    },

    register: async (appId: string, payload: any) => {
        const res = await resilientAxios.post(`${BASE_URL}/register`, { app_id: appId, ...payload });
        return res.data;
    },

    upgrade: async (appId: string, payload: any) => {
        const res = await resilientAxios.post(`${BASE_URL}/upgrade`, { app_id: appId, ...payload });
        return res.data;
    },

    // 3. Authenticated Actions
    getProfile: async () => {
        const token = getCustomerToken();
        if (!token) throw new Error("No customer token found");
        const res = await resilientAxios.get(`${BASE_URL}/profile`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return res.data;
    },

    getVariables: async () => {
        const token = getCustomerToken();
        if (!token) throw new Error("No customer token found");
        const res = await resilientAxios.get(`${BASE_URL}/variables`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return res.data;
    },

    updateCredentials: async (payload: any) => {
        const token = getCustomerToken();
        if (!token) throw new Error("No customer token found");
        const res = await resilientAxios.post(`${BASE_URL}/update-credentials`, payload, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return res.data;
    },

    resetHwid: async () => {
        const token = getCustomerToken();
        if (!token) throw new Error("No customer token found");
        const res = await resilientAxios.post(`${BASE_URL}/reset-hwid`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return res.data;
    },

    logout: async () => {
        const token = getCustomerToken();
        if (token) {
            try {
                await resilientAxios.post(`${BASE_URL}/logout`, {}, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } catch (e) {
                // Ignore errors on logout
            }
        }
    }
};
