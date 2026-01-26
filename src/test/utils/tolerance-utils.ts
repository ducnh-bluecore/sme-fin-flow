/**
 * Tolerance Utilities for E2E Testing
 * 
 * Provides helper functions for comparing actual values against expected values
 * with configurable tolerance thresholds.
 */

import { expect } from 'vitest';

/**
 * Assert that actual value is within tolerance percentage of expected value
 * @param actual - The actual value from the UI/hook
 * @param expected - The expected value from fixtures
 * @param tolerancePercent - Allowed deviation percentage (e.g., 20 = ±20%)
 */
export function expectWithinTolerance(
  actual: number,
  expected: number,
  tolerancePercent: number
): void {
  const tolerance = expected * (tolerancePercent / 100);
  const min = expected - tolerance;
  const max = expected + tolerance;
  
  expect(actual).toBeGreaterThanOrEqual(min);
  expect(actual).toBeLessThanOrEqual(max);
}

/**
 * Assert that actual value is within a specific range
 * @param actual - The actual value
 * @param min - Minimum allowed value (inclusive)
 * @param max - Maximum allowed value (inclusive)
 */
export function expectInRange(actual: number, min: number, max: number): void {
  expect(actual).toBeGreaterThanOrEqual(min);
  expect(actual).toBeLessThanOrEqual(max);
}

/**
 * Assert that actual value exactly matches expected value
 * For counts that should be exact
 */
export function expectExact(actual: number, expected: number): void {
  expect(actual).toBe(expected);
}

/**
 * Assert that a value is not negative
 * Critical for metrics like days_since_last_purchase
 */
export function expectNonNegative(actual: number): void {
  expect(actual).toBeGreaterThanOrEqual(0);
}

/**
 * Assert that a string does NOT match UUID pattern
 * Used to verify product names are not raw UUIDs
 */
export function expectNotUUID(value: string): void {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  expect(value).not.toMatch(uuidPattern);
}

/**
 * Assert that a string matches UUID pattern
 * Used to verify IDs are valid UUIDs
 */
export function expectUUID(value: string): void {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  expect(value).toMatch(uuidPattern);
}

/**
 * Assert that RFM score is valid (1-5)
 */
export function expectValidRFMScore(score: number): void {
  expectInRange(score, 1, 5);
}

/**
 * Assert that percentage is valid (0-100)
 */
export function expectValidPercentage(value: number): void {
  expectInRange(value, 0, 100);
}

/**
 * Assert that currency value is positive
 */
export function expectPositiveCurrency(value: number): void {
  expect(value).toBeGreaterThan(0);
}

/**
 * Calculate percentage difference between actual and expected
 */
export function getPercentDifference(actual: number, expected: number): number {
  if (expected === 0) return actual === 0 ? 0 : 100;
  return Math.abs((actual - expected) / expected) * 100;
}

/**
 * Format test result for reporting
 */
export interface TestResult {
  screen: string;
  metric: string;
  expected: number | string;
  actual: number | string;
  tolerance: string;
  passed: boolean;
  difference?: string;
}

export function formatTestResult(
  screen: string,
  metric: string,
  expected: number,
  actual: number,
  tolerancePercent: number
): TestResult {
  const difference = getPercentDifference(actual, expected);
  const passed = difference <= tolerancePercent;
  
  return {
    screen,
    metric,
    expected,
    actual,
    tolerance: `±${tolerancePercent}%`,
    passed,
    difference: `${difference.toFixed(2)}%`,
  };
}

/**
 * Custom Vitest matcher for tolerance checks
 * Usage: expect(actual).toBeWithinTolerance(expected, 20)
 */
export function createToleranceMatchers() {
  return {
    toBeWithinTolerance(received: number, expected: number, tolerancePercent: number) {
      const tolerance = expected * (tolerancePercent / 100);
      const min = expected - tolerance;
      const max = expected + tolerance;
      const pass = received >= min && received <= max;
      
      return {
        pass,
        message: () =>
          pass
            ? `Expected ${received} not to be within ${tolerancePercent}% of ${expected}`
            : `Expected ${received} to be within ${tolerancePercent}% of ${expected} (range: ${min.toFixed(2)} - ${max.toFixed(2)})`,
      };
    },
    
    toBeInRange(received: number, min: number, max: number) {
      const pass = received >= min && received <= max;
      
      return {
        pass,
        message: () =>
          pass
            ? `Expected ${received} not to be in range [${min}, ${max}]`
            : `Expected ${received} to be in range [${min}, ${max}]`,
      };
    },
    
    toBeNonNegative(received: number) {
      const pass = received >= 0;
      
      return {
        pass,
        message: () =>
          pass
            ? `Expected ${received} to be negative`
            : `Expected ${received} to be non-negative (>= 0)`,
      };
    },
    
    notToBeUUID(received: string) {
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const pass = !uuidPattern.test(received);
      
      return {
        pass,
        message: () =>
          pass
            ? `Expected ${received} to be a UUID`
            : `Expected ${received} not to be a UUID (should be a human-readable name)`,
      };
    },
  };
}

// Custom matchers are defined above via createToleranceMatchers()
// To use them, call expect.extend(createToleranceMatchers()) in your test setup
