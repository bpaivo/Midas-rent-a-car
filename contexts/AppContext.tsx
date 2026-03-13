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
                // 1. Recupera a sessão 

                const sessionPromise = supabase.auth.getSession();
                
                let timeoutId: NodeJS.Timeout;
                const timeoutPromise = new Promise((_, reject) => {
                    timeoutId = setTimeout(() => reject(new Error('Auth Timeout')), 4000);
                });
                
                const { data: { session: initialSession }, error } = await Promise.race([sessionPromise, timeoutPromise]) as any;
                clearTimeout(timeoutId!);
                
                if (error) throw error;

                if (mounted) {
                    setSession(initialSession);
                    // LIBERA A TELA IMEDIATAMENTE se houver sessão ou se não houver
                    setLoading(false); 

                    // 2. Busca o perfil em segundo plano (não trava a tela)
                    if (initialSession) {
                        supabase
                            .from('profiles')
                            .select('*')
                            .eq('id', initialSession.user.id)
                            .single()
                            .then(({ data }) => {
                                if (mounted && data) setProfile(data as UserProfile);
                            });
                    }
                }
            } catch (err: any) {
                console.error('[AuthContext] Erro na inicialização:', err);
                
                if (err.message !== 'Auth Timeout') {
                    await supabase.auth.signOut().catch(console.error);
                }
                
                if (mounted) {
                    setSession(null);
                    setProfile(null);
                    setLoading(false);
                }
            }
        };

        initializeAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
            if (!mounted) return;

            setSession(currentSession);
            
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                if (currentSession) {
                    const { data } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', currentSession.user.id)
                        .single();
                    if (data) setProfile(data as UserProfile);
                }
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