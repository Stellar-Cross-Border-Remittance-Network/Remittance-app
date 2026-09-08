/**
 * SEP-24 WebView security rules, tested as pure functions extracted from the
 * screen so the origin-restriction and completion-detection logic is
 * verifiable without a native WebView.
 */

export function isAllowedNavigation(url: string, anchorOrigin: string | null): boolean {
  if (!anchorOrigin) {
    // First load is the backend-provided URL — trust it once.
    return true;
  }
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') {
      return false;
    }
    const anchorHost = new URL(anchorOrigin).host;
    return u.host === anchorHost || u.host.endsWith(`.${anchorHost}`);
  } catch {
    return false;
  }
}

export function isCompletionUrl(url: string, keywords: string[]): boolean {
  const lower = url.toLowerCase();
  return keywords.some((k) => lower.includes(k));
}

describe('SEP-24 WebView security', () => {
  const anchorOrigin = 'https://testanchor.stellar.org';

  it('trusts only the anchor origin and its subdomains', () => {
    expect(isAllowedNavigation('https://testanchor.stellar.org/sep24/deposit', anchorOrigin)).toBe(true);
    expect(isAllowedNavigation('https://app.testanchor.stellar.org/flow', anchorOrigin)).toBe(true);
    expect(isAllowedNavigation('https://evil.com/steal', anchorOrigin)).toBe(false);
    expect(isAllowedNavigation('https://testanchor.stellar.org.evil.com/steal', anchorOrigin)).toBe(false);
  });

  it('blocks non-https schemes', () => {
    expect(isAllowedNavigation('http://testanchor.stellar.org/x', anchorOrigin)).toBe(false);
    expect(isAllowedNavigation('javascript:alert(1)', anchorOrigin)).toBe(false);
    expect(isAllowedNavigation('file:///etc/passwd', anchorOrigin)).toBe(false);
  });

  it('permits the first load (backend-provided URL)', () => {
    expect(isAllowedNavigation('https://testanchor.stellar.org/sep24/deposit?asset=USDC', null)).toBe(true);
  });

  it('detects completion markers', () => {
    expect(isCompletionUrl('https://testanchor.stellar.org/return?status=complete', ['complete', 'success', 'done', 'status=complete'])).toBe(true);
    expect(isCompletionUrl('https://testanchor.stellar.org/sep24/status?id=1', ['complete', 'success', 'done', 'status=complete'])).toBe(false);
    expect(isCompletionUrl('https://testanchor.stellar.org/redirect?to=cancel', ['complete', 'success', 'done', 'status=complete'])).toBe(false);
  });
});