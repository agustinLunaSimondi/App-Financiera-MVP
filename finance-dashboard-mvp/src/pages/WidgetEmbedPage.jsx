import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Wallet, Target, TrendingDown } from 'lucide-react';
import { getPublicWidget } from '../services/api';

/**
 * Vista pública del widget embebible (#64). Sin auth, sin sidebar, sin layout.
 * Renderizada en iframe. URL: /widget/:token
 */
export function WidgetEmbedPage() {
    const { token } = useParams();
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        getPublicWidget(token).then(setData).catch((e) => {
            const status = e?.response?.status;
            if (status === 404) setError('Widget no encontrado');
            else if (status === 410) setError('Widget expirado');
            else setError('Error al cargar');
        });
    }, [token]);

    if (error) {
        return (
            <div className="w-full h-screen flex items-center justify-center p-6 bg-zinc-50">
                <div className="text-center text-zinc-500 font-bold text-sm">{error}</div>
            </div>
        );
    }
    if (!data) {
        return <div className="w-full h-screen flex items-center justify-center bg-zinc-50">…</div>;
    }

    return (
        <div className="w-full h-screen flex items-center justify-center p-4 bg-gradient-to-br from-zinc-50 to-white">
            {data.type === 'balance' && <BalanceWidget data={data.data} />}
            {data.type === 'goal' && <GoalWidget data={data.data} />}
            {data.type === 'month_spend' && <MonthSpendWidget data={data.data} />}
            <span className="absolute bottom-2 right-3 text-[9px] text-zinc-400 font-bold tracking-wider">
                via Vuelto
            </span>
        </div>
    );
}

function BalanceWidget({ data }) {
    return (
        <div className="w-full max-w-md rounded-3xl p-6 bg-gradient-to-br from-emerald-500 to-blue-600 text-white shadow-2xl">
            <div className="flex items-center gap-2 mb-3">
                <Wallet className="w-5 h-5" />
                <span className="text-xs uppercase tracking-widest font-bold opacity-80">Balance total</span>
            </div>
            <p className="text-4xl font-black tracking-tight">
                ${Number(data.totalBalance).toLocaleString('es-AR', { maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs opacity-80 mt-2">{data.currency} · {data.accounts} cuenta{data.accounts === 1 ? '' : 's'}</p>
        </div>
    );
}

function GoalWidget({ data }) {
    return (
        <div className="w-full max-w-md rounded-3xl p-6 bg-white border border-zinc-200 shadow-2xl">
            <div className="flex items-center gap-2 mb-3">
                <Target className="w-5 h-5" style={{ color: data.color || '#10B981' }} />
                <span className="text-xs uppercase tracking-widest font-bold text-zinc-500">{data.name}</span>
            </div>
            <div className="flex items-end justify-between mb-3">
                <p className="text-3xl font-black text-zinc-900">{data.progressPct}%</p>
                <p className="text-xs text-zinc-500">
                    ${Number(data.current).toLocaleString('es-AR')} / ${Number(data.target).toLocaleString('es-AR')}
                </p>
            </div>
            <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden">
                <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${data.progressPct}%`, backgroundColor: data.color || '#10B981' }}
                />
            </div>
            {data.deadline && (
                <p className="text-[10px] text-zinc-400 mt-2">Deadline {data.deadline}</p>
            )}
        </div>
    );
}

function MonthSpendWidget({ data }) {
    return (
        <div className="w-full max-w-md rounded-3xl p-6 bg-gradient-to-br from-rose-500 to-purple-600 text-white shadow-2xl">
            <div className="flex items-center gap-2 mb-3">
                <TrendingDown className="w-5 h-5" />
                <span className="text-xs uppercase tracking-widest font-bold opacity-80">Gasto del mes</span>
            </div>
            <p className="text-4xl font-black tracking-tight">
                ${Number(data.spent).toLocaleString('es-AR', { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs opacity-80 mt-2 capitalize">{data.monthLabel} · {data.txCount} transacciones</p>
        </div>
    );
}
