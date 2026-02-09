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
  // Auto-width columns
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

  // Download
  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `dieu-chuyen-hang-${dateStr}.xlsx`);
}
