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
  return `${value.toFixed(decimals)}%`;
}
