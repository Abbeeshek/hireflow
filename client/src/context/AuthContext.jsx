import React, { createContext, useContext, useState, useEffect } from 'react';
import { getMe, login as apiLogin, register as apiRegister, logout as apiLogout } from '../api/authApi.js';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await getMe();
        if (response.success && response.data?.user) {
          setUser(response.data.user);
        }
      } catch (err) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentUser();
  }, []);

  const login = async (credentials) => {
    try {
      const response = await apiLogin(credentials);
      if (response.success && response.data?.user) {
        setUser(response.data.user);
        toast.success(`Welcome back, ${response.data.user.name}!`);
        return response.data.user;
      }
    } catch (err) {
      toast.error(err.message || 'Login failed');
      throw err;
    }
  };

  const register = async (userData) => {
    try {
      const response = await apiRegister(userData);
      if (response.success && response.data?.user) {
        setUser(response.data.user);
        toast.success(`Account created! Welcome to HireFlow, ${response.data.user.name}!`);
        return response.data.user;
      }
    } catch (err) {
      toast.error(err.message || 'Registration failed');
      throw err;
    }
  };

  const logout = async () => {
    try {
      await apiLogout();
      setUser(null);
      toast.success('Signed out successfully');
    } catch (err) {
      setUser(null);
    }
  };

  const value = {
    user,
    setUser,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    isCandidate: user?.role === 'candidate',
    isRecruiter: user?.role === 'recruiter',
    isAdmin: user?.role === 'admin'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
