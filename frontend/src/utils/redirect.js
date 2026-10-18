/**
 * Safely resolves an internal redirect destination, preserving pathname, query string, and hash
 * while preventing Open Redirect attacks (e.g. protocol-relative // URLs or external schemes).
 */
export function getSafeRedirectTarget(fromState, fallback = '/dashboard') {
  if (!fromState) return fallback;

  let target = '';
  if (typeof fromState === 'string') {
    target = fromState;
  } else if (typeof fromState === 'object' && fromState.pathname) {
    const pathname = fromState.pathname;
    const search = fromState.search || '';
    const hash = fromState.hash || '';
    target = `${pathname}${search}${hash}`;
  } else {
    return fallback;
  }

  // Security: Ensure target is strictly a relative internal path starting with a single '/'
  // Rejects: //evil.com, https://evil.com, javascript:, \evil.com, etc.
  if (
    typeof target === 'string' &&
    target.startsWith('/') &&
    !target.startsWith('//') &&
    !target.includes('://') &&
    !target.includes('\\')
  ) {
    return target;
  }

  return fallback;
}
