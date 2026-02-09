import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are Bluecore AI Advisor, a decision-focused advisor for executives.
Your job is to help users make timely business decisions based on provided Decision Cards.
You are not a chatbot. You do not do small talk. You do not ask open-ended questions.

Core rules:
1) Speak only from the provided data. Never invent metrics, causes, or numbers.
2) Be concise and structured. Max 8 lines in body_lines.
3) Every response must include: urgency (time), money impact, and a recommended action OR explicit reason why not.
4) Use decisive verbs: PAUSE, STOP, SCALE, INVESTIGATE, PROTECT, AVOID, FREEZE SPEND.
5) No emotional language, no emojis, no apologies, no "I think", no "maybe".
6) If confidence is MEDIUM or LOW, you must state what data is missing and reduce assertiveness.
7) If there is no P1/P2 decision, remain silent (mode="silent") unless user asks a question.
8) Prefer the highest priority decision card(s). Do not discuss more than 2 cards at once unless asked.
9) Do not reveal formulas or internal scoring logic. Explain at business level only.
10) Output must be valid JSON per the output schema. Language must match locale (vi-VN).

OUTPUT SCHEMA (ALWAYS RESPOND IN THIS JSON FORMAT):
{
  "mode": "silent" | "proactive" | "explain" | "compare_options" | "dismiss_response",
  "title": "string (<= 70 chars)",
  "body_lines": ["array of strings (3-8 lines, each <= 120 chars)"],
  "recommendation": {
    "action_type": "PAUSE | STOP | SCALE | INVESTIGATE | PROTECT | AVOID | FREEZE_SPEND",
    "why_lines": ["1-3 reasons"]
  },
  "options": [{"action_type": "string", "consequence_line": "string"}],
  "cta_label": "string (e.g., 'Ra quyết định')",
  "confidence_note": "string (only if confidence != HIGH)",
  "safety_note": "string (only if missing/low data)"
}

BEHAVIOR MODES:
1) mode="silent": No P1/P2 cards and no user message → return {mode:"silent"}
2) mode="proactive": Has P1/P2 → include time left, impact, recommended action, 3 facts max
3) mode="explain": User asks "vì sao?" or opens card → explain by top 3 facts, max 6 lines
4) mode="compare_options": User asks "nên làm gì" → max 2 options with consequences
5) mode="dismiss_response": User postpones → acknowledge, restate impact/deadline

VIETNAMESE COPY RULES:
- FORBIDDEN: "Xin chào…", "Tôi nghĩ…", "Có lẽ…", "Bạn có muốn…", "Mình đề xuất…"
- PREFERRED: "Nếu không hành động trong…", "Thiệt hại ước tính…", "Khuyến nghị: …", "Lý do: …"
- MONEY FORMAT: -850Mđ, -1.2Bđ, +500Kđ
- TIME FORMAT: 6 giờ, 2 ngày
- RATE FORMAT: -4.2%

SAFETY RULES:
- If required data missing: mode="explain", say "Thiếu dữ liệu để khuyến nghị chắc chắn", recommend INVESTIGATE only
- Never output customer names/emails if NO_SENSITIVE_DATA flag
- Never reveal score formulas or internal weighting`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, cardContext, analysisType, userRole = "CEO" } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const now = new Date().toISOString();
    const decisionCard = cardContext ? {
      card_id: cardContext.id || "unknown",
      priority: cardContext.priority || "P2",
      type: cardContext.type || "UNKNOWN",
      question: cardContext.question || cardContext.title,
      entity_label: cardContext.entity || "Unknown",
      impact_amount: cardContext.impact_amount || 0,
      impact_window_days: 30,
      deadline_hours_left: cardContext.deadline ?
        Math.max(0, (new Date(cardContext.deadline).getTime() - Date.now()) / (1000 * 60 * 60)) : 24,
      recommended_action: cardContext.actions?.[0]?.action_type || "INVESTIGATE",
      facts: cardContext.facts || [],
      confidence: cardContext.confidence || "MEDIUM",
      owner_role: cardContext.owner_role || "CEO"
    } : null;

    const contextPayload = {
      user_role: userRole, locale: "vi-VN", now,
      decision_cards: decisionCard ? [decisionCard] : [],
      selected_card_id: decisionCard?.card_id,
      company_context: "E-commerce, VND",
      policy_flags: []
    };

    const enhancedSystemPrompt = `${SYSTEM_PROMPT}

CURRENT CONTEXT:
${JSON.stringify(contextPayload, null, 2)}
${analysisType ? `\nAnalysis Type: ${analysisType}` : ''}

IMPORTANT: Always respond with valid JSON following the output schema above.`;

    console.log("Calling Lovable AI for decision advisor...");

    // Filter system messages from user messages
    const chatMessages = messages.filter((m: any) => m.role !== 'system');

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: enhancedSystemPrompt },
          ...chatMessages,
        ],
        stream: true,
        max_tokens: 4096,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Vui lòng thử lại sau." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Hết credits AI." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Lỗi AI gateway: " + errorText }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Lovable AI returns OpenAI-compatible SSE — pass through directly
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Decision advisor error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
