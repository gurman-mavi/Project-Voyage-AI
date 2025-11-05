import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for existing token on mount
    const token = localStorage.getItem('auth_token');
    if (token) {
      fetchUser(token);
    } else {
      setLoading(false);
    }
  }, []);

  async function fetchUser(token) {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        localStorage.removeItem('auth_token');
      }
    } catch (err) {
      console.error('Auth check failed:', err);
      localStorage.removeItem('auth_token');
    } finally {
      setLoading(false);
    }
  }

  async function login(email, password) {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({ message: 'Login failed' }));
        throw new Error(data.message || 'Login failed');
      }
      
      const data = await res.json();
      localStorage.setItem('auth_token', data.token);
      setUser(data.user);
      return data.user;
    } catch (err) {
      console.error('Login error:', err);
      if (err.message === 'Failed to fetch') {
        throw new Error('Cannot connect to server. Please make sure the backend is running on port 5050.');
      }
      throw err;
    }
  }

  async function register(name, email, password) {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({ message: 'Registration failed' }));
        throw new Error(data.message || 'Registration failed');
      }
      
      const data = await res.json();
      localStorage.setItem('auth_token', data.token);
      setUser(data.user);
      return data.user;
    } catch (err) {
      console.error('Register error:', err);
      if (err.message === 'Failed to fetch') {
        throw new Error('Cannot connect to server. Please make sure the backend is running on port 5050.');
      }
      throw err;
    }
  }

  function logout() {
    localStorage.removeItem('auth_token');
    setUser(null);
    navigate('/login');
  }

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
