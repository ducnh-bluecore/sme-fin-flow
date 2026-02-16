
# Nang cap Clearance Intelligence: Toc do ban, Giai thich rui ro & Nhom theo Bo suu tap

## Tong quan

Ba cai tien chinh:
1. **Toc do ban (Sales Velocity)** - Hien thi toc do ban trung binh/ngay va xu huong (trend) cho moi san pham clearance
2. **Giai thich ro ly do clearance** - Chuyen truong `reason` tu database thanh giao dien de doc, hien thi noi bat thay vi chi 1 dong italic nho
3. **Nhom theo Bo suu tap (Collection)** - Them layer nhom san pham theo collection (vd: "Winter Elegance 2025", "Spring Bloom 2026") de CEO/CFO nhin tong quan nhanh hon

## Chi tiet thiet ke

### 1. Them Sales Velocity vao danh sach va detail panel

**Nguon du lieu**: Bang `inv_state_demand` - da co san du lieu `sales_velocity`, `avg_daily_sales`, `trend` lien ket qua `fc_id`.

**Trong danh sach chinh (bang Clearance Candidates)**:
- Them cot "Toc do ban" hien thi `avg_daily_sales` (vd: "0.07/ngay") va badge trend (tang/giam/on dinh)
- Cot nay giup CEO thay ngay san pham nao "chet" (velocity gan 0) va can uu tien clear

**Trong detail panel (khi click vao san pham)**:
- Them 2 metric moi: "Toc do ban TB" va "Xu huong" vao grid metric phia tren
- Tinh "So ngay de clear het" = current_stock / avg_daily_sales (neu velocity > 0)

### 2. Giai thich ly do clearance ro rang hon

Hien tai `reason` chi hien thi 1 dong nho. Se chuyen thanh:
- Mot card rieng "Tai sao can Clear?" voi icon canh bao
- Tach cac yeu to (markdown risk score, health score, curve state, days to markdown) thanh cac dong rieng voi progress bar / badge mau
- Vd: "Size curve bi pha vo (broken) + Toc do ban cham (0.03/ngay) + Da ton 45 ngay"

### 3. Nhom theo Bo suu tap (Collection Layer)

**Nguon du lieu**: Bang `inv_collections` lien ket qua `collection_id` trong `inv_family_codes`. Da co 3 collections: "Winter Elegance 2025", "Tet Collection 2026", "Spring Bloom 2026".

**Giao dien**:
- Mac dinh hien thi danh sach theo collection (accordion/group)
- Moi collection header hien thi: ten collection, season, so san pham can clear, tong gia tri ton
- Click expand de thay danh sach san pham trong collection do
- Cung cap toggle "Nhom theo BST / Danh sach phang" de nguoi dung chon

## Chi tiet ky thuat

### File: `src/hooks/inventory/useClearanceIntelligence.ts`

**Interface `ClearanceCandidate`** - Them cac truong:
```
avg_daily_sales: number
sales_velocity: number
trend: string | null
days_to_clear: number | null
collection_id: string | null
collection_name: string | null
```

**Hook `useClearanceCandidates`** - Them 2 query song song:
1. Query `inv_state_demand` theo `fc_id` (aggregate `avg_daily_sales` qua cac store)
2. Query `inv_collections` de lay ten collection

Dung RPC hoac aggregate phia server de tranh gioi han 1000 dong khi lay demand data.

### File: `src/pages/command/ClearancePage.tsx`

**ClearanceCandidatesTab** - Thay doi:
- Them state `groupByCollection` (boolean toggle)
- Khi bat: nhom candidates theo `collection_name`, render moi nhom trong Collapsible component
- Moi group header: `[Collection Name] - [Season] - [N san pham] - [Tong gia tri ton]`
- Them cot "Toc do ban" vao bang

**ProductDetailPanel** - Thay doi:
- Them metric cards: "Toc do ban TB", "Xu huong", "So ngay de clear het"
- Them card "Tai sao can Clear?" voi breakdown chi tiet tu `reason`, `markdown_risk_score`, `health_score`, `curve_state`

### Migration (neu can)

Co the can tao RPC `fn_clearance_demand_by_fc` de aggregate demand theo fc_id phia server (tuong tu `fn_clearance_stock_by_fc`), tranh hit gioi han 1000 dong khi co nhieu store x fc.
