import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

import { Card } from '../features/common/components/Card';
import { cn } from '../lib/utils';
import {
    Link2, Unlink, RefreshCw, Check, AlertCircle, Clock,
    CreditCard, ArrowRight, Loader2, ExternalLink, Zap,
    TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as api from '../services/api';

function formatARS(value) {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        maximumFractionDigits: 2,
    }).format(value || 0);
}

export function IntegrationsPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const oauthHandledRef = useRef(false);

    const [mpStatus, setMpStatus] = useState(null);
    const [mpBalance, setMpBalance] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadingBalance, setLoadingBalance] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [syncResult, setSyncResult] = useState(null);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [confirmDisconnect, setConfirmDisconnect] = useState(false);

    const loadBalance = useCallback(async () => {
        setLoadingBalance(true);
        try {
            const balance = await api.getMercadoPagoBalance();
            setMpBalance(balance);
        } catch (err) {
            console.warn('No se pudo cargar el balance de MP:', err);
        } finally {
            setLoadingBalance(false);
        }
    }, []);

    const loadStatus = useCallback(async () => {
        try {
            setLoading(true);
            const status = await api.getMercadoPagoStatus();
            setMpStatus(status);
            if (status?.connected) {
                loadBalance();
            }
        } catch (err) {
            console.error('Error loading MP status:', err);
            setMpStatus({ connected: false });
        } finally {
            setLoading(false);
        }
    }, [loadBalance]);

    const handleOAuthCallback = useCallback(async (code) => {
        setConnecting(true);
        setError(null);
        try {
            const result = await api.handleMercadoPagoCallback(code);
            setMpStatus(result);
            setSuccessMessage('¡Cuenta de Mercado Pago conectada! Sincronizando tus últimos 90 días de movimientos...');
            // Cargar balance después de conectar
            setTimeout(async () => {
                await loadBalance();
                setSuccessMessage('¡Sincronización completada! Revisá tu dashboard.');
                setTimeout(() => setSuccessMessage(null), 5000);
            }, 2000);
        } catch (err) {
            const detail = err?.response?.data?.detail;
            const status = err?.response?.status;
            if (status === 400) {
                setError('El código de autorización ya fue usado o expiró. Por favor, hacé click en "Conectar Mercado Pago" nuevamente.');
            } else {
                setError(typeof detail === 'string' ? detail : 'Error al conectar con Mercado Pago. Reintentá en unos segundos.');
            }
            // Permitir reintentar (limpiar el guard) tras error
            oauthHandledRef.current = false;
        } finally {
            setConnecting(false);
        }
    }, [loadBalance]);

    // Manejo del callback de OAuth (con guard para evitar doble-fire en StrictMode)
    useEffect(() => {
        const code = searchParams.get('code');
        if (code && !oauthHandledRef.current) {
            oauthHandledRef.current = true;
            // Limpiar el code de la URL ANTES de procesarlo, así react-router no
            // lo vuelve a leer si el componente re-renderiza
            const next = new URLSearchParams(searchParams);
            next.delete('code');
            next.delete('state');
            setSearchParams(next, { replace: true });
            handleOAuthCallback(code);
        }
    }, [searchParams, setSearchParams, handleOAuthCallback]);

    useEffect(() => {
        loadStatus();
    }, [loadStatus]);

    const handleConnect = async () => {
        setError(null);
        // Reset OAuth guard, por si quedó en true tras intento previo
        oauthHandledRef.current = false;
        try {
            const authUrl = await api.getMercadoPagoAuthUrl();
            window.location.href = authUrl;
        } catch (err) {
            const detail = err?.response?.data?.detail;
            setError(typeof detail === 'string'
                ? detail
                : 'No se pudo iniciar el flujo de Mercado Pago. Verificá tu conexión y reintentá.');
        }
    };

    const handleSync = async () => {
        setSyncing(true);
        setSyncResult(null);
        setError(null);
        try {
            const result = await api.syncMercadoPago();
            setSyncResult(result);
            await loadBalance(); // Refrescar balance post-sync
            setTimeout(() => setSyncResult(null), 8000);
        } catch (err) {
            setError(err.response?.data?.detail || 'Error al sincronizar');
        } finally {
            setSyncing(false);
        }
    };

    const handleDisconnect = () => setConfirmDisconnect(true);

    const handleConfirmDisconnect = async () => {
        setConfirmDisconnect(false);
        setError(null);
        try {
            await api.disconnectMercadoPago();
            setMpStatus({ connected: false });
            setMpBalance(null);
            setSuccessMessage('Cuenta desconectada.');
            setTimeout(() => setSuccessMessage(null), 4000);
        } catch (err) {
            setError(err.response?.data?.detail || 'Error al desconectar');
        }
    };

    return (
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
                    <h1 className="text-2xl md:text-4xl font-black text-zinc-900 dark:text-white tracking-tight">Integraciones</h1>
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

            {/* Sync Result */}
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Mercado Pago Card */}
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
                            <div className="flex flex-col items-center justify-center py-8 gap-3">
                                <Loader2 className="w-8 h-8 text-[#00AAFF] animate-spin" />
                                <span className="text-zinc-500 font-bold text-sm">Conectando y sincronizando...</span>
                                <span className="text-zinc-400 text-xs">Esto puede tardar unos segundos</span>
                            </div>
                        ) : mpStatus?.connected ? (
                            <div className="space-y-5">
                                {/* Balance Cards */}
                                {loadingBalance ? (
                                    <div className="flex items-center justify-center py-6">
                                        <Loader2 className="w-5 h-5 text-zinc-400 animate-spin" />
                                        <span className="ml-2 text-sm text-zinc-400">Cargando resumen...</span>
                                    </div>
                                ) : mpBalance && (
                                    <div className="space-y-3">
                                        {/* Net balance */}
                                        <div className="bg-gradient-to-br from-[#00AAFF]/10 to-[#0077CC]/5 border border-[#00AAFF]/20 rounded-2xl p-4">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Wallet className="w-4 h-4 text-[#00AAFF]" />
                                                <p className="text-[10px] uppercase tracking-widest font-black text-zinc-500">Balance del mes</p>
                                            </div>
                                            <p className={cn(
                                                "text-2xl font-black tracking-tight",
                                                mpBalance.available_balance >= 0
                                                    ? "text-emerald-600 dark:text-emerald-400"
                                                    : "text-rose-600 dark:text-rose-400"
                                            )}>
                                                {formatARS(mpBalance.available_balance)}
                                            </p>
                                            <p className="text-xs text-zinc-400 mt-1">{mpBalance.total_transactions_month} transacciones este mes</p>
                                        </div>

                                        {/* Income / Expenses */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="bg-emerald-500/8 border border-emerald-500/20 rounded-xl p-3">
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
                                                    <p className="text-[10px] uppercase tracking-widest font-black text-emerald-600 dark:text-emerald-400">Ingresos</p>
                                                </div>
                                                <p className="text-base font-black text-emerald-700 dark:text-emerald-300">
                                                    {formatARS(mpBalance.income_month)}
                                                </p>
                                            </div>
                                            <div className="bg-rose-500/8 border border-rose-500/20 rounded-xl p-3">
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" />
                                                    <p className="text-[10px] uppercase tracking-widest font-black text-rose-600 dark:text-rose-400">Egresos</p>
                                                </div>
                                                <p className="text-base font-black text-rose-700 dark:text-rose-300">
                                                    {formatARS(mpBalance.expenses_month)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Meta info */}
                                <div className="grid grid-cols-2 gap-3">
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
                                        'Importación automática de últimos 90 días',
                                        'Ingresos y egresos en tiempo real',
                                        'Deduplicación inteligente de transacciones',
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

            {confirmDisconnect && (
                <div className="fixed bottom-24 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 w-full max-w-sm">
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-2xl shadow-zinc-900/20 p-4 flex items-center gap-4">
                        <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-500/15 flex items-center justify-center shrink-0">
                            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-zinc-900 dark:text-white">¿Desconectar Mercado Pago?</p>
                            <p className="text-xs text-zinc-500">Las transacciones importadas se mantienen.</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                            <button onClick={() => setConfirmDisconnect(false)} className="px-3 py-1.5 text-xs font-bold border border-zinc-200 dark:border-zinc-700 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-zinc-600 dark:text-zinc-400">
                                Cancelar
                            </button>
                            <button onClick={handleConfirmDisconnect} className="px-3 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition-colors">
                                Desconectar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
