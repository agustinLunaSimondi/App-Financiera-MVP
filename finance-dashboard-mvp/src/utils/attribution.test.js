import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    captureAttribution,
    getAttribution,
    getAttributionPayload,
    getReferralCode,
    clearAttribution,
    buildReferralLink,
} from './attribution';

const ORIGIN = 'https://vueltito.com';

/** Simula aterrizar en una URL concreta con un referrer dado. */
function landOn(search, referrer = '', pathname = '/') {
    delete window.location;
    window.location = {
        search,
        pathname,
        host: 'vueltito.com',
        origin: ORIGIN,
    };
    Object.defineProperty(document, 'referrer', {
        value: referrer,
        configurable: true,
    });
}

describe('attribution', () => {
    beforeEach(() => {
        sessionStorage.clear();
        landOn('');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('captura los parámetros UTM de la URL', () => {
        landOn('?utm_source=reddit&utm_medium=organic&utm_campaign=beta');
        const captured = captureAttribution();

        expect(captured.utmSource).toBe('reddit');
        expect(captured.utmMedium).toBe('organic');
        expect(captured.utmCampaign).toBe('beta');
    });

    it('captura el código de referido de ?ref= y lo normaliza a mayúsculas', () => {
        landOn('?ref=vlt-7k2m9q');
        expect(captureAttribution().referralCode).toBe('VLT-7K2M9Q');
        expect(getReferralCode()).toBe('VLT-7K2M9Q');
    });

    it('es first-touch: no pisa la atribución ya capturada', () => {
        landOn('?utm_source=reddit');
        captureAttribution();

        landOn('?utm_source=instagram');
        expect(captureAttribution().utmSource).toBe('reddit');
    });

    it('guarda el referrer solo si es de otro dominio', () => {
        landOn('?utm_source=x', 'https://google.com/search');
        expect(captureAttribution().referrer).toBe('https://google.com/search');
    });

    it('ignora el referrer si es navegación interna', () => {
        landOn('?utm_source=x', `${ORIGIN}/pricing`);
        expect(captureAttribution().referrer).toBeUndefined();
    });

    it('no guarda nada si no hay ninguna señal de atribución', () => {
        landOn('');
        expect(captureAttribution()).toBeNull();
        expect(getAttribution()).toBeNull();
    });

    it('recorta valores excesivamente largos', () => {
        landOn(`?utm_source=${'a'.repeat(500)}`);
        expect(captureAttribution().utmSource.length).toBe(128);
    });

    it('devuelve un payload vacío cuando no hay atribución', () => {
        expect(getAttributionPayload()).toEqual({});
    });

    it('arma el payload de registro solo con los campos presentes', () => {
        landOn('?utm_source=reddit&ref=VLT-7K2M9Q');
        captureAttribution();

        const payload = getAttributionPayload();
        expect(payload.utmSource).toBe('reddit');
        expect(payload.referralCode).toBe('VLT-7K2M9Q');
        expect(payload.landingPath).toBe('/');
        expect('utmMedium' in payload).toBe(false);
        expect('capturedAt' in payload).toBe(false);
    });

    it('clearAttribution borra lo guardado', () => {
        landOn('?utm_source=reddit');
        captureAttribution();
        clearAttribution();

        expect(getAttribution()).toBeNull();
    });

    it('no explota si sessionStorage falla (modo privado)', () => {
        landOn('?utm_source=reddit');
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('QuotaExceededError');
        });

        expect(() => captureAttribution()).not.toThrow();
    });

    it('buildReferralLink arma el link de invitación', () => {
        expect(buildReferralLink('VLT-7K2M9Q')).toBe(`${ORIGIN}/?ref=VLT-7K2M9Q`);
        expect(buildReferralLink(null)).toBe('');
    });
});
