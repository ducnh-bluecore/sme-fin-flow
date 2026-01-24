#!/usr/bin/env node
/**
 * ============================================
 * PRE-COMMIT SSOT CHECK
 * ============================================
 * 
 * Run this before committing to catch SSOT violations.
 * 
 * Usage:
 *   node scripts/check-ssot.js
 *   
 * Add to package.json scripts:
 *   "precommit": "node scripts/check-ssot.js"
 */

const fs = require('fs');
const path = require('path');

// Violation patterns (same as ssot-violation-detector.ts)
const SSOT_VIOLATION_PATTERNS = {
  REDUCE_ON_DATA: /\.reduce\s*\(\s*\([^)]*\)\s*=>/,
  FILTER_REDUCE: /\.filter\s*\([^)]*\)\s*\.reduce/,
  ACC_PLUS: /acc\s*\+\s*\(/,
  SILENT_COGS: /\*\s*0\.55/,
  SILENT_FEES: /\*\s*0\.12/,
};

// Exempt files (SSOT-compliant or intentionally deprecated)
const EXEMPT_FILES = [
  'useFDPFinanceSSOT.ts',
  'useMDPSSOT.ts',
  'useChannelPLSSOT.ts',
  'useMetricGovernance.ts',
  'useFinanceTruthSnapshot.ts',
  'ssot.ts',
  'useFDPMetrics.ts', // Already deprecated
  'useMDPData.ts',    // Already deprecated
  'useChannelPL.ts',  // Already deprecated
  'deprecated-finance-hooks.ts',
  'ssot-violation-detector.ts',
  'check-ssot.js',
];

function checkFile(filePath) {
  const fileName = path.basename(filePath);
  
  // Skip exempt files
  if (EXEMPT_FILES.includes(fileName)) {
    return [];
  }
  
  // Only check hook files
  if (!filePath.includes('src/hooks/') || !filePath.endsWith('.ts')) {
    return [];
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const violations = [];
  
  lines.forEach((line, index) => {
    Object.entries(SSOT_VIOLATION_PATTERNS).forEach(([name, pattern]) => {
      if (pattern.test(line)) {
        // Skip if line contains 'estimated' or is in a comment
        if (line.includes('estimated') || line.trim().startsWith('//') || line.trim().startsWith('*')) {
          return;
        }
        
        violations.push({
          file: filePath,
          line: index + 1,
          pattern: name,
          code: line.trim().substring(0, 60),
        });
      }
    });
  });
  
  return violations;
}

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      walkDir(filePath, callback);
    } else {
      callback(filePath);
    }
  });
}

function main() {
  console.log('\n🔍 Checking for SSOT violations...\n');
  
  const hooksDir = path.join(process.cwd(), 'src', 'hooks');
  
  if (!fs.existsSync(hooksDir)) {
    console.log('⚠️  src/hooks directory not found');
    process.exit(0);
  }
  
  const allViolations = [];
  
  walkDir(hooksDir, (filePath) => {
    const violations = checkFile(filePath);
    allViolations.push(...violations);
  });
  
  if (allViolations.length === 0) {
    console.log('✅ No SSOT violations detected in hooks.\n');
    console.log('All hooks comply with DB-First architecture.\n');
    process.exit(0);
  }
  
  console.log(`❌ Found ${allViolations.length} SSOT violation(s):\n`);
  console.log('='.repeat(60));
  
  allViolations.forEach(v => {
    console.log(`\n🔴 ${v.file}:${v.line}`);
    console.log(`   Pattern: ${v.pattern}`);
    console.log(`   Code: ${v.code}...`);
  });
  
  console.log('\n' + '='.repeat(60));
  console.log('\n📚 FDP Manifesto Principle #2: SINGLE SOURCE OF TRUTH');
  console.log('   Hooks must be thin wrappers. Move calculations to DB views.\n');
  console.log('   Canonical hooks: useFDPFinanceSSOT, useMDPSSOT, useChannelPLSSOT\n');
  
  // Exit with error to block commit
  process.exit(1);
}

main();
