

# Plan: Fix AI Agent -- 3 Critical Bugs

## Problems Identified

From the screenshot, 3 bugs are visible:

1. **AI asks permission instead of querying**: User asks "cho toi 3 cua hang co doanh thu cao nhat" but AI says "chua co du lieu" and asks "Ban co muon toi truy van?" -- should auto-call `focused_query("store_performance")` immediately.

2. **AI prints SQL as text**: When user confirms "co", AI outputs `print(query_database("SELECT store_name..."))` as markdown text instead of actually executing the tool call. This happens because the final streaming pass has NO tools attached.

3. **Still 24s**: Two sequential AI calls (non-streaming tool pass + streaming final pass) is still slow.

## Root Causes

| Bug | Root Cause | Location |
|-----|-----------|----------|
| No store data | Intent map `'cua hang\|store': ['overview']` only fetches overview, which has zero store data | `cdp-schema.ts` line 111 |
| Asks permission | System prompt lacks rule forbidding "asking user permission to query" | `index.ts` line 153-197 |
| Prints SQL as text | Final streaming pass (line 392) has no `tools` param, so AI can't call tools on follow-ups | `index.ts` line 392-398 |
| Short "co" skipped | `isSimpleChat` regex matches short messages like "co" and skips tool-calling | `index.ts` line 269-270 |
| Slow 24s | 2 sequential AI calls: non-streaming tool pass + streaming final pass | `index.ts` line 317-398 |

## Fixes

### Fix 1: Intent Mapping for Stores (cdp-schema.ts)

Change line 111:
```
'cua hang|store|chi nhanh': ['overview']
```
to:
```
'cua hang|store|chi nhanh': ['overview', 'channels']
```

AND add `store_performance` template as a drill-down hint in the overview pack so the AI knows to call it.

### Fix 2: System Prompt -- No Permission Asking (index.ts)

Add to system prompt rules:
```
- KHONG BAO GIO hoi xin phep user truoc khi truy van. 
  Neu can data -> GOI TOOL NGAY. Khong hoi "ban co muon?", "toi co the truy van?".
- Neu Knowledge Pack khong du -> goi focused_query NGAY, khong can hoi.
```

### Fix 3: Fix isSimpleChat Matching "co" (index.ts)

The regex on line 269 matches short words like "co" (Vietnamese for "yes"). Fix by:
- Removing generic short words from simple chat detection
- Adding logic: if previous assistant message ended with a question, treat ANY short reply as a follow-up (not simple chat)

### Fix 4: Merge to Single-Pass Streaming with Tools (index.ts)

The biggest architectural fix: instead of 2 passes (non-streaming tool + streaming final), use a SINGLE streaming call with tools. When AI makes tool calls mid-stream, pause streaming, execute tools, then continue with a second streaming call that includes tool results.

```text
Current (slow):
  Pass 1: Non-streaming + tools (5-15s) 
  Pass 2: Streaming without tools (5-10s)
  Total: 10-24s

New (fast):
  Pass 1: Non-streaming + tools (if tools needed) (3-8s)
  Pass 2: Streaming WITH tools (for follow-ups) (3-5s)
  Total: 3-13s
```

Key change: the final streaming pass ALSO gets `tools: TOOL_DEFINITIONS` so follow-up messages can trigger tool calls.

BUT streaming + tool_calls is complex (need to parse SSE for tool calls). Simpler approach:
- If tool calls happened in non-streaming pass -> stream final (no tools needed, data already fetched)
- If NO tool calls in non-streaming pass AND it's a follow-up -> re-run non-streaming WITH `tool_choice: 'required'`
- Then stream final

### Fix 5: Follow-up Context Detection (index.ts)

When user sends short confirmations ("co", "duoc", "ok", "di", "lam di"):
1. Check if previous assistant message contains a question mark
2. If yes -> this is a follow-up, NOT simple chat
3. Inject the previous context into the prompt so AI knows what to do
4. Force `tool_choice: 'required'` for this turn

## File Changes

| File | Changes |
|------|---------|
| `supabase/functions/_shared/cdp-schema.ts` | Fix intent mapping for stores |
| `supabase/functions/cdp-qa/index.ts` | Fix isSimpleChat, add no-permission rule to prompt, add tools to final pass for follow-ups, add follow-up detection |

## Expected Results

| Metric | Before | After |
|--------|--------|-------|
| "3 cua hang doanh thu cao nhat" | "Chua co du lieu, ban co muon?" | Auto-calls store_performance, returns data |
| Follow-up "co" | Prints SQL as text | Executes tool, returns results |
| Response time (with tools) | 24s | 8-13s |
| Response time (Tier 1 only) | 10-15s | 3-5s |

