import React, { useEffect, useState } from 'react';
import { Gift, Copy, Check, Share2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { getGrowthState } from '../../../services/api';
import { buildReferralLink } from '../../../utils/attribution';
import { analytics } from '../../../services/analytics';

/**
 * Motor viral: código de invitación + progreso hacia las recompensas.
 *
 * Los referidos solo cuentan cuando el invitado completa el onboarding —
 * eso se muestra explícito para que la promesa no se sienta rota cuando
 * alguien invita a 3 personas y todavía no cobró nada.
 */
export function ReferralCard() {
    const [state, setState] = useState(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        let cancelled = false;

        getGrowthState()
            .then((data) => {
                if (!cancelled) setState(data);
            })
            .catch(() => {
                // La tarjeta es secundaria: si falla, se oculta en vez de romper Settings.
                if (!cancelled) setState(null);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        analytics.referralPageViewed();
        return () => { cancelled = true; };
    }, []);

    if (loading || !state?.referralCode) return null;

    const link = buildReferralLink(state.referralCode);
    const { qualified, pending } = state.referrals;
    const { earnedMonths, nextTier } = state.rewards;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(link);
            setCopied(true);
            analytics.referralLinkCopied('settings');
            toast.success('Link copiado');
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error('No pudimos copiar el link');
        }
    };

    const handleShare = async () => {
        const shareData = {
            title: 'Vueltito',
            text: 'Uso Vueltito para ordenar mis gastos. Entrá con mi link y los dos ganamos un mes Premium:',
            url: link,
        };
        // navigator.share solo existe en mobile/contextos seguros — si no está,
        // caemos a copiar, que funciona en todos lados.
        if (navigator.share) {
            try {
                await navigator.share(shareData);
                analytics.referralLinkShared('native');
            } catch {
                /* el usuario canceló */
            }
        } else {
            handleCopy();
        }
    };

    return (
        <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-6">
            <div className="flex items-start gap-3 mb-5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <Gift size={18} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                    <h3 className="font-black text-lg leading-tight">Invitá y ganá Premium</h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                        Tu amigo arranca con 1 mes gratis. Vos ganás meses por cada uno que se sume.
                    </p>
                </div>
            </div>

            {/* Código + link */}
            <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-4 mb-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-2">Tu código</p>
                <p className="text-2xl font-black tracking-tight mb-3 select-all">{state.referralCode}</p>

                <div className="flex gap-2">
                    <button
                        onClick={handleCopy}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold text-sm transition-opacity hover:opacity-90"
                    >
                        {copied ? <Check size={15} /> : <Copy size={15} />}
                        {copied ? 'Copiado' : 'Copiar link'}
                    </button>
                    <button
                        onClick={handleShare}
                        aria-label="Compartir link de invitación"
                        className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors hover:border-emerald-500"
                    >
                        <Share2 size={15} />
                    </button>
                </div>
            </div>

            {/* Progreso */}
            <div className="grid grid-cols-3 gap-3 mb-4">
                <Stat label="Sumados" value={qualified} />
                <Stat label="En camino" value={pending} muted />
                <Stat label="Meses ganados" value={earnedMonths} accent />
            </div>

            {pending > 0 && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3 flex items-start gap-1.5">
                    <Users size={13} className="shrink-0 mt-0.5" />
                    <span>
                        {pending === 1 ? 'Una persona entró' : `${pending} personas entraron`} con tu código pero
                        {pending === 1 ? ' todavía no terminó' : ' todavía no terminaron'} de configurar la cuenta.
                        Cuenta recién ahí.
                    </span>
                </p>
            )}

            {nextTier && (
                <div className="rounded-2xl bg-emerald-500/[0.07] border border-emerald-500/20 p-3.5">
                    <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                        {nextTier.missing === 1
                            ? 'Te falta 1 persona'
                            : `Te faltan ${nextTier.missing} personas`}
                        {' '}para desbloquear {nextTier.label}
                    </p>
                </div>
            )}
        </div>
    );
}

function Stat({ label, value, accent, muted }) {
    return (
        <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-3 text-center">
            <p
                className={`text-2xl font-black tracking-tight ${
                    accent
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : muted
                            ? 'text-zinc-400 dark:text-zinc-600'
                            : ''
                }`}
            >
                {value}
            </p>
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 mt-0.5">{label}</p>
        </div>
    );
}

export default ReferralCard;
