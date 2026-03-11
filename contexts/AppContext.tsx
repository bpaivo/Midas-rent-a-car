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
        // Timeout de segurança: se em 5 segundos não carregar, libera a tela
        const safetyTimeout = setTimeout(() => {
            if (loading) {
                console.warn('[AppContext] Carregamento demorou demais. Liberando interface por segurança.');
                setLoading(false);
            }
        }, 5000);

        const getInitialSession = async () => {
            try {
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                
                if (sessionError) throw sessionError;
                
                setSession(session);

                if (session) {
                    const { data, error: profileError } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', session.user.id)
                        .single();

                    if (!profileError && data) {
                        setProfile(data as UserProfile);
                    }
                }
            } catch (err) {
                console.error('[AppContext] Erro na inicialização:', err);
            } finally {
                clearTimeout(safetyTimeout);
                setLoading(false);
            }
        };

        getInitialSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
            setSession(currentSession);

            if (currentSession) {
                try {
                    const { data } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', currentSession.user.id)
                        .single();

                    if (data) setProfile(data as UserProfile);
                } catch (err) {
                    console.error('[AppContext] Erro ao atualizar perfil:', err);
                }
            } else {
                setProfile(null);
            }
        });

        return () => {
            clearTimeout(safetyTimeout);
            subscription.unsubscribe();
        };
    }, []);

    useEffect(() => {
        const html = document.documentElement;
        if (isDarkMode) {
            html.classList.add('dark');
            html.classList.remove('light');
        } else {
            html.classList.add('light');
            html.classList.remove('dark');
        }
    }, [isDarkMode]);

    const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

    const logout = async () => {
        try {
            const logoutPromise = supabase.auth.signOut();
            toast.promise(logoutPromise, {
                loading: 'Saindo...',
                success: 'Até logo!',
                error: 'Erro ao sair, tente novamente.'
            });
            await logoutPromise;
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            setSession(null);
            setProfile(null);
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

export type { AppContextType };