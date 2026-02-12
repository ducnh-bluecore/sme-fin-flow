import * as XLSX from 'xlsx';
import type { RebalanceSuggestion } from '@/hooks/inventory/useRebalanceSuggestions';

export function exportRebalanceToExcel(
  suggestions: RebalanceSuggestion[],
  editedQty?: Record<string, number>
) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Phiếu điều chuyển
  const rows = suggestions.map((s, i) => {
    const originalQty = s.qty;
    const edited = editedQty?.[s.id];
    const finalQty = edited ?? originalQty;
    return {
      'STT': i + 1,
      'Mã SP (FC)': s.fc_id,
      'Tên SP': s.fc_name || '',
      'Kho nguồn': s.from_location_name,
      'Loại kho nguồn': s.from_location_type,
      'Kho đích': s.to_location_name,
      'Loại kho đích': s.to_location_type,
      'SL đề xuất': originalQty,
      'SL đã chỉnh': edited != null && edited !== originalQty ? edited : '',
      'SL cuối cùng': finalQty,
      'Ưu tiên': s.priority,
      'Trạng thái': s.status,
      'Cover trước (nguồn)': s.from_weeks_cover != null ? `${s.from_weeks_cover.toFixed(1)}w` : '',
      'Cover trước (đích)': s.to_weeks_cover != null ? `${s.to_weeks_cover.toFixed(1)}w` : '',
      'Cover sau': s.balanced_weeks_cover != null ? `${s.balanced_weeks_cover.toFixed(1)}w` : '',
      'Revenue dự kiến': s.potential_revenue_gain,
      'Ghi chú': s.reason || '',
    };
  });

  const ws1 = XLSX.utils.json_to_sheet(rows);
  const colWidths = Object.keys(rows[0] || {}).map(key => ({
    wch: Math.max(key.length + 2, ...rows.map(r => String((r as any)[key] ?? '').length + 2))
  }));
  ws1['!cols'] = colWidths;
  XLSX.utils.book_append_sheet(wb, ws1, 'Phiếu điều chuyển');

  // Sheet 2: Tóm tắt
  const totalQty = suggestions.reduce((sum, s) => sum + (editedQty?.[s.id] ?? s.qty), 0);
  const totalRevenue = suggestions.reduce((sum, s) => sum + s.potential_revenue_gain, 0);
  const summaryData = [
    ['Tổng số dòng', suggestions.length],
    ['Tổng SL chuyển', totalQty],
    ['Tổng revenue dự kiến', totalRevenue],
    ['Ngày xuất', new Date().toLocaleString('vi-VN')],
    ['Số dòng đã chỉnh', editedQty ? Object.keys(editedQty).filter(id => {
      const s = suggestions.find(x => x.id === id);
      return s && editedQty[id] !== s.qty;
    }).length : 0],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(summaryData);
  ws2['!cols'] = [{ wch: 22 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Tóm tắt');

  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `dieu-chuyen-hang-${dateStr}.xlsx`);
}

// ── Size Transfer Export (Phase 3.2) ──

export interface SizeTransferRow {
  id: string;
  product_id: string;
  product_name?: string;
  size_code: string;
  source_store_id: string;
  source_store_name?: string;
  dest_store_id: string;
  dest_store_name?: string;
  transfer_qty: number;
  net_benefit: number;
  reason: string;
  status?: string;
  approved_at?: string;
}

export function exportSizeTransferToExcel(
  transfers: SizeTransferRow[],
  approverName?: string
) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Phiếu điều chuyển
  const rows = transfers.map((t, i) => ({
    'STT': i + 1,
    'Tên SP': t.product_name || t.product_id,
    'Size': t.size_code,
    'Kho nguồn': t.source_store_name || t.source_store_id,
    'Kho đích': t.dest_store_name || t.dest_store_id,
    'SL': t.transfer_qty,
    'Net Benefit': t.net_benefit,
    'Reason': t.reason || '',
    'Ngày duyệt': t.approved_at ? new Date(t.approved_at).toLocaleString('vi-VN') : new Date().toLocaleString('vi-VN'),
  }));

  const ws1 = XLSX.utils.json_to_sheet(rows);
  if (rows.length > 0) {
    const colWidths = Object.keys(rows[0]).map(key => ({
      wch: Math.max(key.length + 2, ...rows.map(r => String((r as any)[key] ?? '').length + 2))
    }));
    ws1['!cols'] = colWidths;
  }
  XLSX.utils.book_append_sheet(wb, ws1, 'Phiếu điều chuyển');

  // Sheet 2: Tóm tắt
  const totalQty = transfers.reduce((sum, t) => sum + t.transfer_qty, 0);
  const totalBenefit = transfers.reduce((sum, t) => sum + t.net_benefit, 0);
  const summaryData = [
    ['Tổng số dòng', transfers.length],
    ['Tổng SL chuyển', totalQty],
    ['Tổng Net Benefit', totalBenefit],
    ['Ngày xuất', new Date().toLocaleString('vi-VN')],
    ['Người duyệt', approverName || '—'],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(summaryData);
  ws2['!cols'] = [{ wch: 22 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Tóm tắt');

  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `size-transfer-${dateStr}.xlsx`);
}
