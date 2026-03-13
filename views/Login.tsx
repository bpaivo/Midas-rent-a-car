import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      onLogin();
    } catch (err: any) {
      setError(err.message || 'Erro ao realizar login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen flex items-center justify-center p-4 transition-colors relative">
      {/* Botão Voltar */}
      <button 
        onClick={() => navigate('/')}
        className="absolute top-8 left-8 flex items-center gap-2 text-primary/60 dark:text-white/60 hover:text-primary dark:hover:text-white font-bold text-sm transition-colors group"
      >
        <span className="material-symbols-outlined group-hover:-translate-x-1 transition-transform">arrow_back</span>
        Voltar para o Site
      </button>

      <div className="w-full max-w-[480px] flex flex-col items-center">
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center shadow-lg mb-2">
            <span className="material-symbols-outlined text-white text-4xl">car_rental</span>
          </div>
          <h2 className="text-primary dark:text-white text-2xl font-bold tracking-tight">Midas Rent a Car</h2>
          <p className="text-primary/60 dark:text-white/60 text-sm font-medium">Sistema Administrativo</p>
        </div>

        <div className="w-full bg-white dark:bg-[#1a2e2f] rounded-xl shadow-xl border border-primary/5 p-8 sm:p-10 transition-all">
          <h1 className="text-primary dark:text-white text-xl font-bold leading-tight tracking-[-0.015em] text-center pb-8">
            Acesse sua conta
          </h1>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 p-3 rounded-lg flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
                <span className="material-symbols-outlined text-lg">error</span>
                {error}
              </div>
            )}
            <div className="flex flex-col gap-2">
              <label className="flex flex-col w-full">
                <p className="text-primary dark:text-white text-sm font-semibold leading-normal pb-1">Email Corporativo</p>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-primary/40 text-xl">mail</span>
                  <input
                    className="form-input flex w-full rounded-lg text-primary dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/20 border border-primary/10 bg-background-light dark:bg-background-dark/50 focus:border-primary h-12 placeholder:text-primary/40 pl-12 pr-4 text-base font-normal leading-normal"
                    placeholder="exemplo@midas.com"
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </label>
            </div>

            <div className="flex flex-col gap-2">
              <label className="flex flex-col w-full">
                <div className="flex justify-between items-center pb-1">
                  <p className="text-primary dark:text-white text-sm font-semibold leading-normal">Senha</p>
                </div>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-primary/40 text-xl">lock</span>
                  <input
                    className="form-input flex w-full rounded-lg text-primary dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/20 border border-primary/10 bg-background-light dark:bg-background-dark/50 focus:border-primary h-12 placeholder:text-primary/40 pl-12 pr-4 text-base font-normal leading-normal"
                    placeholder="Digite sua senha"
                    required
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </label>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input className="rounded border-primary/20 text-primary focus:ring-primary/30 w-4 h-4" type="checkbox" disabled={loading} />
                <span className="text-sm text-primary/70 dark:text-white/70 group-hover:text-primary transition-colors">Lembrar de mim</span>
              </label>
              <button type="button" className="text-primary dark:text-primary/40 text-sm font-medium hover:underline" disabled={loading}>Esqueci minha senha</button>
            </div>

            <div className="pt-4">
              <button
                className={`w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 px-6 rounded-lg transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  <span className="animate-spin material-symbols-outlined text-xl">progress_activity</span>
                ) : (
                  <>
                    <span>Entrar no sistema</span>
                    <span className="material-symbols-outlined text-xl">login</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        <footer className="mt-12 flex flex-col items-center gap-4 text-primary/40 dark:text-white/30">
          <div className="flex gap-6 text-xs font-medium uppercase tracking-widest">
            <button className="hover:text-primary dark:hover:text-white transition-colors">Suporte</button>
            <button className="hover:text-primary dark:hover:text-white transition-colors">Políticas</button>
            <button className="hover:text-primary dark:hover:text-white transition-colors">Termos</button>
          </div>
          <p className="text-xs">© 2024 Midas Rent a Car. v2.4.0</p>
        </footer>
      </div>
    </div>
  );
};

export default Login;