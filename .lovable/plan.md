
# Plan: Data Assessment Survey System

## Mục tiêu

Xây dựng hệ thống **khảo sát dữ liệu đầu vào** (Data Assessment) cho từng module. Khi user lần đầu vào module, hệ thống sẽ:

1. **Hỏi**: "Bạn hiện có những loại dữ liệu nào?"
2. **So sánh**: với data requirements của module đó
3. **Đề xuất thông minh**: 
   - Data nào kết nối từ Data Warehouse (connectors)
   - Data nào import từ template Excel
   - Data nào cần nhập thủ công

---

## Phân tích hiện trạng

### Đã có:
- **DataReadinessPage (MDP)**: Kiểm tra data đã có trong DB - nhưng chạy SAU khi data đã import
- **FileImportDialog**: 21 template import (invoices, bills, orders, expenses...)
- **AddConnectorDialog**: 35+ connectors (Shopee, Lazada, TikTok Shop, Haravan, Sapo, ERP...)
- **useMDPDataReadiness**: Hook kiểm tra trạng thái data theo từng table

### Thiếu:
- Không có **pre-assessment** trước khi user bắt đầu
- Không có **smart mapping** giữa data user có → nguồn import phù hợp
- Không có **personalized onboarding path** dựa trên khảo sát

---

## Kiến trúc Data Assessment

### Flow tổng quan:

```text
User vào Module lần đầu
         ↓
+---------------------------+
|   DATA ASSESSMENT SURVEY  |
|   "Bạn hiện có gì?"       |
+---------------------------+
         ↓
+---------------------------+
|   SMART MATCHING ENGINE   |
|   Compare với Module Req  |
+---------------------------+
         ↓
+---------------------------+
|   PERSONALIZED ROADMAP    |
|   - Connect từ DW         |
|   - Import từ Excel       |
|   - Skip (để sau)         |
+---------------------------+
         ↓
     Module Dashboard
```

---

## Chi tiết: Data Assessment Survey

### Survey Questions (Per Module)

**Survey flow dạng multi-step wizard:**

**Step 1: Current Data Sources**
```text
"Doanh nghiệp bạn đang sử dụng nguồn dữ liệu nào?"

□ Bán hàng trên sàn TMĐT (Shopee, Lazada, TikTok Shop...)
□ Website riêng (Haravan, Sapo, WooCommerce...)
□ Phần mềm kế toán (MISA, Fast, Bravo...)
□ Phần mềm ERP (SAP, Oracle, Odoo...)
□ Excel / Google Sheets
□ Chưa có hệ thống - nhập thủ công
```

**Step 2: Available Data Types**
```text
"Bạn có sẵn những loại dữ liệu nào?" (chọn nhiều)

□ Danh sách đơn hàng (orders)
□ Danh sách khách hàng (customers)
□ Hóa đơn bán hàng (invoices)
□ Hóa đơn mua hàng / công nợ (bills)
□ Chi phí vận hành (expenses)
□ Giao dịch ngân hàng (bank statements)
□ Chi phí marketing (ads spend)
□ Dữ liệu tồn kho (inventory)
□ Chưa có - cần tạo mới
```

**Step 3: Data Format**
```text
"Dữ liệu của bạn đang ở định dạng nào?"

○ Export từ phần mềm (có thể kết nối API)
○ File Excel/CSV
○ Nhập thủ công từng giao dịch
○ Hỗn hợp nhiều nguồn
```

---

## Data Requirements Map (Per Module)

### FDP Requirements:

| Priority | Data Type | Table | Connector Sources | Template |
|----------|-----------|-------|-------------------|----------|
| Critical | Hóa đơn AR | invoices | MISA, Fast | invoices |
| Critical | Hóa đơn AP | bills | MISA, Fast | bills |
| Critical | Bank Transactions | bank_transactions | BigQuery, Manual | bank_transactions |
| Important | Khách hàng | customers | Shopee, Lazada | customers |
| Important | Nhà cung cấp | vendors | MISA | vendors |
| Important | Expenses | expenses | MISA, Manual | expenses |
| Optional | Cash Forecast | cash_forecasts | Manual | cash_forecasts |

### MDP Requirements:

| Priority | Data Type | Table | Connector Sources | Template |
|----------|-----------|-------|-------------------|----------|
| Critical | Orders | cdp_orders | Shopee, Lazada, TikTok | orders |
| Critical | Marketing Spend | marketing_expenses | Facebook Ads, Google Ads | expenses |
| Important | Campaigns | promotion_campaigns | Meta Graph, TikTok Ads | promotions |
| Important | Products | external_products | Shopee, Lazada | products |
| Important | Channel Fees | channel_fees | Shopee, Lazada | - |
| Optional | Settlements | channel_settlements | Shopee, Lazada | bank_transactions |

### CDP Requirements:

| Priority | Data Type | Table | Connector Sources | Template |
|----------|-----------|-------|-------------------|----------|
| Critical | Orders | cdp_orders | Shopee, Lazada, TikTok | orders |
| Critical | Customers | customers | Shopee, Lazada | customers |
| Important | Order Items | external_order_items | Shopee, Lazada | - |
| Important | Products | external_products | Shopee, Lazada | products |
| Optional | Customer Events | customer_events | Analytics | - |

---

## Smart Matching Engine

### Logic:

```text
User Selection → Module Requirements → Source Mapping

Example:
- User chọn: "Bán hàng trên Shopee" + "File Excel chi phí"
- Module: MDP

Output:
┌─────────────────────────────────────────────────────────┐
│  RECOMMENDED DATA IMPORT PATH                           │
├─────────────────────────────────────────────────────────┤
│  ✅ Đơn hàng → Kết nối Shopee (auto-sync)              │
│  ✅ Sản phẩm → Kết nối Shopee (auto-sync)              │
│  📄 Chi phí Marketing → Import từ Excel template       │
│  📄 Campaigns → Import từ Excel template               │
│  ⏭️  Analytics → Skip (optional, cấu hình sau)         │
└─────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Bảng mới: `user_data_assessments`

```sql
CREATE TABLE user_data_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  module_key TEXT NOT NULL, -- 'fdp', 'mdp', 'cdp', 'control_tower'
  
  -- Survey responses (JSONB)
  survey_responses JSONB DEFAULT '{}',
  -- Example: {
  --   "data_sources": ["shopee", "lazada", "excel"],
  --   "data_types": ["orders", "customers", "expenses"],
  --   "data_format": "mixed"
  -- }
  
  -- Generated import plan (JSONB)
  import_plan JSONB DEFAULT '{}',
  -- Example: {
  --   "connect": ["shopee", "lazada"],
  --   "import": ["expenses", "marketing_expenses"],
  --   "skip": ["channel_analytics"]
  -- }
  
  -- Status tracking
  status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'skipped'
  completed_at TIMESTAMP WITH TIME ZONE,
  skipped_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(user_id, tenant_id, module_key)
);

-- RLS
ALTER TABLE user_data_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own assessments"
  ON user_data_assessments FOR ALL
  USING (auth.uid() = user_id);
```

---

## Cấu trúc Files

```text
src/
├── pages/onboarding/
│   └── DataAssessmentPage.tsx         # Main wizard page
│
├── components/assessment/
│   ├── DataAssessmentWizard.tsx       # Multi-step wizard container
│   ├── DataSourceStep.tsx             # Step 1: Current sources
│   ├── DataTypeStep.tsx               # Step 2: Available data types
│   ├── DataFormatStep.tsx             # Step 3: Format selection
│   ├── ImportPlanStep.tsx             # Generated plan display
│   ├── DataRequirementCard.tsx        # Individual requirement card
│   └── SmartMatcher.tsx               # Matching logic display
│
├── hooks/
│   ├── useDataAssessment.ts           # CRUD for assessments
│   ├── useModuleDataRequirements.ts   # Get requirements per module
│   └── useSmartDataMatcher.ts         # Matching algorithm
│
├── lib/
│   └── dataRequirementsMap.ts         # Static config: module → requirements
│
└── contexts/
    └── DataAssessmentContext.tsx       # Wizard state management
```

---

## Component: Import Plan Display

### UI mockup sau khi matching:

```text
┌──────────────────────────────────────────────────────────────┐
│  📊 KẾ HOẠCH IMPORT DỮ LIỆU CHO MDP                         │
│  Dựa trên khảo sát của bạn, đây là lộ trình tối ưu:         │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  🔗 KẾT NỐI TỰ ĐỘNG (2)                                     │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ [Shopee Logo] Shopee                                   │ │
│  │ → Đơn hàng, Sản phẩm, Phí sàn, Settlements            │ │
│  │ [Kết nối ngay]                                         │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ [Lazada Logo] Lazada                                   │ │
│  │ → Đơn hàng, Sản phẩm, Phí sàn                         │ │
│  │ [Kết nối ngay]                                         │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  📄 IMPORT TỪ EXCEL (2)                                     │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Chi phí Marketing                         [Tải mẫu ↓]  │ │
│  │ Cần cho: Profit Attribution, Cash Impact               │ │
│  │ [Upload file]                                          │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Campaigns                                 [Tải mẫu ↓]  │ │
│  │ Cần cho: ROI Analysis                                  │ │
│  │ [Upload file]                                          │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ⏭️ ĐỂ SAU (1)                                              │
│  • Ads Performance (optional - không bắt buộc)              │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│  [Hoàn thành sau] [Bắt đầu kết nối →]                       │
└──────────────────────────────────────────────────────────────┘
```

---

## Integration Points

### 1. Trigger Assessment:

```typescript
// In module layout or guard
function ModuleAssessmentGuard({ moduleKey, children }) {
  const { data: assessment } = useDataAssessment(moduleKey);
  
  // Show assessment wizard if not completed
  if (!assessment?.completed_at && !assessment?.skipped_at) {
    return <DataAssessmentWizard moduleKey={moduleKey} />;
  }
  
  return children;
}
```

### 2. Smart Matcher Hook:

```typescript
function useSmartDataMatcher(moduleKey: string, userResponses: SurveyResponses) {
  const requirements = useModuleDataRequirements(moduleKey);
  const connectors = useConnectorIntegrations();
  
  return useMemo(() => {
    const plan: ImportPlan = {
      connect: [],    // Connectors to setup
      import: [],     // Templates to use
      skip: [],       // Optional items
      existing: [],   // Already connected
    };
    
    requirements.forEach(req => {
      // Check if user has this data source
      const hasSource = userResponses.data_sources.some(
        source => req.connectorSources.includes(source)
      );
      
      // Check if already connected
      const isConnected = connectors.some(
        c => req.connectorSources.includes(c.connector_type) && c.status === 'active'
      );
      
      if (isConnected) {
        plan.existing.push(req);
      } else if (hasSource && req.connectorSources.length > 0) {
        plan.connect.push(req);
      } else if (req.templateId) {
        plan.import.push(req);
      } else if (req.importance === 'optional') {
        plan.skip.push(req);
      }
    });
    
    return plan;
  }, [requirements, userResponses, connectors]);
}
```

---

## Ưu tiên triển khai

| Phase | Scope | Effort |
|-------|-------|--------|
| **Phase 1** | DB schema + useDataAssessment hook | 0.5 day |
| **Phase 2** | Survey wizard (3 steps) | 1 day |
| **Phase 3** | Smart Matcher + Import Plan UI | 1 day |
| **Phase 4** | Integration với AddConnector + FileImport | 0.5 day |
| **Phase 5** | Module Guards (FDP, MDP, CDP) | 0.5 day |

---

## Lợi ích

1. **Reduced Friction**: User không cần biết trước module cần gì
2. **Smart Guidance**: Hệ thống tự đề xuất path tối ưu
3. **Time-to-Value**: Nhanh chóng connect đúng nguồn dữ liệu
4. **Personalized**: Mỗi user có roadmap riêng dựa trên hoàn cảnh
5. **Progressive**: Có thể skip và quay lại sau

---

## Kết hợp với Onboarding System

Data Assessment sẽ là **Layer 3** trong hệ thống onboarding đã plan trước đó:

```text
Layer 1: Platform Onboarding (Welcome, Role, Company)
         ↓
Layer 2: Tenant Onboarding (Industry, Scale, Data Sources)
         ↓
Layer 3: DATA ASSESSMENT (Per-module, Smart Matching) ← NEW
         ↓
Layer 4: Module Tour (Interactive spotlight)
```

Layer 2 sẽ thu thập thông tin high-level về data sources, Layer 3 sẽ đi sâu vào từng module với matching thông minh.
