

# Toi uu AI Agent: Toc do & Linh hoat

## Van de hien tai

### 1. Cham (Latency)
Kien truc hien tai dung **2 buoc tuong tu** (2-pass), moi buoc deu goi `google/gemini-2.5-pro` - model nang nhat:
- **Pass 1** (Tool-calling): Goi Gemini 2.5 Pro de chon tool va truy van data (non-streaming, co the lap lai 2 lan)
- **Pass 2** (Synthesis): Goi Gemini 2.5 Pro lan nua de phan tich va tra loi (streaming)

Tong thoi gian: ~15-30 giay vi phai doi 2-3 lan goi AI model lon + truy van database.

### 2. May moc (Rigid)
- System prompt qua chi tiet (213 dong), ep AI theo mot khuon cung nhac
- Cau hoi goi y la cau hoi co dinh, khong thay doi theo context
- AI bi ep phai luon tra loi theo format "phan tich + hanh dong" ke ca khi nguoi dung chi hoi don gian

---

## Giai phap de xuat

### A. Toi uu toc do

**A1. Doi Pass 1 sang model nhanh hon**
- Pass 1 chi can chon tool va parse tham so - khong can model lon
- Doi tu `google/gemini-2.5-pro` sang `google/gemini-2.5-flash` cho Pass 1
- Giu `google/gemini-2.5-pro` cho Pass 2 (phan tich sau)
- Du kien giam 40-60% thoi gian Pass 1

**A2. Giam max_tokens Pass 1**
- Hien tai: `max_tokens: 4096` cho Pass 1 (chi can chon tool)
- Doi thanh `max_tokens: 1024` - du de chon tool va parse arguments

**A3. Cau hoi don gian → Skip Pass 1**
- Neu nguoi dung chao hoi hoac hoi cau khong can data → bo qua Pass 1, stream thang Pass 2
- Tiet kiem 1 lan goi AI hoan toan

### B. Linh hoat hon

**B1. Tinh gon system prompt**
- Giu nguyen cac quy tac quan trong (metric classification, VND format)
- Bo bot cac vi du lap lai va chi tiet qua muc
- Them huong dan "tra loi tu nhien, than thien" thay vi chi "ngan gon, decision-grade"

**B2. System prompt phan biet loai cau hoi**
- Them huong dan cho AI phan biet:
  - Cau hoi nhanh (don gian) → tra loi ngan, truc tiep
  - Cau hoi phan tich (phuc tap) → tra loi day du voi chart
  - Tro chuyen/chao hoi → tra loi tu nhien, khong can data

**B3. Cau hoi goi y dong hon**
- Them mot so cau hoi mo hon, tu nhien hon ben canh cac cau ky thuat
- Vi du: "Tinh hinh kinh doanh tuan nay the nao?", "Co gi can chu y khong?"

---

## Chi tiet ky thuat

### File thay doi

**1. `supabase/functions/cdp-qa/index.ts`**
- Dong 370: Doi model Pass 1 tu `google/gemini-2.5-pro` → `google/gemini-2.5-flash`
- Dong 446: Giam `max_tokens` Pass 1 tu `4096` → `1024`
- Dong 88-213: Tinh gon system prompt, them huong dan tra loi linh hoat theo loai cau hoi
- Dong 426-433: Them logic detect cau hoi don gian de skip Pass 1

**2. `src/pages/AIAgentPage.tsx`**
- Dong 19-55: Cap nhat SCENARIO_GROUPS them cau hoi tu nhien hon

### Khong thay doi
- Kien truc 2-pass van giu nguyen (chi toi uu model/params)
- Tool definitions van giu nguyen
- Frontend streaming logic van giu nguyen
- Cac tool execution functions van giu nguyen

---

## Ket qua ky vong
- **Toc do**: Giam tu 15-30s xuong con 8-15s cho cau hoi can data
- **Linh hoat**: AI tra loi tu nhien hon, phan biet duoc cau don gian va phuc tap
- **Khong anh huong**: Chat luong phan tich Pass 2 van dung Gemini 2.5 Pro

