import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="glass p-3 rounded-xl border border-white/20 shadow-2xl backdrop-blur-2xl">
                <p className="text-xs font-bold text-zinc-500 mb-2 uppercase tracking-wider">{data.name}</p>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: data.fill }} />
                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {data.realValue > 0 ? '+' : ''}${data.realValue.toLocaleString('es-AR')}
                    </span>
                </div>
            </div>
        );
    }
    return null;
};

export function CashFlowWaterfallChart({ data }) {
    const chartData = useMemo(() => {
        let runningTotal = 0;
        return data.map((item, index) => {
            const val = item.value;
            let uv = 0;
            let pv = 0;

            if (index === 0) {
                uv = 0;
                pv = val;
                runningTotal = val;
            } else if (item.isTotal) {
                uv = 0;
                pv = runningTotal;
            } else {
                if (val < 0) {
                    runningTotal += val;
                    uv = runningTotal;
                    pv = Math.abs(val);
                } else {
                    uv = runningTotal;
                    pv = val;
                    runningTotal += val;
                }
            }

            return {
                name: item.name,
                pv,
                uv,
                realValue: val,
                fill: item.fill
            };
        });
    }, [data]);

    return (
        <ResponsiveContainer width="100%" height={300}>
            <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
            >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E4E7" strokeOpacity={0.4} />
                <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#71717A', fontSize: 11, fontWeight: 500 }}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717A', fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.1)' }} />
                <Bar dataKey="uv" stackId="a" fill="transparent" />
                <Bar dataKey="pv" stackId="a" radius={[6, 6, 6, 6]} animationDuration={1500}>
                    {chartData.map((entry, index) => (
                        <Cell
                            key={`cell-${index}`}
                            fill={entry.fill}
                            className="transition-opacity duration-300 hover:opacity-80 cursor-pointer"
                        />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}
