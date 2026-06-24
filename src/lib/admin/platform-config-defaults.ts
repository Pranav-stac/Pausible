import { PERSONA_ANIMAL, PERSONA_DISPLAY, personaImagePath } from "@/lib/scoring/persona-defaults";
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
  fitTierBands: { classic: 75, core: 50, leaning: 25, exploring: 0 },
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
  version: "2",
  reportVersionLabel: "v4.0",
  slideLabels: {
    cover: "Cover",
    understanding: "Understanding Your Wellness Personality",
    patternMatch: "Your Pattern Match",
    primaryPattern: "Your Primary Pattern",
    secondaryPattern: "Your Secondary Pattern and Blend",
    blindSpots: "What You Don't See",
    keyActions: "Your Key Actions",
    priorities: "Your High-Impact Priorities",
    whatComesNext: "What Comes Next",
  },
  geminiFitTierTone: {
    classic: "Assertive and confident — use 'You naturally...'",
    core: "Confident but softer — use 'You tend to...'",
    leaning: "Exploratory — use 'You may find...'",
    exploring: "Tentative and invitational — use 'Some aspects suggest...'",
  },
  geminiBlendRules: {
    pure: "Write only a 2-sentence summary of the secondary persona, making it clear that it does not have a significant impact on the primary persona. Skip the behavioural boxes and the blend narrative.",
    tendencies: "Write an 80-100 word secondary narrative and 3 behavioural boxes (Behavioural Tendencies, What Motivates You, Growth Pattern only). Write a 60-80 word blend interaction summary.",
    strong_influence: "Write a 100-150 word secondary narrative and all 6 behavioural boxes. Write a 100-120 word blend interaction narrative with specific examples of how the two patterns complement or create tension.",
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
      imagePath: personaImagePath(key as PersonaKey),
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
    fitTierBands: {
      classic: partial.fitTierBands?.classic ?? DEFAULT_SCORING_CONFIG.fitTierBands.classic,
      core: partial.fitTierBands?.core ?? DEFAULT_SCORING_CONFIG.fitTierBands.core,
      leaning:
        partial.fitTierBands?.leaning ??
        (partial.fitTierBands as { adaptive?: number } | undefined)?.adaptive ??
        DEFAULT_SCORING_CONFIG.fitTierBands.leaning,
      exploring:
        partial.fitTierBands?.exploring ??
        (partial.fitTierBands as { emerging?: number } | undefined)?.emerging ??
        DEFAULT_SCORING_CONFIG.fitTierBands.exploring,
    },
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
