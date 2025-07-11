'use client';

import type { ReactNode } from 'react';
import { createContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { pb } from '@/lib/pocketbase';
import type { RecordModel, Admin } from 'pocketbase';
import { useToast } from '@/hooks/use-toast';

// Define the shape of the user object
export type User = RecordModel | Admin | null;

// Define the shape of the context
export interface AuthContextType {
  user: User;
  token: string;
  loading: boolean;
  login: (email: string, pass: string) => Promise<any>;
  logout: () => void;
  register: (data: any) => Promise<any>;
  refreshUser: () => Promise<void>;
}

// Create the context
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Create the provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [token, setToken] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  const logout = useCallback(() => {
    pb.authStore.clear();
    router.push('/');
  }, [router]);

  const refreshUser = useCallback(async () => {
    if (!pb.authStore.isValid) return;
    try {
      await pb.collection('pdg_users').authRefresh({
        expand: 'church',
      });
    } catch (error) {
      console.error("Impossibile aggiornare l'utente, logout in corso:", error);
      // The token is probably invalid, so log out.
      logout();
    }
  }, [logout]);

  useEffect(() => {
    // 1. Set initial state from whatever is in the store.
    setUser(pb.authStore.model);
    setToken(pb.authStore.token);

    // 2. Subscribe to any FUTURE changes.
    const unsubscribe = pb.authStore.onChange((newToken, newUser) => {
      setToken(newToken);
      setUser(newUser);
    });

    // 3. If we have a valid token, refresh it to get latest data + expands.
    //    The result of this will be caught by the onChange subscription.
    //    If we don't have a valid token, we're done loading.
    if (pb.authStore.isValid) {
      refreshUser().finally(() => {
        setLoading(false);
      });
    } else {
      setLoading(false);
    }

    return () => {
      unsubscribe();
    };
    // We only want this to run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (email: string, pass: string) => {
    setLoading(true);
    try {
      const authData = await pb.collection('pdg_users').authWithPassword(email, pass, {
          expand: 'church',
      });
      toast({ title: "Successo", description: "Login effettuato con successo." });
      router.push('/dashboard');
      return authData;
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Login Fallito', description: "Credenziali non valide." });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [router, toast]);

  const register = useCallback(async (data: any) => {
    setLoading(true);
    try {
      const username = data.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') + Date.now().toString().slice(-4);
      
      const createData = {
          username,
          email: data.email,
          emailVisibility: true,
          password: data.password,
          passwordConfirm: data.passwordConfirm,
          name: data.name,
          church: data.church || [],
          role: 'volontario',
      };
      
      const newUser = await pb.collection('pdg_users').create(createData);

      const avatarResponse = await fetch('https://placehold.co/200x200.png');
      const avatarBlob = await avatarResponse.blob();
      const avatarFormData = new FormData();
      avatarFormData.append('avatar', avatarBlob, `${username}_avatar.png`);
      await pb.collection('pdg_users').update(newUser.id, avatarFormData);
      
      await login(data.email, data.password);
      return newUser;
    } catch (error: any) {
      let errorMessage = "Controlla i dati inseriti e riprova.";
      if (error && typeof error === 'object' && 'data' in error && (error as any).data?.data) {
        const errorData = (error as any).data.data;
        const firstErrorKey = Object.keys(errorData)[0];
        if (firstErrorKey && errorData[firstErrorKey].message) {
            errorMessage = errorData[firstErrorKey].message;
        }
      }
      toast({ variant: 'destructive', title: 'Registrazione Fallita', description: errorMessage });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [login, toast]);


  const value: AuthContextType = {
    user,
    token,
    loading,
    login,
    logout,
    register,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
