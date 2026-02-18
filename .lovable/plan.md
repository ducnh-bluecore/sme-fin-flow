
# Biến AI Agent thành Production Feature

## Hiện trạng thực tế (sau khi đọc code)

**`AIAgentTestPage.tsx`** hiện tại:
- Route: `/ai-agent` — standalone, không có layout
- Badge "Test" trong header — rõ ràng là dev artifact
- Không nằm trong sidebar nào
- Gọi thẳng edge function `cdp-qa` (vẫn dùng tên "cdp-qa" nhưng thực chất đã là full multi-domain agent)
- UI: tự render header riêng, không dùng `DashboardLayout`

**Edge Function `cdp-qa/index.ts`** — đây là điểm mạnh lớn:
- Architecture: **2-pass reasoning** (Pass 1: Tool-calling với temperature 0.1, Pass 2: Streaming answer với temperature 0.4)
- 11 tools đã production-ready: Revenue, Profitability, Channel, Marketing, Products, Inventory, Alerts, Customer, Cohort, Channel P&L, Custom SQL
- System prompt rất mature: schema catalog 20 bảng, metric classification (cumulative/average/snapshot), VND formatting, chart output
- Model: `google/gemini-2.5-pro` — top tier
- Retry logic: 5 lần với exponential backoff khi 429

**Vấn đề cần giải quyết để production-ready:**

| # | Vấn đề | Mức độ |
|---|--------|--------|
| 1 | Không có layout — standalone page | Cao |
| 2 | Badge "Test" — không chuyên nghiệp | Cao |
| 3 | Không có entry point trong sidebar | Cao |
| 4 | Tên route `/ai-agent` ổn, tên file "TestPage" cần đổi | Trung bình |
| 5 | SCENARIO_GROUPS dùng label kỹ thuật (L3 KPI, L2 Orders) — không phù hợp CEO/CFO | Trung bình |
| 6 | Không có conversation history persistence | Thấp (có thể phase 2) |
| 7 | Edge function vẫn tên `cdp-qa` — misleading | Thấp |

---

## Chiến lược: Promote, không viết lại

Logic AI đã production-ready. Chỉ cần **thay đổi visual layer và integration** — không đụng vào edge function.

---

## Thay đổi cụ thể

### 1. Đổi tên file: `AIAgentTestPage.tsx` → `AIAgentPage.tsx`

Rename component và cập nhật import trong `App.tsx`:
```tsx
// App.tsx
const AIAgentPage = lazy(() => import("./pages/AIAgentPage"));
// ...
<Route path="/ai-agent" element={
  <ProtectedRoute>
    <AIAgentPage />
  </ProtectedRoute>
} />
```

### 2. Wrap vào `DashboardLayout`

Hiện tại page tự render header riêng. Cần đặt trong layout để có sidebar + header nhất quán:

```tsx
// AIAgentPage.tsx
import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default function AIAgentPage() {
  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        {/* Nội dung chat */}
      </div>
    </DashboardLayout>
  );
}
```

Xóa: custom header div với badge "Test", border-b riêng.
Giữ: toàn bộ chat logic, streaming, SSE parsing, sendMessage callback.

### 3. Cập nhật header trong page

```tsx
// Thay: standalone header card
// Thành: page-level header nhất quán với các pages khác
<div className="flex items-center justify-between mb-4">
  <div>
    <h1 className="text-xl font-semibold flex items-center gap-2">
      <Sparkles className="h-5 w-5 text-primary" />
      Bluecore AI Analyst
      {/* Bỏ badge "Test" */}
    </h1>
    <p className="text-sm text-muted-foreground">
      Hỏi bất kỳ câu hỏi về doanh thu, KPIs, alerts, khách hàng — AI tự truy vấn SSOT và phân tích.
    </p>
  </div>
  {messages.length > 0 && <Button variant="outline" size="sm" onClick={clearMessages}>...</Button>}
</div>
```

### 4. Thay SCENARIO_GROUPS: từ kỹ thuật → business questions

```tsx
// Từ:
{ label: 'L3 KPI', questions: ['Tổng doanh thu 30 ngày...'] }
{ label: 'L2 Orders', questions: ['Top 10 sản phẩm...'] }
{ label: 'L4 Alerts', questions: [...] }
{ label: 'CDP Equity', questions: [...] }

// Thành (CEO/CFO language):
{ label: '💰 Doanh Thu & Lợi Nhuận', questions: [
  'Doanh thu tháng này so với tháng trước thế nào?',
  'Kênh nào đang lỗ hay lãi ít nhất?',
  'Margin tổng thể đang ở mức bao nhiêu?',
]}
{ label: '📦 Sản Phẩm & Tồn Kho', questions: [
  'Top 10 sản phẩm bán chạy nhất tháng này?',
  'Sản phẩm nào đang tồn kho nhiều nhất?',
]}
{ label: '⚠️ Rủi Ro & Cảnh Báo', questions: [
  'Hiện tại có vấn đề gì nghiêm trọng cần xử lý?',
  'Có bao nhiêu cảnh báo đang mở?',
]}
{ label: '👥 Khách Hàng', questions: [
  'Top khách hàng theo giá trị LTV?',
  'Cohort nào có giá trị tốt nhất?',
]}
```

### 5. Thêm AI Agent vào FDP Sidebar (nhóm [5] Kế Hoạch & Quyết Định)

Trong `src/components/layout/Sidebar.tsx`, thêm vào nhóm `nav.planSimulation`:

```tsx
// [5] KẾ HOẠCH & QUYẾT ĐỊNH — thêm AI Agent
{
  labelKey: 'nav.planSimulation',
  icon: Target,
  children: [
    { labelKey: 'nav.aiAgent', href: '/ai-agent' }, // ← THÊM VÀO ĐẦU
    { labelKey: 'nav.scenario', href: '/scenario' },
    { labelKey: 'nav.rollingForecast', href: '/rolling-forecast' },
    { labelKey: 'nav.executiveSummary', href: '/executive-summary' },
    { labelKey: 'nav.riskDashboard', href: '/risk-dashboard' },
    { labelKey: 'nav.decisionSupport', href: '/decision-support' },
    { labelKey: 'nav.decisionCenter', href: '/decision-center' },
  ],
},
```

### 6. Thêm label vào `LanguageContext.tsx`

```ts
// Tiếng Việt
'nav.aiAgent': 'AI Analyst',

// Tiếng Anh
'nav.aiAgent': 'AI Analyst',
```

---

## Không thay đổi

- Edge function `cdp-qa/index.ts` — không đụng gì, đã production-ready
- Route `/ai-agent` — giữ nguyên
- Toàn bộ streaming/SSE logic trong component
- `sendMessage` callback và auth flow
- `AIMessageContent` component (markdown + chart rendering)

---

## Files thay đổi

| # | File | Thay đổi |
|---|------|----------|
| 1 | `src/pages/AIAgentTestPage.tsx` | Rename → `AIAgentPage.tsx`, bỏ standalone header, wrap vào DashboardLayout, đổi SCENARIO_GROUPS |
| 2 | `src/App.tsx` | Cập nhật import và lazy load |
| 3 | `src/components/layout/Sidebar.tsx` | Thêm `nav.aiAgent` vào nhóm [5] |
| 4 | `src/contexts/LanguageContext.tsx` | Thêm label `nav.aiAgent` |

---

## Kết quả

| Trước | Sau |
|-------|-----|
| `/ai-agent` — standalone, không sidebar | Nằm trong FDP sidebar, nhóm "Kế Hoạch & Quyết Định" |
| Badge "Test" trong header | Không còn badge, tên "Bluecore AI Analyst" |
| Header tự render riêng | Dùng DashboardLayout nhất quán |
| Scenario labels kỹ thuật (L3 KPI, L2 Orders) | Business language (Doanh Thu & Lợi Nhuận, Rủi Ro & Cảnh Báo) |
| Không tìm được từ navigation | Accessible từ sidebar chính |

