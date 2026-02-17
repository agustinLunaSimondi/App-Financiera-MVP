import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Wallet, CreditCard, PieChart, Settings, LogOut, Menu, PiggyBank, Clock, Zap } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../contexts/AuthContext';

export function Layout({ children }) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const { logout } = useAuth();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
        { icon: Wallet, label: 'Transacciones', path: '/transactions' },
        { icon: PieChart, label: 'Presupuestos', path: '/budget' },
        { icon: PiggyBank, label: 'Ahorros', path: '/savings' },
        { icon: Clock, label: 'Recurrentes', path: '/recurring' },
        { icon: CreditCard, label: 'Cuentas', path: '/cards' },
        { icon: Settings, label: 'Configuración', path: '/settings' },
    ];

    const NavItem = ({ item, onClick }) => {
        const isActive = location.pathname === item.path;

        return (
            <NavLink
                to={item.path}
                onClick={onClick}
                className={cn(
                    "flex items-center w-full px-4 py-2.5 text-sm font-medium rounded-lg transition-colors",
                    isActive
                        ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400"
                        : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                )}
            >
                <item.icon className="w-5 h-5 mr-3" />
                {item.label}
            </NavLink>
        );
    };

    return (
        <div className="min-h-screen bg-transparent flex text-zinc-900 dark:text-zinc-100 font-sans overflow-hidden">
            {/* Sidebar Desktop */}
            <aside className="hidden lg:flex flex-col w-72 glass-sidebar sticky top-0 h-screen">
                <div className="p-8">
                    <div className="flex items-center gap-3 px-2">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <Wallet className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">
                            FinanceFlow
                        </h1>
                    </div>
                </div>

                <nav className="flex-1 px-4 space-y-1.5 mt-4">
                    <p className="px-4 mb-2 text-[10px] uppercase tracking-widest font-bold text-zinc-400 dark:text-zinc-500">Menú Principal</p>
                    {navItems.map((item) => (
                        <NavItem key={item.path} item={item} />
                    ))}
                </nav>

                <div className="p-6 mt-auto border-t border-zinc-200/50 dark:border-zinc-800/50">
                    <div className="px-4 py-4 mb-4 rounded-2xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/10 dark:border-emerald-500/20">
                        <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Próximamente</p>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1">Sincronización bancaria automática en camino.</p>
                    </div>
                    <button onClick={handleLogout} className="flex items-center w-full px-4 py-2.5 text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/5 rounded-xl transition-all duration-300">
                        <LogOut className="w-5 h-5 mr-3" />
                        Cerrar Sesión
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 h-screen relative">
                {/* Mobile Header */}
                <header className="lg:hidden flex items-center justify-between p-4 glass sticky top-0 z-40">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
                            <Wallet className="w-5 h-5 text-white" />
                        </div>
                        <h1 className="text-lg font-bold bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
                            FinanceFlow
                        </h1>
                    </div>
                    <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 -mr-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg">
                        <Menu className="w-6 h-6" />
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={location.pathname}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                            className="p-6 lg:p-10 max-w-[1400px] mx-auto w-full"
                        >
                            {children}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <div className="fixed inset-0 z-50 lg:hidden flex">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50"
                            onClick={() => setIsMobileMenuOpen(false)}
                        />
                        <motion.div
                            initial={{ x: -256 }}
                            animate={{ x: 0 }}
                            exit={{ x: -256 }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="relative flex flex-col w-64 bg-white dark:bg-zinc-900 h-full p-4 shadow-xl"
                        >
                            <div className="mb-6 px-2">
                                <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
                                    FinanceFlow
                                </h1>
                            </div>
                            <nav className="flex-1 space-y-1">
                                {navItems.map((item) => (
                                    <NavItem
                                        key={item.path}
                                        item={item}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    />
                                ))}
                            </nav>
                            <button onClick={() => { setIsMobileMenuOpen(false); handleLogout(); }} className="flex items-center w-full px-4 py-2.5 text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/5 rounded-xl transition-all duration-300">
                                <LogOut className="w-5 h-5 mr-3" />
                                Cerrar Sesión
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
