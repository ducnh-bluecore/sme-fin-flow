

# Bỏ tab "Phân Tích SKU" khỏi Size Control Tower

## Thay đổi

1. **`src/pages/command/AssortmentPage.tsx`**:
   - Xoa tab "Phân Tich SKU" khoi `TabsList` va `TabsContent`
   - Chuyen `grid-cols-3` thanh `grid-cols-2` cho TabsList
   - Xoa import `PrioritizedBreakdown`
   - Xoa cac bien lien quan: `brokenGroup`, `brokenDetails`, `brokenLoading`, `brokenHasMore`
   - Xoa `useEffect` auto-load broken group
   - Doi `defaultValue` sang `"transfers"`

2. **Giu nguyen**: DecisionFeed Top 5 van hien thi phia tren tabs, nguoi dung van co the drill-down qua Evidence Drawer tu DecisionFeed.

## Ky thuat

- Chi sua 1 file: `AssortmentPage.tsx`
- Khong xoa component `PrioritizedBreakdown` (co the dung o noi khac sau nay)
- Giam do phuc tap UI, tap trung vao hanh dong (transfers) va tong quan (heatmap)

