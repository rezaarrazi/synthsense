import { useEffect, useState } from "react";
import { useMutation, useQuery } from '@apollo/client';
import { SIGNUP_MUTATION, LOGIN_MUTATION, GET_ME_QUERY } from '../graphql/queries';

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

  // Get current user
  const { data: meData, loading: meLoading, refetch: refetchMe } = useQuery(GET_ME_QUERY, {
    skip: !localStorage.getItem('access_token'),
    onCompleted: (data) => {
      if (data.me) {
        setUser(data.me);
      }
      setLoading(false);
    },
    onError: () => {
      // Token is invalid, clear it
      localStorage.removeItem('access_token');
      setUser(null);
      setLoading(false);
    }
  });

  // Signup mutation
  const [signupMutation] = useMutation(SIGNUP_MUTATION, {
    onCompleted: (data) => {
      localStorage.setItem('access_token', data.signup.accessToken);
      refetchMe();
    },
    onError: (error) => {
      console.error('Signup error:', error);
    }
  });

  // Login mutation
  const [loginMutation] = useMutation(LOGIN_MUTATION, {
    onCompleted: (data) => {
      localStorage.setItem('access_token', data.login.accessToken);
      refetchMe();
    },
    onError: (error) => {
      console.error('Login error:', error);
    }
  });

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
