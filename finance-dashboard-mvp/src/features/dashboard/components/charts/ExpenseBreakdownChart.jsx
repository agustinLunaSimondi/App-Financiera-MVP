import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { PieChart as PieChartIcon } from 'lucide-react';

const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        return (
            <div className="glass p-3 rounded-xl border border-white/20 shadow-2xl backdrop-blur-2xl">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: payload[0].payload.color }} />
                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                        {payload[0].name}: ${Number(payload[0].value).toLocaleString('es-AR')}
                    </span>
                </div>
            </div>
        );
    }
    return null;
};

function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center h-full py-8 text-center bg-zinc-50/50 dark:bg-zinc-800/10 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800/50">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center mb-3 animate-pulse">
                <PieChartIcon className="w-6 h-6 text-rose-400 dark:text-rose-400" />
            </div>
            <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Sin gastos registrados</h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-[200px]">
                La distribución por categoría aparecerá cuando registres tus gastos del mes.
            </p>
        </div>
    );
}

export function ExpenseBreakdownChart({ data }) {
    const isEmpty = !data || data.length === 0 || data.every(d => (d.value ?? 0) === 0);

    if (isEmpty) return <EmptyState />;

    return (
        <ResponsiveContainer width="100%" height={300}>
            <PieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={8}
                    dataKey="value"
                    stroke="none"
                    cornerRadius={6}
                    animationBegin={200}
                    animationDuration={1200}
                >
                    {data.map((entry, index) => (
                        <Cell
                            key={`cell-${index}`}
                            fill={entry.color}
                            className="focus:outline-none transition-opacity duration-300 hover:opacity-80 cursor-pointer"
                        />
                    ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                    iconType="circle"
                    wrapperStyle={{ paddingTop: '20px', fontSize: '11px', fontWeight: 500 }}
                />
            </PieChart>
        </ResponsiveContainer>
    );
}
