

# Phase 4: Strategic — Markdown Memory Engine (Moat Feature)

## Status: ✅ COMPLETED

### Implemented
1. ✅ Database: `inv_markdown_events`, `sem_markdown_ladders`, `sem_markdown_caps` with RLS
2. ✅ RPC: `fn_markdown_ladder_summary` (server-side aggregation)
3. ✅ Types: `InvMarkdownEvent`, `SemMarkdownLadder`, `SemMarkdownCap`, `MarkdownLadderStep` in `inventory.ts`
4. ✅ Hook: `useMarkdownLadder` with 5min staleTime
5. ✅ MarkdownHistoryTab: Extracted + Ladder visualization + Channel comparison + Next step recommendations
6. ✅ ProductDetailPanel: Added Markdown Ladder section per product
7. ✅ WhyClearCard: Added Markdown Memory section with best performing channel/step

---

## Architecture

- `inv_markdown_events` → Raw event log (every discount event)
- `sem_markdown_ladders` → Aggregated clearability per FC/channel/step (computed)
- `sem_markdown_caps` → Database-enforced discount guardrails
- `fn_markdown_ladder_summary` → RPC for ladder data
- `useMarkdownLadder` → Frontend hook wrapping RPC

## Next Strategic Opportunities

- Capital Misallocation Score enhancement (fed by markdown history)
- Buy Depth Engine
- Growth Simulator Engine
