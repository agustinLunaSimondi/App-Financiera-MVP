import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Wallet, PieChart, PiggyBank, Settings, Plus } from 'lucide-react';
import { cn } from '../../../lib/utils';

/**
 * Bottom navigation visible solo en mobile (hidden lg+).
 * Las 4 rutas más usadas + un FAB central que abre el modal de "nueva transacción".
 *
 * El layout usa una grid de 5 columnas — la columna central queda vacía para que
 * el FAB (renderizado por encima por Layout) "flote" sobre ella.
 */
export function BottomNav({ onQuickAdd }) {
    const items = [
        { icon: LayoutDashboard, label: 'Inicio', path: '/' },
        { icon: Wallet, label: 'Mov.', path: '/transactions' },
        // gap central para el FAB
        { icon: PieChart, label: 'Presup.', path: '/budget' },
        { icon: PiggyBank, label: 'Metas', path: '/savings' },
    ];

    const linkClass = ({ isActive }) => cn(
        "flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl transition-all",
        "text-[10px] font-bold tracking-tight",
        isActive
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 active:scale-95"
    );

    return (
        <nav
            className={cn(
                "lg:hidden fixed bottom-0 left-0 right-0 z-40",
                "bg-white/85 dark:bg-zinc-900/85 backdrop-blur-xl",
                "border-t border-zinc-200/60 dark:border-zinc-800/60",
                "shadow-[0_-2px_20px_rgba(0,0,0,0.04)]"
            )}
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            aria-label="Navegación principal"
        >
            <div className="grid grid-cols-5 items-stretch h-16">
                {items.slice(0, 2).map(item => (
                    <NavLink key={item.path} to={item.path} end={item.path === '/'} className={linkClass} aria-label={item.label}>
                        {({ isActive }) => (
                            <>
                                <item.icon className={cn("w-5 h-5 transition-transform", isActive && "scale-110")} />
                                <span className="leading-none">{item.label}</span>
                            </>
                        )}
                    </NavLink>
                ))}

                {/* FAB central — botón "Nueva transacción" */}
                <div className="relative flex items-center justify-center">
                    <button
                        type="button"
                        onClick={onQuickAdd}
                        aria-label="Nueva transacción"
                        className={cn(
                            "absolute -top-5 w-14 h-14 rounded-2xl",
                            "bg-gradient-to-br from-emerald-500 to-emerald-600",
                            "text-white flex items-center justify-center",
                            "shadow-xl shadow-emerald-500/30",
                            "hover:scale-110 active:scale-95 transition-all duration-200",
                            "ring-4 ring-white dark:ring-zinc-900"
                        )}
                    >
                        <Plus className="w-7 h-7" strokeWidth={2.5} />
                    </button>
                </div>

                {items.slice(2).map(item => (
                    <NavLink key={item.path} to={item.path} className={linkClass} aria-label={item.label}>
                        {({ isActive }) => (
                            <>
                                <item.icon className={cn("w-5 h-5 transition-transform", isActive && "scale-110")} />
                                <span className="leading-none">{item.label}</span>
                            </>
                        )}
                    </NavLink>
                ))}
            </div>
        </nav>
    );
}
