// Base URL of the CareIQ patient app that serves /api/shield/decrypt.
//
// care-iq-sable.vercel.app answers every request with a 307 redirect to
// care-iq-os.vercel.app. Browsers will not follow a redirect on a CORS
// preflight, so cross-origin calls to the old host fail with the generic
// "Failed to fetch". Always call the canonical host directly.
const RAW = (process.env.NEXT_PUBLIC_CAREIQ_URL || 'https://care-iq-os.vercel.app').trim();

export const CAREIQ_URL = RAW.replace(/\/+$/, '').replace(
  /^https:\/\/care-iq-sable\.vercel\.app$/,
  'https://care-iq-os.vercel.app',
);

/** Turn a raw fetch/HTTP error into calm, user-facing text (no dashes). */
export function friendlyVitalsError(raw: string | null | undefined): string {
  const m = (raw || '').toLowerCase();
  if (!m) return 'Readings are not available right now. Please try again in a minute.';
  if (m.includes('failed to fetch') || m.includes('network') || m.includes('load failed')) {
    return 'Readings are not available right now. Check your connection and try again in a minute.';
  }
  if (m.includes('session') || m.includes('token') || m.includes('401')) {
    return 'Your session ended. Sign in again to see readings.';
  }
  if (m.includes('403') || m.includes('forbidden')) {
    return 'You do not have access to these readings. Ask the patient to check your Care Circle invite.';
  }
  return 'Readings are not available right now. Please try again in a minute.';
}
