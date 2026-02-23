import * as React from 'react';

interface Props {
    children: React.ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null
        };
    }

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-w-md w-full">
                        <span className="material-symbols-outlined text-6xl text-rose-500 mb-4 animate-bounce">error_meditation</span>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Ops! Algo deu errado.</h1>
                        <p className="text-slate-500 dark:text-slate-400 mb-6 font-medium">
                            Ocorreu um erro inesperado no sistema. Recarregue a página ou entre em contato com o suporte.
                        </p>
                        <div className="bg-rose-50 dark:bg-rose-900/10 p-4 rounded-lg text-left mb-6 overflow-x-auto">
                            <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                                Detalhes do erro foram registrados no console do navegador para análise técnica.
                            </p>
                        </div>
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full py-3 bg-primary text-white rounded-xl font-bold hover:brightness-110 transition-all flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined">refresh</span>
                            Recarregar Sistema
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
