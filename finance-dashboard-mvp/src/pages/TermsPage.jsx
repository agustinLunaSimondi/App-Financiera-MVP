import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, ArrowLeft, List, ChevronDown } from 'lucide-react';

const SECTIONS = [
    { id: 'sec-1', label: '1. Quiénes somos' },
    { id: 'sec-2', label: '2. Qué es Vuelto y qué NO es' },
    { id: 'sec-3', label: '3. Beta privada gratuita' },
    { id: 'sec-4', label: '4. Tu cuenta y responsabilidades' },
    { id: 'sec-5', label: '5. Integración con Mercado Pago' },
    { id: 'sec-6', label: '6. Uso aceptable' },
    { id: 'sec-7', label: '7. Limitación de responsabilidad' },
    { id: 'sec-8', label: '8. Propiedad intelectual' },
    { id: 'sec-9', label: '9. Modificaciones' },
    { id: 'sec-10', label: '10. Terminación' },
    { id: 'sec-11', label: '11. Ley aplicable y jurisdicción' },
    { id: 'sec-12', label: '12. Contacto' },
];

function LegalTOC({ sections }) {
    const [open, setOpen] = useState(false);
    return (
        <nav aria-label="Tabla de contenidos" className="not-prose my-6">
            <div className="md:hidden">
                <button
                    type="button"
                    onClick={() => setOpen(o => !o)}
                    aria-expanded={open}
                    className="w-full flex items-center justify-between px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl font-bold text-sm text-zinc-800 dark:text-zinc-200"
                >
                    <span className="inline-flex items-center gap-2"><List className="w-4 h-4" /> Tabla de contenidos</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>
                {open && (
                    <ol className="mt-2 space-y-1 p-2 bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 rounded-2xl list-none">
                        {sections.map(s => (
                            <li key={s.id}>
                                <a href={`#${s.id}`} onClick={() => setOpen(false)} className="block px-3 py-2 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 hover:bg-blue-500/10 hover:text-blue-700 dark:hover:text-blue-400 transition-colors font-medium">
                                    {s.label}
                                </a>
                            </li>
                        ))}
                    </ol>
                )}
            </div>
            <div className="hidden md:block">
                <div className="px-5 py-4 bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
                    <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-3">
                        <List className="w-3.5 h-3.5" /> Tabla de contenidos
                    </p>
                    <ol className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-1 list-none m-0 p-0">
                        {sections.map(s => (
                            <li key={s.id} className="m-0">
                                <a href={`#${s.id}`} className="block px-2 py-1.5 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 hover:bg-blue-500/10 hover:text-blue-700 dark:hover:text-blue-400 transition-colors font-medium">
                                    {s.label}
                                </a>
                            </li>
                        ))}
                    </ol>
                </div>
            </div>
        </nav>
    );
}

/**
 * Términos y Condiciones de Uso — Vuelto (Beta privada, sin monetización).
 * Última actualización: 2026-05-16
 */
export function TermsPage() {
    return (
        <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200">
            <header className="border-b border-zinc-200 dark:border-zinc-800 sticky top-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md z-10">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
                    <Link to="/" className="text-sm font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white inline-flex items-center gap-1.5">
                        <ArrowLeft className="w-4 h-4" /> Volver
                    </Link>
                    <span className="text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Vuelto · Términos</span>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12 prose prose-zinc dark:prose-invert">
                <div className="flex items-center gap-3 mb-6 not-prose">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                        <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight m-0">Términos y Condiciones de Uso</h1>
                        <p className="text-xs text-zinc-500 m-0 mt-1">Última actualización: 16 de mayo de 2026</p>
                    </div>
                </div>

                <p>
                    Estos términos regulan el uso de <strong>Vuelto</strong> (en adelante, "el servicio" o
                    "la app"). Al crear una cuenta y usar el servicio aceptás estos términos en su totalidad.
                    Si no estás de acuerdo con alguno, no uses Vuelto.
                </p>

                <div className="rounded-2xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-4 not-prose my-6">
                    <p className="text-sm font-bold text-amber-900 dark:text-amber-200 m-0">
                        ⚠ Vuelto es un <strong>proyecto personal en beta privada</strong>, gratuito y
                        sin fines comerciales por el momento. No es una entidad financiera, no es un
                        banco, no es un asesor de inversión, no procesa pagos y no está regulado por
                        el BCRA, la CNV ni la UIF. Es una herramienta de visualización y registro de
                        finanzas personales — nada más.
                    </p>
                </div>

                <LegalTOC sections={SECTIONS} />

                <h2 id="sec-1" className="scroll-mt-20">1. Quiénes somos</h2>
                <p>
                    Vuelto es un proyecto desarrollado por <strong>Agustín Luna</strong>, persona humana
                    con domicilio en la República Argentina. Contacto:{' '}
                    <a href="mailto:agustinluna760@gmail.com" className="text-emerald-600 dark:text-emerald-400 font-bold">
                        agustinluna760@gmail.com
                    </a>.
                </p>

                <h2 id="sec-2" className="scroll-mt-20">2. Qué es Vuelto y qué NO es</h2>
                <p><strong>Vuelto es</strong>:</p>
                <ul>
                    <li>Una herramienta para registrar ingresos, gastos, presupuestos y metas de ahorro.</li>
                    <li>Una integración opcional con Mercado Pago vía OAuth, que importa el historial de pagos del usuario para evitar la carga manual.</li>
                    <li>Un dashboard con visualizaciones y métricas a partir de los datos que vos cargás o importás.</li>
                </ul>
                <p><strong>Vuelto NO es</strong>:</p>
                <ul>
                    <li>Una entidad financiera ni un banco.</li>
                    <li>Un servicio que mueva, transfiera o procese dinero.</li>
                    <li>Un asesor financiero o de inversión. Cualquier cifra, gráfico o sugerencia que muestre Vuelto es informativa, no constituye recomendación de inversión.</li>
                    <li>Una billetera virtual ni una solución de pagos.</li>
                </ul>

                <h2 id="sec-3" className="scroll-mt-20">3. Estado actual: beta privada gratuita</h2>
                <p>
                    Vuelto está actualmente en fase de validación. <strong>El servicio es gratuito</strong>{' '}
                    y se ofrece "tal cual está" (<em>as is</em>), sin garantías de funcionamiento continuo,
                    ausencia de errores ni preservación de datos.
                </p>
                <p>
                    Si en el futuro se introduce un plan pago, te avisaremos por email con anticipación
                    razonable y siempre conservarás la opción de descargar tus datos y/o eliminar tu cuenta
                    antes de que aplique cualquier cambio.
                </p>

                <h2 id="sec-4" className="scroll-mt-20">4. Tu cuenta y responsabilidades</h2>
                <ul>
                    <li>Tenés que ser <strong>mayor de 18 años</strong> para crear una cuenta.</li>
                    <li>Sos responsable de mantener tu contraseña segura. Si sospechás un acceso no autorizado, cambiala desde Configuración y/o usá la opción "cerrar todas las sesiones".</li>
                    <li>Sos responsable de los datos que cargás. No cargues información de terceros sin su consentimiento.</li>
                    <li>Sos responsable del uso lícito del servicio.</li>
                </ul>

                <h2 id="sec-5" className="scroll-mt-20">5. Integración con Mercado Pago</h2>
                <p>
                    Si conectás tu cuenta de Mercado Pago a Vuelto, autorizás a la app a leer tu historial
                    de pagos y cobros mediante la API oficial de Mercado Pago, usando OAuth 2.0. Vuelto no
                    accede a tu contraseña de Mercado Pago. Podés desconectar la integración en cualquier
                    momento desde <em>Integraciones</em>, y eso revoca el token de acceso.
                </p>

                <h2 id="sec-6" className="scroll-mt-20">6. Uso aceptable</h2>
                <p>Está prohibido:</p>
                <ul>
                    <li>Intentar acceder a cuentas que no son tuyas.</li>
                    <li>Hacer scraping, ingeniería inversa o ataques contra la infraestructura.</li>
                    <li>Usar el servicio para actividades ilícitas, lavado de activos, financiamiento del terrorismo o cualquier finalidad regulada por la UIF.</li>
                    <li>Subir contenido difamatorio, ofensivo o que infrinja derechos de terceros.</li>
                </ul>
                <p>Si detectamos uso indebido, podemos suspender o eliminar la cuenta sin previo aviso.</p>

                <h2 id="sec-7" className="scroll-mt-20">7. Limitación de responsabilidad</h2>
                <p>
                    Vuelto se ofrece <strong>tal cual está</strong>, sin garantías expresas o implícitas
                    de comerciabilidad, idoneidad para un propósito particular o disponibilidad continua.
                    En la máxima medida que la ley permita:
                </p>
                <ul>
                    <li>Vuelto no se hace responsable por <strong>decisiones financieras</strong> que tomes basándote en lo que muestra la app. Verificá tus números siempre contra fuentes primarias (banco, MP oficial, AFIP).</li>
                    <li>Vuelto no se hace responsable por <strong>pérdida de datos</strong>, downtime, errores de sincronización con Mercado Pago u otros proveedores, ni por inexactitudes en cotización de dólar o IPC (los obtenemos de fuentes públicas de terceros y los mostramos sin garantía).</li>
                    <li>Vuelto no se hace responsable por <strong>acciones de terceros</strong> (proveedores de hosting, MP, Google, PostHog).</li>
                </ul>

                <h2 id="sec-8" className="scroll-mt-20">8. Propiedad intelectual</h2>
                <p>
                    El código de Vuelto, la marca, el diseño y los textos del producto son propiedad
                    intelectual del autor. Los datos que vos cargás siguen siendo tuyos y podés
                    exportarlos o eliminarlos en cualquier momento.
                </p>

                <h2 id="sec-9" className="scroll-mt-20">9. Modificaciones</h2>
                <p>
                    Podemos actualizar estos términos. Si los cambios son sustanciales, te lo avisamos
                    por email y/o con un banner en la app antes de que apliquen. La versión vigente está
                    siempre publicada en <code>/terms</code>.
                </p>

                <h2 id="sec-10" className="scroll-mt-20">10. Terminación</h2>
                <p>
                    Podés eliminar tu cuenta en cualquier momento desde <em>Configuración → Eliminar mi
                    cuenta</em>. Podemos suspender o terminar tu acceso si violás estos términos.
                </p>

                <h2 id="sec-11" className="scroll-mt-20">11. Ley aplicable y jurisdicción</h2>
                <p>
                    Estos términos se rigen por las leyes de la República Argentina. Cualquier disputa
                    se someterá a los tribunales ordinarios de la Ciudad Autónoma de Buenos Aires,
                    salvo que la normativa de defensa del consumidor disponga otro foro a favor del
                    usuario.
                </p>

                <h2 id="sec-12" className="scroll-mt-20">12. Contacto</h2>
                <p>
                    Para cualquier consulta sobre estos términos, escribí a{' '}
                    <a href="mailto:agustinluna760@gmail.com" className="text-emerald-600 dark:text-emerald-400 font-bold">
                        agustinluna760@gmail.com
                    </a>.
                </p>

                <div className="mt-10 pt-6 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 not-prose">
                    <p>
                        Ver también: <Link to="/privacy" className="text-emerald-600 dark:text-emerald-400 font-bold underline">Política de Privacidad</Link>.
                    </p>
                </div>
            </main>
        </div>
    );
}
