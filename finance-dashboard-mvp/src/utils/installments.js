// Espejo en JS del cálculo del backend (transaction_routes.py: _calc_installments /
// _educational_tip) — sistema francés (cuota fija), para preview instantáneo sin
// round-trip. El backend recalcula y persiste; esto es solo para que el usuario
// vea el número mientras tipea.

/**
 * @param {number} principal
 * @param {number} n - cantidad de cuotas (>= 2)
 * @param {number} monthlyRatePct - tasa mensual en % (ej. 5 = 5%/mes)
 * @returns {{ installmentAmount: number, totalPaid: number, totalInterest: number }}
 */
export function calcInstallments(principal, n, monthlyRatePct) {
    const i = monthlyRatePct / 100;
    const raw = i === 0 ? principal / n : (principal * i) / (1 - Math.pow(1 + i, -n));
    const installmentAmount = Math.round(raw * 100) / 100;
    const totalPaid = Math.round(installmentAmount * n * 100) / 100;
    const totalInterest = Math.round((totalPaid - principal) * 100) / 100;
    return { installmentAmount, totalPaid, totalInterest };
}

/**
 * @param {number} principal
 * @param {number} n
 * @param {number} monthlyRatePct
 * @param {number} totalInterest
 * @returns {string}
 */
export function getEducationalTip(principal, n, monthlyRatePct, totalInterest) {
    if (monthlyRatePct === 0) {
        return `Sin interés: pagás exactamente lo mismo que al contado, dividido en ${n} cuotas iguales.`;
    }

    const surchargePct = principal ? (totalInterest / principal) * 100 : 0;
    const surchargeStr = `${surchargePct.toFixed(1)}%`;
    const interestStr = `$${totalInterest.toFixed(2)}`;

    if (surchargePct < 10) {
        return `Vas a pagar ${interestStr} de más en total (${surchargeStr} sobre el precio de contado) — un recargo bajo para ${n} cuotas.`;
    }
    if (surchargePct < 30) {
        return `Vas a pagar ${interestStr} de más en total (${surchargeStr} sobre el precio de contado). Es un recargo notable — si podés pagarlo antes o de contado, ahorrás esa diferencia.`;
    }
    return `Ojo: vas a pagar ${interestStr} de más en total (${surchargeStr} sobre el precio de contado). A esta tasa, financiar en cuotas sale caro — muchas veces conviene ahorrar unos meses y pagar de contado.`;
}
