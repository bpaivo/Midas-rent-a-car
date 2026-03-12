import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';
import toast from 'react-hot-toast';

interface AppContextType {
    session: any;
    profile: UserProfile | null;
    isDarkMode: boolean;
    loading: boolean;
    toggleDarkMode: () => void;
    logout: () => Promise<void>;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<any>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        const initializeAuth = async () => {
            try {
                // 1. Tenta recuperar a sessão existente de forma segura
                const { data: { session: initialSession }, error } = await supabase.auth.getSession();
                
                if (error) throw error;

                if (mounted) {
                    setSession(initialSession);
                    if (initialSession) {
                        const { data: profileData } = await supabase
                            .from('profiles')
                            .select('*')
                            .eq('id', initialSession.user.id)
                            .single();
                        
                        if (profileData) setProfile(profileData as UserProfile);
                    }
                }
            } catch (err) {
                console.error('[AuthContext] Erro na inicialização:', err);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        initializeAuth();

        // 2. Escuta mudanças de estado (Login/Logout/Refresh)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
            if (!mounted) return;

            setSession(currentSession);
            
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                const { data } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', currentSession?.user.id)
                    .single();
                if (data) setProfile(data as UserProfile);
            } else if (event === 'SIGNED_OUT') {
                setProfile(null);
                setSession(null);
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    useEffect(() => {
        const html = document.documentElement;
        if (isDarkMode) {
            html.classList.add('dark');
        } else {
            html.classList.remove('dark');
        }
    }, [isDarkMode]);

    const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

    const logout = async () => {
        try {
            await supabase.auth.signOut();
            setSession(null);
            setProfile(null);
            toast.success('Sessão encerrada');
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    return (
        <AppContext.Provider value={{
            session,
            profile,
            isDarkMode,
            loading,
            toggleDarkMode,
            logout
        }}>
            {children}
        </AppContext.Provider>
    );
};