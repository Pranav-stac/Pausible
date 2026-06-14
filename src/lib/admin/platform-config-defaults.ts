import { PERSONA_ANIMAL, PERSONA_DISPLAY } from "@/lib/scoring/persona-defaults";
import { PERSONA_KEYS, type PersonaKey } from "@/lib/scoring/persona-types";
import type {
  PersonaCatalogDoc,
  ReportTemplatesDoc,
  ScoringConfigDoc,
} from "@/lib/admin/platform-config-types";

export const DEFAULT_SCORING_CONFIG: ScoringConfigDoc = {
  version: "1",
  likertMin: 1,
  likertMax: 7,
  traitDeviationThreshold: 0.8,
  fitTierBands: { classic: 75, core: 50, adaptive: 25, emerging: 0 },
  blendRatioBands: { pure: 2.0, tendencies: 1.3 },
};

export function buildDefaultPersonaCatalog(): PersonaCatalogDoc {
  const personas = {} as PersonaCatalogDoc["personas"];
  for (const key of PERSONA_KEYS) {
    const d = PERSONA_DISPLAY[key];
    const a = PERSONA_ANIMAL[key];
    personas[key] = {
      label: d.label,
      archetype: d.archetype,
      summary: d.summary,
      bullets: [...d.bullets],
      animalName: a.name,
      emoji: a.emoji,
      imagePath: a.imagePath,
    };
  }
  return { version: "1", personas };
}

export const DEFAULT_REPORT_TEMPLATES: ReportTemplatesDoc = {
  version: "1",
  reportVersionLabel: "v2.0",
  slideLabels: {
    cover: "Cover",
    introduction: "Introduction",
    personality: "Your Wellness Personality",
    blindSpots: "What You Don't See",
    successBlueprint: "Your Success Blueprint",
    whereYouStand: "Where You Stand",
    opportunities: "High-Impact Wellness Opportunities",
    actionPlan: "Your Personalized Action Plan",
    launchpad: "Your Wellness Launchpad",
    coaching: "Your Coaching Guide",
  },
  geminiFitTierTone: {
    classic: "Assertive and confident — use 'You naturally...'",
    core: "Confident but softer — use 'You tend to...'",
    adaptive: "Exploratory — use 'You may find...'",
    emerging: "Tentative and invitational — use 'Some aspects suggest...'",
  },
  geminiBlendRules: {
    pure: "Never mention a secondary persona.",
    tendencies: "Include one sentence acknowledging secondary influence.",
    strong_influence: "Dedicate substantive content to the blend.",
  },
  pillarLabels: {
    Nutrition: "Nutrition",
    "Physical Activity": "Physical Activity",
    "Sleep & Recovery": "Sleep & Recovery",
    "Mental Wellness": "Mental Wellness",
  },
};

export function mergePersonaCatalog(partial: Partial<PersonaCatalogDoc> | null): PersonaCatalogDoc {
  const defaults = buildDefaultPersonaCatalog();
  if (!partial?.personas) return defaults;
  const personas = { ...defaults.personas };
  for (const key of PERSONA_KEYS) {
    const row = partial.personas[key as PersonaKey];
    if (!row) continue;
    personas[key as PersonaKey] = {
      label: row.label?.trim() || personas[key as PersonaKey].label,
      archetype: row.archetype?.trim() || personas[key as PersonaKey].archetype,
      summary: row.summary?.trim() || personas[key as PersonaKey].summary,
      bullets: Array.isArray(row.bullets) && row.bullets.length ? row.bullets : personas[key as PersonaKey].bullets,
      animalName: row.animalName?.trim() || personas[key as PersonaKey].animalName,
      emoji: row.emoji?.trim() || personas[key as PersonaKey].emoji,
      imagePath: row.imagePath?.trim() || personas[key as PersonaKey].imagePath,
    };
  }
  return { version: partial.version ?? defaults.version, personas };
}

export function mergeScoringConfig(partial: Partial<ScoringConfigDoc> | null): ScoringConfigDoc {
  if (!partial) return DEFAULT_SCORING_CONFIG;
  return {
    version: partial.version ?? DEFAULT_SCORING_CONFIG.version,
    likertMin: partial.likertMin ?? DEFAULT_SCORING_CONFIG.likertMin,
    likertMax: partial.likertMax ?? DEFAULT_SCORING_CONFIG.likertMax,
    traitDeviationThreshold:
      partial.traitDeviationThreshold ?? DEFAULT_SCORING_CONFIG.traitDeviationThreshold,
    fitTierBands: { ...DEFAULT_SCORING_CONFIG.fitTierBands, ...partial.fitTierBands },
    blendRatioBands: { ...DEFAULT_SCORING_CONFIG.blendRatioBands, ...partial.blendRatioBands },
  };
}

export function mergeReportTemplates(partial: Partial<ReportTemplatesDoc> | null): ReportTemplatesDoc {
  if (!partial) return DEFAULT_REPORT_TEMPLATES;
  return {
    version: partial.version ?? DEFAULT_REPORT_TEMPLATES.version,
    reportVersionLabel: partial.reportVersionLabel ?? DEFAULT_REPORT_TEMPLATES.reportVersionLabel,
    slideLabels: { ...DEFAULT_REPORT_TEMPLATES.slideLabels, ...partial.slideLabels },
    geminiFitTierTone: { ...DEFAULT_REPORT_TEMPLATES.geminiFitTierTone, ...partial.geminiFitTierTone },
    geminiBlendRules: { ...DEFAULT_REPORT_TEMPLATES.geminiBlendRules, ...partial.geminiBlendRules },
    pillarLabels: { ...DEFAULT_REPORT_TEMPLATES.pillarLabels, ...partial.pillarLabels },
  };
}
