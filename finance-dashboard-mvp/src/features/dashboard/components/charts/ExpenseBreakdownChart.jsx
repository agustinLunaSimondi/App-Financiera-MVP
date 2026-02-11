import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

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

export function ExpenseBreakdownChart({ data }) {
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
