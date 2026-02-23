import * as XLSX from 'xlsx';
import type { RebalanceSuggestion } from '@/hooks/inventory/useRebalanceSuggestions';

export function exportRebalanceToExcel(
  suggestions: RebalanceSuggestion[],
  editedQty?: Record<string, number>
) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Phiếu điều chuyển (per-size rows for WMS)
  const rows: Record<string, any>[] = [];
  let stt = 0;

  for (const s of suggestions) {
    const sizeBreakdown = (s as any).size_breakdown as Array<{sku: string; size: string; qty: number; source_on_hand?: number; dest_on_hand?: number}> | null;
    const finalQty = editedQty?.[s.id] ?? s.qty;

    if (sizeBreakdown && sizeBreakdown.length > 0) {
      // Export each size as a separate row
      for (const sz of sizeBreakdown) {
        stt++;
        rows.push({
          'STT': stt,
          'Tên SP': s.fc_name || s.fc_id,
          'Size': sz.size,
          'SKU': sz.sku,
          'SL': sz.qty,
          'Kho nguồn': s.from_location_name,
          'Kho đích': s.to_location_name,
          'Tồn nguồn': sz.source_on_hand ?? '',
          'Tồn đích': sz.dest_on_hand ?? '',
          'Ưu tiên': s.priority,
          'Trạng thái': s.status,
          'Revenue dự kiến': s.potential_revenue_gain,
          'Ghi chú': s.reason || '',
        });
      }
    } else {
      // Fallback: export as FC-level row (no size data)
      stt++;
      rows.push({
        'STT': stt,
        'Tên SP': s.fc_name || s.fc_id,
        'Size': '',
        'SKU': '',
        'SL': finalQty,
        'Kho nguồn': s.from_location_name,
        'Kho đích': s.to_location_name,
        'Tồn nguồn': '',
        'Tồn đích': '',
        'Ưu tiên': s.priority,
        'Trạng thái': s.status,
        'Revenue dự kiến': s.potential_revenue_gain,
        'Ghi chú': s.reason || '',
      });
    }
  }

  const ws1 = XLSX.utils.json_to_sheet(rows);
  if (rows.length > 0) {
    const colWidths = Object.keys(rows[0]).map(key => ({
      wch: Math.max(key.length + 2, ...rows.map(r => String((r as any)[key] ?? '').length + 2))
    }));
    ws1['!cols'] = colWidths;
  }
  XLSX.utils.book_append_sheet(wb, ws1, 'Phiếu điều chuyển');

  // Sheet 2: Tóm tắt
  const totalQty = suggestions.reduce((sum, s) => sum + (editedQty?.[s.id] ?? s.qty), 0);
  const totalRevenue = suggestions.reduce((sum, s) => sum + s.potential_revenue_gain, 0);
  const summaryData = [
    ['Tổng số dòng (FC)', suggestions.length],
    ['Tổng dòng chi tiết (Size)', rows.length],
    ['Tổng SL chuyển', totalQty],
    ['Tổng revenue dự kiến', totalRevenue],
    ['Ngày xuất', new Date().toLocaleString('vi-VN')],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(summaryData);
  ws2['!cols'] = [{ wch: 26 }, { wch: 20 }];
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
