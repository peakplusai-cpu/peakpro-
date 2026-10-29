export function safeInternalPath(value: string | null | undefined, fallback = '/app'): string {
  if (typeof value !== 'string' || !value.startsWith('/')) return fallback;
  if (value.startsWith('//') || value.includes('\\') || value.includes('://')) return fallback;
  if (
    value === '/' ||
    value.startsWith('/app') ||
    value.startsWith('/subscribe') ||
    value.startsWith('/api/')
  ) {
    return value;
  }
  return fallback;
}
