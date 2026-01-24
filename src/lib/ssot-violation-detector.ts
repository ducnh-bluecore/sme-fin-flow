/**
 * ============================================
 * SSOT VIOLATION DETECTOR
 * ============================================
 * 
 * Runtime checker that detects client-side calculation patterns
 * in hooks. Run this in development to catch violations early.
 * 
 * Patterns detected:
 * - .reduce() on fetched data
 * - .filter().reduce() chains
 * - Manual percentage calculations
 * - Hardcoded fallback values (silent defaults)
 */

// Forbidden patterns that indicate SSOT violations
export const SSOT_VIOLATION_PATTERNS = {
  // Array aggregation in hooks
  REDUCE_ON_DATA: /\.reduce\s*\(\s*\([^)]*\)\s*=>/,
  FILTER_REDUCE: /\.filter\s*\([^)]*\)\s*\.reduce/,
  MAP_WITH_CALCULATION: /\.map\s*\([^)]*\)\s*\.reduce/,
  
  // Manual calculations
  PERCENTAGE_CALC: /\/\s*\d+\s*\*\s*100/,
  DIVISION_FOR_RATIO: /[a-zA-Z]+\s*\/\s*[a-zA-Z]+/,
  
  // Silent defaults (hardcoded fallbacks without warning)
  SILENT_COGS: /\*\s*0\.55/,
  SILENT_FEES: /\*\s*0\.12/,
  SILENT_MARGIN: /\*\s*0\.[234]/,
  
  // Sum operations
  SUM_ACCUMULATOR: /sum\s*\+\s*\(/i,
  ACC_PLUS: /acc\s*\+\s*\(/,
} as const;

// Files that should be checked
export const HOOK_FILE_PATTERNS = [
  /src\/hooks\/use[A-Z]/,
  /src\/hooks\/.*\.ts$/,
];

// Files that are exempt (SSOT-compliant or legacy with warnings)
export const EXEMPT_FILES = [
  'useFDPFinanceSSOT.ts',
  'useMDPSSOT.ts', 
  'useChannelPLSSOT.ts',
  'useMetricGovernance.ts',
  'useFinanceTruthSnapshot.ts',
  'ssot.ts',
  // Legacy files already marked deprecated
  'useFDPMetrics.ts',
  'useMDPData.ts',
  'useChannelPL.ts',
  'deprecated-finance-hooks.ts',
];

export interface ViolationReport {
  file: string;
  line: number;
  pattern: string;
  code: string;
  severity: 'error' | 'warning';
  message: string;
  suggestion: string;
}

/**
 * Check a single file content for SSOT violations
 */
export function checkFileForViolations(
  filePath: string,
  content: string
): ViolationReport[] {
  const violations: ViolationReport[] = [];
  
  // Skip exempt files
  const fileName = filePath.split('/').pop() || '';
  if (EXEMPT_FILES.includes(fileName)) {
    return [];
  }
  
  // Only check hook files
  const isHookFile = HOOK_FILE_PATTERNS.some(pattern => pattern.test(filePath));
  if (!isHookFile) {
    return [];
  }
  
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    // Check for reduce patterns
    if (SSOT_VIOLATION_PATTERNS.REDUCE_ON_DATA.test(line)) {
      violations.push({
        file: filePath,
        line: index + 1,
        pattern: 'REDUCE_ON_DATA',
        code: line.trim(),
        severity: 'error',
        message: 'Client-side aggregation detected. Use precomputed DB views instead.',
        suggestion: 'Move aggregation to a PostgreSQL view and fetch the result.',
      });
    }
    
    // Check for filter-reduce chains
    if (SSOT_VIOLATION_PATTERNS.FILTER_REDUCE.test(line)) {
      violations.push({
        file: filePath,
        line: index + 1,
        pattern: 'FILTER_REDUCE',
        code: line.trim(),
        severity: 'error',
        message: 'Filter-reduce chain violates SSOT. This calculation should happen in DB.',
        suggestion: 'Add WHERE clause to your view/query instead of filtering in JS.',
      });
    }
    
    // Check for silent COGS default
    if (SSOT_VIOLATION_PATTERNS.SILENT_COGS.test(line) && !line.includes('estimated')) {
      violations.push({
        file: filePath,
        line: index + 1,
        pattern: 'SILENT_COGS',
        code: line.trim(),
        severity: 'warning',
        message: 'Silent 55% COGS default detected. Must mark as estimated.',
        suggestion: 'Use createEstimatedMetric() with explicit confidence score.',
      });
    }
    
    // Check for silent fees default
    if (SSOT_VIOLATION_PATTERNS.SILENT_FEES.test(line) && !line.includes('estimated')) {
      violations.push({
        file: filePath,
        line: index + 1,
        pattern: 'SILENT_FEES',
        code: line.trim(),
        severity: 'warning',
        message: 'Silent 12% fees default detected. Must mark as estimated.',
        suggestion: 'Use createEstimatedMetric() with explicit confidence score.',
      });
    }
    
    // Check for accumulator patterns
    if (SSOT_VIOLATION_PATTERNS.ACC_PLUS.test(line)) {
      violations.push({
        file: filePath,
        line: index + 1,
        pattern: 'ACC_PLUS',
        code: line.trim(),
        severity: 'error',
        message: 'Accumulator pattern suggests client-side aggregation.',
        suggestion: 'Use SUM() in your PostgreSQL view instead.',
      });
    }
  });
  
  return violations;
}

/**
 * Format violations for console output
 */
export function formatViolationReport(violations: ViolationReport[]): string {
  if (violations.length === 0) {
    return '✅ No SSOT violations detected.';
  }
  
  const errors = violations.filter(v => v.severity === 'error');
  const warnings = violations.filter(v => v.severity === 'warning');
  
  let output = `\n❌ SSOT VIOLATIONS DETECTED\n`;
  output += `${'='.repeat(50)}\n`;
  output += `Errors: ${errors.length} | Warnings: ${warnings.length}\n\n`;
  
  violations.forEach(v => {
    const icon = v.severity === 'error' ? '🔴' : '🟡';
    output += `${icon} ${v.file}:${v.line}\n`;
    output += `   Pattern: ${v.pattern}\n`;
    output += `   Message: ${v.message}\n`;
    output += `   Code: ${v.code.substring(0, 80)}...\n`;
    output += `   Fix: ${v.suggestion}\n\n`;
  });
  
  output += `\n📚 Reference: FDP Manifesto Principle #2 - SSOT\n`;
  output += `   All calculations must happen in PostgreSQL views.\n`;
  output += `   Hooks must be thin wrappers that only fetch data.\n`;
  
  return output;
}

/**
 * Check if code contains any SSOT violations (for quick validation)
 */
export function hasViolations(content: string): boolean {
  return Object.values(SSOT_VIOLATION_PATTERNS).some(pattern => pattern.test(content));
}
