/**
 * PWA & Environment Detection Utility
 * Detects whether the user is running Ballotly as an installed standalone PWA mobile application
 * or browsing via a standard web browser.
 */

export function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false;

  // 1. Check standard display-mode media queries
  const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
  const isFullscreenMedia = window.matchMedia('(display-mode: fullscreen)').matches;
  const isMinimalUiMedia = window.matchMedia('(display-mode: minimal-ui)').matches;

  // 2. Check iOS Safari standalone mode
  const isIosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;

  // 3. Check Android webview / intent referrer
  const isAndroidApp = typeof document !== 'undefined' && document.referrer.includes('android-app://');

  // 4. Check explicit query parameter passed by manifest start_url
  const params = new URLSearchParams(window.location.search);
  const isQueryPwa = params.get('source') === 'pwa' || params.get('mode') === 'pwa';

  return isStandaloneMedia || isFullscreenMedia || isMinimalUiMedia || isIosStandalone || isAndroidApp || isQueryPwa;
}

/**
 * Returns the appropriate destination URL when a user logs out.
 * - Installed PWA: Redirects to /login (bypasses landing page).
 * - Web Browser: Redirects to / (the Landing Page).
 */
export function getPostLogoutRedirectUrl(message?: string): string {
  const isPwa = isStandalonePwa();
  if (isPwa) {
    return message ? `/login?message=${encodeURIComponent(message)}` : '/login';
  }
  return message ? `/?message=${encodeURIComponent(message)}` : '/';
}
