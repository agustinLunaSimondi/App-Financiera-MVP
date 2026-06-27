import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Send, Sparkles, Bot, User, PiggyBank,
    PieChart, Wallet, CheckCircle, RefreshCw, RotateCcw, AlertCircle
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useFinance } from '../hooks/useFinance';
import { sendMessageToAgent } from '../services/chat';
import { submitAkiName, getRecentAkiNames } from '../services/akiName';
import { formatCurrency } from '../utils/formatters';
import { parseApiError, isTimeoutError } from '../lib/apiErrors';
import { AIInsightsCard } from './components/AIInsightsCard';

// ─────────────────────────────────────────────
// SAFE MARKDOWN RENDERER
// No usa dangerouslySetInnerHTML — todo se renderiza como elementos React.
// Soporta: **bold**, listas con `- `, saltos de línea.
// ─────────────────────────────────────────────
function renderInline(text) {
    if (!text) return null;
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
        if (/^\*\*[^*]+\*\*$/.test(part)) {
            return <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>;
        }
        return <React.Fragment key={i}>{part}</React.Fragment>;
    });
}

function renderMarkdown(text) {
    if (!text) return null;
    const lines = text.split('\n');
    const blocks = [];
    let currentList = null;

    lines.forEach((line, i) => {
        const listMatch = line.match(/^\s*-\s+(.+)$/);
        if (listMatch) {
            if (!currentList) currentList = [];
            currentList.push(listMatch[1]);
        } else {
            if (currentList) {
                blocks.push({ type: 'list', items: currentList, key: `list-${i}` });
                currentList = null;
            }
            if (line.trim() === '') {
                blocks.push({ type: 'br', key: `br-${i}` });
            } else {
                blocks.push({ type: 'p', text: line, key: `p-${i}` });
            }
        }
    });
    if (currentList) {
        blocks.push({ type: 'list', items: currentList, key: 'list-end' });
    }

    return blocks.map((block) => {
        if (block.type === 'list') {
            return (
                <ul key={block.key} className="list-disc list-inside space-y-0.5 my-1.5">
                    {block.items.map((item, j) => (
                        <li key={j}>{renderInline(item)}</li>
                    ))}
                </ul>
            );
        }
        if (block.type === 'br') {
            return <div key={block.key} className="h-2" />;
        }
        return <p key={block.key}>{renderInline(block.text)}</p>;
    });
}

export function ChatPage() {
    const { t } = useLanguage();
    const { refreshData } = useFinance();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const lastUserMessageRef = useRef(null);

    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const [nameInput, setNameInput] = useState('');
    const [nameSubmitting, setNameSubmitting] = useState(false);
    const [nameSubmitted, setNameSubmitted] = useState(false);
    const [nameError, setNameError] = useState('');
    const [recentNames, setRecentNames] = useState([]);

    useEffect(() => {
        getRecentAkiNames().then(setRecentNames).catch(() => {});
    }, []);

    useEffect(() => {
        setMessages([
            {
                id: 'welcome',
                role: 'model',
                content: t('chat.welcome'),
                timestamp: new Date()
            }
        ]);
    }, [t]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    const handleSend = async (textToSend, { isRetry = false } = {}) => {
        const text = (textToSend || input).trim();
        if (!text || loading) return;

        if (!textToSend) setInput('');
        lastUserMessageRef.current = text;

        // En retry, no agregamos otro mensaje user — usamos el anterior
        let workingMessages = messages;
        if (!isRetry) {
            const userMsg = {
                id: `user-${Date.now()}`,
                role: 'user',
                content: text,
                timestamp: new Date()
            };
            workingMessages = [...messages, userMsg];
            setMessages(workingMessages);
        } else {
            // Filtramos el último mensaje de error antes de reintentar
            workingMessages = messages.filter(m => !m.isError);
            setMessages(workingMessages);
        }

        setLoading(true);

        try {
            const historyPayload = workingMessages
                .filter(m => !m.isError)
                .map(m => ({ role: m.role, content: m.content }));

            // El último user message ya está en historyPayload — el backend espera message + history
            // Removemos el último user message del history y lo pasamos como message
            const lastUserIdx = historyPayload.map(m => m.role).lastIndexOf('user');
            const historyForBackend = lastUserIdx >= 0
                ? historyPayload.slice(0, lastUserIdx)
                : historyPayload;

            const result = await sendMessageToAgent(text, historyForBackend);

            const botMsg = {
                id: `bot-${Date.now()}`,
                role: 'model',
                content: result.response,
                actionResult: result.actionResult,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, botMsg]);

            if (result.actionResult && result.actionResult.status === 'success') {
                await refreshData();
            }

        } catch (error) {
            console.error("Error al enviar mensaje:", error);
            const isTimeout = isTimeoutError(error);
            // 502/503/504 → IA ocupada o pensando; mensaje amigable en vez del error crudo.
            const isServerBusy = error?.response?.status >= 502;
            const errorMsg = {
                id: `error-${Date.now()}`,
                role: 'model',
                content: isTimeout
                    ? 'Aki tardó demasiado en responder. Puede ser que el servidor esté frío, intentá de nuevo.'
                    : isServerBusy
                        ? 'Aki está pensando... intentá de nuevo en un momento 🤔'
                        : parseApiError(error, 'No pude procesar tu mensaje. Reintentá en un momento.'),
                timestamp: new Date(),
                isError: true,
                canRetry: true,
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setLoading(false);
            // Refocus al input después de enviar
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    };

    const handleRetry = () => {
        if (lastUserMessageRef.current) {
            handleSend(lastUserMessageRef.current, { isRetry: true });
        }
    };

    const handleSuggestClick = (suggestionText) => {
        handleSend(suggestionText);
    };

    const handleNameSubmit = async (e) => {
        e.preventDefault();
        const trimmed = nameInput.trim();
        if (!trimmed || nameSubmitting) return;
        setNameError('');
        setNameSubmitting(true);
        try {
            await submitAkiName(trimmed);
            setNameSubmitted(true);
            setRecentNames(prev => [{ name: trimmed }, ...prev].slice(0, 20));
        } catch (err) {
            const detail = err?.response?.data?.detail;
            setNameError(
                typeof detail === 'string' ? detail : t('aki.name.error')
            );
        } finally {
            setNameSubmitting(false);
        }
    };

    const renderActionResultCard = (actionResult) => {
        if (!actionResult || actionResult.status !== 'success') return null;

        if (actionResult.transaction) {
            const tx = actionResult.transaction;
            const isExpense = tx.amount < 0;
            return (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 p-4 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm max-w-sm shadow-sm"
                >
                    <div className="flex items-center justify-between gap-3 mb-2">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <CheckCircle size={10} /> Transacción Registrada
                        </span>
                        <span className="text-xs text-zinc-400">{tx.date}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="min-w-0">
                            <p className="font-bold text-sm text-zinc-900 dark:text-white truncate max-w-[180px]">{tx.description}</p>
                            <p className="text-[11px] text-zinc-400">{tx.categoryName} • {tx.accountName}</p>
                        </div>
                        <span className={`font-black text-sm shrink-0 ${isExpense ? 'text-rose-500' : 'text-emerald-500'}`}>
                            {isExpense ? '-' : '+'}{formatCurrency(Math.abs(tx.amount))}
                        </span>
                    </div>
                </motion.div>
            );
        }

        if (actionResult.savingGoal) {
            const goal = actionResult.savingGoal;
            return (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 max-w-sm shadow-sm flex gap-3 items-center"
                >
                    <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-500">
                        <PiggyBank size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 block mb-0.5">Meta de Ahorro Creada</span>
                        <p className="font-bold text-sm text-zinc-900 dark:text-white truncate">{goal.name}</p>
                        <p className="text-[11px] text-zinc-400">Objetivo: {formatCurrency(goal.targetAmount)}</p>
                    </div>
                </motion.div>
            );
        }

        if (actionResult.budget) {
            const budget = actionResult.budget;
            return (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 max-w-sm shadow-sm flex gap-3 items-center"
                >
                    <div className="p-3 rounded-lg bg-blue-500/10 text-blue-500">
                        <PieChart size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 block mb-0.5">Presupuesto Configurado</span>
                        <p className="font-bold text-sm text-zinc-900 dark:text-white truncate">{budget.categoryName}</p>
                        <p className="text-[11px] text-zinc-400">Límite mensual: {formatCurrency(budget.amount)}</p>
                    </div>
                </motion.div>
            );
        }

        if (actionResult.totalBalance !== undefined) {
            const summary = actionResult;
            return (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 p-4 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-sm max-w-md shadow-sm space-y-3"
                >
                    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-indigo-500">
                        <Wallet size={12} /> Estado de tus Saldos
                    </div>

                    <div className="pb-2 border-b border-zinc-200/40 dark:border-zinc-800/40">
                        <p className="text-xs text-zinc-400">Balance Consolidado</p>
                        <p className="text-xl font-black text-zinc-900 dark:text-white mt-0.5">
                            {formatCurrency(summary.totalBalance)}
                        </p>
                    </div>

                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {summary.accounts && summary.accounts.map(acc => (
                            <div key={acc.id} className="flex justify-between items-center text-xs">
                                <span className="text-zinc-500">{acc.name}</span>
                                <span className="font-bold text-zinc-700 dark:text-zinc-300">{formatCurrency(acc.balance)}</span>
                            </div>
                        ))}
                    </div>
                </motion.div>
            );
        }

        return null;
    };

    return (
        <div className="space-y-4 max-w-5xl mx-auto">
            <AIInsightsCard compact />

            <div className="flex flex-col h-[calc(100vh-260px)] min-h-[560px] max-h-[860px] bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md rounded-3xl border border-zinc-200/50 dark:border-zinc-800/50 overflow-hidden shadow-2xl relative">

            {/* Header del Chat */}
            <div className="px-6 py-4 border-b border-zinc-200/50 dark:border-zinc-800/50 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-sm flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/10">
                        <Sparkles size={18} />
                    </div>
                    <div>
                        <h1 className="text-md font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
                            Aki <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
                        </h1>
                        <p className="text-[10px] text-zinc-400 dark:text-zinc-500">Asistente Inteligente de Vueltito</p>
                    </div>
                </div>
            </div>

            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin flex flex-col">
                <AnimatePresence initial={false}>
                    {messages.map((msg) => {
                        const isBot = msg.role === 'model';
                        return (
                            <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`flex gap-3 max-w-[85%] ${isBot ? 'self-start' : 'self-end ml-auto flex-row-reverse'}`}
                            >
                                <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs ${
                                    isBot
                                        ? msg.isError
                                            ? 'bg-rose-100 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                                            : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border border-purple-500/10'
                                        : 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                                }`}>
                                    {isBot
                                        ? (msg.isError ? <AlertCircle size={14} /> : <Bot size={14} />)
                                        : <User size={14} />
                                    }
                                </div>
                                <div className="space-y-1 min-w-0">
                                    <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm break-words ${
                                        isBot
                                            ? msg.isError
                                                ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 border border-rose-500/20 rounded-tl-none'
                                                : 'bg-zinc-100/80 dark:bg-zinc-800/80 text-zinc-800 dark:text-zinc-100 border border-zinc-200/50 dark:border-zinc-800/30 rounded-tl-none'
                                            : 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-tr-none'
                                    }`}>
                                        {isBot ? renderMarkdown(msg.content) : msg.content}
                                    </div>

                                    {msg.isError && msg.canRetry && (
                                        <button
                                            type="button"
                                            onClick={handleRetry}
                                            disabled={loading}
                                            className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 px-2 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40"
                                        >
                                            <RotateCcw size={12} />
                                            Reintentar
                                        </button>
                                    )}

                                    {isBot && msg.actionResult && renderActionResultCard(msg.actionResult)}
                                </div>
                            </motion.div>
                        );
                    })}

                    {loading && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="flex gap-3 max-w-[80%] self-start"
                        >
                            <div className="w-8 h-8 rounded-full shrink-0 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border border-purple-500/10 flex items-center justify-center">
                                <Bot size={14} />
                            </div>
                            <div className="p-4 rounded-2xl rounded-tl-none bg-zinc-100/80 dark:bg-zinc-800/80 text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-2 border border-zinc-200/30 dark:border-zinc-800/30 shadow-sm">
                                <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-500" />
                                {t('chat.thinking')}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                <div ref={messagesEndRef} />
            </div>

            {/* Sugerencias y Barra de Entrada */}
            <div className="p-4 border-t border-zinc-200/50 dark:border-zinc-800/50 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-sm shrink-0">
                {messages.length < 3 && !loading && (
                    <div className="flex flex-wrap gap-2 mb-4">
                        {[
                            { label: t('chat.suggest.balance'), text: "Brindame un resumen de mis saldos y cuentas." },
                            { label: t('chat.suggest.gasto'), text: "Anotá un gasto de $1200 en cafetería hoy con Efectivo." },
                            { label: t('chat.suggest.presupuesto'), text: "Crear un presupuesto mensual de $15000 en comida." },
                            { label: t('chat.suggest.meta'), text: "Crear una meta de ahorro llamada Vacaciones de $50000." }
                        ].map((sug, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => handleSuggestClick(sug.text)}
                                className="px-3.5 py-1.5 rounded-xl border border-zinc-200/70 dark:border-zinc-800/70 bg-white/50 dark:bg-zinc-900/50 text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-all text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
                            >
                                {sug.label}
                            </button>
                        ))}
                    </div>
                )}

                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleSend();
                    }}
                    className="flex gap-2"
                >
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={t('chat.placeholder')}
                        disabled={loading}
                        aria-label="Mensaje para Aki"
                        className="flex-1 px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors disabled:opacity-50 text-zinc-900 dark:text-white"
                    />
                    <button
                        type="submit"
                        disabled={loading || !input.trim()}
                        aria-label="Enviar mensaje"
                        className="p-3 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:scale-105 active:scale-95 transition-all shadow-md disabled:opacity-50 disabled:scale-100 flex items-center justify-center shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
                    >
                        <Send size={16} />
                    </button>
                </form>
            </div>

            </div>

        {/* Naming contest — bautizá al asistente */}
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md rounded-3xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-lg p-6"
        >
            <div className="flex items-start gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-white shadow-md shadow-purple-500/20 shrink-0">
                    <Sparkles size={18} />
                </div>
                <div>
                    <h2 className="font-black text-zinc-900 dark:text-white text-sm">{t('aki.name.title')}</h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{t('aki.name.subtitle')}</p>
                </div>
            </div>

            {nameSubmitted ? (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 font-bold"
                >
                    <CheckCircle size={16} />
                    {t('aki.name.submitted')}
                </motion.div>
            ) : (
                <form onSubmit={handleNameSubmit} className="flex gap-2">
                    <input
                        type="text"
                        value={nameInput}
                        onChange={(e) => { setNameInput(e.target.value); setNameError(''); }}
                        placeholder={t('aki.name.placeholder')}
                        maxLength={30}
                        className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-colors text-zinc-900 dark:text-white"
                    />
                    <button
                        type="submit"
                        disabled={nameSubmitting || !nameInput.trim()}
                        className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-bold hover:scale-105 active:scale-95 transition-all shadow-md disabled:opacity-50 disabled:scale-100 shrink-0"
                    >
                        {nameSubmitting ? '...' : t('aki.name.submit')}
                    </button>
                </form>
            )}

            {nameError && (
                <p className="mt-2 text-xs text-rose-500 font-medium">{nameError}</p>
            )}

            {recentNames.length > 0 && (
                <div className="mt-5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-2.5">
                        {t('aki.name.recent')}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {recentNames.map((entry, i) => (
                            <span
                                key={i}
                                className="px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-xs font-bold text-zinc-600 dark:text-zinc-400 border border-zinc-200/70 dark:border-zinc-700/70"
                            >
                                {entry.name}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </motion.div>
        </div>
    );
}
