import React from 'react';
import { cn } from '../../../lib/utils';
import { getSectionPalette } from '../../../lib/sectionPalette';

/**
 * Header estándar de página con kicker + título + subtítulo + acción opcional.
 * Lee la paleta de color por sección desde sectionPalette.
 *
 * Reemplaza el patrón duplicado en TransactionsPage, BudgetPage, SavingsPage,
 * RecurringPage, CardsPage, IntegrationsPage, SettingsPage, ChatPage, etc.
 */
export function PageHeader({
    icon: Icon,
    section = 'dashboard',
    kicker,
    title,
    subtitle,
    action,
    className,
}) {
    const palette = getSectionPalette(section);

    return (
        <header className={cn(
            "flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6",
            className
        )}>
            <div className="min-w-0">
                {(Icon || kicker) && (
                    <div className="flex items-center gap-3 mb-2">
                        {Icon && (
                            <div className={cn("p-2 rounded-lg shrink-0", palette.iconBg)}>
                                <Icon className={cn("w-5 h-5", palette.iconText)} />
                            </div>
                        )}
                        {kicker && (
                            <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                                {kicker}
                            </h2>
                        )}
                    </div>
                )}
                <h1 className="text-2xl md:text-4xl font-black text-zinc-900 dark:text-white tracking-tight">
                    {title}
                </h1>
                {subtitle && (
                    <p className="text-zinc-500 dark:text-zinc-400 font-medium mt-2 text-sm md:text-base max-w-2xl">
                        {subtitle}
                    </p>
                )}
            </div>
            {action && (
                <div className="shrink-0 w-full md:w-auto">
                    {action}
                </div>
            )}
        </header>
    );
}
