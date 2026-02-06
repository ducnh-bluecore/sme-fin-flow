

# CẬP NHẬT SECRET VÀ TEST BIGQUERY CONNECTION

## THÔNG TIN SERVICE ACCOUNT

| Field | Value |
|-------|-------|
| **Project ID** | `bluecore-dcp` |
| **Service Account** | `getdata@bluecore-dcp.iam.gserviceaccount.com` |
| **Client ID** | `115908193243448104600` |
| **Key ID** | `44b05e31b88b3324212484805561e7fe83d526e5` |

---

## BƯỚC 1: CẬP NHẬT SECRET

Sử dụng `add_secret` tool để cập nhật `GOOGLE_SERVICE_ACCOUNT_JSON` với nội dung:

```json
{
  "type": "service_account",
  "project_id": "bluecore-dcp",
  "private_key_id": "44b05e31...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "getdata@bluecore-dcp.iam.gserviceaccount.com",
  "client_id": "115908193243448104600",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/getdata%40bluecore-dcp.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
}
```

---

## BƯỚC 2: DEPLOY EDGE FUNCTION

Sau khi secret được cập nhật, deploy lại `bigquery-list` function để load secret mới.

---

## BƯỚC 3: TEST KẾT NỐI

Gọi Edge Function để verify:

```bash
POST /functions/v1/bigquery-list
{
  "action": "list_datasets"
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "datasets": [
      { "datasetId": "..." },
      ...
    ]
  }
}
```

---

## BƯỚC 4: KHÁM PHÁ DATA

Sau khi kết nối thành công:
1. List tất cả datasets trong project
2. List tables trong mỗi dataset
3. Xem schema của các tables chính (orders, items)
4. Preview sample data

---

## FILES KHÔNG CẦN THAY ĐỔI

Edge Function `bigquery-list/index.ts` đã sẵn sàng:
- Đọc `GOOGLE_SERVICE_ACCOUNT_JSON` từ environment
- Hỗ trợ `list_datasets`, `list_tables`, `get_schema`, `preview_data`

---

## TECHNICAL NOTES

1. **Secret Format**: Phải là valid JSON string (không có line breaks ngoài trong private_key)
2. **Permissions Required**: Service account cần `BigQuery Data Viewer` và `BigQuery Job User`
3. **Project Default**: Nếu không truyền `project_id`, sẽ lấy từ service account JSON

