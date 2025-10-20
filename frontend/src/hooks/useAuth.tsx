import { useEffect, useState } from "react";
import { useMutation, useQuery } from '@apollo/client';
import { SIGNUP_MUTATION, LOGIN_MUTATION, GET_ME_QUERY } from '../graphql/queries';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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
    } else if (meError) {
      // Token is invalid, clear it
      localStorage.removeItem('access_token');
      setUser(null);
    }
    setLoading(false);
  }, [meData, meError]);

  // Signup mutation
  const [signupMutation, { data: signupData, error: signupError }] = useMutation(SIGNUP_MUTATION);

  // Handle signup results
  useEffect(() => {
    if (signupData?.signup) {
      localStorage.setItem('access_token', signupData.signup.accessToken);
      refetchMe();
    }
    if (signupError) {
      console.error('Signup error:', signupError);
    }
  }, [signupData, signupError, refetchMe]);

  // Login mutation
  const [loginMutation, { data: loginData, error: loginError }] = useMutation(LOGIN_MUTATION);

  // Handle login results
  useEffect(() => {
    if (loginData?.login) {
      localStorage.setItem('access_token', loginData.login.accessToken);
      refetchMe();
    }
    if (loginError) {
      console.error('Login error:', loginError);
    }
  }, [loginData, loginError, refetchMe]);

  const signup = async (email: string, password: string, fullName?: string) => {
    try {
      await signupMutation({
        variables: {
          userData: {
            email,
            password,
            fullName
          }
        }
      });
    } catch (error) {
      throw error;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      await loginMutation({
        variables: {
          credentials: {
            email,
            password
          }
        }
      });
    } catch (error) {
      throw error;
    }
  };

  const signOut = async () => {
    localStorage.removeItem('access_token');
    setUser(null);
    // Clear Apollo cache
    window.location.reload();
  };

  return { 
    user, 
    loading: loading || meLoading, 
    signup, 
    login, 
    signOut 
  };
};
