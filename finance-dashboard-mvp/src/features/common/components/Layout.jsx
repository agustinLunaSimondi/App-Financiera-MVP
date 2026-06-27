import React, { useState, useEffect } from 'react';
import { useReducedMotion } from 'framer-motion';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, Wallet, CreditCard, PieChart, Settings,
    LogOut, Menu, PiggyBank, Clock, GraduationCap,
    Link2, HelpCircle, X, Sun, Moon, MessageSquare, Bug, Users
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useFinance } from '../../../hooks/useFinance';
import { OnboardingTour } from './OnboardingTour';
import { BottomNav } from './BottomNav';
import { Modal } from './Modal';
import { StreakPill } from './StreakPill';
import { TransactionForm } from '../../transactions/components/TransactionForm';

// ─── Dark Mode Toggle Button ───────────────────────────────────
function DarkModeToggle({ isDark, onToggle, compact = false }) {
    return (
        <button
            onClick={onToggle}
            aria-label="Cambiar modo oscuro"
            className={cn(
                "relative flex items-center justify-center rounded-xl transition-all duration-300",
                "hover:scale-105 active:scale-95",
                compact
                    ? "w-9 h-9 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                    : "w-10 h-10 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            )}
        >
            <AnimatePresence mode="wait" initial={false}>
                {isDark ? (
                    <motion.div
                        key="sun"
                        initial={{ rotate: -90, opacity: 0 }}
                        animate={{ rotate: 0, opacity: 1 }}
                        exit={{ rotate: 90, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <Sun size={18} />
                    </motion.div>
                ) : (
                    <motion.div
                        key="moon"
                        initial={{ rotate: 90, opacity: 0 }}
                        animate={{ rotate: 0, opacity: 1 }}
                        exit={{ rotate: -90, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <Moon size={18} />
                    </motion.div>
                )}
            </AnimatePresence>
        </button>
    );
}

// ─── Nav Item ─────────────────────────────────────────────────
const NavItemLink = ({ item, onClick }) => {
    return (
        <NavLink
            to={item.path}
            onClick={onClick}
            className={({ isActive }) => cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-300 group",
                isActive 
                    ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-xl shadow-zinc-900/10 dark:shadow-white/5" 
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
            )}
        >
            <item.icon className={cn("w-5 h-5 transition-transform group-hover:scale-110")} />
            <span className="truncate">{item.label}</span>
        </NavLink>
    );
};

// ─── Sidebar Content ──────────────────────────────────────────
function SidebarContent({ onMobileNavClick }) {
    const { user, logout } = useAuth();
    const { t } = useLanguage();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const mainNav = [
        { icon: LayoutDashboard, label: t('sidebar.dashboard'), path: '/' },
        { icon: Wallet, label: t('sidebar.transactions'), path: '/transactions' },
        { icon: MessageSquare, label: t('sidebar.chat'), path: '/chat' },
        { icon: PieChart, label: t('sidebar.budgets'), path: '/budget' },
        { icon: PiggyBank, label: t('sidebar.savings'), path: '/savings' },
        { icon: Users, label: t('sidebar.events'), path: '/events' },
        { icon: Clock, label: t('sidebar.recurring'), path: '/recurring' },
        { icon: CreditCard, label: t('sidebar.accounts'), path: '/cards' },
    ];

    const supportNav = [
        { icon: GraduationCap, label: t('sidebar.academy'), path: '/academy' },
        { icon: Link2, label: t('sidebar.integrations'), path: '/integrations' },
        { icon: HelpCircle, label: t('sidebar.help'), path: '/help' },
        { icon: Settings, label: t('sidebar.settings'), path: '/settings' },
    ];

    return (
        <div className="flex flex-col h-full py-8">
            {/* Logo */}
            <div className="px-6 mb-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                        <Wallet className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <span className="text-xl font-black text-zinc-900 dark:text-zinc-100 tracking-tighter">Vueltito</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">Beta privada</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation – scrollable area that does NOT reset when route changes */}
            <nav className="flex-1 px-4 space-y-8 overflow-y-auto scrollbar-hide">
                <div>
                    <span className="px-4 text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">{t('sidebar.main')}</span>
                    <div className="mt-4 space-y-1">
                        {mainNav.map(item => <NavItemLink key={item.path} item={item} onClick={onMobileNavClick} />)}
                    </div>
                </div>
                <div>
                    <span className="px-4 text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">{t('sidebar.resources')}</span>
                    <div className="mt-4 space-y-1">
                        {supportNav.map(item => <NavItemLink key={item.path} item={item} onClick={onMobileNavClick} />)}
                    </div>
                </div>
            </nav>

            {/* Streak pill (#62) */}
            <div className="px-4 mt-6">
                <StreakPill />
            </div>

            {/* Profile Section */}
            <div className="px-4 mt-auto pt-6 border-t border-zinc-200/50 dark:border-zinc-800/50">
                <div className="p-4 rounded-2xl bg-zinc-100/50 dark:bg-zinc-800/40 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                            {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">{user?.name || user?.email}</p>
                            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate">{user?.email}</p>
                        </div>
                    </div>
                    <a
                        href="mailto:agustinluna760@gmail.com?subject=Vueltito%20beta%20—%20Feedback"
                        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-[11px] font-bold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors"
                        title="Mandar feedback o reportar un bug"
                    >
                        <Bug className="w-3.5 h-3.5" />
                        Reportar / Feedback
                    </a>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black text-rose-500 hover:bg-rose-500/10 transition-colors border border-rose-500/10"
                    >
                        <LogOut className="w-4 h-4" />
                        {t('sidebar.logout')}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Layout ───────────────────────────────────────────────────
export function Layout({ children }) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
    const { settings, updateSettings } = useFinance();
    const location = useLocation();
    const prefersReducedMotion = useReducedMotion();

    // Inicializar desde localStorage. Si no hay preferencia local, usar la del sistema.
    const [isDark, setIsDark] = useState(() => {
        try {
            const stored = localStorage.getItem('darkMode');
            if (stored !== null) return stored === 'true';
            return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
        } catch {
            return false;
        }
    });

    // Fuente de verdad única: isDark → clase en <html>
    // Esto cubre tanto el toggle manual como la sincronización con backend.
    useEffect(() => {
        document.documentElement.classList.toggle('dark', isDark);
    }, [isDark]);

    // Sincronización inicial backend → cliente: solo se aplica UNA vez por sesión y solo si
    // no hay preferencia local. Evita que un refresh tardío del backend pise el toggle del user.
    const didInitialSyncRef = React.useRef(false);
    useEffect(() => {
        if (didInitialSyncRef.current) return;
        if (settings.darkMode === undefined) return;
        try {
            const stored = localStorage.getItem('darkMode');
            if (stored === null) {
                setIsDark(settings.darkMode);
            }
        } catch { /* noop */ }
        didInitialSyncRef.current = true;
    }, [settings.darkMode]);

    const handleToggleDark = async () => {
        const next = !isDark;
        setIsDark(next); // el useEffect([isDark]) aplica la clase
        try {
            localStorage.setItem('darkMode', String(next));
        } catch { /* noop */ }
        try {
            await updateSettings({ darkMode: next });
        } catch {
            // no-op: clase y localStorage ya actualizados
        }
    };

    return (
        <div className="min-h-screen bg-transparent flex text-zinc-900 dark:text-zinc-100 font-sans overflow-x-hidden">
            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex flex-col w-72 glass-sidebar sticky top-0 h-screen border-r border-zinc-200/50 dark:border-zinc-800/50">
                <SidebarContent />
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col min-w-0 h-screen relative bg-transparent">
                {/* Top Header – always visible, contains dark mode toggle */}
                <header className="hidden lg:flex items-center justify-end gap-3 px-8 py-4 border-b border-zinc-200/30 dark:border-zinc-800/30 bg-white/30 dark:bg-zinc-900/30 backdrop-blur-sm sticky top-0 z-40">
                    <DarkModeToggle isDark={isDark} onToggle={handleToggleDark} />
                </header>

                {/* Mobile Header */}
                <header className="lg:hidden flex items-center justify-between p-4 glass sticky top-0 z-40 border-b border-zinc-200/50 dark:border-zinc-800/50">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
                            <Wallet className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-lg font-black tracking-tighter">Vueltito</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <DarkModeToggle isDark={isDark} onToggle={handleToggleDark} compact />
                        <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -mr-2 text-zinc-600 dark:text-zinc-400">
                            <Menu className="w-6 h-6" />
                        </button>
                    </div>
                </header>

                {/* Page Content */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth relative">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={location.pathname}
                            initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
                            transition={{ duration: prefersReducedMotion ? 0 : 0.3, ease: "easeOut" }}
                            className="p-4 md:p-6 lg:p-10 pb-28 lg:pb-10 max-w-[1400px] mx-auto w-full"
                        >
                            {children}

                            {/* Mini footer legal — siempre visible al final del scroll */}
                            <footer className="mt-12 pt-6 border-t border-zinc-200/60 dark:border-zinc-800/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-zinc-400 dark:text-zinc-500">
                                <p>Vueltito · Beta privada · Proyecto personal de Agustín Luna · No es un servicio financiero</p>
                                <div className="flex items-center gap-4 font-bold">
                                    <NavLink to="/privacy" className="hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">Privacidad</NavLink>
                                    <NavLink to="/terms" className="hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">Términos</NavLink>
                                    <a href="mailto:agustinluna760@gmail.com" className="hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">Contacto</a>
                                </div>
                            </footer>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>

            {/* Bottom navigation – mobile only, con FAB de "nueva transacción" */}
            <BottomNav onQuickAdd={() => setIsQuickAddOpen(true)} />

            {/* Quick Add modal – disparado por el FAB */}
            <Modal
                isOpen={isQuickAddOpen}
                onClose={() => setIsQuickAddOpen(false)}
                title="Nueva Transacción"
            >
                <TransactionForm onClose={() => setIsQuickAddOpen(false)} />
            </Modal>

            {/* Mobile Sidebar Overlay */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
                            onClick={() => setIsMobileMenuOpen(false)}
                        />
                        <motion.div
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="fixed inset-y-0 left-0 w-80 bg-white dark:bg-zinc-900 z-[70] shadow-2xl"
                        >
                            <button 
                                onClick={() => setIsMobileMenuOpen(false)} 
                                className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                            >
                                <X className="w-6 h-6" />
                            </button>
                            <SidebarContent
                                onMobileNavClick={() => setIsMobileMenuOpen(false)}
                            />
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Onboarding Tour – solo dentro del Layout privado y fuera de la ruta /onboarding */}
            {location.pathname !== '/onboarding' && <OnboardingTour />}
        </div>
    );
}
