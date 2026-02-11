import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        return (
            <div className="glass p-3 rounded-xl border border-white/20 shadow-2xl backdrop-blur-2xl">
                <p className="text-xs font-bold text-zinc-500 mb-2 uppercase tracking-wider">{payload[0].payload.category}</p>
                {payload.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2 mb-1 last:mb-0">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.fill }} />
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

export function BudgetComparisonChart({ data }) {
    return (
        <ResponsiveContainer width="100%" height={300}>
            <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                barGap={8}
            >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E4E4E7" strokeOpacity={0.4} />
                <XAxis type="number" hide />
                <YAxis
                    dataKey="category"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#71717A', fontSize: 11, fontWeight: 500 }}
                    width={100}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.1)' }} />
                <Bar
                    dataKey="budget"
                    name="Presupuesto"
                    fill="#E4E4E7"
                    radius={[0, 10, 10, 0]}
                    barSize={12}
                    animationDuration={1500}
                />
                <Bar
                    dataKey="actual"
                    name="Gasto Real"
                    fill="#3b82f6"
                    radius={[0, 10, 10, 0]}
                    barSize={12}
                    animationDuration={1500}
                />
            </BarChart>
        </ResponsiveContainer>
    );
}
