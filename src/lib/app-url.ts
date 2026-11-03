export const DEFAULT_APP_URL = 'https://carecircleos.vercel.app';

/** Public base URL for links in emails, from NEXT_PUBLIC_APP_URL with a safe fallback. */
export function appUrl(): string {
  return ((process.env.NEXT_PUBLIC_APP_URL || '').trim() || DEFAULT_APP_URL).replace(/\/+$/, '');
}
