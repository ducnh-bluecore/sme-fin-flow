

# Chuyen tat ca AI functions sang OpenAI API truc tiep

## Muc tieu
Chuyen tat ca Edge Functions AI tu Lovable AI Gateway (`ai.gateway.lovable.dev`) sang goi truc tiep OpenAI API (`api.openai.com`) su dung `OPENAI_API_KEY` da duoc luu.

## Cac file can sua

### 1. `supabase/functions/cdp-qa/index.ts`
- Doi ham `callAI()` tu Lovable Gateway sang OpenAI API truc tiep
- URL: `https://ai.gateway.lovable.dev/v1/chat/completions` -> `https://api.openai.com/v1/chat/completions`
- API key: `LOVABLE_API_KEY` -> `OPENAI_API_KEY`
- Model: `google/gemini-3-flash-preview` -> `gpt-4o` (ca Pass 1 va Pass 2)

### 2. `supabase/functions/whatif-chat/index.ts`
- Doi URL gateway sang OpenAI API truc tiep
- Doi API key sang `OPENAI_API_KEY`
- Model: `google/gemini-2.5-flash` -> `gpt-4o`

### 3. `supabase/functions/decision-advisor/index.ts`
- Doi URL gateway sang OpenAI API truc tiep
- Doi API key sang `OPENAI_API_KEY`
- Model: `google/gemini-2.5-flash` -> `gpt-4o`

## Chi tiet thay doi ky thuat

### Ham `callAI()` trong cdp-qa (dong 322-328):
```
// TRUOC
fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
  headers: { 'Authorization': `Bearer ${apiKey}` },
})
// apiKey = Deno.env.get('LOVABLE_API_KEY')

// SAU
fetch('https://api.openai.com/v1/chat/completions', {
  headers: { 'Authorization': `Bearer ${apiKey}` },
})
// apiKey = Deno.env.get('OPENAI_API_KEY')
```

### Model mapping:
- Pass 1 (cdp-qa): `google/gemini-3-flash-preview` -> `gpt-4o`
- Pass 2 (cdp-qa): `google/gemini-3-flash-preview` -> `gpt-4o`
- whatif-chat: `google/gemini-2.5-flash` -> `gpt-4o`
- decision-advisor: `google/gemini-2.5-flash` -> `gpt-4o`

### Loi ich
- Toc do nhanh hon (khong qua gateway trung gian)
- Dung truc tiep model GPT-4o ma ban da co API key
- Khong bi gioi han rate limit cua Lovable AI Gateway

## Ghi chu
- SSE streaming format cua OpenAI tuong thich voi code hien tai (vi Lovable Gateway cung dung OpenAI-compatible format)
- Khong can thay doi frontend code
- Tat ca 3 edge functions se duoc deploy lai sau khi sua

