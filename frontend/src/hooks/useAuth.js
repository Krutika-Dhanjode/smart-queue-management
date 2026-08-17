import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      connectSocket(JSON.parse(savedUser).id);
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const response = await authAPI.login({ email, password });
    const { token, user: userData, emailVerified } = response.data;

    if (!emailVerified) {
      return { emailVerified: false, userId: response.data.userId };
    }

    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    connectSocket(userData.id);
    return { emailVerified: true, role: userData.role };
  };

  const register = async (data) => {
    const response = await authAPI.register(data);
    return response.data;
  };

  const registerAdmin = async (data) => {
    const response = await authAPI.registerAdmin(data);
    return response.data;
  };

  const verifyOTP = async (userId, otp) => {
    const response = await authAPI.verifyOTP({ userId, otp });
    const { token, user: userData } = response.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    connectSocket(userData.id);
    return response.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    disconnectSocket();
    authAPI.logout();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, registerAdmin, verifyOTP, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
