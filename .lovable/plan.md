

## Them cot "Actual DB" va "Thoi gian" vao BackfillJobTable

### Thay doi

**File: `src/components/admin/BackfillJobTable.tsx`**

#### 1. Them cot "Actual DB" (so record thuc trong database)

Data da co san trong `job.metadata.inserted` - day la so record thuc su duoc ghi vao DB (sau khi dedup). Hien tai chi hien `processed_records` (so dong doc tu BigQuery).

Them cot moi giua "Records" va "Started":

```text
| Records (BQ)      | Actual DB    |
| 127,598 / 333,013 | 7,000        |
```

- "Records" doi label thanh "BQ Processed" de ro rang hon
- "Actual DB" lay tu `(job.metadata as any)?.inserted ?? '-'`
- Khi `inserted < processed`, hien mau nhat de chi ra dedup ratio

#### 2. Cai thien cot "Started" va "Duration"

Hien tai:
- Started: "3 hours ago" (relative, kho tracking)
- Duration: "1234s" (kho doc khi lon)

Sau khi sua:
- Started: hien ca ngay gio tuyet doi, vi du "08/02 17:32"
- Duration: format thanh "2h 15m 30s" thay vi "8130s"
- Voi job dang chay: tinh elapsed time tu `started_at` den now()

#### 3. Cap nhat colSpan

CollapsibleContent colSpan tang tu 8 len 9 (them 1 cot)

### Chi tiet ky thuat

Chi thay doi 1 file: `src/components/admin/BackfillJobTable.tsx`

1. Them helper `formatDuration(seconds)` -> "1h 23m 45s" hoac "45s"
2. Them helper `formatStartTime(dateStr)` -> "08/02 17:32"
3. Them TableHead "Actual DB"
4. Them TableCell render `metadata.inserted`
5. Doi label "Records" thanh "BQ Processed"
6. Tinh elapsed cho running jobs: `Math.round((Date.now() - started_at) / 1000)`
7. Cap nhat colSpan tu 8 -> 9

### Khong can migration SQL

Du lieu `metadata.inserted` da co san trong `bigquery_backfill_jobs`. Chi thay doi UI.
