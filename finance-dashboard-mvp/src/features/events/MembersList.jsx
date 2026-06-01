import React, { useState } from 'react';
import { UserPlus, Trash2 } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { cn } from '../../lib/utils';

const INPUT = "w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-colors text-sm";

export function MembersList({ event, isOwner, onAddMember, onRemoveMember, busy = false }) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const closed = event.status === 'CLOSED';

    const submit = (e) => {
        e.preventDefault();
        if (!name.trim() && !email.trim()) return;
        onAddMember({ displayName: name.trim(), email: email.trim() || null });
        setName('');
        setEmail('');
    };

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                {event.members.map(m => {
                    const net = Number(m.netBalance);
                    const positive = net > 0.005;
                    const negative = net < -0.005;
                    return (
                        <div key={m.id} className="flex items-center justify-between gap-3 glass-card rounded-2xl px-5 py-4">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold shrink-0">
                                    {(m.displayName || '?').charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <p className="font-bold text-sm text-zinc-900 dark:text-white truncate">
                                        {m.displayName}
                                        {m.role === 'OWNER' && <span className="ml-2 text-[9px] uppercase tracking-widest font-black text-orange-500">Organizador</span>}
                                    </p>
                                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate">
                                        {m.email || (m.userId ? 'Usuario registrado' : 'Participante externo')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                                <div className="text-right">
                                    <p className={cn(
                                        "font-black text-sm",
                                        positive ? "text-emerald-600 dark:text-emerald-400" : negative ? "text-rose-500" : "text-zinc-400"
                                    )}>
                                        {positive ? '+' : negative ? '−' : ''}{formatCurrency(Math.abs(net), event.currency)}
                                    </p>
                                    <p className="text-[10px] text-zinc-400">
                                        {positive ? 'le deben' : negative ? 'debe' : 'saldado'}
                                    </p>
                                </div>
                                {isOwner && !closed && m.role !== 'OWNER' && (
                                    <button
                                        type="button"
                                        onClick={() => onRemoveMember(m.id)}
                                        aria-label="Eliminar miembro"
                                        className="p-2 text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {isOwner && !closed && (
                <form onSubmit={submit} className="glass-card rounded-2xl p-4 space-y-3">
                    <p className="text-xs font-black uppercase tracking-widest text-zinc-400">Agregar miembro</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input value={name} onChange={e => setName(e.target.value)} placeholder="Nombre" className={INPUT} />
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email (opcional, para invitar)" className={INPUT} />
                    </div>
                    <button
                        type="submit"
                        disabled={busy || (!name.trim() && !email.trim())}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white bg-orange-600 hover:bg-orange-700 font-medium transition-colors disabled:opacity-50"
                    >
                        <UserPlus className="w-4 h-4" />
                        Agregar
                    </button>
                </form>
            )}
        </div>
    );
}
