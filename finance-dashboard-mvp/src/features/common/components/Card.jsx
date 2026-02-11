import React from 'react';
import { cn } from '../../../lib/utils';
import { motion } from 'framer-motion';

export function Card({ className, children, title, subtitle, delay = 0 }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay, ease: [0.23, 1, 0.32, 1] }}
            className={cn("glass-card rounded-2xl overflow-hidden", className)}
        >
            {(title || subtitle) && (
                <div className="px-6 py-5 border-b border-zinc-200/30 dark:border-zinc-800/20 bg-white/20 dark:bg-zinc-900/20">
                    {title && <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">{title}</h3>}
                    {subtitle && <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">{subtitle}</p>}
                </div>
            )}
            <div className="p-6">
                {children}
            </div>
        </motion.div>
    );
}
