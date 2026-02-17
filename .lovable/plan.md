
# Danh gia hien trang Bluecore Command & Phuong an toi uu

## TONG QUAN DANH GIA

Bluecore Command hien tai la mot he thong **Level 2 Financial Operating** rat vung chac voi kien truc ro rang, doc v2.1 day du, va 9 modules hoat dong. Tuy nhien, co 3 van de PERFORMANCE, 4 van de ARCHITECTURE, va 3 co hoi STRATEGIC can xu ly.

---

## A. DIEM MANH (giu nguyen, khong sua)

| Module | Danh gia | Ly do |
|--------|---------|-------|
| Size Control Tower (Assortment) | **9/10** | 3 tang UI (HealthStrip + DecisionFeed + Tabs), summary views bypass 1000-row, pagination qua RPC `fn_size_health_details` |
| Growth Simulator Engine | **8/10** | 726 dong logic, HeroScore 4 thanh phan, Risk Flags, GrowthShape, server-side via Edge Function |
| Decision Queue + Outcomes | **8/10** | Vong doi day du: PROPOSED → APPROVED/REJECTED → Outcome tracking + Override Learning |
| Doc v2.1 | **9/10** | Route Contracts, Grain Invariants, Scoring Spec — du de AI + dev khong drift |

---

## B. VAN DE CAN TOI UU

### B1. PERFORMANCE — 3 diem nong

**[P1] AssortmentPage: Waterfall queries trong Evidence Drawer**
- File: `AssortmentPage.tsx` (dong 124-240)
- Van de: Khi mo Evidence Drawer, chay **4 queries** tuần tu:
  1. `kpi_size_completeness` (missing sizes)
  2. `inv_sku_fc_mapping` (all sizes)
  3. `inv_sku_fc_mapping` (problematic SKUs)
  4. `inv_state_positions` (surplus stores) + `inv_stores` (names)
- Tac dong: 200-500ms per query x 4 = UI lag 1-2s khi click vao 1 style
- **Fix**: Gop thanh 1 RPC `fn_evidence_pack_by_fc(p_tenant_id, p_fc_id)` tra ve tat ca data trong 1 call

**[P2] ClearancePage: N+1 query trong useClearanceCandidates**
- File: `useClearanceIntelligence.ts` (dong 81-203)
- Van de: Fetch 200 risk rows, roi query **5 bang khac** (health, cash, stock, demand, collections) voi `Promise.all` — tot, nhung van la 6 round-trip
- Tac dong: Voi 200+ FCs, moi query van lay du lieu cho tat ca 200 IDs cung luc (OK), nhung tong thoi gian van ~2-3s
- **Fix**: Tao 1 RPC `fn_clearance_candidates(p_tenant_id, p_min_risk)` join tat ca tables server-side, tra ve `ClearanceCandidate[]` truc tiep

**[P3] useRebalanceSuggestions: Pagination loop client-side**
- File: `useRebalanceSuggestions.ts` (dong 47-65)
- Van de: While loop `hasMore` voi PAGE_SIZE=1000 — neu co 5000 suggestions se chay 5 round-trips
- Tac dong: Hiem gap, nhung khi xay ra se block UI
- **Fix**: Them server-side pagination voi `limit + offset` qua params, hoac tao RPC aggregate

---

### B2. ARCHITECTURE — 4 diem can chinh

**[A1] Type Safety: `as any` abuse**
- Hien trang: Hau het moi query deu cast `as any`:
  ```typescript
  buildQuery('inv_family_codes' as any)
  buildQuery('state_markdown_risk_daily' as any)
  ```
- Van de: Supabase types khong nhan dien cac bang nay → mat autocomplete, mat type-check
- **Fix**: Cap nhat `supabase/types.ts` (tu dong tu schema) hoac tao local type definitions cho cac bang inventory

**[A2] AssortmentPage: 600 dong trong 1 file**
- Van de: AssortmentPage.tsx = 597 dong, chua ca Evidence Drawer logic, surplus store queries, transfer grouping
- **Fix**: Tach thanh:
  - `EvidenceDrawer.tsx` (~200 dong)
  - `useEvidenceDrawerData.ts` (custom hook cho 4 queries)
  - Giu AssortmentPage chi ~300 dong (layout + tabs)

**[A3] ClearancePage: 728 dong, 5 components inline**
- Van de: `WhyClearCard`, `ProductDetailPanel`, `CollectionGroupHeader`, `CandidateTableRows` tat ca nam trong 1 file
- **Fix**: Tach thanh thu muc `src/components/command/Clearance/`

**[A4] CommandOverviewPage: Khong co "Capital Misallocation" metric**
- Van de: Overview hien tai chi co 4 KPIs co ban (Ton Kho, Von Bi Khoa, Lech Chuan, Cho Quyet Dinh)
- Thieu: **Total Capital Misallocation** — 1 con so duy nhat aggregate Lost Revenue + Cash Lock + Margin Leak
- **Fix**: Them 1 KPI card "Von Dat Sai Cho" = sum(lost_revenue + cash_locked + margin_leak) tu summary views

---

### B3. DATA FLOW — 2 diem rui ro

**[D1] useSizeIntelligence: Van query raw rows**
- File: `useSizeIntelligence.ts` (dong 85-175)
- Van de: Query `state_size_health_daily.limit(2000)`, `state_lost_revenue_daily.limit(500)` — **van hit 1000-row default**
- Da co: `useSizeIntelligenceSummary` dung DB views → dung
- **Fix**: Remove hoac deprecate `useSizeIntelligence` summary logic. Chi giu Maps (healthMap, lostRevenueMap...) cho drill-down. AssortmentPage da dung `useSizeControlTower` (dung), nhung `useSizeIntelligence` van duoc import cho `evidencePackMap` va `sizeTransfers`

**[D2] staleTime khong nhat quan**
- `CommandOverviewPage`: staleTime = 30s/60s
- `useSizeIntelligenceSummary`: staleTime = khong set (default 0)
- `useClearanceIntelligence`: staleTime = khong set
- **Fix**: Chuan hoa: state_* data = staleTime 5 phut (computed daily, khong can refresh lien tuc), dec_* data = staleTime 30s (can realtime hon)

---

## C. PHUONG AN TOI UU — THU TU UU TIEN

### Phase 1: Quick Wins (1-2 ngay) ✅ DONE

| # | Viec | Impact | Effort | Status |
|---|------|--------|--------|--------|
| 1 | Them staleTime chuan: state=5min, dec=30s, kpi=2min | Giam 60% API calls | Thap | ✅ |
| 2 | Them KPI "Von Dat Sai Cho" vao CommandOverviewPage | CEO impact truc tiep | Thap | ✅ |
| 3 | Fix `days_to_clear = null` → `9999` trong ClearancePage (dong 193) | Consistency voi Scoring Spec | Thap | ✅ |

### Phase 2: Performance (3-5 ngay)

| # | Viec | Impact | Effort |
|---|------|--------|--------|
| 4 | Tao RPC `fn_evidence_pack_by_fc` — gop 4 queries | -75% latency Evidence Drawer | Trung binh |
| 5 | Tao RPC `fn_clearance_candidates` — gop 6 queries | -60% latency ClearancePage | Trung binh |
| 6 | Deprecate `useSizeIntelligence` summary logic, chi giu Maps | Giam confusion, giam queries | Thap |

### Phase 3: Architecture (5-7 ngay)

| # | Viec | Impact | Effort |
|---|------|--------|--------|
| 7 | Tach AssortmentPage → EvidenceDrawer + hook | Maintainability | Trung binh |
| 8 | Tach ClearancePage → 5 components rieng | Maintainability | Trung binh |
| 9 | Fix `as any` — tao local type definitions | Type safety | Cao |

---

## D. STRATEGIC — CO HOI MOI (khong code ngay, chi ghi nhan)

| Co hoi | Mo ta | Level |
|--------|-------|-------|
| Capital Misallocation Score | 1 metric aggregate: Lost Rev + Cash Lock + Margin Leak + Markdown Risk | Level 2→3 bridge |
| Buy Depth Engine | expected cash yield per SKU — evolve tu Growth Simulator | Level 3 |
| Markdown Memory | inv_markdown_events + clearability by channel — moat feature | Level 2 signature |

---

## TOM TAT

```text
MANH:  Kien truc 3-brain, Doc v2.1, Size Control Tower, Growth Engine
YEU:   Performance (waterfall queries), File size (600-700 dong/file), Type safety
NGUY:  useSizeIntelligence van query raw → co the sai tren data lon
CO HOI: Capital Misallocation Score (CEO-facing), RPC consolidation (UX)
```

De xuat: Bat dau tu Phase 1 (Quick Wins) vi impact cao, effort thap. Phase 2 (RPC consolidation) la muc tieu chinh de Clearance + Assortment "muot" hon.
