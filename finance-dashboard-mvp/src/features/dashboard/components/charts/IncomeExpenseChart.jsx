import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="glass p-3 rounded-xl border border-white/20 shadow-2xl backdrop-blur-2xl">
                <p className="text-xs font-bold text-zinc-500 mb-2 uppercase tracking-wider">{label}</p>
                {payload.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2 mb-1 last:mb-0">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                            {entry.name}: ${Number(entry.value).toLocaleString('es-AR')}
                        </span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center h-full py-8 text-center bg-zinc-50/50 dark:bg-zinc-800/10 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800/50">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center mb-3 animate-pulse">
                <TrendingUp className="w-6 h-6 text-emerald-500 dark:text-emerald-400" />
            </div>
            <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Sin movimientos en el período</h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-[220px]">
                Registrá ingresos y gastos para ver la evolución mensual acá.
            </p>
        </div>
    );
}

export function IncomeExpenseChart({ data }) {
    const isEmpty = !data || data.length === 0 || data.every(d => (d.income ?? 0) === 0 && (d.expenses ?? 0) === 0);

    if (isEmpty) return <EmptyState />;

    return (
        <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" strokeOpacity={0.08} />
                <XAxis
                    dataKey={(d) => d.label ?? d.month}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#71717A', fontSize: 11, fontWeight: 500 }}
                    dy={10}
                />
                <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#71717A', fontSize: 11 }}
                    tickFormatter={(value) =>
                        new Intl.NumberFormat('es-AR', {
                            notation: 'compact',
                            compactDisplay: 'short',
                            style: 'currency',
                            currency: 'ARS',
                            maximumFractionDigits: 1
                        }).format(value)
                    }
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#10b981', strokeWidth: 1, strokeDasharray: '5 5' }} />
                <Area
                    type="monotone"
                    dataKey="income"
                    name="Ingresos"
                    stroke="#10b981"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorIncome)"
                    animationDuration={1500}
                />
                <Area
                    type="monotone"
                    dataKey="expenses"
                    name="Gastos"
                    stroke="#ef4444"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorExpenses)"
                    animationDuration={1500}
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}
