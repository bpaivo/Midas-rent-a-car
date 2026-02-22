
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';

const UsersView: React.FC = () => {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [newEmail, setNewEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching users:', error);
        } else {
            setUsers(data || []);
        }
        setLoading(false);
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreating(true);
        setMessage(null);

        try {
            const { error } = await supabase.rpc('create_user_by_admin', {
                new_email: newEmail,
                new_password: newPassword
            });

            if (error) throw error;

            setMessage({ type: 'success', text: 'Usuário criado com sucesso!' });
            setNewEmail('');
            setNewPassword('');
            fetchUsers();
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Erro ao criar usuário.' });
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-8">
            <div className="flex flex-wrap justify-between items-end gap-4">
                <div className="space-y-1">
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Gerenciar Usuários</h2>
                    <p className="text-slate-500 dark:text-slate-400">Controle quem tem acesso ao sistema administrativo.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Registration Form */}
                <div className="lg:col-span-1">
                    <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-800/30">
                            <h3 className="font-bold text-slate-900 dark:text-white">Novo Usuário</h3>
                        </div>
                        <form className="p-6 space-y-4" onSubmit={handleCreateUser}>
                            {message && (
                                <div className={`p-3 rounded-lg text-xs font-bold flex items-center gap-2 ${message.type === 'success'
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                        : 'bg-rose-50 text-rose-700 border border-rose-100'
                                    }`}>
                                    <span className="material-symbols-outlined text-sm">
                                        {message.type === 'success' ? 'check_circle' : 'error'}
                                    </span>
                                    {message.text}
                                </div>
                            )}
                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Email</label>
                                <input
                                    type="email"
                                    className="w-full rounded-lg border-slate-200 dark:border-slate-700 dark:bg-slate-900 focus:ring-primary focus:border-primary text-sm p-3 dark:text-white"
                                    placeholder="email@midas.com"
                                    required
                                    value={newEmail}
                                    onChange={e => setNewEmail(e.target.value)}
                                    disabled={isCreating}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Senha Provisória</label>
                                <input
                                    type="password"
                                    className="w-full rounded-lg border-slate-200 dark:border-slate-700 dark:bg-slate-900 focus:ring-primary focus:border-primary text-sm p-3 dark:text-white"
                                    placeholder="******"
                                    required
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    disabled={isCreating}
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full py-3 bg-primary text-white rounded-lg font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                disabled={isCreating}
                            >
                                {isCreating ? (
                                    <span className="animate-spin material-symbols-outlined text-lg">progress_activity</span>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-lg">person_add</span>
                                        <span>Criar usuário</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </section>
                </div>

                {/* User List */}
                <div className="lg:col-span-2">
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Email</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nível de Acesso</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Cadastrado em</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={3} className="px-6 py-10 text-center">
                                                <span className="animate-spin material-symbols-outlined text-primary text-3xl">progress_activity</span>
                                            </td>
                                        </tr>
                                    ) : users.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="px-6 py-10 text-center text-slate-400 text-sm italic">Nenhum usuário encontrado.</td>
                                        </tr>
                                    ) : users.map((u) => (
                                        <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`size-8 rounded-full flex items-center justify-center font-bold text-xs ${u.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-primary/10 text-primary'
                                                        }`}>
                                                        {u.email[0].toUpperCase()}
                                                    </div>
                                                    <span className="text-sm font-semibold text-slate-900 dark:text-white">{u.email}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${u.role === 'admin'
                                                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                                        : 'bg-slate-100 text-slate-800 border border-slate-200'
                                                    }`}>
                                                    {u.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400">
                                                {new Date(u.created_at).toLocaleDateString('pt-BR')} {new Date(u.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UsersView;
