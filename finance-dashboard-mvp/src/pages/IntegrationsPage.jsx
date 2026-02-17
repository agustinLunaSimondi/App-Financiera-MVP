import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { Layout } from '../features/common/components/Layout';
import { Card } from '../features/common/components/Card';
import { cn } from '../lib/utils';
import {
    Link2, Unlink, RefreshCw, Check, AlertCircle, Clock,
    CreditCard, ArrowRight, Loader2, ExternalLink, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as api from '../services/api';

export function IntegrationsPage() {
    const [searchParams] = useSearchParams();
    const location = useLocation();

    const [mpStatus, setMpStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [syncResult, setSyncResult] = useState(null);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    const loadStatus = useCallback(async () => {
        try {
            setLoading(true);
            const status = await api.getMercadoPagoStatus();
            setMpStatus(status);
        } catch (err) {
            console.error('Error loading MP status:', err);
            setMpStatus({ connected: false });
        } finally {
            setLoading(false);
        }
    }, []);

    // Manejo del callback de OAuth
    useEffect(() => {
        const code = searchParams.get('code');
        if (code) {
            handleOAuthCallback(code);
        }
    }, [searchParams]);

    useEffect(() => {
        loadStatus();
    }, [loadStatus]);

    const handleOAuthCallback = async (code) => {
        setConnecting(true);
        setError(null);
        try {
            const result = await api.handleMercadoPagoCallback(code);
            setMpStatus(result);
            setSuccessMessage('¡Cuenta de Mercado Pago conectada exitosamente!');
            // Limpiar code de la URL
            window.history.replaceState({}, '', '/integrations');
            setTimeout(() => setSuccessMessage(null), 5000);
        } catch (err) {
            setError(err.response?.data?.detail || 'Error al conectar con Mercado Pago');
        } finally {
            setConnecting(false);
        }
    };

    const handleConnect = async () => {
        setError(null);
        try {
            const authUrl = await api.getMercadoPagoAuthUrl();
            window.location.href = authUrl;
        } catch (err) {
            setError(err.response?.data?.detail || 'Error al obtener URL de autorización. Verificá las variables de entorno MP_CLIENT_ID y MP_CLIENT_SECRET.');
        }
    };

    const handleSync = async () => {
        setSyncing(true);
        setSyncResult(null);
        setError(null);
        try {
            const result = await api.syncMercadoPago();
            setSyncResult(result);
            setTimeout(() => setSyncResult(null), 8000);
        } catch (err) {
            setError(err.response?.data?.detail || 'Error al sincronizar');
        } finally {
            setSyncing(false);
        }
    };

    const handleDisconnect = async () => {
        if (!window.confirm('¿Estás seguro de desconectar tu cuenta de Mercado Pago? Las transacciones ya importadas se mantienen.')) return;
        setError(null);
        try {
            await api.disconnectMercadoPago();
            setMpStatus({ connected: false });
            setSuccessMessage('Cuenta desconectada.');
            setTimeout(() => setSuccessMessage(null), 4000);
        } catch (err) {
            setError(err.response?.data?.detail || 'Error al desconectar');
        }
    };

    return (
        <Layout>
            <div className="space-y-10">
                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-sky-500/10 rounded-lg">
                                <Zap className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                            </div>
                            <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Conexiones</h2>
                        </div>
                        <h1 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tight">Integraciones</h1>
                        <p className="text-zinc-500 dark:text-zinc-400 font-medium mt-2">
                            Conectá tus servicios financieros para importar transacciones automáticamente.
                        </p>
                    </div>
                </header>

                {/* Success Message */}
                <AnimatePresence>
                    {successMessage && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-700 dark:text-emerald-300"
                        >
                            <Check className="w-5 h-5 flex-shrink-0" />
                            <span className="font-bold text-sm">{successMessage}</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Error Message */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-700 dark:text-rose-300"
                        >
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <span className="font-bold text-sm">{error}</span>
                            <button onClick={() => setError(null)} className="ml-auto text-rose-400 hover:text-rose-600 transition-colors">✕</button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Sync Result Toast */}
                <AnimatePresence>
                    {syncResult && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex items-center gap-3 p-4 bg-sky-500/10 border border-sky-500/20 rounded-2xl text-sky-700 dark:text-sky-300"
                        >
                            <RefreshCw className="w-5 h-5 flex-shrink-0" />
                            <span className="font-bold text-sm">{syncResult.message}</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Mercado Pago Card */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <Card className="group relative overflow-hidden" delay={0.1}>
                        <div className="relative z-10 space-y-6">
                            {/* Header */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-[#00AAFF]/10 flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 duration-300">
                                        <CreditCard className="w-7 h-7 text-[#00AAFF]" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-zinc-900 dark:text-white text-xl tracking-tight">Mercado Pago</h3>
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-0.5">Importar cobros y pagos</p>
                                    </div>
                                </div>
                                {mpStatus?.connected && (
                                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-black">
                                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                        Conectado
                                    </span>
                                )}
                            </div>

                            {/* Content */}
                            {loading ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
                                </div>
                            ) : connecting ? (
                                <div className="flex items-center justify-center py-8 gap-3">
                                    <Loader2 className="w-6 h-6 text-[#00AAFF] animate-spin" />
                                    <span className="text-zinc-500 font-bold">Conectando...</span>
                                </div>
                            ) : mpStatus?.connected ? (
                                <div className="space-y-5">
                                    {/* Connection Info */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3">
                                            <p className="text-[10px] uppercase tracking-widest font-black text-zinc-400 mb-1">ID de cuenta</p>
                                            <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">{mpStatus.mpUserId || '—'}</p>
                                        </div>
                                        <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3">
                                            <p className="text-[10px] uppercase tracking-widest font-black text-zinc-400 mb-1">Última sincronización</p>
                                            <p className="text-sm font-bold text-zinc-900 dark:text-white">
                                                {mpStatus.lastSyncAt
                                                    ? new Date(mpStatus.lastSyncAt).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                                                    : 'Nunca'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-3">
                                        <button
                                            onClick={handleSync}
                                            disabled={syncing}
                                            className={cn(
                                                "flex-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-95",
                                                "bg-[#00AAFF]/10 text-[#00AAFF] hover:bg-[#00AAFF]/20",
                                                syncing && "opacity-50 cursor-not-allowed"
                                            )}
                                        >
                                            <RefreshCw className={cn("w-4 h-4", syncing && "animate-spin")} />
                                            {syncing ? 'Sincronizando...' : 'Sincronizar ahora'}
                                        </button>
                                        <button
                                            onClick={handleDisconnect}
                                            className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl font-bold text-sm text-rose-500 hover:bg-rose-500/10 transition-all active:scale-95"
                                        >
                                            <Unlink className="w-4 h-4" />
                                            Desconectar
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-5">
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
                                        Conectá tu cuenta de Mercado Pago para importar automáticamente tus cobros y pagos al dashboard.
                                    </p>
                                    <div className="space-y-2">
                                        {[
                                            'Importación automática de transacciones',
                                            'Sincronización bajo demanda',
                                            'Deduplicación inteligente',
                                        ].map((feature, i) => (
                                            <div key={i} className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300 font-medium">
                                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                                                {feature}
                                            </div>
                                        ))}
                                    </div>
                                    <button
                                        onClick={handleConnect}
                                        className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-[#00AAFF] hover:bg-[#0099EE] text-white rounded-2xl font-black text-sm shadow-xl shadow-[#00AAFF]/20 transition-all active:scale-95 group"
                                    >
                                        <Link2 className="w-5 h-5" />
                                        Conectar Mercado Pago
                                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Glass Decoration */}
                        <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-[#00AAFF]/5 blur-3xl rounded-full" />
                    </Card>

                    {/* Coming Soon placeholder */}
                    <Card className="group relative overflow-hidden opacity-50 cursor-not-allowed" delay={0.2}>
                        <div className="relative z-10 space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-zinc-500/10 flex items-center justify-center">
                                    <ExternalLink className="w-7 h-7 text-zinc-400" />
                                </div>
                                <div>
                                    <h3 className="font-black text-zinc-400 text-xl tracking-tight">Más integraciones</h3>
                                    <p className="text-xs text-zinc-400 font-medium mt-0.5">Próximamente</p>
                                </div>
                            </div>
                            <p className="text-sm text-zinc-400 font-medium">
                                Estamos trabajando en integrar más servicios financieros: bancos, billeteras digitales, y más.
                            </p>
                            <div className="flex items-center gap-2 text-xs text-zinc-400 font-bold">
                                <Clock className="w-4 h-4" />
                                En desarrollo
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </Layout>
    );
}
