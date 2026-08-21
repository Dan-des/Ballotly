/**
 * PWA & Environment Detection Utility
 * Detects whether the user is running Ballotly as an installed standalone PWA mobile application
 * or browsing via a standard web browser.
 */

export function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false;

  // 1. Check explicit query parameter passed by manifest start_url
  const params = new URLSearchParams(window.location.search);
  if (params.get('source') === 'pwa' || params.get('mode') === 'pwa') {
    try {
      sessionStorage.setItem('ballotly_is_pwa', 'true');
    } catch {}
    return true;
  }

  // 2. Check if this session was verified as PWA
  try {
    if (sessionStorage.getItem('ballotly_is_pwa') === 'true') {
      return true;
    }
  } catch {}

  // 3. Check iOS Safari standalone mode
  const isIosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  if (isIosStandalone) {
    return true;
  }

  // 4. Check Android webview / intent referrer
  if (typeof document !== 'undefined' && document.referrer && document.referrer.includes('android-app://')) {
    return true;
  }

  // 5. Check exact standalone display mode only (never match fullscreen or minimal-ui)
  const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
  if (isStandaloneMedia) {
    return true;
  }

  return false;
}

/**
 * Returns the appropriate destination URL when a user logs out.
 * - Installed PWA: Redirects to /?source=pwa (the PWA App Onboarding screen).
 * - Web Browser: Redirects to / (the website Landing Page).
 */
export function getPostLogoutRedirectUrl(message?: string): string {
  const isPwa = isStandalonePwa();
  if (isPwa) {
    return message ? `/?source=pwa&message=${encodeURIComponent(message)}` : '/?source=pwa';
  }
  return message ? `/?message=${encodeURIComponent(message)}` : '/';
}
