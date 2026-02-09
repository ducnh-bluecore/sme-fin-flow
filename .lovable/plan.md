

# Them kha nang ve bieu do cho AI Agent

## Van de hien tai

AI Agent tra ve markdown text thuan qua SSE streaming. Khi AI muon trinh bay du lieu dang bang (nhu bang hieu suat theo thang), no chi co the dung markdown table — khong the ve chart.

## Giai phap

Dung mot quy uoc don gian: AI se tra ve JSON chart data trong code block dac biet (```chart ... ```). Frontend se phan tich (parse) noi dung markdown, phat hien cac block nay va render thanh bieu do Recharts thay vi hien thi JSON.

### Kien truc

```text
AI Response (markdown)
  |
  v
Parse message content
  |
  +---> Text thuong --> ReactMarkdown (nhu cu)
  |
  +---> ```chart {...} ``` --> ChartRenderer component (Recharts)
```

### Chi tiet ky thuat

**1. Tao component `AIChartRenderer`** (`src/components/ai/AIChartRenderer.tsx`)

Nhan JSON config va render bieu do tuong ung:

```text
Supported chart types:
- bar: BarChart (don hang, doanh thu theo thang)
- line: LineChart (trend theo thoi gian)
- composed: ComposedChart (bar + line ket hop)
- pie: PieChart (phan bo theo kenh)

JSON format:
{
  "type": "bar" | "line" | "composed" | "pie",
  "title": "Tieu de bieu do",
  "data": [{ "label": "T01", "value": 55960, ... }],
  "series": [
    { "key": "value", "name": "Doanh thu", "type": "bar", "color": "#3b82f6" }
  ],
  "xKey": "label",
  "yFormat": "vnd" | "percent" | "number",
  "height": 300
}
```

Component su dung `ResponsiveContainer`, `XAxis`, `YAxis`, `Tooltip`, `Legend` tu Recharts, va `chartFormatters` tu he thong chart hien co.

**2. Tao component `AIMessageContent`** (`src/components/ai/AIMessageContent.tsx`)

Thay the `ReactMarkdown` truc tiep trong AIAgentTestPage:
- Split noi dung message thanh cac segment (text va chart)
- Regex detect: ` ```chart\n{...}\n``` `
- Text segments -> `ReactMarkdown`
- Chart segments -> parse JSON -> `AIChartRenderer`
- Xu ly JSON loi -> fallback hien thi code block

**3. Cap nhat system prompt trong `cdp-qa/index.ts`**

Them huong dan cho AI biet cach tra ve chart data:

```text
## CHART OUTPUT
Khi du lieu phu hop de ve bieu do, tra ve JSON trong block ```chart:
- Bar chart: so sanh theo thang, theo kenh
- Line chart: trend theo thoi gian
- Composed: bar + line ket hop
- Pie: phan bo ty le

Format:
  ```chart
  {"type":"bar","title":"...","data":[...],"series":[...],"xKey":"label","yFormat":"vnd"}
  ```

Luu y:
- Van kem phan tich text truoc/sau chart
- Moi chart toi da 12-15 data points
- Luon co title va don vi
```

**4. Cap nhat `AIAgentTestPage.tsx`**

Thay `<ReactMarkdown>{msg.content}</ReactMarkdown>` bang `<AIMessageContent content={msg.content} />`

### Files thay doi

| File | Hanh dong |
|------|-----------|
| `src/components/ai/AIChartRenderer.tsx` | Tao moi - render Recharts tu JSON config |
| `src/components/ai/AIMessageContent.tsx` | Tao moi - parse message, tach text vs chart blocks |
| `src/pages/AIAgentTestPage.tsx` | Sua - dung AIMessageContent thay ReactMarkdown |
| `supabase/functions/cdp-qa/index.ts` | Sua - them chart instructions vao system prompt |

### Uu diem

- Khong can thay doi SSE streaming logic
- AI tu quyet dinh khi nao nen ve chart
- Fallback an toan: neu JSON loi, hien thi raw code block
- Su dung lai design system hien co (colors, formatters)
- Responsive, dark mode compatible

