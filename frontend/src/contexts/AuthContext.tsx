import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useMutation, useQuery, useApolloClient } from '@apollo/client';
import { SIGNUP_MUTATION, LOGIN_MUTATION, GET_ME_QUERY } from '../graphql/queries';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  createdAt: string;
  updatedAt: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signup: (email: string, password: string, fullName?: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const client = useApolloClient();

  // Helper function to update user state
  const updateUserState = useCallback((userData: User | null) => {
    console.log('AuthProvider updating user state:', userData);
    setUser(userData);
    setLoading(false);
    console.log('AuthProvider state updated - user:', userData, 'loading: false');
  }, []);

  // Get current user using GraphQL
  const { data: meData, loading: meLoading, error: meError, refetch: refetchMe } = useQuery(GET_ME_QUERY, {
    variables: {
      token: localStorage.getItem('access_token') || ""
    },
    skip: !localStorage.getItem('access_token'),
    errorPolicy: 'ignore', // Ignore errors to prevent Apollo from throwing
  });

  // Handle me query results
  useEffect(() => {
    if (meData?.me) {
      setUser(meData.me);
      setLoading(false);
    } else if (meError) {
      // Token is invalid, clear it
      localStorage.removeItem('access_token');
      setUser(null);
      setLoading(false);
    }
    // Don't set loading to false if we're still loading the me query
  }, [meData, meError]);

  // Handle case where there's no token (query is skipped)
  useEffect(() => {
    if (!localStorage.getItem('access_token') && !meLoading) {
      setUser(null);
      setLoading(false);
    }
  }, [meLoading]);

  // Signup mutation
  const [signupMutation, { data: signupData, error: signupError }] = useMutation(SIGNUP_MUTATION);

  // Handle signup results
  useEffect(() => {
    if (signupData?.signup) {
      localStorage.setItem('access_token', signupData.signup.accessToken);
      // Immediately update UI with user data from signup response
      const userData = {
        id: signupData.signup.user.id,
        email: signupData.signup.user.email,
        full_name: signupData.signup.user.fullName,
        avatar_url: signupData.signup.user.avatarUrl,
        createdAt: signupData.signup.user.createdAt,
        updatedAt: signupData.signup.user.updatedAt
      };
      console.log('AuthProvider setting user data from signup:', userData);
      updateUserState(userData);
      
      // Refetch the me query to ensure cache consistency
      refetchMe();
    }
    if (signupError) {
      console.error('Signup error:', signupError);
    }
  }, [signupData, signupError, refetchMe, updateUserState]);

  // Login mutation
  const [loginMutation, { data: loginData, error: loginError }] = useMutation(LOGIN_MUTATION);

  // Handle login results
  useEffect(() => {
    if (loginData?.login) {
      localStorage.setItem('access_token', loginData.login.accessToken);
      // Immediately update UI with user data from login response
      const userData = {
        id: loginData.login.user.id,
        email: loginData.login.user.email,
        full_name: loginData.login.user.fullName,
        avatar_url: loginData.login.user.avatarUrl,
        createdAt: loginData.login.user.createdAt,
        updatedAt: loginData.login.user.updatedAt
      };
      console.log('AuthProvider setting user data from login:', userData);
      updateUserState(userData);
      
      // Refetch the me query to ensure cache consistency
      refetchMe();
    }
    if (loginError) {
      console.error('Login error:', loginError);
    }
  }, [loginData, loginError, refetchMe, updateUserState]);

  const signup = async (email: string, password: string, fullName?: string) => {
    await signupMutation({
      variables: {
        userData: {
          email,
          password,
          fullName
        }
      }
    });
  };

  const login = async (email: string, password: string) => {
    await loginMutation({
      variables: {
        credentials: {
          email,
          password
        }
      }
    });
  };

  const signOut = useCallback(async () => {
    // Remove token first to prevent any further authenticated requests
    localStorage.removeItem('access_token');
    // Clear Apollo cache completely
    await client.clearStore();
    // Update user state to null, triggering component re-renders
    updateUserState(null);
  }, [client, updateUserState]);

  const loadingState = loading || (meLoading && !user && localStorage.getItem('access_token'));
  console.log('AuthProvider returning - user:', user?.id || 'null', 'loading:', loadingState);

  const value = {
    user,
    loading: loadingState,
    signup,
    login,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
