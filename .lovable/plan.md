

# Plan: Ads Command Center V2 - Ket noi API truc tiep + Tu dong thuc hien

## Tong quan

Nang cap tu V1 (chi de xuat) len V2: **ket noi truc tiep API cac nen tang ads** va **tu dong thuc hien** (pause/resume/adjust budget) sau khi CEO/CMO duyet.

### 4 nen tang ho tro:
- **TikTok Ads** - `open_api/v1.3/campaign/*`
- **Facebook/Meta Ads** - Graph API `v21.0/act_{ad_account_id}/*`
- **Google Ads** - REST API `v18/customers/{id}/campaigns:mutate`
- **Shopee Ads** - Open Platform API (da co data BigQuery)

---

## Phan 1: Database Schema (V1 + V2)

### Bang `ads_platform_connections` - Luu API credentials cua tung nen tang
```text
id, tenant_id, platform (tiktok|meta|google|shopee),
account_id (advertiser_id/ad_account_id/customer_id),
account_name, 
credentials (jsonb encrypted): { access_token, app_id, app_secret, refresh_token, developer_token },
token_expires_at (timestamptz),
is_active, last_synced_at,
created_by, created_at, updated_at
```

### Bang `ads_rules` - Rule tu dong
```text
id, tenant_id, rule_name, platform,
rule_type (pause|increase_budget|decrease_budget|kill|scale),
conditions (jsonb): [{ metric, operator, value, lookback_days }],
actions (jsonb): { action_type, value, notify_before_execute },
is_active, priority, created_by, created_at
```

### Bang `ads_content` - Noi dung AI-generated
```text
id, tenant_id, platform, product_id,
content_type (image_caption|video_script|product_listing),
title, body, hashtags (text[]), media_urls (text[]),
status (draft|pending_review|approved|rejected|scheduled|published),
reviewed_by, reviewed_at, review_comment,
scheduled_at, published_at, created_by, created_at
```

### Bang `ads_recommendations` - De xuat tu engine
```text
id, tenant_id, platform, campaign_id, campaign_name, ad_group_id,
recommendation_type (pause|resume|increase_budget|decrease_budget|kill|scale),
reason, evidence (jsonb): { metrics, rule_id, thresholds, lookback_data },
current_value (numeric), recommended_value (numeric),
impact_estimate (numeric), confidence (integer 0-100),
status (pending|approved|rejected|executing|executed|failed|expired),
approved_by, approved_at, 
execution_result (jsonb): { api_response, executed_at, error },
created_at, expires_at
```

### Bang `ads_execution_log` - Audit trail moi hanh dong
```text
id, tenant_id, recommendation_id (FK), platform,
action_type, campaign_id, 
request_payload (jsonb), response_payload (jsonb),
status (success|failed|retrying),
executed_by, executed_at, error_message
```

RLS: Tat ca bang co policy `tenant_id = get_user_tenant_id()` cho authenticated users.

---

## Phan 2: Edge Functions

### 2.1 `ads-sync-campaigns` - Doc campaigns tu API cac nen tang

Chuc nang: Goi API tung nen tang de lay danh sach campaigns + metrics ve luu vao `platform_ads_daily`.

Logic cho tung platform:
- **TikTok**: `POST /open_api/v1.3/campaign/get/` + `/report/integrated/get/`
- **Meta**: `GET /v21.0/act_{id}/campaigns?fields=name,status,daily_budget,lifetime_budget` + insights
- **Google**: `POST /v18/customers/{id}/googleAds:searchStream` (GAQL query)
- **Shopee**: Da co qua BigQuery, nhung co the bo sung real-time qua Open API

Output: Upsert vao `platform_ads_daily` va `promotion_campaigns`.

### 2.2 `ads-execute-action` - Thuc hien hanh dong sau khi duyet

Chuc nang: Nhan recommendation_id da approved, goi API tuong ung:

```text
Platform     | Pause                          | Resume                         | Budget
-------------|--------------------------------|--------------------------------|--------
TikTok       | campaign/status/update          | campaign/status/update          | campaign/update (budget)
Meta         | POST /{campaign_id} status=PAUSED | POST /{campaign_id} status=ACTIVE | POST /{campaign_id} daily_budget=X
Google       | campaigns:mutate (status PAUSED) | campaigns:mutate (status ENABLED) | campaigns:mutate (budget)
Shopee       | shopee_ads/campaign/update       | shopee_ads/campaign/update       | shopee_ads/campaign/update
```

Safety checks truoc khi thuc hien:
1. Verify recommendation chua expired
2. Verify approver co quyen (CEO/CMO role)
3. Double-check current campaign status truoc khi thay doi
4. Ghi log vao `ads_execution_log`
5. Neu fail -> status = 'failed', gui alert

### 2.3 `ads-content-generator` - Tao noi dung bang AI

Chuc nang: Lay thong tin san pham tu `external_products` / `inv_family_codes`, goi Lovable AI (gemini-3-flash-preview) de tao noi dung quang cao phu hop tung platform.

Input: product_id, platform, content_type
Output: title, body, hashtags -> luu vao `ads_content`

### 2.4 `ads-optimizer-engine` - Phan tich va de xuat

Chuc nang: Doc data tu `platform_ads_daily` + `ads_rules`, so sanh metrics voi thresholds, tao recommendations.

Logic:
1. Lay campaigns co data trong 3-7 ngay gan nhat
2. Ap dung tung rule: neu ROAS < threshold 3 ngay lien tuc -> de xuat PAUSE
3. Neu CM% > threshold + cash conversion tot -> de xuat SCALE (tang budget)
4. Tinh impact estimate = projected savings/gains
5. Insert vao `ads_recommendations` voi status = 'pending'

---

## Phan 3: UI Pages

### 3.1 Nav: Them vao BluecoreCommandLayout

```text
MARKETING
  - Ads Dashboard    /command/ads
  - Ket noi Ads      /command/ads/connections
  - Rules            /command/ads/rules  
  - Noi dung AI      /command/ads/content
```

### 3.2 `/command/ads/connections` - Quan ly ket noi API

- 4 cards cho 4 nen tang (TikTok, Meta, Google, Shopee)
- Moi card: Form nhap API credentials (Access Token, App ID/Secret, Account ID)
- Nut "Test ket noi" -> goi edge function verify
- Trang thai: Connected / Disconnected / Token Expired
- Nut "Sync campaigns" -> goi `ads-sync-campaigns`

### 3.3 `/command/ads` - Ads Command Dashboard

- **KPI Row**: Tong spend hom nay, ROAS TB, Campaigns active, De xuat cho duyet
- **Recommendations Table**: Danh sach de xuat voi Approve/Reject buttons
  - Khi Approve -> goi `ads-execute-action` -> tu dong thuc hien
  - Hien thi execution status (executing -> executed/failed)
- **Platform Health**: 4 mini-cards cho tung nen tang

### 3.4 `/command/ads/rules` - Quan ly Rules

- Bang liet ke rules (ten, platform, dieu kien, hanh dong, trang thai)
- Dialog tao rule moi:
  - Chon platform
  - Chon metric (ROAS, CPA, CTR, Spend, CVR, ACOS)
  - Chon operator + threshold
  - Chon action (Pause, Scale +X%, Kill)
  - Toggle notify_before_execute (bat buoc approve truoc khi thuc hien)

### 3.5 `/command/ads/content` - AI Content Studio

- Chon san pham, chon platform
- Nut "Tao noi dung" -> stream AI response
- Preview content, sua chua
- Approve -> co the gan vao campaign (stretch goal)

---

## Phan 4: Bao mat & An toan

### Token Storage
- API credentials luu trong `ads_platform_connections.credentials` (jsonb)
- Trong tuong lai co the dung Supabase Vault de encrypt
- Access chi qua edge functions, khong bao gio tra ve client

### Execution Safety
- Moi hanh dong write (pause/resume/budget) bat buoc phai co approved recommendation
- Khong co "1-click execute" - luon qua approval flow
- Execution log ghi lai moi API call (request + response)
- Rate limiting: toi da 10 actions/phut/tenant

### Role-based Access
- CHI CEO/CMO moi approve recommendations
- Marketer co the tao rules va content nhung khong approve execution
- Moi execution gui notification cho owner

---

## Trinh tu thuc hien

1. **Database**: Tao 5 bang moi + RLS policies
2. **Edge Function `ads-sync-campaigns`**: Ket noi doc data tu 4 nen tang
3. **Edge Function `ads-execute-action`**: Thuc hien hanh dong sau approval  
4. **Edge Function `ads-optimizer-engine`**: Phan tich va tao recommendations
5. **Edge Function `ads-content-generator`**: AI content generation
6. **UI - Connections page**: Form nhap API credentials
7. **UI - Ads Dashboard**: KPI + recommendations + approval flow
8. **UI - Rules Manager**: CRUD rules
9. **UI - Content Studio**: AI content
10. **Routing**: Cap nhat BluecoreCommandLayout + App.tsx
11. **Deploy** tat ca edge functions

---

## Luu y quan trong

- **TikTok Ads API**: Can tao TikTok for Business developer app, lay `app_id` + `secret`, user authorize de lay `access_token`. Base URL: `https://business-api.tiktok.com/open_api/v1.3/`
- **Meta Marketing API**: Can Facebook App, user grant `ads_management` permission. Base URL: `https://graph.facebook.com/v21.0/`
- **Google Ads API**: Can Google Cloud project + OAuth + `developer_token`. Base URL: `https://googleads.googleapis.com/v18/`
- **Shopee Ads**: Dung chung voi Shopee Open Platform API da co trong connector. Base URL: `https://partner.shopeemobile.com/api/v2/`
- Nguoi dung can tu tao developer accounts tren tung nen tang va cung cap credentials qua UI Connections page
- Edge functions su dung `LOVABLE_API_KEY` cho AI content, cac API key ads luu trong DB (khong phai env vars)

