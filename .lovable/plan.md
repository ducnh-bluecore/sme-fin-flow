

# Implement Bluecore Command Doc v2.1 - 5 Gap Fixes

## Tong quan

Cap nhat 3 files theo plan da approved: viet lai `.lovable/plan.md` thanh v2.1 day du, cap nhat types trong `contracts.ts`, va them COMMAND metrics vao `metric-registry.ts`.

---

## Thay doi chi tiet

### File 1: `.lovable/plan.md` (viet lai toan bo)

Viet lai tu dau voi cau truc moi:

- **Header**: Version 2.1, ngay cap nhat, muc dich
- **Section 1**: Decision Stack Philosophy (3 brains)
- **Section 2**: Module Map (9 routes)
- **Section 3**: Cong thuc & Logic (Hero Score, Damage Score, Growth Efficiency, Days to Clear)
- **Section 4**: Database Schema Map (inv_, state_, kpi_, dec_, sem_)
  - **4.6 (MOI)**: Markdown & Clearance History (Planned) - inv_markdown_events, sem_markdown_ladders, sem_markdown_caps
- **Section 5**: Data Flow & RPC Functions
- **Section 6**: Component Architecture tree
- **Section 7**: Hook Architecture
- **Section 8**: Simulation Engine (Growth Simulator v2)
- **Section 9**: Decision Contract spec
  - **9.3 (CAP NHAT)**: Them COMMAND domain, Owner Role Map, dedupeKey rule
- **Section 10**: Alert & Control Tower integration
- **Section 11 (MOI)**: Route Contracts - block chuan cho 9 routes (input filters, RPC/queries, tables read/write, refresh, row constraints, fallback)
- **Section 12 (MOI)**: Grain Invariants - 3 invariants bat buoc (Decision Grain, State Grain, Demand Grain)
- **Section 13 (MOI)**: Scoring Specification (scope & windows, bounds & clamping, null rules, outlier handling)

### File 2: `src/lib/command-center/contracts.ts`

Thay doi 2 dong:
- Line 125: `CommandCenterDomain` them `'COMMAND'`
- Line 147: `DecisionOwnerRole` them `'MERCHANDISER'`

### File 3: `src/lib/command-center/metric-registry.ts`

Them block `COMMAND_METRICS` voi cac metrics dac trung cho inventory command:
- `size_health_score` - Size health tong hop
- `markdown_risk_score` - Markdown risk 
- `cash_locked_value` - Cash bi khoa trong ton kho
- `days_to_clear` - So ngay de clear hang
- `clearance_candidates_count` - So luong FC can thanh ly

Them vao `METRIC_REGISTRY` array.

---

## Khong thay doi

- Khong tao database migration
- Khong thay doi UI components
- Khong thay doi hooks logic
- Khong thay doi routing

