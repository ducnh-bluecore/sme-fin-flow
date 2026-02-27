

# Plan: Nang cap AI Content Studio - Chon san pham & hinh anh thuc

## Van de hien tai

- Form tao content chi co 2 truong: Nen tang + Loai noi dung
- Khong cho chon san pham cu the -> AI tu bia thong tin
- Khong co phan chon/upload hinh anh san pham
- Edge function `ads-content-generator` da ho tro `product_id` nhung UI khong gui len

## Giai phap

### 1. Them Product Picker vao form tao content

Tao component searchable combobox (dung `cmdk` da co san) de tim va chon san pham tu bang `products`:
- Hien thi: Ten san pham, SKU, gia ban, danh muc
- Tim kiem theo ten hoac SKU
- Khi chon san pham -> hien thi card preview thong tin san pham (ten, SKU, gia, danh muc)
- Gui `product_id` len edge function de AI viet dua tren thong tin that

### 2. Them phan upload/chon hinh anh

- Them khu vuc upload hinh san pham (dung `react-dropzone` da co san)
- Hinh duoc upload len Storage bucket `ads-media`
- URL hinh duoc luu vao `ads_content.media_urls`
- Hien thi preview hinh da chon truoc khi tao content
- Trong content card da tao, hien thi hinh anh kem theo

### 3. Cap nhat Edge Function

Sua `ads-content-generator` de doc dung cot tu bang `products` (hien tai dang doc tu `external_products` voi cot sai ten nhu `retail_price` thay vi `selling_price`):
- Doc tu `products` thay vi `external_products`
- Dung dung ten cot: `name, sku, description, selling_price, cost_price, category, subcategory, brand`

### 4. Cap nhat UI hien thi content

- Content card hien thi hinh anh (neu co) phia tren title
- Hien thi ten san pham duoc chon (join voi `products` table)

---

## Chi tiet ky thuat

### Files can tao/sua:

1. **`src/components/ads/ProductPicker.tsx`** (moi)
   - Combobox searchable dung Command component
   - Hook `useProductSearch` query bang `products` voi debounced search
   - Hien thi: name, sku, selling_price, category

2. **`src/components/ads/MediaUploader.tsx`** (moi)
   - Dung `react-dropzone` cho phep keo/tha hoac chon hinh
   - Upload len Storage bucket `ads-media`
   - Tra ve mang URL de luu vao `media_urls`
   - Preview thumbnails

3. **`src/pages/command/AdsContentPage.tsx`** (sua)
   - Them ProductPicker vao form
   - Them MediaUploader vao form
   - Gui `product_id` va `media_urls` khi generate
   - Hien thi hinh anh va thong tin san pham trong content cards

4. **`src/hooks/useAdsCommandCenter.ts`** (sua)
   - `useGenerateAdsContent` them tham so `media_urls`
   - Them hook `useProductSearch(query)` de tim san pham

5. **`supabase/functions/ads-content-generator/index.ts`** (sua)
   - Doc tu bang `products` thay vi `external_products`
   - Dung dung ten cot (`selling_price`, `cost_price`, `sku`, `subcategory`)

6. **Migration** (moi)
   - Tao Storage bucket `ads-media` (public)
   - RLS policy cho bucket

### Flow moi:

```text
User chon san pham (search by name/SKU)
  -> Hien thi preview thong tin SP
  -> User upload hinh san pham (optional)
  -> User chon platform + content type
  -> Bam "Tao noi dung"
  -> Edge function doc thong tin SP that tu DB
  -> AI viet content dua tren thong tin that
  -> Luu content + media_urls + product_id
  -> Hien thi card voi hinh + noi dung
```

