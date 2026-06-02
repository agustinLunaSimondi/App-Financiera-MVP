import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
    ArrowLeft, Plus, Receipt, Users, Scale, Trash2, Lock,
    Paperclip, Pencil, Check, ChevronDown,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../features/common/components/Card';
import { EmptyState } from '../features/common/components/EmptyState';
import { ConfirmDeleteModal } from '../features/common/components/ConfirmDeleteModal';
import { AddExpenseModal } from '../features/events/AddExpenseModal';
import { CreateEventModal } from '../features/events/CreateEventModal';
import { MembersList } from '../features/events/MembersList';
import { SettlementsSummary } from '../features/events/SettlementsSummary';
import { ReceiptViewer } from '../features/events/ReceiptViewer';
import {
    getEvent, updateEvent, deleteEvent, closeEvent,
    addEventMember, removeEventMember, addEventExpense,
    deleteEventExpense, uploadEventReceipt, markSplitPaid,
} from '../services/events';
import { formatCurrency } from '../utils/formatters';
import { parseApiError } from '../lib/apiErrors';
import { cn } from '../lib/utils';

const fmtDate = (d) => d ? new Date(d.split('T')[0] + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }) : '';

export function EventDetailPage() {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('expenses');
    const [addOpen, setAddOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [confirm, setConfirm] = useState(null); // { kind, id, name }
    const [receipt, setReceipt] = useState(null); // { url, filename }
    const [expanded, setExpanded] = useState(null); // expense id

    const load = useCallback(async () => {
        try {
            setEvent(await getEvent(eventId));
        } catch (err) {
            toast.error(parseApiError(err, 'No se pudo cargar el evento'));
            navigate('/events');
        } finally {
            setLoading(false);
        }
    }, [eventId, navigate]);

    useEffect(() => { load(); }, [load]);

    const isOwner = !!event && !!user && event.ownerId === user.id;
    const closed = event?.status === 'CLOSED';

    const run = async (fn, okMsg, errMsg) => {
        setBusy(true);
        try {
            const updated = await fn();
            if (updated) setEvent(updated);
            if (okMsg) toast.success(okMsg);
            return updated;
        } catch (err) {
            toast.error(parseApiError(err, errMsg));
            throw err;
        } finally {
            setBusy(false);
        }
    };

    const handleAddExpense = async (payload, file) => {
        try {
            const priorIds = new Set((event.expenses || []).map(e => e.id));
            let updated = await addEventExpense(event.id, payload);
            if (file) {
                const newExp = (updated.expenses || []).find(e => !priorIds.has(e.id));
                if (newExp) {
                    try { updated = await uploadEventReceipt(event.id, newExp.id, file); }
                    catch (e) { toast.error(parseApiError(e, 'Gasto creado, pero falló subir el recibo')); }
                }
            }
            setEvent(updated);
            setAddOpen(false);
            toast.success('Gasto agregado');
        } catch (err) {
            toast.error(parseApiError(err, 'No se pudo agregar el gasto'));
        }
    };

    const handleEdit = async (payload) => {
        await run(() => updateEvent(event.id, payload), 'Evento actualizado', 'No se pudo actualizar');
        setEditOpen(false);
    };

    const handleConfirm = async () => {
        if (!confirm) return;
        if (confirm.kind === 'event') {
            setBusy(true);
            try {
                await deleteEvent(event.id);
                toast.success('Evento eliminado');
                navigate('/events');
            } catch (err) {
                toast.error(parseApiError(err, 'No se pudo eliminar el evento'));
            } finally {
                setBusy(false);
                setConfirm(null);
            }
        } else if (confirm.kind === 'expense') {
            try {
                await run(() => deleteEventExpense(event.id, confirm.id), 'Gasto eliminado', 'No se pudo eliminar el gasto');
            } finally {
                setConfirm(null);
            }
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-8 w-32 glass-card rounded-xl animate-pulse" />
                <div className="h-32 glass-card rounded-3xl animate-pulse" />
                <div className="h-64 glass-card rounded-2xl animate-pulse" />
            </div>
        );
    }
    if (!event) return null;

    const tabs = [
        { key: 'expenses', label: 'Gastos', icon: Receipt },
        { key: 'members', label: 'Miembros', icon: Users },
        { key: 'settle', label: 'Liquidar', icon: Scale },
    ];

    return (
        <div className="space-y-6">
            <button
                type="button"
                onClick={() => navigate('/events')}
                className="inline-flex items-center gap-2 text-sm font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
                <ArrowLeft className="w-4 h-4" /> Eventos
            </button>

            {/* Cover */}
            <Card className="relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                        <div className="w-16 h-16 rounded-3xl bg-orange-500/10 flex items-center justify-center text-4xl shrink-0">
                            {event.coverEmoji || '🎉'}
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight truncate">{event.name}</h1>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                                {event.eventDate && <span>{fmtDate(event.eventDate)}</span>}
                                <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {event.members.length}</span>
                                <span className={cn(
                                    "font-black uppercase tracking-widest px-2 py-0.5 rounded",
                                    closed ? "bg-zinc-400/15 text-zinc-500" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                )}>{closed ? 'Cerrado' : 'Activo'}</span>
                            </div>
                            {event.description && <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1.5 truncate">{event.description}</p>}
                        </div>
                    </div>
                    <div className="text-left sm:text-right shrink-0">
                        <p className="text-[10px] uppercase tracking-widest font-black text-zinc-400">Total</p>
                        <p className="text-3xl font-black text-zinc-900 dark:text-white">{formatCurrency(event.totalAmount, event.currency)}</p>
                    </div>
                </div>

                {isOwner && (
                    <div className="flex flex-wrap gap-2 mt-5 pt-5 border-t border-zinc-200/50 dark:border-zinc-800/50">
                        <button type="button" onClick={() => setEditOpen(true)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                            <Pencil className="w-3.5 h-3.5" /> Editar
                        </button>
                        {!closed && (
                            <button type="button" disabled={busy} onClick={() => run(() => closeEvent(event.id), 'Evento cerrado', 'No se pudo cerrar')} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 transition-colors">
                                <Lock className="w-3.5 h-3.5" /> Cerrar evento
                            </button>
                        )}
                        <button type="button" onClick={() => setConfirm({ kind: 'event', id: event.id, name: event.name })} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" /> Eliminar
                        </button>
                    </div>
                )}
            </Card>

            {/* Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-2xl bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-700/50 w-full sm:w-auto sm:inline-flex">
                {tabs.map(t => (
                    <button
                        key={t.key}
                        type="button"
                        onClick={() => setTab(t.key)}
                        className={cn(
                            "flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all",
                            tab === t.key ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                        )}
                    >
                        <t.icon className="w-4 h-4" /> {t.label}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            {tab === 'expenses' && (
                <div className="space-y-4">
                    {!closed && (
                        <button
                            type="button"
                            onClick={() => setAddOpen(true)}
                            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-dashed border-orange-400/50 text-orange-600 dark:text-orange-400 bg-orange-500/5 hover:bg-orange-500/10 text-sm font-bold transition-colors"
                        >
                            <Plus className="w-4 h-4" /> Agregar gasto
                        </button>
                    )}

                    {event.expenses.length === 0 ? (
                        <EmptyState icon={Receipt} tone="warning" title="Sin gastos todavía" description={closed ? 'Este evento no tiene gastos registrados.' : 'Agregá el primer gasto del evento.'} />
                    ) : (
                        event.expenses.map(exp => {
                            const perCount = exp.splits.length;
                            const isOpen = expanded === exp.id;
                            return (
                                <Card key={exp.id} className="!p-0">
                                    <div className="p-5">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="font-bold text-zinc-900 dark:text-white truncate">{exp.description}</p>
                                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                                                    Pagó <span className="font-bold text-zinc-700 dark:text-zinc-300">{exp.paidByName}</span> · {fmtDate(exp.expenseDate)}
                                                </p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="font-black text-zinc-900 dark:text-white">{formatCurrency(exp.amount, event.currency)}</p>
                                                <p className="text-[10px] text-zinc-400">{perCount} {perCount === 1 ? 'persona' : 'personas'}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 mt-3">
                                            <button type="button" onClick={() => setExpanded(isOpen ? null : exp.id)} className="inline-flex items-center gap-1 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">
                                                <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", isOpen && "rotate-180")} /> Detalle
                                            </button>
                                            {exp.receiptUrl && (
                                                <button type="button" onClick={() => setReceipt({ url: exp.receiptUrl, filename: exp.receiptFilename })} className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline">
                                                    <Paperclip className="w-3.5 h-3.5" /> Recibo
                                                </button>
                                            )}
                                            <div className="flex-1" />
                                            {!closed && (
                                                <button type="button" onClick={() => setConfirm({ kind: 'expense', id: exp.id, name: exp.description })} aria-label="Eliminar gasto" className="p-1.5 text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>

                                        {isOpen && (
                                            <div className="mt-3 pt-3 border-t border-zinc-200/50 dark:border-zinc-800/50 space-y-1.5">
                                                {exp.splits.map(s => (
                                                    <button
                                                        key={s.id}
                                                        type="button"
                                                        disabled={busy}
                                                        onClick={() => run(() => markSplitPaid(event.id, exp.id, s.id), null, 'No se pudo actualizar el split')}
                                                        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors text-left"
                                                    >
                                                        <span className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 min-w-0">
                                                            <span className={cn(
                                                                "w-4 h-4 rounded-md border flex items-center justify-center shrink-0",
                                                                s.isPaid ? "bg-emerald-500 border-emerald-500" : "border-zinc-300 dark:border-zinc-600"
                                                            )}>
                                                                {s.isPaid && <Check className="w-3 h-3 text-white" />}
                                                            </span>
                                                            <span className={cn("truncate", s.isPaid && "line-through text-zinc-400")}>{s.memberName}</span>
                                                        </span>
                                                        <span className={cn("text-sm font-bold shrink-0", s.isPaid ? "text-zinc-400 line-through" : "text-zinc-900 dark:text-white")}>
                                                            {formatCurrency(s.shareAmount, event.currency)}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </Card>
                            );
                        })
                    )}
                </div>
            )}

            {tab === 'members' && (
                <MembersList
                    event={event}
                    isOwner={isOwner}
                    busy={busy}
                    onAddMember={(m) => run(() => addEventMember(event.id, m), 'Miembro agregado', 'No se pudo agregar el miembro')}
                    onRemoveMember={(id) => run(() => removeEventMember(event.id, id), 'Miembro eliminado', 'No se pudo eliminar el miembro')}
                />
            )}

            {tab === 'settle' && <SettlementsSummary event={event} />}

            {/* Modals */}
            <AddExpenseModal
                isOpen={addOpen}
                onClose={() => setAddOpen(false)}
                members={event.members}
                currency={event.currency}
                onSubmit={handleAddExpense}
                submitting={busy}
            />
            <CreateEventModal
                isOpen={editOpen}
                onClose={() => setEditOpen(false)}
                initialData={event}
                onSubmit={handleEdit}
                submitting={busy}
            />
            <ConfirmDeleteModal
                isOpen={!!confirm}
                onClose={() => setConfirm(null)}
                onConfirm={handleConfirm}
                loading={busy}
                title={confirm?.kind === 'event' ? '¿Eliminar este evento?' : '¿Eliminar este gasto?'}
                description="Esta acción no se puede deshacer."
                itemName={confirm?.name}
            />
            <ReceiptViewer
                isOpen={!!receipt}
                onClose={() => setReceipt(null)}
                url={receipt?.url}
                filename={receipt?.filename}
            />
        </div>
    );
}
