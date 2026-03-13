import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';
import toast from 'react-hot-toast';

export interface AppContextType {
    session: any;
    profile: UserProfile | null;
    isDarkMode: boolean;
    loading: boolean;
    toggleDarkMode: () => void;
    logout: () => Promise<void>;
    repairSession: () => Promise<void>;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<any>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [loading, setLoading] = useState(true);

    const repairSession = async () => {
        try {
            console.log('[AuthContext] Iniciando reparo forçado...');
            // Limpa apenas o que é relacionado ao Supabase para forçar re-autenticação se necessário
            localStorage.removeItem('supabase.auth.token');
            const { data, error } = await supabase.auth.refreshSession();
            if (error) throw error;
            if (data.session) setSession(data.session);
            return true;
        } catch (err) {
            console.error('[AuthContext] Erro no reparo:', err);
            return false;
        }
    };

    useEffect(() => {
        let mounted = true;

        const initializeAuth = async () => {
            try {
                // getUser() é mais seguro que getSession() pois valida com o servidor
                const { data: { user }, error } = await supabase.auth.getUser();
                
                if (error || !user) {
                    if (mounted) {
                        setSession(null);
                        setLoading(false);
                    }
                    return;
                }

                // Se temos usuário, pegamos a sessão atual
                const { data: { session: currentSession } } = await supabase.auth.getSession();

                if (mounted) {
                    setSession(currentSession);
                    setLoading(false);

                    // Busca perfil
                    const { data: profileData } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', user.id)
                        .single();
                    
                    if (mounted && profileData) setProfile(profileData as UserProfile);
                }
            } catch (err) {
                console.error('[AuthContext] Erro na inicialização:', err);
                if (mounted) setLoading(false);
            }
        };

        initializeAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
            if (!mounted) return;
            
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                setSession(currentSession);
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
            logout,
            repairSession
        }}>
            {children}
        </AppContext.Provider>
    );
};