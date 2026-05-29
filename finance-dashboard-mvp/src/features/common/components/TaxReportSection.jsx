import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Download, Info, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import {
    generateTaxReport, getCategories, updateCategory,
} from '../../../services/api';
import { parseApiError, parseBlobError } from '../../../lib/apiErrors';

/**
 * Descarga un blob de forma robusta cross-plataforma.
 * iOS Safari ignora el atributo `download` en URLs blob: y bloquea `window.open`
 * fuera de un gesto directo (acá venimos de un `await`). Navegar la pestaña al
 * blob abre el visor nativo, desde donde el usuario hace "Compartir → Guardar
 * en Archivos". En desktop/Android el anchor con `download` funciona normal.
 */
function triggerBlobDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent)
        || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    if (isIOS) {
        window.location.href = url;
    } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
    setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/**
 * Sección "Reporte para contador" (#63).
 * - Lista de categorías de gasto: checkbox para marcar deducible.
 * - Selector de período y formato (PDF/Excel).
 * - Botón "Generar y descargar".
 */
export function TaxReportSection() {
    const [cats, setCats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    const today = new Date();
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const [startDate, setStartDate] = useState(firstOfMonth.toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);
    const [format, setFormat] = useState('pdf');

    const refresh = async () => {
        setLoading(true);
        try {
            const all = await getCategories();
            setCats(all.filter((c) => c.type === 'EXPENSE'));
        } catch {
            // silent
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { refresh(); }, []);

    const toggleDeductible = async (cat) => {
        // Optimistic update — si la API falla, revertimos y avisamos.
        const previousValue = !!cat.taxDeductible;
        setCats((prev) => prev.map((c) =>
            c.id === cat.id ? { ...c, taxDeductible: !previousValue } : c
        ));
        try {
            await updateCategory(cat.id, { taxDeductible: !previousValue });
        } catch (e) {
            setCats((prev) => prev.map((c) =>
                c.id === cat.id ? { ...c, taxDeductible: previousValue } : c
            ));
            toast.error(parseApiError(e, 'No se pudo guardar el cambio'));
        }
    };

    const bulkSet = async (value) => {
        const targets = cats.filter((c) => !!c.taxDeductible !== value);
        if (targets.length === 0) return;
        const snapshot = cats;
        setCats((prev) => prev.map((c) => ({ ...c, taxDeductible: value })));
        try {
            await Promise.all(targets.map((c) => updateCategory(c.id, { taxDeductible: value })));
            toast.success(value
                ? `${targets.length} ${targets.length === 1 ? 'categoría marcada' : 'categorías marcadas'} como deducibles`
                : 'Categorías deducibles limpiadas'
            );
        } catch {
            setCats(snapshot);
            toast.error('Algunos cambios fallaron — recargá la página');
        }
    };

    const handleGenerate = async () => {
        const selectedIds = cats.filter((c) => c.taxDeductible).map((c) => c.id);
        if (selectedIds.length === 0) {
            toast.error('Marcá al menos una categoría como deducible');
            return;
        }
        setGenerating(true);
        try {
            // Pasamos categoryIds explícitos: el reporte respeta exactamente lo
            // tildado en la UI, sin depender solo del flag tax_deductible en DB.
            const res = await generateTaxReport({ startDate, endDate, categoryIds: selectedIds, format });
            const ext = format === 'pdf' ? 'pdf' : 'xlsx';
            triggerBlobDownload(res.data, `vuelto-deducibles-${startDate}-${endDate}.${ext}`);
            toast.success('Reporte generado');
        } catch (e) {
            // responseType:'blob' → el error del backend viene en un Blob; parseBlobError lo lee.
            toast.error(await parseBlobError(e, 'No se pudo generar el reporte'));
        } finally {
            setGenerating(false);
        }
    };

    const deductibleCount = cats.filter((c) => c.taxDeductible).length;

    return (
        <div className="p-6">
            <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-zinc-500" />
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                        Reporte para contador (AFIP)
                    </h3>
                </div>
                <Link
                    to="/help"
                    className="text-[11px] flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline font-bold whitespace-nowrap"
                >
                    <Info className="w-3.5 h-3.5" />
                    ¿Cómo funciona?
                </Link>
            </div>

            {/* Explicación de para qué sirve */}
            <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/15 p-4 mb-4">
                <p className="text-sm text-zinc-700 dark:text-zinc-200 leading-relaxed">
                    <strong>Pensado para freelancers y monotributistas.</strong> Marcás qué
                    categorías de gasto son <em>deducibles</em> (Servicios, Honorarios, Internet,
                    Insumos…) y la app arma un reporte con todas tus tx del período en esas
                    categorías. <strong>Tu contador completa el CUIT, Neto e IVA del Excel.</strong>
                </p>
            </div>

            {/* Mini stepper */}
            <ol className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
                {[
                    { n: 1, t: 'Marcá categorías', d: 'Tildá las que sean deducibles para vos.' },
                    { n: 2, t: 'Elegí período', d: 'Generalmente un mes calendario.' },
                    { n: 3, t: 'Descargá', d: 'PDF resumen o Excel detallado.' },
                ].map((s) => (
                    <li key={s.n} className="flex gap-2.5 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40">
                        <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-black shrink-0">
                            {s.n}
                        </span>
                        <div className="min-w-0">
                            <p className="text-xs font-black text-zinc-800 dark:text-zinc-100">{s.t}</p>
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">{s.d}</p>
                        </div>
                    </li>
                ))}
            </ol>

            {loading ? (
                <div className="h-20 bg-zinc-100 dark:bg-zinc-800/40 rounded-xl animate-pulse" />
            ) : (
                <>
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] uppercase tracking-widest font-black text-zinc-400">
                            1 · Categorías de gasto (tildá las deducibles)
                        </p>
                        {cats.length > 0 && (
                            <div className="flex gap-2 text-[10px] font-black uppercase tracking-wider">
                                <button
                                    type="button"
                                    onClick={() => bulkSet(true)}
                                    disabled={deductibleCount === cats.length}
                                    className="px-2 py-1 rounded-md text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                    Marcar todas
                                </button>
                                <button
                                    type="button"
                                    onClick={() => bulkSet(false)}
                                    disabled={deductibleCount === 0}
                                    className="px-2 py-1 rounded-md text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                    Limpiar
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-2 mb-5 border border-zinc-200/60 dark:border-zinc-700/60 rounded-xl p-2">
                        {cats.length === 0 && (
                            <p className="text-xs text-zinc-400 italic p-3">
                                No tenés categorías de gasto. Crealas en Configuración → Gestionar Categorías.
                            </p>
                        )}
                        {cats.map((cat) => (
                            <label
                                key={cat.id}
                                className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/40 cursor-pointer"
                            >
                                <input
                                    type="checkbox"
                                    checked={!!cat.taxDeductible}
                                    onChange={() => toggleDeductible(cat)}
                                    className="w-4 h-4 rounded accent-emerald-500"
                                />
                                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                                <span className="text-sm text-zinc-700 dark:text-zinc-200 flex-1">{cat.name}</span>
                                {cat.taxDeductible && (
                                    <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded font-bold flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3" />
                                        Deducible
                                    </span>
                                )}
                            </label>
                        ))}
                    </div>

                    <p className="text-[10px] uppercase tracking-widest font-black text-zinc-400 mb-2">
                        2 · Elegí período y formato
                    </p>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                        <label className="text-xs font-bold text-zinc-500">
                            Desde
                            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                                className="mt-1 w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-sm font-normal" />
                        </label>
                        <label className="text-xs font-bold text-zinc-500">
                            Hasta
                            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                                className="mt-1 w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-sm font-normal" />
                        </label>
                        <label className="text-xs font-bold text-zinc-500">
                            Formato
                            <select value={format} onChange={(e) => setFormat(e.target.value)}
                                className="mt-1 w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-sm font-normal">
                                <option value="pdf">PDF Resumen</option>
                                <option value="excel">Excel detallado</option>
                            </select>
                        </label>
                    </div>

                    <p className="text-[10px] uppercase tracking-widest font-black text-zinc-400 mb-2">
                        3 · Descargar
                    </p>
                    <button
                        onClick={handleGenerate}
                        disabled={generating || deductibleCount === 0}
                        className="w-full md:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                    >
                        <Download className="w-4 h-4" />
                        {generating
                            ? 'Generando...'
                            : deductibleCount === 0
                                ? 'Marcá al menos una categoría'
                                : `Generar y descargar (${deductibleCount} ${deductibleCount === 1 ? 'categoría' : 'categorías'})`}
                    </button>
                </>
            )}
        </div>
    );
}
