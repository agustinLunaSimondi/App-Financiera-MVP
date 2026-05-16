import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowLeft } from 'lucide-react';

/**
 * Política de Privacidad — Vuelto (Beta privada, sin monetización).
 * Adecuada a la Ley 25.326 de Protección de Datos Personales (Argentina).
 *
 * Responsable: Agustín Luna · agustinluna760@gmail.com
 * Última actualización: 2026-05-16
 */
export function PrivacyPage() {
    return (
        <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200">
            <header className="border-b border-zinc-200 dark:border-zinc-800 sticky top-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md z-10">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
                    <Link to="/" className="text-sm font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white inline-flex items-center gap-1.5">
                        <ArrowLeft className="w-4 h-4" /> Volver
                    </Link>
                    <span className="text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Vuelto · Privacidad</span>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12 prose prose-zinc dark:prose-invert">
                <div className="flex items-center gap-3 mb-6 not-prose">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                        <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight m-0">Política de Privacidad</h1>
                        <p className="text-xs text-zinc-500 m-0 mt-1">Última actualización: 16 de mayo de 2026</p>
                    </div>
                </div>

                <p className="text-base">
                    Este documento explica qué datos personales recolecta <strong>Vuelto</strong>,
                    para qué los usa, con quién los comparte y cómo podés ejercer tus derechos.
                </p>

                <div className="rounded-2xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-4 not-prose my-6">
                    <p className="text-sm font-bold text-amber-900 dark:text-amber-200 m-0">
                        ⚠ Vuelto está en <strong>beta privada</strong>. Es un proyecto en validación, gratuito y sin
                        carácter comercial todavía. <strong>No es un servicio financiero ni una entidad regulada
                        por el BCRA o la CNV.</strong> No movemos plata, no damos asesoramiento de inversión y no
                        prestamos servicios bancarios.
                    </p>
                </div>

                <h2>1. Responsable del tratamiento</h2>
                <p>
                    El responsable de la base de datos es <strong>Agustín Luna</strong>, persona humana
                    con domicilio en la República Argentina. Cualquier consulta o ejercicio de
                    derechos puede dirigirse a:{' '}
                    <a href="mailto:agustinluna760@gmail.com" className="text-emerald-600 dark:text-emerald-400 font-bold">
                        agustinluna760@gmail.com
                    </a>.
                </p>

                <h2>2. Qué datos recolectamos</h2>
                <p>Recolectamos únicamente los datos que vos cargás voluntariamente al usar el servicio:</p>
                <ul>
                    <li><strong>Datos de cuenta</strong>: nombre, email, contraseña (almacenada hasheada con bcrypt — nunca en texto plano).</li>
                    <li><strong>Datos financieros que vos cargás</strong>: cuentas, transacciones, montos, descripciones, categorías, presupuestos, metas de ahorro.</li>
                    <li><strong>Datos de Mercado Pago, solo si vos conectás tu cuenta por OAuth</strong>: identificador de usuario MP, historial de pagos y cobros aprobados de los últimos 90 días (y los nuevos a partir de la conexión). Los tokens OAuth quedan cifrados en nuestra base de datos.</li>
                    <li><strong>Datos técnicos automáticos</strong>: dirección IP, user agent, página visitada, evento (registro, login, gasto agregado, etc.) — para analizar uso y mejorar el producto.</li>
                </ul>
                <p>
                    <strong>No</strong> recolectamos número de documento, CUIT, datos de tarjeta, datos de
                    cuenta bancaria, fotos, ubicación, ni contactos.
                </p>

                <h2>3. Para qué usamos los datos</h2>
                <ul>
                    <li>Operar el servicio (mostrarte tu dashboard, presupuestos, etc.).</li>
                    <li>Si conectaste MP: importar tus transacciones para que no las cargues a mano.</li>
                    <li>Enviarte notificaciones operativas (no marketing) por email si surge un problema crítico.</li>
                    <li>Analizar uso agregado para mejorar el producto.</li>
                </ul>
                <p>No usamos tus datos para vender publicidad ni los entregamos a anunciantes.</p>

                <h2>4. Con quién compartimos los datos</h2>
                <p>Solamente con los proveedores tecnológicos que hacen funcionar el servicio:</p>
                <ul>
                    <li><strong>Supabase</strong> (base de datos PostgreSQL, región sa-east-1).</li>
                    <li><strong>Render</strong> (alojamiento del backend).</li>
                    <li><strong>Vercel</strong> (alojamiento del frontend).</li>
                    <li><strong>PostHog</strong> (analítica de uso). Cuando enviamos un evento de tu cuenta, mandamos tu user_id interno y propiedades del evento, no tu contraseña ni los detalles de tus transacciones.</li>
                    <li><strong>Mercado Pago</strong> (solo si vos conectaste tu cuenta MP por OAuth — accedemos a tu historial de pagos vía su API oficial).</li>
                    <li><strong>Google</strong> (solo si elegís "Continuar con Google" en el login — Google nos comparte tu nombre y email verificado).</li>
                </ul>
                <p>No vendemos datos a terceros y no los compartimos con anunciantes ni brokers.</p>

                <h2>5. Cuánto tiempo guardamos los datos</h2>
                <p>
                    Mantenemos tus datos mientras tengas una cuenta activa. Si eliminás tu cuenta desde
                    <em>Configuración → Eliminar mi cuenta</em>, borramos todas tus transacciones, cuentas,
                    presupuestos y metas. Los registros mínimos necesarios para cumplir obligaciones legales
                    o defendernos ante un reclamo pueden conservarse hasta 5 años.
                </p>

                <h2>6. Tus derechos (Ley 25.326 — derechos ARCO)</h2>
                <p>En cualquier momento podés:</p>
                <ul>
                    <li><strong>Acceder</strong> a tus datos personales que tenemos.</li>
                    <li><strong>Rectificar</strong> datos inexactos.</li>
                    <li><strong>Cancelar</strong> (eliminar) tus datos.</li>
                    <li><strong>Oponerte</strong> a que tratemos ciertos datos.</li>
                </ul>
                <p>
                    Para ejercer cualquiera de estos derechos, escribinos a{' '}
                    <a href="mailto:agustinluna760@gmail.com" className="text-emerald-600 dark:text-emerald-400 font-bold">
                        agustinluna760@gmail.com
                    </a>{' '}
                    desde el email asociado a tu cuenta. Respondemos en hasta 10 días corridos.
                </p>
                <p>
                    Adicionalmente, podés denunciar cualquier violación a tu privacidad ante la{' '}
                    <a href="https://www.argentina.gob.ar/aaip" target="_blank" rel="noreferrer" className="text-emerald-600 dark:text-emerald-400 font-bold">
                        Agencia de Acceso a la Información Pública (AAIP)
                    </a>, autoridad de aplicación de la Ley 25.326.
                </p>

                <h2>7. Seguridad</h2>
                <p>
                    Implementamos las medidas técnicas razonables para proteger tus datos:
                </p>
                <ul>
                    <li>Contraseñas hasheadas con bcrypt.</li>
                    <li>Conexiones cifradas con TLS.</li>
                    <li>Tokens de Mercado Pago cifrados at-rest (AES-128 vía Fernet).</li>
                    <li>JWT con expiración corta (60 minutos) y mecanismo de revocación.</li>
                    <li>Rate limiting para mitigar abusos.</li>
                </ul>
                <p>
                    Ninguna medida es 100% infalible. <strong>No subas a Vuelto información que no toleres
                    eventualmente perder o ver expuesta</strong>. Estamos en beta, las pruebas pueden
                    encontrar bugs.
                </p>

                <h2>8. Cookies y tecnologías similares</h2>
                <p>
                    Usamos almacenamiento local del navegador para mantenerte logueado (token JWT) y
                    recordar preferencias (idioma, modo oscuro, estado del onboarding). PostHog usa
                    cookies/local storage para identificar sesiones de uso. No usamos cookies de
                    publicidad.
                </p>

                <h2>9. Menores de edad</h2>
                <p>
                    Vuelto está pensado para mayores de 18 años. No recolectamos a sabiendas datos de
                    menores. Si nos enterás de que un menor creó una cuenta, la eliminamos.
                </p>

                <h2>10. Cambios en esta política</h2>
                <p>
                    Si modificamos esta política de forma material, te avisamos por email y/o con un
                    banner en la app antes de que el cambio tenga efecto. La versión vigente siempre
                    está publicada en <code>/privacy</code>.
                </p>

                <h2>11. Jurisdicción</h2>
                <p>
                    Esta política se rige por la legislación de la República Argentina, particularmente
                    la Ley 25.326 y normativa concordante de la Agencia de Acceso a la Información
                    Pública.
                </p>

                <div className="mt-10 pt-6 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 not-prose">
                    <p>
                        Si querés ver los <Link to="/terms" className="text-emerald-600 dark:text-emerald-400 font-bold underline">Términos y Condiciones</Link>{' '}
                        o volver al inicio, los links están arriba y abajo de esta página.
                    </p>
                </div>
            </main>
        </div>
    );
}
