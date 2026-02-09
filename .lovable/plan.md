

# Chuyển đổi AI Agent: Từ "SQL Generator" sang "Knowledge-Based Reasoning"

## Vấn đề hiện tại

Kiến trúc hiện tại bắt AI làm việc quá khó:

```text
User hỏi -> AI sinh SQL -> Chạy SQL (thường lỗi) -> AI đọc kết quả
                 |
                 +-- JOIN sai, type mismatch, timeout, 500 errors
```

AI phải "viết code" đúng trên 14 bảng với quan hệ phức tạp. Mỗi lỗi nhỏ (sai tên cột, sai kiểu dữ liệu) đều khiến toàn bộ flow fail.

## Giải pháp: Knowledge Snapshot Architecture

Thay vì bắt AI sinh SQL mỗi lần hỏi, ta **pre-compute các bản tóm tắt kinh doanh** (Knowledge Snapshots) theo lịch, rồi AI chỉ cần **đọc và suy luận** từ đó.

```text
[Scheduled Job - mỗi ngày/giờ]
   |
   v
Database (14 bảng L2-L4) --> Pre-compute --> knowledge_snapshots table
                                              (JSON summaries)

[User hỏi]
   |
   v
Load relevant snapshots --> Đưa vào context AI --> AI suy luận & trả lời
                                                    (KHÔNG cần SQL)
```

## Chi tiết triển khai

### 1. Tạo bảng `knowledge_snapshots`

Lưu các bản tóm tắt kinh doanh đã tính sẵn:

```text
knowledge_snapshots
  - tenant_id (uuid)
  - snapshot_type (text): 'revenue_daily', 'top_products', 'channel_breakdown', 
                          'customer_equity', 'alert_summary', 'cohort_ltv', ...
  - snapshot_date (date): ngày tính
  - data (jsonb): dữ liệu tóm tắt dạng JSON
  - summary_text (text): mô tả bằng ngôn ngữ tự nhiên (cho AI đọc trực tiếp)
  - created_at (timestamptz)
```

### 2. Tạo Edge Function `build-knowledge-snapshots`

Scheduled job chạy hàng ngày (hoặc sau mỗi lần sync), tính toán ~10 loại snapshot:

| Snapshot Type | Nguồn dữ liệu | Nội dung |
|---|---|---|
| `revenue_summary` | kpi_facts_daily | Tổng doanh thu 7/30/90 ngày, so sánh kỳ trước |
| `channel_breakdown` | kpi_facts_daily | Doanh thu/margin theo từng kênh |
| `top_products` | cdp_order_items + products | Top 20 sản phẩm theo doanh thu & lợi nhuận |
| `customer_overview` | cdp_customers + v_cdp_ltv_summary | Tổng KH, equity, risk distribution |
| `cohort_analysis` | v_cdp_ltv_by_cohort | LTV theo cohort, retention rates |
| `source_performance` | v_cdp_ltv_by_source | Hiệu quả từng nguồn khách |
| `alert_digest` | alert_instances | Tóm tắt alerts đang active |
| `marketing_kpi` | kpi_facts_daily (ad metrics) | ROAS, CPA, ad spend trends |
| `inventory_health` | products | Tồn kho, days of stock |
| `order_trends` | kpi_facts_daily | Xu hướng đơn hàng, AOV |

Mỗi snapshot bao gồm:
- `data`: JSON với số liệu chi tiết (cho AI tham chiếu chính xác)
- `summary_text`: Đoạn văn tiếng Việt tóm tắt (cho AI đọc tự nhiên)

### 3. Viết lại `cdp-qa` Edge Function

Flow mới:

```text
1. User hỏi "Top 10 sản phẩm bán chạy nhất?"
2. Load tất cả snapshots gần nhất cho tenant (10-15 rows, mỗi row ~2KB)
3. Ghép thành 1 khối "Knowledge Context" (~20KB text)
4. Gửi cho AI: system prompt + knowledge context + câu hỏi
5. AI đọc context và trả lời trực tiếp (KHÔNG sinh SQL)
```

**Ưu điểm:**
- Không còn SQL errors, JOIN failures, type mismatches
- AI trả lời nhanh hơn (1 lần gọi AI thay vì 2)
- Có thể trả lời câu hỏi phức tạp xuyên nhiều bảng
- Dữ liệu luôn nhất quán (pre-computed, verified)

**Fallback SQL (hybrid):**
- Giữ lại khả năng sinh SQL cho câu hỏi cực kỳ cụ thể mà snapshots không cover
- Nếu AI phát hiện cần drill-down chi tiết, nó có thể yêu cầu SQL query bổ sung

### 4. Cập nhật Frontend

- Không thay đổi giao diện chat
- Thêm indicator "Knowledge updated: [timestamp]" để user biết dữ liệu mới đến đâu

## Technical Details

### File changes:

1. **New migration**: Tạo bảng `knowledge_snapshots` với RLS policy theo tenant
2. **New edge function**: `build-knowledge-snapshots/index.ts` - scheduled job tính snapshot
3. **Rewrite**: `cdp-qa/index.ts` - chuyển từ SQL-gen sang knowledge-based
4. **Update**: `_shared/cdp-schema.ts` - thêm helper functions cho knowledge loading
5. **Optional**: Cron trigger gọi `build-knowledge-snapshots` sau mỗi `daily-bigquery-sync`

### Knowledge Context Format (ví dụ cho AI):

```text
=== DOANH THU (cập nhật: 2026-02-09) ===
- 7 ngày gần nhất: 1.2 tỷ VND (giảm 8% vs tuần trước)
- 30 ngày: 5.1 tỷ VND (tăng 3% vs tháng trước)
- Kênh: KiotViet 3.8 tỷ (75%), Shopee 0.9 tỷ (18%), TikTok 0.4 tỷ (7%)

=== TOP SẢN PHẨM (30 ngày) ===
1. SKU 2220178FS - Áo thun basic: 850 đơn, 425 triệu, margin 42%
2. SKU 3310456XL - Quần jean slim: 620 đơn, 380 triệu, margin 38%
...

=== KHÁCH HÀNG ===
- Tổng: 310K, Active 30d: 12K
- Equity 12m: 8.2 tỷ, At-risk: 1.4 tỷ (17%)
- Top cohort: 2025-06 (LTV 12m: 2.1 triệu/KH)
...
```

### Sizing estimate:
- 10 snapshot types x ~2KB mỗi loại = ~20KB context
- Gemini Flash context window: 1M tokens --> 20KB chỉ chiếm ~0.5%
- Hoàn toàn fit trong 1 lần gọi AI

