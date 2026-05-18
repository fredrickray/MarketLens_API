const SYMBOL_PATTERN = /^[A-Za-z0-9.\-^]+$/;

export function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase().replace(/\s+/g, '');
}

export function isValidSymbol(symbol: string): boolean {
  const normalized = normalizeSymbol(symbol);
  return (
    normalized.length >= 1 &&
    normalized.length <= 16 &&
    SYMBOL_PATTERN.test(normalized)
  );
}

export function normalizeSearchQuery(query: string): string {
  return query.trim();
}
