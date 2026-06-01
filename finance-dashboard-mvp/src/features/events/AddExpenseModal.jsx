import React, { useState, useEffect } from 'react';
import { Paperclip } from 'lucide-react';
import { Modal } from '../common/components/Modal';
import { formatCurrency } from '../../utils/formatters';

const INPUT = "w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-colors";

export function AddExpenseModal({ isOpen, onClose, members = [], currency = 'ARS', onSubmit, submitting = false }) {
    const [form, setForm] = useState({ description: '', amount: '', paidByMemberId: '', expenseDate: new Date().toISOString().split('T')[0] });
    const [file, setFile] = useState(null);

    useEffect(() => {
        if (isOpen) {
            setForm({ description: '', amount: '', paidByMemberId: members[0]?.id || '', expenseDate: new Date().toISOString().split('T')[0] });
            setFile(null);
        }
    }, [isOpen, members]);

    const amountNum = parseFloat(form.amount);
    const perPerson = members.length > 0 && amountNum > 0 ? amountNum / members.length : 0;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.description.trim() || !(amountNum > 0) || !form.paidByMemberId) return;
        onSubmit({
            paidByMemberId: form.paidByMemberId,
            description: form.description.trim(),
            amount: amountNum,
            expenseDate: form.expenseDate,
            splitMode: 'equal',
        }, file);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Agregar gasto">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Descripción</label>
                    <input autoFocus value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} required placeholder="Carne, bebidas, nafta..." className={INPUT} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Monto</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                            <input type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} required placeholder="0.00" className={`${INPUT} pl-7`} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Fecha</label>
                        <input type="date" value={form.expenseDate} onChange={e => setForm(p => ({ ...p, expenseDate: e.target.value }))} required className={INPUT} />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Pagó</label>
                    <select value={form.paidByMemberId} onChange={e => setForm(p => ({ ...p, paidByMemberId: e.target.value }))} required className={INPUT}>
                        {members.map(m => <option key={m.id} value={m.id}>{m.displayName}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Ticket / recibo (opcional)</label>
                    <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-600 cursor-pointer hover:border-orange-500 transition-colors text-sm text-zinc-500 dark:text-zinc-400">
                        <Paperclip className="w-4 h-4" />
                        <span className="truncate">{file ? file.name : 'Subir imagen o PDF'}</span>
                        <input type="file" accept="image/*,application/pdf" onChange={e => setFile(e.target.files?.[0] || null)} className="hidden" />
                    </label>
                </div>
                {perPerson > 0 && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 bg-orange-500/5 border border-orange-500/10 rounded-lg px-3 py-2">
                        Se divide en partes iguales: <span className="font-bold text-orange-600 dark:text-orange-400">{formatCurrency(perPerson, currency)}</span> por persona ({members.length}).
                    </p>
                )}
                <div className="flex gap-3 pt-2">
                    <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 font-medium transition-colors">
                        Cancelar
                    </button>
                    <button type="submit" disabled={submitting} className="flex-1 px-4 py-2.5 rounded-xl text-white bg-orange-600 hover:bg-orange-700 font-medium transition-colors disabled:opacity-60">
                        {submitting ? 'Guardando...' : 'Agregar gasto'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
