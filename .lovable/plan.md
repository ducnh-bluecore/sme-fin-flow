
# Plan: Nâng cấp Backfill UI với Progress Chi Tiết từng Source

## Phân Tích Vấn đề

### Vấn đề 1: Products chỉ sync 500 records
- Hiện tại `syncProducts` query có `LIMIT ${batchSize}` nhưng **không có pagination loop**
- Không dùng `last_watermark` hoặc `OFFSET` để tiếp tục batch tiếp theo
- Kết quả: Chỉ lấy được 500 records đầu tiên, bỏ qua hàng chục nghìn records còn lại

### Vấn đề 2: Không có progress chi tiết từng source
- UI hiện tại chỉ show tổng `processed_records` và `total_records`
- Không biết đang sync từ source nào (Shopee, Lazada, KiotViet...)
- Không biết mỗi source có bao nhiêu records
- Khó debug khi có lỗi

## Giải pháp

### 1. Tạo bảng `backfill_source_progress` để track từng source

```sql
CREATE TABLE backfill_source_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES bigquery_backfill_jobs(id) ON DELETE CASCADE,
  source_name TEXT NOT NULL,
  dataset TEXT NOT NULL,
  table_name TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, running, completed, failed
  total_records INTEGER DEFAULT 0,
  processed_records INTEGER DEFAULT 0,
  last_offset INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, source_name)
);
```

### 2. Cập nhật Edge Function `backfill-bigquery`

**a) Thêm function đếm records từ BigQuery trước khi sync:**
```typescript
async function countSourceRecords(
  accessToken: string, 
  projectId: string,
  dataset: string,
  table: string,
  dateFrom?: string,
  dateColumn?: string
): Promise<number> {
  let query = `SELECT COUNT(*) as cnt FROM \`${projectId}.${dataset}.${table}\``;
  if (dateFrom && dateColumn) {
    query += ` WHERE DATE(\`${dateColumn}\`) >= '${dateFrom}'`;
  }
  const { rows } = await queryBigQuery(accessToken, projectId, query);
  return parseInt(rows[0]?.cnt || '0', 10);
}
```

**b) Track progress từng source trong metadata:**
```typescript
// Trong syncCustomers, syncOrders, syncProducts...
await updateSourceProgress(supabase, jobId, {
  source_name: source.name,
  dataset: source.dataset,
  table_name: source.table,
  status: 'running',
  total_records: await countSourceRecords(...),
  started_at: new Date().toISOString()
});
```

**c) Thêm pagination loop cho syncProducts:**
```typescript
async function syncProducts(...) {
  let offset = 0;
  let hasMore = true;
  
  // Count total first
  const totalQuery = `SELECT COUNT(*) as cnt FROM ...`;
  const { rows: countRows } = await queryBigQuery(accessToken, projectId, totalQuery);
  const total = parseInt(countRows[0]?.cnt || '0', 10);
  
  while (hasMore) {
    const query = `SELECT ... ORDER BY productid LIMIT ${batchSize} OFFSET ${offset}`;
    const { rows } = await queryBigQuery(...);
    
    if (rows.length === 0) { hasMore = false; break; }
    
    // Upsert batch
    await supabase.from('products').upsert(...);
    
    offset += rows.length;
    totalProcessed += rows.length;
    
    // Update progress
    await updateJobStatus(supabase, jobId, {
      processed_records: totalProcessed,
      total_records: total,
      last_watermark: String(offset)
    });
    
    if (rows.length < batchSize) hasMore = false;
  }
}
```

### 3. Cập nhật Admin UI với Source Progress

**Thêm component hiển thị chi tiết từng source:**

```
+------------------------------------------+
| BigQuery Backfill - Customers            |
+------------------------------------------+
| Source       | Dataset        | Status   |
|--------------|----------------|----------|
| kiotviet     | olvboutique    | ✓ 15,420 |
| haravan      | olvboutique    | ⏳ 8,230/12,500 |
| bluecore     | olvboutique    | ⏸ pending |
+------------------------------------------+
| Total: 23,650 / 40,000 (59%)            |
+------------------------------------------+
```

**Cập nhật UI component:**
```tsx
// Trong BigQueryBackfill.tsx - thêm SourceProgressTable
function SourceProgressTable({ jobId }: { jobId: string }) {
  const { data: sources } = useSourceProgress(jobId);
  
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Source</TableHead>
          <TableHead>Dataset</TableHead>
          <TableHead>Table</TableHead>
          <TableHead>Progress</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sources?.map(s => (
          <TableRow key={s.id}>
            <TableCell>{s.source_name}</TableCell>
            <TableCell className="font-mono text-xs">{s.dataset}</TableCell>
            <TableCell className="font-mono text-xs">{s.table_name}</TableCell>
            <TableCell>
              {s.processed_records.toLocaleString()} / {s.total_records.toLocaleString()}
            </TableCell>
            <TableCell>{getSourceStatusBadge(s.status)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

### 4. Response format mới từ Edge Function

```json
{
  "success": true,
  "job_id": "xxx",
  "model_type": "customers",
  "result": {
    "processed": 40000,
    "created": 35000,
    "merged": 5000,
    "sources": [
      {
        "name": "kiotviet",
        "dataset": "olvboutique",
        "table": "raw_kiotviet_Customers",
        "total": 15420,
        "processed": 15420,
        "status": "completed"
      },
      {
        "name": "haravan",
        "dataset": "olvboutique", 
        "table": "raw_hrv_Customers",
        "total": 12500,
        "processed": 12500,
        "status": "completed"
      }
    ]
  }
}
```

## Danh sách Files Cần Thay Đổi

| File | Thay đổi |
|------|----------|
| `supabase/functions/backfill-bigquery/index.ts` | Thêm pagination, source tracking, COUNT queries |
| `src/pages/admin/BigQueryBackfill.tsx` | Thêm SourceProgressTable, expandable rows |
| `src/hooks/useBigQueryBackfill.ts` | Thêm hook `useSourceProgress()` |
| Database Migration | Tạo bảng `backfill_source_progress` |

## Thứ tự Thực hiện

1. Tạo migration cho bảng `backfill_source_progress`
2. Cập nhật Edge Function với pagination loop và source tracking
3. Thêm hook `useSourceProgress()` 
4. Cập nhật UI với expandable source details
5. Deploy và test

## Ước tính Impact

- Products: Từ 500 → 10,000+ records (full sync)
- Customers: Có thể debug từng source (KiotViet, Haravan, Bluecore)
- Orders: Có thể theo dõi từng channel (Shopee, Lazada, TikTok, Tiki, KiotViet)
