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

// Check if JWT token is expired
const isTokenExpired = (tok) => {
  if (!tok) return true;
  try {
    const parts = tok.split('.');
    if (parts.length !== 3) return false;
    const payload = JSON.parse(atob(parts[1]));
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
};

// Read cached user from localStorage for instant optimistic render
const readCachedUser = () => {
  try {
    const raw = localStorage.getItem('dworld_user');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};
const writeCachedUser = (u) => {
  try {
    if (u) localStorage.setItem('dworld_user', JSON.stringify(u));
    else localStorage.removeItem('dworld_user');
  } catch {}
};

export const AuthProvider = ({ children }) => {
  // Purge expired token immediately before seeding state
  const initialToken = (() => {
    const tok = localStorage.getItem('token');
    if (tok && isTokenExpired(tok)) {
      localStorage.removeItem('token');
      writeCachedUser(null);
      return null;
    }
    return tok;
  })();

  // Seed from cache so user is available immediately — no spinner on reload
  const [user, setUser] = useState(() => {
    return initialToken ? readCachedUser() : null;
  });
  // loading=false when a token is present and cached user exists (optimistic)
  const [loading, setLoading] = useState(() => {
    return !initialToken || !readCachedUser(); // only block if no cache available
  });
  const [token, setToken] = useState(() => initialToken);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser(); // silently revalidate in background
    } else {
      delete axios.defaults.headers.common['Authorization'];
      setUser(null);
      writeCachedUser(null);
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const res = await axios.get(`${API_URL}/auth/me`);
      if (res.data?.success && res.data?.user) {
        setUser(res.data.user);
        writeCachedUser(res.data.user); // keep cache fresh
      }
    } catch (err) {
      console.error('Failed to fetch user', err);
      // Only clear credentials if server explicitly rejected with 401 Unauthorized
      if (err.response && err.response.status === 401) {
        localStorage.removeItem('token');
        writeCachedUser(null);
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
    writeCachedUser(user);
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
    writeCachedUser(user);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setToken(token);
    setUser(user);
    setLoading(false);
    return user;
  };

  const logout = () => {
    localStorage.removeItem('token');
    writeCachedUser(null);
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
    setLoading(false);
  };

  const refreshUser = async () => {
    await fetchUser();
  };

  // Optimistic local update — for avatar/profile changes that don't need a re-fetch
  const updateUserCache = (partial) => {
    setUser(prev => {
      const updated = { ...prev, ...partial };
      writeCachedUser(updated);
      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, initiateRegister, verifyRegistration, logout, refreshUser, updateUserCache }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
