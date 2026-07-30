import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types';

interface AuthContextType {
  user: UserProfile;
  loginWithGoogle: () => void;
  logout: () => void;
  updateProfile: (updated: Partial<UserProfile>) => void;
}

const DEFAULT_PROFILE: UserProfile = {
  uid: 'user-ezequiel-1212',
  displayName: 'Ezequiel Luis Lucca',
  email: 'ezequiellucca1212@gmail.com',
  photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  businessName: 'Distribuidora Central',
  whatsappNumber: '+5491155554321',
  defaultMinStock: 5,
  defaultExpirationAlertDays: 7,
  currency: '$',
  totemAnimal: 'Jaguar',
  isLoggedIn: true
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'stock_control_user_profile';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load user profile from storage', e);
    }
    return DEFAULT_PROFILE;
  });

  useEffect(() => {
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } catch (e) {
      console.error('Failed to save user profile to storage', e);
    }
  }, [user]);

  const loginWithGoogle = () => {
    // Simulate seamless Google Login with full profile verification
    setUser(prev => ({
      ...prev,
      isLoggedIn: true,
      displayName: prev.displayName || 'Ezequiel Luis Lucca',
      email: prev.email || 'ezequiellucca1212@gmail.com'
    }));
  };

  const logout = () => {
    setUser(prev => ({
      ...prev,
      isLoggedIn: false
    }));
  };

  const updateProfile = (updated: Partial<UserProfile>) => {
    setUser(prev => ({ ...prev, ...updated }));
  };

  return (
    <AuthContext.Provider value={{ user, loginWithGoogle, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
