import { describe, it, expect } from 'vitest';
import { formatMoney, formatDate } from '../lib/format';

/**
 * Tests for format.ts utilities — formatMoney and formatDate
 *
 * TODO: Activate these tests once lib/format.ts is implemented by frontend agent.
 * These tests are marked .skip to avoid failures during initial setup.
 */

describe('formatMoney', () => {
  it('formats integer with thousand separator', () => {
    expect(formatMoney('120000')).toBe('120 000');
  });

  it('formats decimal with comma separator', () => {
    expect(formatMoney('120000.50')).toBe('120 000,50');
  });

  it('formats decimal with trailing zero', () => {
    expect(formatMoney('120000.5')).toBe('120 000,5');
  });

  it('handles zero', () => {
    expect(formatMoney('0')).toBe('0');
  });

  it('handles zero with decimals', () => {
    expect(formatMoney('0.00')).toBe('0');
  });

  it('handles negative numbers', () => {
    expect(formatMoney('-5000')).toBe('-5 000');
  });

  it('handles negative with decimals', () => {
    expect(formatMoney('-5000.50')).toBe('-5 000,50');
  });

  it('includes currency symbol when withCurrency option is true', () => {
    expect(formatMoney('120000', { withCurrency: true })).toBe('120 000 DH');
  });

  it('includes currency symbol with decimals', () => {
    expect(formatMoney('120000.50', { withCurrency: true })).toBe('120 000,50 DH');
  });

  it('handles very large numbers', () => {
    expect(formatMoney('1200000000')).toBe('1 200 000 000');
  });

  it('handles very large numbers with currency', () => {
    expect(formatMoney('1200000000', { withCurrency: true })).toBe('1 200 000 000 DH');
  });

  it('handles number input (coerces to string)', () => {
    expect(formatMoney(120000)).toBe('120 000');
  });
});

describe('formatDate', () => {
  it('formats ISO date to short format DD/MM/YYYY', () => {
    expect(formatDate('2026-04-24', 'short')).toBe('24/04/2026');
  });

  it('formats ISO date to long format (French)', () => {
    expect(formatDate('2026-04-24', 'long')).toBe('24 avr. 2026');
  });

  it('uses short format by default', () => {
    expect(formatDate('2026-04-24')).toBe('24/04/2026');
  });

  it('handles month names in French', () => {
    expect(formatDate('2026-01-01', 'long')).toContain('janv.');
    expect(formatDate('2026-12-25', 'long')).toContain('déc.');
  });

  it('handles different months', () => {
    const months = [
      '2026-01-01',
      '2026-02-01',
      '2026-03-01',
      '2026-04-01',
      '2026-05-01',
      '2026-06-01',
      '2026-07-01',
      '2026-08-01',
      '2026-09-01',
      '2026-10-01',
      '2026-11-01',
      '2026-12-01',
    ];
    months.forEach((date) => {
      expect(formatDate(date, 'long')).toMatch(/\d{1,2}\s\w+\.\s2026/);
    });
  });

  it('handles invalid date gracefully', () => {
    // Implementation should either throw or return empty string
    // Adjust expectation based on actual implementation
    const result = formatDate('invalid-date');
    expect(result === '' || result === 'Invalid date').toBe(true);
  });

  it('preserves leading zeros in day', () => {
    expect(formatDate('2026-04-01', 'short')).toBe('01/04/2026');
  });
});
