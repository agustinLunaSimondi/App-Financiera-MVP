import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
    LayoutDashboard, Wallet, CreditCard, PieChart, Settings, 
    LogOut, Menu, PiggyBank, Clock, Zap, GraduationCap, 
    Link2, HelpCircle, User as UserIcon, X 
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';

const NavItemLink = ({ item, onClick, t }) => {
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

export function Layout({ children }) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { user, logout } = useAuth();
    const { t } = useLanguage();
    const location = useLocation();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const mainNav = [
        { icon: LayoutDashboard, label: t('sidebar.dashboard'), path: '/' },
        { icon: Wallet, label: t('sidebar.transactions'), path: '/transactions' },
        { icon: PieChart, label: t('sidebar.budgets'), path: '/budget' },
        { icon: PiggyBank, label: t('sidebar.savings'), path: '/savings' },
        { icon: Clock, label: t('Recurrentes'), path: '/recurring' },
        { icon: CreditCard, label: t('sidebar.accounts'), path: '/cards' },
    ];

    const supportNav = [
        { icon: GraduationCap, label: t('sidebar.academy'), path: '/academy' },
        { icon: Link2, label: t('Integraciones'), path: '/integrations' },
        { icon: HelpCircle, label: t('Ayuda / Tutorial'), path: '/help' },
        { icon: Settings, label: t('sidebar.settings'), path: '/settings' },
    ];

    const SidebarContent = ({ onMobileNavClick }) => (
        <div className="flex flex-col h-full py-8">
            {/* Logo */}
            <div className="px-6 mb-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                        <Wallet className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <span className="text-xl font-black text-zinc-900 dark:text-zinc-100 tracking-tighter">FinanceFlow</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Premium Plan</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 space-y-8 overflow-y-auto scrollbar-hide">
                <div>
                    <span className="px-4 text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">{t('sidebar.main')}</span>
                    <div className="mt-4 space-y-1">
                        {mainNav.map(item => <NavItemLink key={item.path} item={item} t={t} onClick={onMobileNavClick} />)}
                    </div>
                </div>
                <div>
                    <span className="px-4 text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Recursos</span>
                    <div className="mt-4 space-y-1">
                        {supportNav.map(item => <NavItemLink key={item.path} item={item} t={t} onClick={onMobileNavClick} />)}
                    </div>
                </div>
            </nav>

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

    return (
        <div className="min-h-screen bg-transparent flex text-zinc-900 dark:text-zinc-100 font-sans overflow-hidden">
            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex flex-col w-72 glass-sidebar sticky top-0 h-screen border-r border-zinc-200/50 dark:border-zinc-800/50">
                <SidebarContent />
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col min-w-0 h-screen relative bg-transparent">
                {/* Mobile Header */}
                <header className="lg:hidden flex items-center justify-between p-4 glass sticky top-0 z-40 border-b border-zinc-200/50 dark:border-zinc-800/50">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
                            <Wallet className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-lg font-black tracking-tighter">FinanceFlow</span>
                    </div>
                    <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -mr-2 text-zinc-600 dark:text-zinc-400">
                        <Menu className="w-6 h-6" />
                    </button>
                </header>

                {/* Page Content */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth relative">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={location.pathname}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            className="p-6 lg:p-10 max-w-[1400px] mx-auto w-full"
                        >
                            {children}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>

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
                            <SidebarContent onMobileNavClick={() => setIsMobileMenuOpen(false)} />
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
