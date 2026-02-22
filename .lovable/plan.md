

# Sửa nút Delete cho job đang chạy + Xóa job order_items

## Vấn đề
- Trong `BackfillJobTable.tsx`, nút Delete (Trash) chỉ hiện khi `job.status !== 'running'`
- Khi job đang running, bạn không thể xóa được
- Job `order_items` (ID: `0fd50f7f`) đang running cần được xóa

## Thay đổi

### 1. Xóa job order_items qua database
- Cancel job bằng cách gọi edge function `backfill-bigquery` với action `cancel`
- Sau đó xóa job và source progress records liên quan

### 2. Sửa UI: Cho phép Delete khi job đang running
- File: `src/components/admin/BackfillJobTable.tsx`
- Bỏ điều kiện `job.status !== 'running'` trên nút Delete
- Thay bằng: luôn hiển thị nút Delete cho mọi trạng thái
- Khi xóa job đang running, tự động cancel trước rồi xóa

## Chi tiết kỹ thuật

Thay đổi duy nhất trong `BackfillJobTable.tsx` dòng 173-184:

```text
// Trước:
{job.status !== 'running' && (
  <Button ... onClick={() => onDelete(job.id)}>
    <Trash2 />
  </Button>
)}

// Sau: Luôn hiển thị nút Delete
<Button ... onClick={() => {
  const ok = window.confirm('Xoa job nay? (khong the hoan tac)');
  if (ok) onDelete(job.id);
}} disabled={isDeletePending}>
  <Trash2 />
</Button>
```

