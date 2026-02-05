 /**
  * Bluecore Design System - Theme Export Utilities
  * Generates design tokens, CSS variables, and Tailwind presets for external use
  */
 
 // ============================================================================
 // DESIGN TOKENS - Source of Truth
 // ============================================================================
 
 export const BLUECORE_BRAND_COLORS = {
   '50': { hsl: '220 60% 98%', hex: '#f7f9fc' },
   '100': { hsl: '220 50% 95%', hex: '#eef2f9' },
   '200': { hsl: '220 45% 88%', hex: '#d8e1f0' },
   '300': { hsl: '220 45% 75%', hex: '#afc0e0' },
   '400': { hsl: '221 50% 60%', hex: '#6b8dc9' },
   '500': { hsl: '221 65% 50%', hex: '#3b6cd4' },
   '600': { hsl: '222 70% 45%', hex: '#2a59c3' },
   '700': { hsl: '223 72% 38%', hex: '#1b48a7' },
   '800': { hsl: '224 68% 30%', hex: '#183a82' },
   '900': { hsl: '224 60% 22%', hex: '#162c5a' },
 };
 
 export const SEMANTIC_COLORS = {
   background: { hsl: '220 20% 97%', hex: '#f5f7f9' },
   foreground: { hsl: '224 50% 15%', hex: '#141d2d' },
   card: { hsl: '0 0% 100%', hex: '#ffffff' },
   cardForeground: { hsl: '224 50% 15%', hex: '#141d2d' },
   popover: { hsl: '0 0% 100%', hex: '#ffffff' },
   popoverForeground: { hsl: '224 50% 15%', hex: '#141d2d' },
   primary: { hsl: '221 65% 50%', hex: '#3b6cd4' },
   primaryForeground: { hsl: '0 0% 100%', hex: '#ffffff' },
   secondary: { hsl: '220 20% 94%', hex: '#eef0f3' },
   secondaryForeground: { hsl: '224 50% 25%', hex: '#1e2d47' },
   muted: { hsl: '220 15% 93%', hex: '#eaecef' },
   mutedForeground: { hsl: '220 15% 45%', hex: '#656d7a' },
   accent: { hsl: '220 40% 92%', hex: '#e2e8f2' },
   accentForeground: { hsl: '222 70% 45%', hex: '#2a59c3' },
   destructive: { hsl: '0 72% 51%', hex: '#dc2626' },
   destructiveForeground: { hsl: '0 0% 100%', hex: '#ffffff' },
   success: { hsl: '152 60% 36%', hex: '#1b9d5d' },
   successForeground: { hsl: '0 0% 100%', hex: '#ffffff' },
   warning: { hsl: '38 92% 50%', hex: '#f59e0b' },
   warningForeground: { hsl: '38 92% 15%', hex: '#4a2c02' },
   info: { hsl: '210 80% 52%', hex: '#2196f3' },
   infoForeground: { hsl: '0 0% 100%', hex: '#ffffff' },
   border: { hsl: '220 20% 88%', hex: '#d8dce3' },
   input: { hsl: '220 20% 88%', hex: '#d8dce3' },
   ring: { hsl: '221 65% 50%', hex: '#3b6cd4' },
 };
 
 export const SIDEBAR_COLORS = {
   background: { hsl: '224 50% 12%', hex: '#0f1729' },
   foreground: { hsl: '220 20% 90%', hex: '#e2e5ea' },
   primary: { hsl: '221 65% 55%', hex: '#4a7ae0' },
   primaryForeground: { hsl: '0 0% 100%', hex: '#ffffff' },
   accent: { hsl: '224 45% 18%', hex: '#1a2642' },
   accentForeground: { hsl: '220 20% 98%', hex: '#f9fafb' },
   border: { hsl: '224 40% 20%', hex: '#212d47' },
   ring: { hsl: '221 65% 55%', hex: '#4a7ae0' },
 };
 
 export const CHART_COLORS = {
   1: { hsl: '221 65% 50%', hex: '#3b6cd4' },
   2: { hsl: '152 60% 40%', hex: '#1f9f68' },
   3: { hsl: '38 85% 52%', hex: '#f5a623' },
   4: { hsl: '0 65% 55%', hex: '#d64545' },
   5: { hsl: '270 55% 55%', hex: '#8b5cf6' },
 };
 
 export const SHADOWS = {
   xs: '0 1px 2px 0 rgb(0 0 0 / 0.03)',
   sm: '0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
   md: '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
   lg: '0 10px 15px -3px rgb(0 0 0 / 0.06), 0 4px 6px -4px rgb(0 0 0 / 0.06)',
   card: '0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
   elevated: '0 4px 12px -2px rgb(0 0 0 / 0.08)',
 };
 
 export const TYPOGRAPHY = {
   fontFamily: '"Be Vietnam Pro", system-ui, sans-serif',
   fontUrl: 'https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@300;400;500;600;700;800&display=swap',
   weights: {
     light: 300,
     regular: 400,
     medium: 500,
     semibold: 600,
     bold: 700,
     extrabold: 800,
   },
 };
 
 export const RADIUS = '0.5rem';
 
 // ============================================================================
 // EXPORT GENERATORS
 // ============================================================================
 
 /**
  * Generate Figma-compatible Design Tokens JSON
  */
 export function generateDesignTokensJSON(): string {
   const tokens = {
     $schema: 'https://design-tokens.github.io/community-group/format',
     bluecore: Object.fromEntries(
       Object.entries(BLUECORE_BRAND_COLORS).map(([key, value]) => [
         key,
         { $value: value.hex, $type: 'color', hsl: value.hsl },
       ])
     ),
     semantic: Object.fromEntries(
       Object.entries(SEMANTIC_COLORS).map(([key, value]) => [
         key,
         { $value: value.hex, $type: 'color', hsl: value.hsl },
       ])
     ),
     sidebar: Object.fromEntries(
       Object.entries(SIDEBAR_COLORS).map(([key, value]) => [
         key,
         { $value: value.hex, $type: 'color', hsl: value.hsl },
       ])
     ),
     chart: Object.fromEntries(
       Object.entries(CHART_COLORS).map(([key, value]) => [
         key,
         { $value: value.hex, $type: 'color', hsl: value.hsl },
       ])
     ),
     shadow: Object.fromEntries(
       Object.entries(SHADOWS).map(([key, value]) => [
         key,
         { $value: value, $type: 'shadow' },
       ])
     ),
     typography: {
       fontFamily: { $value: TYPOGRAPHY.fontFamily, $type: 'fontFamily' },
       fontUrl: { $value: TYPOGRAPHY.fontUrl, $type: 'string' },
       weights: Object.fromEntries(
         Object.entries(TYPOGRAPHY.weights).map(([key, value]) => [
           key,
           { $value: value, $type: 'fontWeight' },
         ])
       ),
     },
     spacing: {
       radius: { $value: RADIUS, $type: 'dimension' },
     },
   };
 
   return JSON.stringify(tokens, null, 2);
 }
 
 /**
  * Generate standalone CSS file with all variables and component classes
  */
 export function generateStandaloneCSS(): string {
   return `/**
  * Bluecore Design System - Standalone CSS
  * Finance-grade visual discipline. Decision-first. CFO-ready.
  * 
  * Usage: Include this file in any project to apply Bluecore theme.
  * No Tailwind required.
  */
 
 @import url('${TYPOGRAPHY.fontUrl}');
 
 :root {
   /* ═══════════════════════════════════════════════════════════════════
      BLUECORE BRAND PALETTE
      ═══════════════════════════════════════════════════════════════════ */
 ${Object.entries(BLUECORE_BRAND_COLORS)
   .map(([key, value]) => `  --bluecore-${key}: ${value.hex};`)
   .join('\n')}
 
   /* ─── Semantic Surfaces ─── */
 ${Object.entries(SEMANTIC_COLORS)
   .map(([key, value]) => `  --color-${camelToKebab(key)}: ${value.hex};`)
   .join('\n')}
 
   /* ─── Sidebar Colors ─── */
 ${Object.entries(SIDEBAR_COLORS)
   .map(([key, value]) => `  --sidebar-${camelToKebab(key)}: ${value.hex};`)
   .join('\n')}
 
   /* ─── Chart Colors ─── */
 ${Object.entries(CHART_COLORS)
   .map(([key, value]) => `  --chart-${key}: ${value.hex};`)
   .join('\n')}
 
   /* ─── Shadows ─── */
 ${Object.entries(SHADOWS)
   .map(([key, value]) => `  --shadow-${key}: ${value};`)
   .join('\n')}
 
   /* ─── Typography ─── */
   --font-family: ${TYPOGRAPHY.fontFamily};
   --font-weight-light: ${TYPOGRAPHY.weights.light};
   --font-weight-regular: ${TYPOGRAPHY.weights.regular};
   --font-weight-medium: ${TYPOGRAPHY.weights.medium};
   --font-weight-semibold: ${TYPOGRAPHY.weights.semibold};
   --font-weight-bold: ${TYPOGRAPHY.weights.bold};
   --font-weight-extrabold: ${TYPOGRAPHY.weights.extrabold};
 
   /* ─── Spacing ─── */
   --radius: ${RADIUS};
 }
 
 /* ═══════════════════════════════════════════════════════════════════
    BASE STYLES
    ═══════════════════════════════════════════════════════════════════ */
 
 html {
   font-family: var(--font-family);
 }
 
 body {
   background-color: var(--color-background);
   color: var(--color-foreground);
   -webkit-font-smoothing: antialiased;
   -moz-osx-font-smoothing: grayscale;
 }
 
 /* ═══════════════════════════════════════════════════════════════════
    DECISION CARD SYSTEM
    Core UI object for Bluecore - Decision-first, not dashboard-first
    ═══════════════════════════════════════════════════════════════════ */
 
 .decision-card {
   background-color: var(--color-card);
   border-radius: var(--radius);
   border: 1px solid var(--color-border);
   padding: 1.25rem;
   transition: all 0.2s ease;
   box-shadow: var(--shadow-card);
 }
 
 .decision-card:hover {
   box-shadow: var(--shadow-elevated);
 }
 
 .decision-card-critical {
   border-left: 4px solid var(--color-destructive);
 }
 
 .decision-card-warning {
   border-left: 4px solid var(--color-warning);
 }
 
 .decision-card-success {
   border-left: 4px solid var(--color-success);
 }
 
 /* ─── Data Card ─── */
 .data-card {
   background-color: var(--color-card);
   border-radius: var(--radius);
   border: 1px solid var(--color-border);
   padding: 1.25rem;
   transition: all 0.2s ease;
   box-shadow: var(--shadow-card);
 }
 
 .data-card:hover {
   box-shadow: var(--shadow-md);
 }
 
 .data-card-interactive {
   cursor: pointer;
 }
 
 .data-card-interactive:hover {
   transform: translateY(-2px);
   box-shadow: var(--shadow-elevated);
 }
 
 /* ─── KPI Card ─── */
 .kpi-card {
   position: relative;
   overflow: hidden;
   background-color: var(--color-card);
   border-radius: var(--radius);
   border: 1px solid var(--color-border);
   padding: 1.25rem;
   box-shadow: var(--shadow-card);
 }
 
 .kpi-card::before {
   content: '';
   position: absolute;
   top: 0;
   left: 0;
   width: 4px;
   height: 100%;
   background-color: var(--color-primary);
   border-radius: var(--radius) 0 0 var(--radius);
 }
 
 .kpi-card.success::before {
   background-color: var(--color-success);
 }
 
 .kpi-card.warning::before {
   background-color: var(--color-warning);
 }
 
 .kpi-card.danger::before {
   background-color: var(--color-destructive);
 }
 
 /* ─── Status Badges ─── */
 .status-badge {
   display: inline-flex;
   align-items: center;
   padding: 0.25rem 0.625rem;
   border-radius: 0.375rem;
   font-size: 0.75rem;
   font-weight: 500;
 }
 
 .status-badge.success {
   background-color: color-mix(in srgb, var(--color-success) 10%, transparent);
   color: var(--color-success);
 }
 
 .status-badge.warning {
   background-color: color-mix(in srgb, var(--color-warning) 10%, transparent);
   color: var(--color-warning-foreground);
 }
 
 .status-badge.danger {
   background-color: color-mix(in srgb, var(--color-destructive) 10%, transparent);
   color: var(--color-destructive);
 }
 
 .status-badge.info {
   background-color: color-mix(in srgb, var(--color-info) 10%, transparent);
   color: var(--color-info);
 }
 
 .status-badge.neutral {
   background-color: var(--color-muted);
   color: var(--color-muted-foreground);
 }
 
 /* ─── Data Table ─── */
 .data-table {
   width: 100%;
 }
 
 .data-table th {
   text-align: left;
   font-size: 0.75rem;
   font-weight: 600;
   color: var(--color-muted-foreground);
   text-transform: uppercase;
   letter-spacing: 0.05em;
   padding: 0.75rem 1rem;
   background-color: color-mix(in srgb, var(--color-muted) 50%, transparent);
   border-bottom: 1px solid var(--color-border);
 }
 
 .data-table td {
   padding: 0.75rem 1rem;
   font-size: 0.875rem;
   border-bottom: 1px solid var(--color-border);
 }
 
 .data-table tr:hover td {
   background-color: color-mix(in srgb, var(--color-muted) 30%, transparent);
 }
 
 /* ─── Vietnamese Currency Format ─── */
 .format-vnd::after {
   content: ' ₫';
 }
 
 .vnd-value {
   font-variant-numeric: tabular-nums;
 }
 
 /* ─── Animations ─── */
 @keyframes fade-in {
   from {
     opacity: 0;
     transform: translateY(8px);
   }
   to {
     opacity: 1;
     transform: translateY(0);
   }
 }
 
 @keyframes slide-in-left {
   from {
     opacity: 0;
     transform: translateX(-16px);
   }
   to {
     opacity: 1;
     transform: translateX(0);
   }
 }
 
 @keyframes scale-in {
   from {
     opacity: 0;
     transform: scale(0.96);
   }
   to {
     opacity: 1;
     transform: scale(1);
   }
 }
 
 .animate-fade-in {
   animation: fade-in 0.4s ease-out forwards;
 }
 
 .animate-slide-in-left {
   animation: slide-in-left 0.3s ease-out forwards;
 }
 
 .animate-scale-in {
   animation: scale-in 0.25s ease-out forwards;
 }
 `;
 }
 
 /**
  * Generate Tailwind CSS Preset
  */
 export function generateTailwindPreset(): string {
   return `/**
  * Bluecore Design System - Tailwind CSS Preset
  * 
  * Usage:
  * 1. Save this file as bluecore-preset.ts in your project
  * 2. In tailwind.config.ts, add: presets: [require('./bluecore-preset')]
  * 3. Install tailwindcss-animate: npm install tailwindcss-animate
  */
 
 import type { Config } from "tailwindcss";
 
 export const bluecorePreset = {
   theme: {
     extend: {
       fontFamily: {
         sans: ['"Be Vietnam Pro"', 'system-ui', 'sans-serif'],
       },
       colors: {
         border: "hsl(var(--border))",
         input: "hsl(var(--input))",
         ring: "hsl(var(--ring))",
         background: "hsl(var(--background))",
         foreground: "hsl(var(--foreground))",
         primary: {
           DEFAULT: "hsl(var(--primary))",
           foreground: "hsl(var(--primary-foreground))",
         },
         secondary: {
           DEFAULT: "hsl(var(--secondary))",
           foreground: "hsl(var(--secondary-foreground))",
         },
         destructive: {
           DEFAULT: "hsl(var(--destructive))",
           foreground: "hsl(var(--destructive-foreground))",
         },
         success: {
           DEFAULT: "hsl(var(--success))",
           foreground: "hsl(var(--success-foreground))",
         },
         warning: {
           DEFAULT: "hsl(var(--warning))",
           foreground: "hsl(var(--warning-foreground))",
         },
         info: {
           DEFAULT: "hsl(var(--info))",
           foreground: "hsl(var(--info-foreground))",
         },
         muted: {
           DEFAULT: "hsl(var(--muted))",
           foreground: "hsl(var(--muted-foreground))",
         },
         accent: {
           DEFAULT: "hsl(var(--accent))",
           foreground: "hsl(var(--accent-foreground))",
         },
         popover: {
           DEFAULT: "hsl(var(--popover))",
           foreground: "hsl(var(--popover-foreground))",
         },
         card: {
           DEFAULT: "hsl(var(--card))",
           foreground: "hsl(var(--card-foreground))",
         },
         sidebar: {
           DEFAULT: "hsl(var(--sidebar-background))",
           foreground: "hsl(var(--sidebar-foreground))",
           primary: "hsl(var(--sidebar-primary))",
           "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
           accent: "hsl(var(--sidebar-accent))",
           "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
           border: "hsl(var(--sidebar-border))",
           ring: "hsl(var(--sidebar-ring))",
         },
         bluecore: {
 ${Object.entries(BLUECORE_BRAND_COLORS)
   .map(([key, value]) => `          ${key}: "hsl(${value.hsl})",`)
   .join('\n')}
         },
         chart: {
 ${Object.entries(CHART_COLORS)
   .map(([key, value]) => `          ${key}: "hsl(${value.hsl})",`)
   .join('\n')}
         },
       },
       borderRadius: {
         lg: "var(--radius)",
         md: "calc(var(--radius) - 2px)",
         sm: "calc(var(--radius) - 4px)",
       },
       boxShadow: {
 ${Object.entries(SHADOWS)
   .map(([key, value]) => `        '${key}': '${value}',`)
   .join('\n')}
       },
       keyframes: {
         "accordion-down": {
           from: { height: "0" },
           to: { height: "var(--radix-accordion-content-height)" },
         },
         "accordion-up": {
           from: { height: "var(--radix-accordion-content-height)" },
           to: { height: "0" },
         },
         "fade-in": {
           from: { opacity: "0", transform: "translateY(8px)" },
           to: { opacity: "1", transform: "translateY(0)" },
         },
         "slide-in-left": {
           from: { opacity: "0", transform: "translateX(-16px)" },
           to: { opacity: "1", transform: "translateX(0)" },
         },
         "scale-in": {
           from: { opacity: "0", transform: "scale(0.96)" },
           to: { opacity: "1", transform: "scale(1)" },
         },
       },
       animation: {
         "accordion-down": "accordion-down 0.2s ease-out",
         "accordion-up": "accordion-up 0.2s ease-out",
         "fade-in": "fade-in 0.4s ease-out forwards",
         "slide-in-left": "slide-in-left 0.3s ease-out forwards",
         "scale-in": "scale-in 0.25s ease-out forwards",
       },
     },
   },
   plugins: [require("tailwindcss-animate")],
 } satisfies Config;
 
 export default bluecorePreset;
 `;
 }
 
 /**
  * Generate formatters utility code
  */
 export function generateFormattersCode(): string {
   return `/**
  * Bluecore Formatters - Vietnamese Locale Utilities
  */
 
 // Format currency with Vietnamese locale
 export function formatCurrency(value: number | string | null | undefined, currency = 'VND'): string {
   const numValue = typeof value === 'string' ? parseFloat(value) : (value ?? 0);
   
   if (isNaN(numValue)) return '₫0';
   
   return new Intl.NumberFormat('vi-VN', {
     style: 'currency',
     currency,
     minimumFractionDigits: 0,
     maximumFractionDigits: 0,
   }).format(numValue);
 }
 
 // Format number with locale
 export function formatNumber(value: number | string | null | undefined): string {
   const numValue = typeof value === 'string' ? parseFloat(value) : (value ?? 0);
   
   if (isNaN(numValue)) return '0';
   
   return new Intl.NumberFormat('vi-VN').format(numValue);
 }
 
 // Format percentage
 export function formatPercent(value: number | null | undefined, decimals = 1): string {
   if (value === null || value === undefined) return '0%';
   return \`\${value.toFixed(decimals)}%\`;
 }
 
 // Format compact number (e.g., 1.5M, 2.3B)
 export function formatCompact(value: number | null | undefined): string {
   if (value === null || value === undefined) return '0';
   
   return new Intl.NumberFormat('vi-VN', {
     notation: 'compact',
     compactDisplay: 'short',
   }).format(value);
 }
 
 // Format date in Vietnamese locale
 export function formatDate(date: Date | string | null | undefined): string {
   if (!date) return '';
   const d = typeof date === 'string' ? new Date(date) : date;
   return new Intl.DateTimeFormat('vi-VN', {
     day: '2-digit',
     month: '2-digit',
     year: 'numeric',
   }).format(d);
 }
 
 // Format datetime in Vietnamese locale
 export function formatDateTime(date: Date | string | null | undefined): string {
   if (!date) return '';
   const d = typeof date === 'string' ? new Date(date) : date;
   return new Intl.DateTimeFormat('vi-VN', {
     day: '2-digit',
     month: '2-digit',
     year: 'numeric',
     hour: '2-digit',
     minute: '2-digit',
   }).format(d);
 }
 `;
 }
 
 /**
  * Generate cn utility code
  */
 export function generateCnUtility(): string {
   return `/**
  * Bluecore className utility
  * Combines clsx and tailwind-merge for optimal class handling
  */
 
 import { type ClassValue, clsx } from "clsx";
 import { twMerge } from "tailwind-merge";
 
 export function cn(...inputs: ClassValue[]) {
   return twMerge(clsx(inputs));
 }
 `;
 }
 
 // Helper function
 function camelToKebab(str: string): string {
   return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
 }
 
 // ============================================================================
 // DOWNLOAD UTILITIES
 // ============================================================================
 
 export function downloadFile(content: string, filename: string, mimeType: string = 'text/plain') {
   const blob = new Blob([content], { type: mimeType });
   const url = URL.createObjectURL(blob);
   const link = document.createElement('a');
   link.href = url;
   link.download = filename;
   document.body.appendChild(link);
   link.click();
   document.body.removeChild(link);
   URL.revokeObjectURL(url);
 }
 
 export function copyToClipboard(text: string): Promise<void> {
   return navigator.clipboard.writeText(text);
 }