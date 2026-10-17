import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';

const AuthContext = createContext();

// Ensure every outgoing request has the active Bearer token
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && !config.headers['Authorization']) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(() => localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      delete axios.defaults.headers.common['Authorization'];
      setUser(null);
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const res = await axios.get(`${API_URL}/auth/me`);
      if (res.data?.success && res.data?.user) {
        setUser(res.data.user);
      }
    } catch (err) {
      console.error('Failed to fetch user', err);
      // Only clear credentials if server explicitly rejected with 401 Unauthorized
      if (err.response && err.response.status === 401) {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const res = await axios.post(`${API_URL}/auth/login`, { email, password }, { timeout: 12000 });
    const { token, user } = res.data;
    
    // Attach authorization immediately before any navigation
    localStorage.setItem('token', token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setToken(token);
    setUser(user);
    setLoading(false);
    return user;
  };

  // Step 1: submit form data → triggers OTP email via Gmail
  const initiateRegister = async (userData) => {
    const res = await axios.post(`${API_URL}/auth/register`, userData, { timeout: 25000 });
    return res.data; // { success, message, email }
  };

  // Step 2: submit OTP → creates account and logs in
  const verifyRegistration = async (email, otp) => {
    const res = await axios.post(`${API_URL}/auth/register/verify`, { email, otp }, { timeout: 25000 });
    const { token, user } = res.data;
    
    localStorage.setItem('token', token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setToken(token);
    setUser(user);
    setLoading(false);
    return user;
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
    setLoading(false);
  };

  const refreshUser = async () => {
    await fetchUser();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, initiateRegister, verifyRegistration, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
