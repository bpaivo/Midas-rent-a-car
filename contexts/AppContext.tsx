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

    // Função de reparo técnico (pode ser chamada manualmente ou automática)
    const repairSession = async () => {
        try {
            // 1. Limpa caches do navegador que não sejam a própria sessão (evita dados corrompidos)
            Object.keys(localStorage).forEach(key => {
                if (!key.includes('midas-auth-token') && !key.includes('supabase.auth')) {
                    localStorage.removeItem(key);
                }
            });

            // 2. Tenta dar um refresh no token sem deslogar
            const { data, error } = await supabase.auth.refreshSession();
            if (error) throw error;
            
            if (data.session) {
                setSession(data.session);
                return true;
            }
        } catch (err) {
            console.error('[AuthContext] Erro ao reparar sessão:', err);
        }
        return false;
    };

    useEffect(() => {
        let mounted = true;

        const initializeAuth = async () => {
            // Timeout de segurança agressivo: 5 segundos para validar acesso
            const safetyTimeout = setTimeout(() => {
                if (mounted && loading) {
                    console.warn('[AuthContext] Timeout de segurança atingido. Liberando interface.');
                    setLoading(false);
                }
            }, 5000);

            try {
                // AUTOMATIZAÇÃO: Sempre tenta reparar/limpar cache no F5
                await repairSession();

                // Recupera a sessão atualizada
                const { data: { session: initialSession }, error } = await supabase.auth.getSession();
                
                if (error) throw error;

                if (mounted) {
                    setSession(initialSession);
                    setLoading(false); 
                    clearTimeout(safetyTimeout);

                    if (initialSession) {
                        // Busca perfil em segundo plano
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
            } catch (err) {
                console.error('[AuthContext] Erro na inicialização:', err);
                if (mounted) {
                    setLoading(false);
                    clearTimeout(safetyTimeout);
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
            logout,
            repairSession
        }}>
            {children}
        </AppContext.Provider>
    );
};