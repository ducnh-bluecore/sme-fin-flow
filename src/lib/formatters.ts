// Vietnamese number and currency formatters

export const formatVND = (value: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
};

export const formatVNDCompact = (value: number): string => {
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

export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('vi-VN').format(value);
};

export const formatPercent = (value: number, isDecimal: boolean = true): string => {
  // If value is a decimal (e.g., 0.35 for 35%), multiply by 100
  const percentage = isDecimal && Math.abs(value) <= 1 ? value * 100 : value;
  return `${percentage.toFixed(1)}%`;
};

export const formatDate = (date: Date | string): string => {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '-';
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d);
  } catch {
    return '-';
  }
};

export const formatDateShort = (date: Date | string): string => {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '-';
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
    }).format(d);
  } catch {
    return '-';
  }
};

export const getDaysOverdue = (dueDate: Date | string): number => {
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

export const getAgingBucket = (daysOverdue: number): string => {
  if (daysOverdue <= 0) return 'Hiện hành';
  if (daysOverdue <= 30) return '1-30 ngày';
  if (daysOverdue <= 60) return '31-60 ngày';
  if (daysOverdue <= 90) return '61-90 ngày';
  return '>90 ngày';
};

// Alias for formatVND with optional compact mode
export const formatCurrency = (value: number, compact?: boolean): string => {
  if (compact) {
    return formatVNDCompact(value);
  }
  return formatVND(value);
};
