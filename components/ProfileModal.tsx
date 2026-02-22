import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface ProfileModalProps {
    userProfile: UserProfile | null;
    onClose: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ userProfile, onClose }) => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'USER_UPDATED') {
                console.log('[ProfileModal] Evento USER_UPDATED detectado! (Fallback acionado)');
                // Se o evento disparou e ainda estamos marcados como "atualizando",
                // significa que a promessa travou mas o servidor processou.
                setIsUpdating(prev => {
                    if (prev) {
                        toast.success('Senha atualizada (confirmado via evento)!');
                        setNewPassword('');
                        setConfirmPassword('');
                        setTimeout(() => onClose(), 1500);
                        return false;
                    }
                    return prev;
                });
            }
        });
        return () => subscription.unsubscribe();
    }, [onClose]);

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            toast.error('As senhas não coincidem!');
            return;
        }

        if (newPassword.length < 6) {
            toast.error('A senha deve ter pelo menos 6 caracteres.');
            return;
        }

        setIsUpdating(true);
        const loadingToast = toast.loading('Atualizando sua senha...');

        // Safety timeout: 15 seconds
        const safetyTimeout = setTimeout(() => {
            console.warn('[ProfileModal] Timeout de segurança atingido. A promessa do SDK não retornou.');
            setIsUpdating(false);
            toast.error('A atualização está demorando muito. Verifique sua conexão ou tente novamente.', { id: loadingToast });
        }, 15000);

        try {
            console.log('[ProfileModal] Chamando supabase.auth.updateUser...');

            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            clearTimeout(safetyTimeout);

            if (error) {
                console.error('[ProfileModal] Supabase retornou erro:', error);
                throw error;
            }

            console.log('[ProfileModal] Sucesso recebido do SDK.');
            toast.success('Senha atualizada com sucesso!', { id: loadingToast });
            setNewPassword('');
            setConfirmPassword('');

            setTimeout(() => onClose(), 1500);

        } catch (error: any) {
            console.error('[ProfileModal] Erro capturado:', error);
            clearTimeout(safetyTimeout);
            toast.error('Erro ao alterar senha: ' + (error.message || 'Falha na comunicação'), { id: loadingToast });
        } finally {
            // Em caso de sucesso ou erro (antes do timeout), resetamos aqui
            // Se o timeout já disparou, setIsUpdating já será false.
            setIsUpdating(prev => {
                if (prev) {
                    console.log('[ProfileModal] Resetando isUpdating no finally.');
                    return false;
                }
                return false;
            });
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200 overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Meu Perfil</h2>
                        <p className="text-sm text-slate-500 font-medium">Informações da sua conta</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-400">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="p-8 space-y-8">
                    {/* User Info */}
                    <div className="flex items-center gap-4">
                        <div
                            className="size-16 rounded-full bg-cover bg-center border-2 border-primary/20 bg-primary/10 flex items-center justify-center overflow-hidden"
                            style={userProfile?.avatar_url ? { backgroundImage: `url("${userProfile.avatar_url}")` } : {}}
                        >
                            {!userProfile?.avatar_url && <span className="material-symbols-outlined text-primary text-3xl">person</span>}
                        </div>
                        <div>
                            <p className="text-lg font-bold text-slate-900 dark:text-white uppercase truncate">
                                {userProfile?.full_name || userProfile?.email?.split('@')[0] || 'Usuário'}
                            </p>
                            <p className="text-sm text-slate-500 truncate">{userProfile?.email}</p>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary border border-primary/20 mt-1">
                                {userProfile?.role === 'admin' ? 'Gerente Geral' : 'Operador'}
                            </span>
                        </div>
                    </div>

                    <div className="h-px bg-slate-100 dark:bg-slate-800"></div>

                    {/* Change Password Form */}
                    <form onSubmit={handleUpdatePassword} className="space-y-4">
                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Alterar Senha</h3>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Nova Senha</label>
                            <input
                                type="password"
                                required
                                className="w-full h-11 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl px-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all dark:text-white"
                                placeholder="******"
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Confirmar Nova Senha</label>
                            <input
                                type="password"
                                required
                                className="w-full h-11 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl px-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all dark:text-white"
                                placeholder="******"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isUpdating}
                            className="w-full py-3 bg-primary text-white rounded-xl font-bold text-sm hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isUpdating ? (
                                <span className="animate-spin material-symbols-outlined text-lg">progress_activity</span>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-lg">lock_reset</span>
                                    <span>Atualizar Senha</span>
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ProfileModal;
