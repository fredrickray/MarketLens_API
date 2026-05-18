import {
  isValidSymbol,
  normalizeSearchQuery,
  normalizeSymbol,
} from './symbol.util';

describe('symbol.util', () => {
  it('normalizes symbols to uppercase', () => {
    expect(normalizeSymbol(' aapl ')).toBe('AAPL');
  });

  it('validates symbol format', () => {
    expect(isValidSymbol('BRK.B')).toBe(true);
    expect(isValidSymbol('')).toBe(false);
    expect(isValidSymbol('BAD$')).toBe(false);
  });

  it('normalizes search query', () => {
    expect(normalizeSearchQuery('  apple ')).toBe('apple');
  });
});
