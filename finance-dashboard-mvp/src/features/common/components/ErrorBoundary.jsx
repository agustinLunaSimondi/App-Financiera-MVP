import React from 'react';
import { Layout } from './Layout';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-zinc-50 dark:bg-black flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 max-w-md w-full shadow-2xl text-center">
                        <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle className="w-8 h-8 text-rose-500" />
                        </div>
                        <h1 className="text-2xl font-black text-zinc-900 dark:text-white mb-2">
                            Algo salió mal
                        </h1>
                        <p className="text-zinc-500 dark:text-zinc-400 mb-8">
                            Ha ocurrido un error inesperado. Por favor, intentá recargar la página via tu cuenta.
                        </p>
                        <div className="bg-zinc-100 dark:bg-zinc-800 p-4 rounded-xl text-left mb-8 overflow-auto max-h-32">
                            <code className="text-xs font-mono text-rose-500">
                                {this.state.error?.toString()}
                            </code>
                        </div>
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Recargar Aplicación
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
