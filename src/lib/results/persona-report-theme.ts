import type { PersonaKey } from "@/lib/scoring/persona-types";

/** Deloitte-inspired accent per persona (report blocks, circles, badges). */
export const PERSONA_REPORT_THEME: Record<
  PersonaKey,
  { hex: string; abbr: string; lightBg: string }
> = {
  self_regulated_planner: { hex: "#C9A227", abbr: "SP", lightBg: "#FBF6E8" },
  social_motivator: { hex: "#2563EB", abbr: "SM", lightBg: "#EFF6FF" },
  stress_sensitive: { hex: "#D97706", abbr: "SS", lightBg: "#FFF7ED" },
  curious_explorer: { hex: "#EA580C", abbr: "CE", lightBg: "#FFF7ED" },
  resilient_performer: { hex: "#059669", abbr: "RP", lightBg: "#ECFDF5" },
  brittle_avoidant: { hex: "#0D9488", abbr: "BA", lightBg: "#F0FDFA" },
};
