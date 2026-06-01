import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Users, Plus } from 'lucide-react';
import { PageHeader } from '../features/common/components/PageHeader';
import { EmptyState } from '../features/common/components/EmptyState';
import { EventCard } from '../features/events/EventCard';
import { CreateEventModal } from '../features/events/CreateEventModal';
import { getEvents, createEvent } from '../services/events';
import { parseApiError } from '../lib/apiErrors';
import { cn } from '../lib/utils';
import { BTN_PRIMARY } from '../lib/formClasses';

export function EventsPage() {
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        let active = true;
        getEvents()
            .then(d => { if (active) setEvents(d); })
            .catch(err => toast.error(parseApiError(err, 'No se pudieron cargar los eventos')))
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, []);

    const handleCreate = async (payload) => {
        setSubmitting(true);
        try {
            const ev = await createEvent(payload);
            setModalOpen(false);
            toast.success('Evento creado');
            navigate(`/events/${ev.id}`);
        } catch (err) {
            toast.error(parseApiError(err, 'No se pudo crear el evento'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-10">
            <PageHeader
                section="events"
                icon={Users}
                kicker="Compartido"
                title="Eventos"
                subtitle={events.length === 0
                    ? 'Dividí gastos en grupo con transparencia total.'
                    : `${events.length} ${events.length === 1 ? 'evento' : 'eventos'}`}
                action={
                    <button type="button" onClick={() => setModalOpen(true)} className={cn(BTN_PRIMARY, 'w-full md:w-auto group py-3.5')}>
                        <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" />
                        Nuevo evento
                    </button>
                }
            />

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {[1, 2, 3].map(n => <div key={n} className="h-40 glass-card rounded-2xl animate-pulse" />)}
                </div>
            ) : events.length === 0 ? (
                <EmptyState
                    icon={Users}
                    tone="primary"
                    title="Sin eventos todavía"
                    description="Creá un evento (asado, viaje, trabajo) e invitá participantes para dividir los gastos automáticamente."
                    actionLabel="Crear primer evento"
                    onAction={() => setModalOpen(true)}
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {events.map((ev, i) => (
                        <EventCard key={ev.id} event={ev} delay={i * 0.05} onClick={() => navigate(`/events/${ev.id}`)} />
                    ))}
                </div>
            )}

            <CreateEventModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onSubmit={handleCreate} submitting={submitting} />
        </div>
    );
}
