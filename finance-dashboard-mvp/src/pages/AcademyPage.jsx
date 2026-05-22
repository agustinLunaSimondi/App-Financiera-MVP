import React, { useState } from 'react';

import {
    GraduationCap, TrendingUp, PiggyBank, CreditCard, Calculator,
    ChevronDown, ChevronUp, Lightbulb, BookOpen, DollarSign, Percent,
    ArrowRight, Star, Clock, BarChart3
} from 'lucide-react';
import { PageHeader } from '../features/common/components/PageHeader';

// ─── Data ────────────────────────────────────────────────────
const concepts = [
    {
        id: 'tna',
        icon: Percent,
        title: 'TNA – Tasa Nominal Anual',
        color: 'blue',
        short: 'La tasa de interés sin capitalización. Ideal para comparar entre bancos.',
        full: `La Tasa Nominal Anual (TNA) es la tasa de interés que se anuncia en los productos financieros. No tiene en cuenta la capitalización de intereses.

**Ejemplo práctico:** Si un banco te ofrece un plazo fijo al 75% TNA a 30 días, el interés mensual sería:
- Interés mensual = 75% / 365 × 30 = 6.16%
- Si invertís $100.000, ganás $6.164 en 30 días.

**Dato clave:** La TNA es útil para comparar entre bancos, pero no refleja cuánto ganás realmente si reinvertís.`,
    },
    {
        id: 'tea',
        icon: TrendingUp,
        title: 'TEA – Tasa Efectiva Anual',
        color: 'green',
        short: 'El rendimiento real considerando reinversión de intereses.',
        full: `La Tasa Efectiva Anual (TEA) muestra el rendimiento real que obtenés si reinvertís los intereses que vas ganando durante todo el año.

**Fórmula:** TEA = (1 + TNA/n)^n - 1
Donde n = número de períodos de capitalización en el año.

**Ejemplo:** Con una TNA del 75% capitalizada mensualmente:
- TEA = (1 + 0.75/12)^12 - 1 = 107.46%
- ¡Ganás más del doble de lo que sugiere la TNA!

**Consejo:** Siempre pedí la TEA al comparar opciones de inversión.`,
    },
    {
        id: 'plazo-fijo',
        icon: Clock,
        title: 'Plazo Fijo Tradicional',
        color: 'purple',
        short: 'Invertí tu dinero por un período fijo y generá intereses seguros.',
        full: `Un plazo fijo es un depósito que hacés en un banco por un período determinado (mínimo 30 días). A cambio, el banco te paga una tasa de interés.

**Ventajas:**
- Inversión segura (garantizada por el Estado hasta cierto monto)
- Rendimiento predecible
- Ideal para empezar a invertir

**Desventajas:**
- Tu dinero queda "bloqueado" hasta el vencimiento
- La inflación puede comerse las ganancias
- Penalización si retirás antes

**Tip:** Usá nuestra calculadora para simular cuánto ganarías.`,
    },
    {
        id: 'inflacion',
        icon: BarChart3,
        title: 'Inflación y Tasa Real',
        color: 'red',
        short: 'Entendé si realmente estás ganando o perdiendo poder adquisitivo.',
        full: `La inflación es el aumento general de precios. Si tu inversión rinde menos que la inflación, estás perdiendo poder adquisitivo.

**Tasa Real ≈ Tasa Nominal − Inflación**

**Ejemplo:**
- Tu plazo fijo rinde 75% anual (TNA)
- La inflación es del 100% anual
- Tasa real = 75% − 100% = −25% → ¡Estás perdiendo!

**Regla de oro:** Siempre compará el rendimiento de tus inversiones contra la inflación esperada.`,
    },
    {
        id: 'diversificacion',
        icon: PiggyBank,
        title: 'Diversificación',
        color: 'amber',
        short: 'No pongas todos los huevos en la misma canasta.',
        full: `Diversificar significa repartir tu dinero en distintos tipos de inversiones para reducir el riesgo.

**Ejemplo de portafolio diversificado:**
- 40% Plazo fijo (seguridad)
- 30% Fondos Comunes de Inversión (crecimiento)
- 20% Dólar MEP (cobertura cambiaria)
- 10% Acciones/CEDEARs (alto rendimiento potencial)

**Beneficio principal:** Si una inversión baja, las otras pueden compensar la pérdida.

**Consejo:** Empezá simple y andá diversificando a medida que aprendas.`,
    },
    {
        id: 'presupuesto',
        icon: CreditCard,
        title: 'Regla 50/30/20',
        color: 'cyan',
        short: 'Un método simple para organizar tus ingresos mensuales.',
        full: `La regla 50/30/20 es un método popular para presupuestar tus ingresos:

**50% – Necesidades:** Alquiler, comida, servicios, transporte.
**30% – Deseos:** Salidas, streaming, hobbies, ropa.
**20% – Ahorro e inversión:** Fondo de emergencia, plazo fijo, inversiones.

**Ejemplo con sueldo de $500.000:**
- $250.000 para necesidades
- $150.000 para gustos
- $100.000 para ahorro

**Tip:** Si estás arrancando, empezá con 10% de ahorro e ir subiendo.`,
    },
];

const tips = [
    { icon: Star, text: 'Armá un fondo de emergencia de 3 a 6 meses de gastos antes de invertir.' },
    { icon: Lightbulb, text: 'Automatizá tus ahorros: Separá plata apenas cobrás, no lo que "sobra".' },
    { icon: DollarSign, text: 'Cancelá suscripciones que no usás. $2.000/mes = $24.000/año.' },
    { icon: BookOpen, text: 'Revisá tus gastos cada semana en nuestra app para detectar fugas.' },
    { icon: TrendingUp, text: 'Reinvertí los intereses del plazo fijo para aprovechar el interés compuesto.' },
    { icon: Calculator, text: 'Antes de una compra grande, calculá cuántas horas de trabajo te cuesta.' },
];

// ─── Components ──────────────────────────────────────────────

function ConceptCard({ concept }) {
    const [expanded, setExpanded] = useState(false);
    const Icon = concept.icon;
    const colorMap = {
        blue: { bg: 'bg-blue-100 dark:bg-blue-900/40', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' },
        green: { bg: 'bg-green-100 dark:bg-green-900/40', text: 'text-green-600 dark:text-green-400', border: 'border-green-200 dark:border-green-800' },
        purple: { bg: 'bg-purple-100 dark:bg-purple-900/40', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800' },
        red: { bg: 'bg-red-100 dark:bg-red-900/40', text: 'text-red-600 dark:text-red-400', border: 'border-red-200 dark:border-red-800' },
        amber: { bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800' },
        cyan: { bg: 'bg-cyan-100 dark:bg-cyan-900/40', text: 'text-cyan-600 dark:text-cyan-400', border: 'border-cyan-200 dark:border-cyan-800' },
    };
    const c = colorMap[concept.color] || colorMap.blue;

    return (
        <div className={`bg-white dark:bg-gray-800 rounded-xl border ${c.border} shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden`}>
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full p-5 flex items-start gap-4 text-left"
            >
                <div className={`${c.bg} p-3 rounded-lg flex-shrink-0`}>
                    <Icon className={`h-6 w-6 ${c.text}`} />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-lg">{concept.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{concept.short}</p>
                </div>
                <div className="flex-shrink-0 mt-1">
                    {expanded
                        ? <ChevronUp className="h-5 w-5 text-gray-400" />
                        : <ChevronDown className="h-5 w-5 text-gray-400" />
                    }
                </div>
            </button>
            {expanded && (
                <div className={`px-5 pb-5 border-t ${c.border}`}>
                    <div className="pt-4 prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 whitespace-pre-line">
                        {concept.full.split('\n').map((line, i) => {
                            if (line.startsWith('**') && line.endsWith('**')) {
                                return <p key={i} className="font-bold text-gray-900 dark:text-white mt-3 mb-1">{line.replace(/\*\*/g, '')}</p>;
                            }
                            if (line.startsWith('- ')) {
                                return <p key={i} className="ml-4 text-sm">• {line.slice(2)}</p>;
                            }
                            if (line.trim() === '') return <br key={i} />;
                            const parts = line.split(/(\*\*.*?\*\*)/g);
                            return (
                                <p key={i} className="text-sm leading-relaxed">
                                    {parts.map((part, j) =>
                                        part.startsWith('**') && part.endsWith('**')
                                            ? <strong key={j} className="text-gray-900 dark:text-white">{part.replace(/\*\*/g, '')}</strong>
                                            : part
                                    )}
                                </p>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

function PlazoFijoCalculator() {
    const [capital, setCapital] = useState(100000);
    const [tna, setTna] = useState(75);
    const [days, setDays] = useState(30);

    const interest = capital * (tna / 100) * (days / 365);
    const total = capital + interest;
    const monthlyRate = ((tna / 100) / 365) * days * 100;

    const formatMoney = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="bg-green-100 dark:bg-green-900/40 p-3 rounded-lg">
                    <Calculator className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-lg">Calculadora de Plazo Fijo</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Simulá tu rendimiento</p>
                </div>
            </div>

            <div className="space-y-5">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Capital a invertir: {formatMoney(capital)}
                    </label>
                    <input
                        type="range" min="10000" max="10000000" step="10000" value={capital}
                        onChange={(e) => setCapital(Number(e.target.value))}
                        className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>$10.000</span><span>$10.000.000</span>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">TNA: {tna}%</label>
                    <input
                        type="range" min="1" max="200" step="0.5" value={tna}
                        onChange={(e) => setTna(Number(e.target.value))}
                        className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>1%</span><span>200%</span>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Plazo: {days} días</label>
                    <input
                        type="range" min="30" max="365" step="1" value={days}
                        onChange={(e) => setDays(Number(e.target.value))}
                        className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>30 días</span><span>365 días</span>
                    </div>
                </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3">
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Interés ganado</p>
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">{formatMoney(interest)}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total al vencimiento</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{formatMoney(total)}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Rendimiento</p>
                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{monthlyRate.toFixed(2)}%</p>
                </div>
            </div>
        </div>
    );
}

// ─── Main Page ───────────────────────────────────────────────

export function AcademyPage() {
    return (
        <div className="space-y-8">
            <PageHeader
                section="academy"
                icon={GraduationCap}
                kicker="Educación"
                title="Academia Financiera"
                subtitle="Aprendé conceptos clave (TNA, TEA, plazo fijo, diversificación) para tomar mejores decisiones con tu plata."
            />

            {/* Tips Banner */}
            <div className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 dark:from-blue-500/20 dark:via-purple-500/20 dark:to-pink-500/20 border border-blue-200/50 dark:border-blue-800/50 rounded-xl p-5">
                <h2 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-amber-500" />
                    Tips Financieros Rápidos
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {tips.map((tip, i) => {
                        const Icon = tip.icon;
                        return (
                            <div key={i} className="flex items-start gap-3 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-lg p-3">
                                <Icon className="h-4 w-4 text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-gray-700 dark:text-gray-300">{tip.text}</p>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Calculator */}
            <PlazoFijoCalculator />

            {/* Concepts */}
            <div>
                <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-purple-500" />
                    Conceptos Fundamentales
                </h2>
                <div className="space-y-3">
                    {concepts.map(c => <ConceptCard key={c.id} concept={c} />)}
                </div>
            </div>
        </div>
    );
}
