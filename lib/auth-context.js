'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { isPlaceholderConfig } from '@/lib/supabase';

const AuthContext = createContext(undefined);

async function readJson(response, fallbackMessage) {
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.ok === false) {
    throw new Error(payload.message || fallbackMessage);
  }

  return payload;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      if (isPlaceholderConfig()) {
        setUser({ id: 'demo-user', email: 'demo@example.com', full_name: 'Demo User', role: 'user' });
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/auth/session', {
          credentials: 'include',
          cache: 'no-store'
        });
        const payload = await readJson(response, '读取登录状态失败');

        if (mounted) {
          setUser(payload.user ?? null);
        }
      } catch (error) {
        console.error('Failed to load user session', error);
        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadSession();

    return () => {
      mounted = false;
    };
  }, []);

  const signIn = async (email, password) => {
    if (isPlaceholderConfig()) {
      const demoUser = { id: 'demo-user', email, full_name: 'Demo User', role: 'user' };
      setUser(demoUser);
      return { data: { user: demoUser }, error: null };
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });
      const payload = await readJson(response, '登录失败');

      setUser(payload.user);
      return { data: payload, error: null };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('登录失败')
      };
    }
  };

  const signUp = async (email, password, fullName) => {
    if (isPlaceholderConfig()) {
      const demoUser = { id: 'demo-user', email, full_name: fullName || 'Demo User', role: 'user' };
      setUser(demoUser);
      return { data: { user: demoUser }, error: null };
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ email, password, fullName })
      });
      const payload = await readJson(response, '注册失败');

      setUser(payload.user);
      return { data: payload, error: null };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('注册失败')
      };
    }
  };

  const signOut = async () => {
    if (isPlaceholderConfig()) {
      setUser(null);
      return { error: null };
    }

    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      await readJson(response, '退出登录失败');
      setUser(null);
      return { error: null };
    } catch (error) {
      return {
        error: error instanceof Error ? error : new Error('退出登录失败')
      };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        signOut
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
