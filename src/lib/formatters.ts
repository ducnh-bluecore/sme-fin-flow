// Vietnamese number and currency formatters
// Centralized formatting utilities for consistent UI across the application

/**
 * Format number as VND currency with full format
 * Example: 1234567 → "1.234.567 ₫"
 */
export const formatVND = (value: number): string => {
  if (value == null || isNaN(value)) return '—';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
};

/**
 * Format number as compact VND for display in cards/charts
 * Example: 1234567890 → "1.2 tỷ", 1234567 → "1 tr", 1234 → "1K"
 */
export const formatVNDCompact = (value: number): string => {
  if (value == null || isNaN(value)) return '—';
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  
  if (absValue >= 1_000_000_000) {
    return `${sign}${(absValue / 1_000_000_000).toFixed(1)} tỷ`;
  }
  if (absValue >= 1_000_000) {
    return `${sign}${(absValue / 1_000_000).toFixed(0)} tr`;
  }
  if (absValue >= 1_000) {
    return `${sign}${(absValue / 1_000).toFixed(0)}K`;
  }
  return `${sign}${absValue.toFixed(0)}`;
};

/**
 * Format number with Vietnamese locale (thousand separators)
 * Example: 1234567 → "1.234.567"
 */
export const formatNumber = (value: number): string => {
  if (value == null || isNaN(value)) return '—';
  return new Intl.NumberFormat('vi-VN').format(value);
};

/**
 * Format percentage value
 * @param value - The percentage value
 * @param isDecimal - If true, value is treated as decimal (0.35 = 35%)
 * Example: formatPercent(0.35, true) → "35.0%", formatPercent(35, false) → "35.0%"
 */
export const formatPercent = (value: number, isDecimal: boolean = false): string => {
  if (value == null || isNaN(value)) return '—';
  // If value is a decimal (e.g., 0.35 for 35%), multiply by 100
  const percentage = isDecimal ? value * 100 : value;
  return `${percentage.toFixed(1)}%`;
};

/**
 * Format date in Vietnamese format dd/MM/yyyy
 * Example: "2024-01-15" → "15/01/2024"
 */
export const formatDate = (date: Date | string | null | undefined): string => {
  if (!date) return '—';
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d);
  } catch {
    return '—';
  }
};

/**
 * Format date in short format dd/MM
 * Example: "2024-01-15" → "15/01"
 */
export const formatDateShort = (date: Date | string | null | undefined): string => {
  if (!date) return '—';
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
    }).format(d);
  } catch {
    return '—';
  }
};

/**
 * Format date with month name (e.g., "Tháng 1 2024" or "Jan 2024")
 */
export const formatMonthYear = (date: Date | string | null | undefined): string => {
  if (!date) return '—';
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('vi-VN', {
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return '—';
  }
};

/**
 * Format datetime with time
 * Example: "2024-01-15T10:30:00" → "15/01/2024 10:30"
 */
export const formatDateTime = (date: Date | string | null | undefined): string => {
  if (!date) return '—';
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return '—';
  }
};

/**
 * Calculate days overdue from due date
 */
export const getDaysOverdue = (dueDate: Date | string | null | undefined): number => {
  if (!dueDate) return 0;
  try {
    const due = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
    if (isNaN(due.getTime())) return 0;
    const today = new Date();
    const diffTime = today.getTime() - due.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
};

/**
 * Get aging bucket label based on days overdue
 */
export const getAgingBucket = (daysOverdue: number): string => {
  if (daysOverdue <= 0) return 'Hiện hành';
  if (daysOverdue <= 30) return '1-30 ngày';
  if (daysOverdue <= 60) return '31-60 ngày';
  if (daysOverdue <= 90) return '61-90 ngày';
  return '>90 ngày';
};

/**
 * Format currency with optional compact mode - Alias for formatVND/formatVNDCompact
 */
export const formatCurrency = (value: number, compact?: boolean): string => {
  if (value == null || isNaN(value)) return '—';
  if (compact) {
    return formatVNDCompact(value);
  }
  return formatVND(value);
};

/**
 * Format number for charts (millions)
 * Example: 1234567 → "1.2M"
 */
export const formatMillions = (value: number): string => {
  if (value == null || isNaN(value)) return '—';
  return `${(value / 1_000_000).toFixed(1)}M`;
};

/**
 * Format number for charts (billions)
 * Example: 1234567890 → "1.2B"
 */
export const formatBillions = (value: number): string => {
  if (value == null || isNaN(value)) return '—';
  return `${(value / 1_000_000_000).toFixed(1)}B`;
};

/**
 * Format days (e.g., for DSO, DPO, DIO)
 */
export const formatDays = (value: number): string => {
  if (value == null || isNaN(value)) return '—';
  return `${Math.round(value)} ngày`;
};

/**
 * Format count/quantity with thousand separators
 * Example: 12345 → "12.345"
 */
export const formatCount = (value: number): string => {
  if (value == null || isNaN(value)) return '—';
  return new Intl.NumberFormat('vi-VN').format(Math.round(value));
};

/**
 * Format ratio as percentage from decimal or whole number
 * @param numerator - The numerator value
 * @param denominator - The denominator value
 * @param decimals - Number of decimal places (default: 1)
 * Example: formatRatio(35, 100) → "35.0%"
 */
export const formatRatio = (numerator: number, denominator: number, decimals: number = 1): string => {
  if (denominator == null || denominator === 0 || isNaN(numerator) || isNaN(denominator)) return '—';
  return `${((numerator / denominator) * 100).toFixed(decimals)}%`;
};
