import React, { useState, useEffect } from 'react';
import { Modal } from '../common/components/Modal';

const INPUT = "w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-colors";
const EMOJIS = ['🎉', '🍖', '🌍', '💼', '🏠', '🍻', '✈️', '🎂', '⚽', '🎸', '🏖️', '🛒'];

export function CreateEventModal({ isOpen, onClose, onSubmit, initialData = null, submitting = false }) {
    const [form, setForm] = useState({ name: '', coverEmoji: '🎉', eventDate: '', currency: 'ARS', description: '' });

    useEffect(() => {
        if (initialData) {
            setForm({
                name: initialData.name || '',
                coverEmoji: initialData.coverEmoji || '🎉',
                eventDate: initialData.eventDate ? initialData.eventDate.split('T')[0] : '',
                currency: initialData.currency || 'ARS',
                description: initialData.description || '',
            });
        } else {
            setForm({ name: '', coverEmoji: '🎉', eventDate: '', currency: 'ARS', description: '' });
        }
    }, [initialData, isOpen]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.name.trim()) return;
        onSubmit({
            name: form.name.trim(),
            coverEmoji: form.coverEmoji,
            eventDate: form.eventDate || null,
            currency: form.currency,
            description: form.description.trim() || null,
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'Editar evento' : 'Nuevo evento'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Emoji</label>
                    <div className="flex flex-wrap gap-2">
                        {EMOJIS.map(em => (
                            <button
                                key={em}
                                type="button"
                                onClick={() => setForm(p => ({ ...p, coverEmoji: em }))}
                                aria-pressed={form.coverEmoji === em}
                                className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${
                                    form.coverEmoji === em
                                        ? 'bg-orange-500/20 ring-2 ring-orange-500'
                                        : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                                }`}
                            >
                                {em}
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Nombre</label>
                    <input
                        autoFocus
                        value={form.name}
                        onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                        required
                        placeholder="Asado del finde, Viaje a Bariloche..."
                        className={INPUT}
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Fecha</label>
                        <input type="date" value={form.eventDate} onChange={e => setForm(p => ({ ...p, eventDate: e.target.value }))} className={INPUT} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Moneda</label>
                        <select value={form.currency} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))} className={INPUT}>
                            <option value="ARS">ARS</option>
                            <option value="USD">USD</option>
                            <option value="EUR">EUR</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Descripción (opcional)</label>
                    <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Detalle del evento" className={INPUT} />
                </div>
                <div className="flex gap-3 pt-2">
                    <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 font-medium transition-colors">
                        Cancelar
                    </button>
                    <button type="submit" disabled={submitting} className="flex-1 px-4 py-2.5 rounded-xl text-white bg-orange-600 hover:bg-orange-700 font-medium transition-colors disabled:opacity-60">
                        {submitting ? 'Guardando...' : (initialData ? 'Guardar' : 'Crear evento')}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
