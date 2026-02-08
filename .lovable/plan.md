

## Tao cac bang con thieu theo kien truc v1.4.2

### Hien trang

Theo thiet ke trong `tableMapping.ts`, he thong can 53 bang chia thanh 10 layer. Nhung rat nhieu bang thiet ke da co trong mapping nhung **chua duoc tao trong database**.

Duoi day la danh sach cac bang **THIEU** theo tung layer:

#### L1 Foundation - THIEU 4 bang

| Bang can tao | Mo ta |
|---|---|
| `organizations` | To chuc / thuong hieu trong tenant |
| `organization_members` | Thanh vien thuoc organization |
| `tenant_members` | Lien ket user-tenant (khac tenant_users da co) |
| `tenant_roles` | Dinh nghia role va permission |

Da co: `tenants`, `tenant_users`, `connector_integrations`, `profiles`

#### L1.5 Ingestion - THIEU 3 bang

| Bang can tao | Mo ta |
|---|---|
| `ingestion_batches` | Theo doi tung batch import |
| `data_watermarks` | High-water mark cho sync incremental |
| `sync_checkpoints` | Checkpoint cho moi lan sync |

#### L2.5 Events/Marketing - THIEU 1 bang

| Bang can tao | Mo ta |
|---|---|
| `commerce_events` | Event log thuong mai (view, add_to_cart, purchase...) |

Da co: `ad_spend_daily`, `promotion_campaigns`

#### L3 KPI - THIEU 3 bang

| Bang can tao | Mo ta |
|---|---|
| `kpi_definitions` | Dinh nghia metric (code, formula, category) |
| `kpi_targets` | Muc tieu theo metric va ky |
| `kpi_thresholds` | Nguong canh bao cho tung metric |

Da co: `kpi_facts_daily` (8,203 records)

#### L4 Alert/Decision - THIEU 3 bang

| Bang can tao | Mo ta |
|---|---|
| `alert_rules` | Quy tac canh bao |
| `card_actions` | Hanh dong tren decision card |
| `evidence_logs` | Nhat ky bang chung cho quyet dinh |

Da co: `alert_instances` (3), `decision_cards` (0)

#### L5 AI Query - THIEU 5 bang tenant + 4 bang platform

**Tenant-scoped:**

| Bang can tao | Mo ta |
|---|---|
| `ai_conversations` | Lich su hoi thoai AI |
| `ai_messages` | Tin nhan trong conversation |
| `ai_query_history` | Lich su truy van |
| `ai_favorites` | Cau hoi/bao cao yeu thich |
| `ai_insights` | AI-generated insights |

**Platform-scoped (read-only, chia se giua cac tenant):**

| Bang can tao | Mo ta |
|---|---|
| `ai_metric_definitions` | Dinh nghia metric chuan |
| `ai_semantic_models` | Mo ta schema cho AI |
| `ai_query_templates` | Mau truy van SQL |
| `kpi_definition_templates` | Mau KPI tieu chuan |
| `alert_rule_templates` | Mau quy tac canh bao |
| `decision_taxonomy` | Phan loai quyet dinh |
| `global_source_platforms` | Danh muc nen tang ket noi |

#### L6 Audit - THIEU 3 bang

| Bang can tao | Mo ta |
|---|---|
| `sync_jobs` | Theo doi job sync thong nhat |
| `sync_errors` | Log loi sync |
| `event_logs` | Nhat ky su kien he thong |

Da co: `sync_logs`, `audit_logs`

---

### Tong ket

| Layer | Da co | Thieu | Can tao |
|---|---|---|---|
| L1 Foundation | 4 | 4 | `organizations`, `organization_members`, `tenant_members`, `tenant_roles` |
| L1.5 Ingestion | 0 | 3 | `ingestion_batches`, `data_watermarks`, `sync_checkpoints` |
| L2 Master | 7 | 0 | (du) |
| L2.5 Events | 2 | 1 | `commerce_events` |
| L3 KPI | 1 | 3 | `kpi_definitions`, `kpi_targets`, `kpi_thresholds` |
| L4 Alert/Decision | 2 | 3 | `alert_rules`, `card_actions`, `evidence_logs` |
| L5 AI (tenant) | 0 | 5 | `ai_conversations`, `ai_messages`, `ai_query_history`, `ai_favorites`, `ai_insights` |
| L5 AI (platform) | 0 | 7 | `ai_metric_definitions`, `ai_semantic_models`, `ai_query_templates`, `kpi_definition_templates`, `alert_rule_templates`, `decision_taxonomy`, `global_source_platforms` |
| L6 Audit | 2 | 3 | `sync_jobs`, `sync_errors`, `event_logs` |
| **Tong** | **18** | **29** | |

### Ke hoach thuc hien

**1 migration duy nhat** tao tat ca 29 bang con thieu:

- Moi bang tenant-scoped co `tenant_id` va RLS policy: `tenant_id = current_setting('app.current_tenant')::uuid`
- Moi bang platform-scoped co RLS read-only cho tat ca authenticated users
- Tat ca dung `gen_random_uuid()` cho primary key, `now()` cho timestamp mac dinh
- Tat ca dung `CREATE TABLE IF NOT EXISTS` de khong anh huong bang da co
- **KHONG seed data** - bang tao ra de trong, data se den tu BigQuery sync hoac nguoi dung nhap

### Chi tiet ky thuat tung bang

Cot cua moi bang se duoc suy ra tu:
1. TypeScript interface da co trong hooks (vd: `IngestionBatch`, `DataWatermark`, `KPIDefinition`...)
2. Architecture design v1.4.2
3. `tableMapping.ts` de dam bao ten bang khop

Moi bang tenant-scoped se co toi thieu:
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE`
- `created_at TIMESTAMPTZ DEFAULT now()`
- `updated_at TIMESTAMPTZ DEFAULT now()`

