

## Phase 3.1: Chuyển Size Health Details sang Action Groups

### Vấn đề hiện tại
- Bảng Size Health Details hiển thị flat list, giới hạn 1000 dòng (thực tế chỉ show 100)
- Không phân biệt mức độ nghiêm trọng — style broken và healthy nằm chung
- Vi phạm nguyên tắc Progressive Decision Disclosure
- Trùng lặp thông tin với các action feeds phía trên

### Giải pháp: Action Groups by Curve State

Thay thế bảng flat bằng 4 Collapsible Action Groups, sắp xếp theo mức độ nghiêm trọng:

```text
+--------------------------------------------------+
| BROKEN (45 styles)              Cash: 2.3B locked |
| Total Lost Rev: 890M | Margin Leak: 234M         |
| [Click to expand]                                 |
+--------------------------------------------------+
| RISK (120 styles)               Cash: 1.1B locked |
| Total Lost Rev: 456M | MD Risk: 67 styles         |
| [Click to expand]                                 |
+--------------------------------------------------+
| WATCH (300 styles)              Deviation avg: 12 |
| [Collapsed by default]                            |
+--------------------------------------------------+
| HEALTHY (735 styles)            Avg score: 82     |
| [Collapsed by default]                            |
+--------------------------------------------------+
```

### Chi tiet ky thuat

#### 1. Tao DB View: `v_size_health_by_state`

View nay group theo `curve_state` va tinh tong impact metrics tu cac bang state:
- Count styles per state
- Sum lost_revenue, cash_locked, margin_leak per state
- Avg health_score per state

#### 2. Tao DB RPC: `fn_size_health_details`

RPC nhan tham so `p_curve_state` va `p_limit`/`p_offset` de load chi tiet theo tung group voi server-side pagination. Join voi `dim_products` de lay ten san pham thay vi UUID.

#### 3. Tao Hook: `useSizeHealthGroups`

- Goi `v_size_health_by_state` cho summary 4 groups (luon load)
- Goi `fn_size_health_details` khi user expand 1 group (lazy load)
- Cache theo group de khong re-fetch khi collapse/expand

#### 4. Refactor UI trong `AssortmentPage.tsx`

- Xoa bang "Size Health Details" hien tai
- Thay bang 4 Collapsible cards (dung Accordion component co san)
- Moi card header hien: State badge + count + tong impact metrics
- Expand: hien bang chi tiet voi product name, health score, lost rev, cash lock, margin leak
- Broken va Risk: auto-expand khi co data
- Watch va Healthy: collapsed mac dinh
- Moi group co "Load more" button neu > 50 styles

#### 5. Giu nguyen phan tren (Hero KPIs + Action Feeds)

- Hero KPIs van dung `useSizeIntelligenceSummary` (DB views)
- Smart Transfer Suggestions van gom theo store
- Evidence Pack drawer van hoat dong

### Ket qua mong doi
- Hero KPIs chinh xac 100% (da fix)
- Action Groups load nhanh (chi 1 query summary + lazy load detail)
- Khong bi gioi han 1000 dong
- CEO/CFO thay ngay: "45 styles broken, khoa 2.3B" trong 5 giay
- Drill-down khi can audit

