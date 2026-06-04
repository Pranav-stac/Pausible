import type {
  ActionPlan,
  ActionPlanSelection,
  ActionPlanSynthesis,
  LaunchpadGroup,
  PillarName,
} from "@/lib/recommendations/types";

const PILLARS: PillarName[] = ["Nutrition", "Physical Activity", "Sleep & Recovery", "Mental Wellness"];

const LAUNCHPAD_LABELS: Record<LaunchpadGroup, string> = {
  remove_friction: "Remove Friction",
  build_awareness: "Build Awareness",
  create_support: "Create Support & Structure",
};

function fallbackSynthesis(selection: ActionPlanSelection): ActionPlanSynthesis {
  const opportunities = selection.opportunities.map((cluster, i) => {
    const top = cluster.rows[0];
    return {
      title: cluster.category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      summary: top?.text ?? "Focus on sustainable progress in this area.",
      sourceIds: cluster.rows.slice(0, 3).map((r) => r.id),
      category: cluster.category,
    };
  });

  const pillarPlans = {} as ActionPlanSynthesis["pillarPlans"];
  for (const pillar of PILLARS) {
    const plan = selection.pillarPlans[pillar];
    pillarPlans[pillar] = {
      focusArea: plan.focusArea.replace(/\b\w/g, (c) => c.toUpperCase()),
      focusReason: plan.focusReason,
      dos: plan.dos.map((d) => d.text),
      donts: plan.donts.map((d) => d.text),
      sourceIds: plan.sourceIds,
    };
  }

  const launchpad: ActionPlanSynthesis["launchpad"] = {
    remove_friction: [],
    build_awareness: [],
    create_support: [],
  };
  for (const item of selection.launchpad) {
    launchpad[item.group].push(item.text);
  }

  const coachTop = selection.coachNotes[0];
  const coachNotes = {
    keyStrength:
      selection.coachNotes.find((c) => c.text.toLowerCase().includes("strength"))?.text ??
      "You have clear motivations we can build on.",
    keyRisk:
      selection.coachNotes.find((c) => c.text.toLowerCase().includes("risk") || c.text.toLowerCase().includes("watch"))?.text ??
      selection.coachNotes[1]?.text ??
      "Watch for overload when life gets busy.",
    guidance: coachTop?.text ?? "Start with one small win this week and protect recovery.",
    sourceIds: selection.coachNotes.map((c) => c.id),
  };

  const safetyGuidance = selection.safetyGuidance.map((s) => ({ id: s.id, text: s.text }));

  return {
    opportunities,
    pillarPlans,
    launchpad,
    coachNotes,
    safetyGuidance,
    synthesized: false,
    synthesisError: "GEMINI_API_KEY not configured — showing deterministic copy from your matched recommendations.",
  };
}

function buildPrompt(selection: ActionPlanSelection): string {
  const payload = {
    profile: {
      primaryPersona: selection.profile.primaryPersonaAlias,
      secondaryPersona: selection.profile.secondaryPersonaAlias,
      goals: selection.profile.goals,
      barriers: selection.profile.barriers,
      context: selection.profile.context,
    },
    opportunities: selection.opportunities.map((c) => ({
      category: c.category,
      rows: c.rows.slice(0, 4).map((r) => ({ id: r.id, type: r.type, text: r.text, pillar: r.pillar })),
    })),
    pillarPlans: selection.pillarPlans,
    launchpad: selection.launchpad,
    coachNotes: selection.coachNotes.map((r) => ({ id: r.id, text: r.text })),
    safetyGuidance: selection.safetyGuidance.map((r) => ({ id: r.id, text: r.text })),
    allowedSourceIds: selection.allSourceIds,
  };

  return `You are a wellness coach writing a personalized action plan for Pausibl (A12–A13 synthesis rules).

You are a synthesizer only. Use ONLY the recommendation rows provided. Do not invent new advice, medical claims, or treatments. Preserve recommendation IDs in sourceIds arrays.

Tone: clear, supportive, practical, non-judgmental.
Length: opportunities 50–75 words each; pillar focus reasons 40–60 words; coach notes 50–75 words total or compact bullets.
Explain focus areas in plain language (stress, barriers, goals, persona pattern). Do not show internal scores or raw tag names.

Return valid JSON matching this schema exactly:
{
  "opportunities": [{ "title": string, "summary": string (2-3 sentences, warm tone), "sourceIds": string[], "category": string }],
  "pillarPlans": {
    "Nutrition": { "focusArea": string, "focusReason": string (1-2 sentences), "dos": string[4], "donts": string[2], "sourceIds": string[] },
    "Physical Activity": { ... },
    "Sleep & Recovery": { ... },
    "Mental Wellness": { ... }
  },
  "launchpad": {
    "remove_friction": string[],
    "build_awareness": string[],
    "create_support": string[]
  },
  "coachNotes": { "keyStrength": string, "keyRisk": string, "guidance": string, "sourceIds": string[] },
  "safetyGuidance": [{ "id": string, "text": string }]
}

Rules:
- opportunities: exactly ${Math.min(3, selection.opportunities.length)} items from the cluster data
- Each pillar: rewrite dos/donts in second person; keep meaning; sourceIds must be subset of allowedSourceIds
- launchpad: group items under remove_friction, build_awareness, create_support (labels: ${Object.values(LAUNCHPAD_LABELS).join(", ")})
- coachNotes: synthesize from coach_note rows only
- safetyGuidance: up to 3 items; use provided ids and lightly edit text for clarity
- Never cite IDs in user-facing strings except sourceIds arrays

INPUT:
${JSON.stringify(payload, null, 2)}`;
}

function parseGeminiJson(text: string): unknown {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fence ? fence[1].trim() : trimmed;
  return JSON.parse(raw);
}

export async function synthesizeActionPlanWithGemini(
  selection: ActionPlanSelection,
): Promise<ActionPlanSynthesis> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return fallbackSynthesis(selection);

  const model = process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash";
  const prompt = buildPrompt(selection);

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.35,
            responseMimeType: "application/json",
          },
        }),
      },
    );

    if (!res.ok) {
      const errText = await res.text();
      const fallback = fallbackSynthesis(selection);
      return { ...fallback, synthesisError: `Gemini HTTP ${res.status}: ${errText.slice(0, 200)}` };
    }

    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      const fallback = fallbackSynthesis(selection);
      return { ...fallback, synthesisError: "Gemini returned empty content" };
    }

    const parsed = parseGeminiJson(text) as ActionPlanSynthesis;
    return {
      ...parsed,
      synthesized: true,
    };
  } catch (e) {
    const fallback = fallbackSynthesis(selection);
    const msg = e instanceof Error ? e.message : String(e);
    return { ...fallback, synthesisError: `Gemini error: ${msg}` };
  }
}

export async function buildActionPlan(selection: ActionPlanSelection): Promise<ActionPlan> {
  const synthesis = await synthesizeActionPlanWithGemini(selection);
  return { ...selection, synthesis };
}
