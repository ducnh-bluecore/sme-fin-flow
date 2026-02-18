
# Fix: AI Agent "xoay vòng vòng" — 2 bugs

## Root Cause đã xác định

### Bug 1 (Critical): ref trên ScrollArea
`src/pages/AIAgentPage.tsx` line 261:
```tsx
<ScrollArea className="h-full p-6" ref={scrollRef}>
```
`ScrollArea` từ Radix UI không forward refs theo cách này. React throws warning và có thể gây render failures khiến state updates bị drop.

**Fix**: Dùng `useRef` vào một `div` wrapper bên trong ScrollArea thay vì ref trực tiếp trên ScrollArea.

### Bug 2 (Secondary): isLoading không reset khi empty content
Khi AI trả về response nhưng `assistantContent` vẫn rỗng (edge case trong streaming), `setIsLoading(false)` vẫn chạy trong `finally` — nhưng nếu có render error từ Bug 1, React có thể bỏ qua state update này.

## Thay đổi

### File duy nhất: `src/pages/AIAgentPage.tsx`

**Fix 1: Auto-scroll** — thay vì `ref={scrollRef}` trên ScrollArea, dùng `useRef` + `useEffect` với một inner div:

```tsx
// Thay:
const scrollRef = useRef<HTMLDivElement>(null);
// ...
<ScrollArea className="h-full p-6" ref={scrollRef}>

// Thành:
const bottomRef = useRef<HTMLDivElement>(null);
// useEffect:
useEffect(() => {
  bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
}, [messages]);
// JSX:
<ScrollArea className="h-full p-6">
  <div> {/* content */}
    <div ref={bottomRef} />  {/* sentinel element */}
  </div>
</ScrollArea>
```

**Fix 2: Guard empty assistant message** — sau khi stream xong, nếu `assistantContent` rỗng, xóa message rỗng thay vì để nó stuck:

```tsx
} finally {
  // Nếu không nhận được content, xóa assistant message rỗng
  if (!assistantContent) {
    setMessages(prev => {
      const last = prev[prev.length - 1];
      if (last?.role === 'assistant' && !last.content) {
        return prev.slice(0, -1);
      }
      return prev;
    });
  }
  setIsLoading(false);
}
```

**Fix 3: Loại bỏ `AIMessageContent` ref warning** — `AIMessageContent` không cần ref, nhưng việc nó được render bên trong ScrollArea với broken ref chain gây warning cascade. Sau khi fix scrollRef, warning này sẽ tự biến mất.

## Tóm tắt thay đổi

| # | Vấn đề | Fix |
|---|--------|-----|
| 1 | `ref={scrollRef}` trên `ScrollArea` component gây React warning | Dùng sentinel `div ref={bottomRef}` bên trong ScrollArea |
| 2 | `assistantContent` rỗng sau stream → message rỗng stuck | Guard trong `finally` block |
| 3 | `isLoading` không reset | Đảm bảo `finally` luôn chạy `setIsLoading(false)` |

**Chỉ 1 file thay đổi:** `src/pages/AIAgentPage.tsx`
