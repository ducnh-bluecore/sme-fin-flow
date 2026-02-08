

## Redesign BigQuery Backfill Page: Tab-based Job Management

### Van de hien tai

Tat ca jobs (running, completed, failed, cancelled, pending) hien thi chung trong 1 table duy nhat. Khi so luong jobs tang len hang tram, se rat kho:
- Theo doi job nao dang chay
- Tim job loi de retry
- Phan biet job cu va moi

### Giai phap: Chia thanh 3 tabs

```text
+--------------------------------------------------+
| [Dang chay (2)]  [Hoan thanh (45)]  [Loi (3)]   |
+--------------------------------------------------+
```

**Tab 1: Dang chay** (Running + Pending)
- Chi hien thi jobs dang active (running, pending)
- Auto-refresh moi 5s
- Hien thi progress bar noi bat
- Actions: Cancel, Continue

**Tab 2: Hoan thanh** (Completed)
- Jobs da sync xong
- Sap xep theo thoi gian moi nhat
- Actions: Delete, xem source details

**Tab 3: Loi** (Failed + Cancelled)
- Jobs can xu ly
- Hien thi error message ro rang
- Actions: Retry (Continue), Delete

### Layout moi

```text
+--------------------------------------------------+
| BigQuery Backfill                      [Refresh]  |
| Sync data from BigQuery to Master Model          |
+--------------------------------------------------+
| Model Overview Cards (5 models)                   |
| [Customers] [Products] [Orders] [Items] [Refunds] |
+--------------------------------------------------+
| Start New Backfill (collapsed by default)          |
| [Model] [Date From] [Date To] [Batch] [Start]    |
+--------------------------------------------------+
| [Dang chay (2)]  [Hoan thanh]  [Loi (3)]         |
| +----------------------------------------------+ |
| | Table filtered by tab                        | |
| +----------------------------------------------+ |
+--------------------------------------------------+
```

Thay doi:
- Model Overview Cards di len tren de thay tong quan nhanh
- "Start New Backfill" form dung Collapsible (gon hon)
- Job table chia theo tabs voi badge count

### Chi tiet ky thuat

**File thay doi:** `src/pages/admin/BigQueryBackfill.tsx`

1. Import `Tabs, TabsList, TabsTrigger, TabsContent` tu `@/components/ui/tabs`
2. Tinh `activeJobs`, `completedJobs`, `failedJobs` tu `jobs` array bang filter:
   - Active: status in ['running', 'pending']
   - Completed: status === 'completed'
   - Failed: status in ['failed', 'cancelled']
3. Tach table render thanh component `JobTable` nhan filtered jobs lam prop
4. Moi tab hien thi count trong badge (vi du: "Dang chay (2)")
5. Model Overview Cards chuyen len truoc form, hien thi tat ca 10 models (hien tai chi 5)
6. "Start New Backfill" card dung Collapsible de gon giao dien

### Khong can migration SQL

Chi thay doi UI component, khong thay doi data layer.

