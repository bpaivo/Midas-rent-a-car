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
        const getInitialSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);

            if (session) {
                const { data } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();

                if (data) setProfile(data as UserProfile);
            }

            setLoading(false);
        };

        getInitialSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
            console.log(`[AppContext] Auth Event: ${event}`, { hasSession: !!currentSession });
            setSession(currentSession);

            if (currentSession) {
                console.log('[AppContext] Buscando perfil do usuário...');
                try {
                    const { data, error } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', currentSession.user.id)
                        .single();

                    if (error) {
                        console.error('[AppContext] Erro ao buscar perfil:', error);
                    } else if (data) {
                        console.log('[AppContext] Perfil carregado com sucesso.');
                        setProfile(data as UserProfile);
                    }
                } catch (err) {
                    console.error('[AppContext] Exceção ao buscar perfil:', err);
                }
            } else {
                setProfile(null);
            }
        });

        return () => subscription.unsubscribe();
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
            // Explicitly clear state to ensure UI updates even if signOut has issues
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
