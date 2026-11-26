import { createHash, createHmac } from 'node:crypto';

/** Matching only: never replace the address used to contact the customer. */
export function canonicalEmail(value: string): string | null {
    const email = value.trim().toLowerCase();
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+$/.test(email)) return null;
    const separator = email.lastIndexOf('@');
    let local = email.slice(0, separator);
    const domain = email.slice(separator + 1);
    if (domain === 'gmail.com') local = local.split('+').shift()?.replaceAll('.', '') ?? '';
    return local ? `${local}@${domain}` : null;
}

export function sha256(value: string): string {
    return createHash('sha256').update(value, 'utf8').digest('hex');
}

export function emailIdentityHash(value?: string): string | undefined {
    if (!value) return undefined;
    const canonical = canonicalEmail(value);
    if (!canonical) throw new Error('Invalid email identity');
    return sha256(canonical);
}

export function normalizedPhone(value?: string): string | null {
    if (!value) return null;
    const digits = value.replace(/\D/g, '');
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
    if (digits.length >= 10 && digits.length <= 15) return `+${digits}`;
    return null;
}

/** Hash the actual business payload, excluding unstable attribution and timestamps. */
export function leadPayloadHash(params: URLSearchParams, volatileKeys: ReadonlySet<string>, bindingKey?: string): string {
    const entries = [...params].filter(([key]) => !volatileKeys.has(key))
        .sort(([ak, av], [bk, bv]) => ak.localeCompare(bk) || av.localeCompare(bv));
    if (!bindingKey) return sha256(JSON.stringify(entries)); // Offline dry-run only; live caller requires a secret.
    if (!/^[a-f0-9]{64}$/.test(bindingKey)) throw new Error('Lead binding key unavailable');
    return createHmac('sha256', Buffer.from(bindingKey, 'hex')).update(JSON.stringify(entries)).digest('hex');
}
