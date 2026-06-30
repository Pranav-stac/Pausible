**PAUSIBL WELLNESS INTELLIGENCE PLATFORM**

**Platform Design Authority Document**

Canonical, implementation-ready master specification

Version 1.0 (canonical reconstruction) · June 2026

Fully replaces: Developer Implementation Guide v2.1 · Content Logic Guide v2.0 ·

Integrated Plan Generator Framework v1.1 · Plan Page Developer Guide v1.0

Authoritative data: Recommendation Master v1.13 (171 recs, 21 cols) · Contextual Questions & Tags v1.3

Scope: Recommendation Engine · Integrated Plan Generator · 10-page Wellness Report.

(The Coach Guide is a separate companion specification.)

Classification: Internal / Engineering — Source of Truth

**0\. How to use this document**

This is the **single source of truth** for the Pausibl recommendation engine, integrated plan generator, and wellness report. It is a full reconstruction — every deterministic table, scoring rule, phase definition, prompt, JSON schema, fallback and validation rule is reproduced here in full. A developer, AI engineer, PM, or QA reviewer can build, validate, debug and extend the platform from this document alone, without opening any source file.

**Precedence of truth (most-recent wins):** (1) corrections agreed after the source documents were written; (2) Recommendation Master **v1.13**; (3) Contextual Questions & Tags **v1.3**; (4) the four source design documents. Where a source document conflicts with a later decision or with v1.13, the later decision / v1.13 wins; the superseded logic is recorded in §32 (Deprecated Logic) and §33 (Resolved Conflicts).

**Generation-type labels** are attached to every component: **\[DET\]** deterministic logic · **\[AI\]** AI synthesis · **\[HYB\]** hybrid · **\[TPL\]** static template · **\[DATA\]** data-driven rendering. AI never invents business logic — it only converts approved deterministic outputs into user-facing language.

**1\. Executive Overview**

Pausibl converts a psychological assessment plus a contextual questionnaire into a deeply personalised wellness report and an 8–12 week phased plan. The pipeline is deterministic end-to-end; AI is used only at the final composition step to turn approved, pre-personalised content into warm, clear prose.

The platform has five layers:

| Layer | What it does | Generation |
| :---- | :---- | :---- |
| **Assessment & Persona** | 90-item wellness-OCEAN assessment → 5 trait scores \+ 30 facet scores → persona assignment, fit score, blend. | \[DET\] |
| **Recommendation Engine** | Filters, scores, ranks, clusters the 171-rec Master v1.13 against the user profile; resolves persona context. | \[DET\] |
| **Integrated Plan Generator** | Sequences the scored recs into persona-specific phases (config matrix, activation-energy caps, readiness signals, overrides). | \[DET\] |
| **Report Assembly** | 10-page Wellness Report; 9 AI synthesis calls compose the narrative \+ plan-page wording; the rest is deterministic/template. | \[HYB\] |
| **Guardrails** | Blocklists, length limits, fallbacks, pre/post validation, traceability. | \[DET\] |

This document specifies all five in full.

**2\. Platform Philosophy**

Pausibl answers **"What is most likely to work for THIS person?"** — not "what is healthy?". It optimises for sustainability, adherence, emotional realism, psychological fit, low-friction execution and behaviour change over idealised or textbook advice.

**Guidance-only scope (governing constraint).** Pausibl provides wellness \*guidance\* — how to approach a wellness journey, mindset and habit framing — never prescriptive programming. It does not output sets, reps, weights, calorie targets, macros, or named meal plans as the basis of a recommendation. Where a source recommendation includes a light, optional progression cue, it stays modest and is framed as guidance. No engine output, plan, report, or prompt may cross this line, even when a goal implies it.

**Emotional safety.** Content is never shaming, aggressive, perfectionist, or extreme. Weaknesses are framed as patterns to notice; strengths as genuine advantages. Goals are never dismissed as unrealistic.

**3\. Current Source of Truth — version register**

| Artifact | Authoritative version | Notes |
| :---- | :---- | :---- |
| **Recommendation Master** | v1.13 (171 recs, 21 columns) | Supersedes all earlier counts (144/166). Adds OCEAN Trait Tags \+ Effort Level columns; FIT037 bridge \+ FIT038–FIT041 modality anchors. |
| **Contextual Questions & Tags** | v1.3 (20 questions, 8 sections A–H, Derived Rules sheet) | Supersedes v1.2. New families activity\_pref\_\*, time\_of\_day\_\*, caffeine\_\*, support\_self\_directed/social\_\*. Religious-food tag removed. |
| **Recommendation Engine logic** | This document, §13–18 | Reconstructs Developer Implementation Guide v2.1 \+ corrections. |
| **Wellness Report logic** | This document, §19–20 | Reconstructs Content Logic Guide v2.0 \+ Plan Page Guide v1.0 \+ the approved sample report. |
| **Integrated Plan Generator** | This document, §21 | Reproduces Plan Generator Framework v1.1 in full. |
| **Fit-tier names** | Classic / Core / Leaning / Exploring | Adaptive / Emerging deprecated. |
| **Persona centroids** | §8 table (Shielded Turtle corrected) | Max inter-centroid distance recomputed to 7.1099 (Pack Wolf↔Shielded Turtle). |

**4\. Core Definitions & Canonical Output Rules**

**4.1 Personas**

Six wellness personas, codes: shielded\_turtle, curious\_fox, watchful\_deer, steadfast\_bear, steady\_elephant, pack\_wolf, plus all\_personas for universal content.

**4.2 OCEAN → user-facing label mapping (CANONICAL)**

| Trait (engine) | User-facing label | Deprecated — do NOT use |
| :---- | :---- | :---- |
| **Openness** | Openness | Curiosity |
| **Conscientiousness** | Discipline | Conscientiousness |
| **Extraversion** | Social Energy | Extraversion |
| **Agreeableness** | Agreeableness | Cooperation |
| **Neuroticism** | Stress Sensitivity | Neuroticism |

Only **Conscientiousness, Extraversion, Neuroticism** are forbidden words in user-facing text; Openness/Agreeableness are retained as labels.

**4.3 Output visibility rules (corrected to match the approved report)**

| Element | Rule |
| :---- | :---- |
| **Persona / animal names** | ALLOWED in the report — they are the product identity (cover, persona title, Page 2 grid, page titles, plan subtitle, plan rationale). AI behavioural prose should still centre the person ('you tend to…'). |
| **Fit score (e.g., 71/100 — Core tier)** | ALLOWED user-facing (Cover, Page 3, plan rationale). |
| **OCEAN technical names** | FORBIDDEN user-facing — use §4.2 labels (also on the Page-3 radar and cover one-liner). |
| **Engine internals** | FORBIDDEN user-facing: activation energy, blend ratio, scoring/score, centroid, softmax, cluster, recommendation master, rec IDs, strength labels, 'readiness signal', 'pillar distribution', 'density weighting'. |

**5\. Data Architecture & Pipeline**

Assessment (OCEAN 90-item) \+ Contextual Questionnaire v1.3  
  | OCEAN scoring \-\> Persona assignment \-\> Fit score / Blend / Persona title  
  v  
RECOMMENDATION ENGINE (§13-17): pre-process tags \-\> filter \-\> score \-\> rank \-\> cluster \-\> resolve persona context  
  |  
  \+--\> INTEGRATED PLAN GENERATOR (§21) \-\> plan\_output \--\> Report Page 9  
  v  
WELLNESS REPORT (§19-22): Pages 1-10  (9 AI synthesis calls; remainder deterministic/template)  
  |  
  \+--\> Guardrails (§24-26): blocklist scan, length enforce, JSON validity, fallback, traceability

Data stores: the **Recommendation Master v1.13** (the content), the **Questionnaire v1.3 tag map** (input vocabulary \+ derived rules), the **persona centroids** (geometry), and the **persona lookup tables** (Quick Profile, coaching content). All are deterministic inputs.

**6\. Assessment Engine  \[DET\]**

The wellness-specific OCEAN assessment has **90 items → 5 trait scores (1–7 scale) and 30 facet scores** (6 facets per trait), each scored low/medium/high after reverse-key adjustment. Trait score \= average of its items after reverse-keying. Facet score \= average of the facet's items. Trait bands: **low 1.00–2.99 · medium 3.00–4.99 · high 5.00–7.00.**

Outputs consumed downstream: 5 trait scores (persona assignment, radar, deviations, OCEAN scoring via trait tags), 30 facet scores (analytics, clustering tertiary key), and the per-trait/per-facet low/medium/high tags.

**6.1 Pre-generation completeness gate**

* All 90 OCEAN items answered — else block report.  
* Primary \+ secondary persona computed — else block.

**7\. OCEAN Category & Trait Tagging  \[DET\]**

Two tag layers exist on each recommendation:

* **OCEAN Category Tags (Master col L)** — facet-level tags (e.g., workout\_adherence\_low, stress\_impact\_on\_consistency\_high). 30 facets × low/medium/high. Used for **analytics and clustering (tertiary key)** — NOT for scoring.  
* **OCEAN Trait Tags (Master col T)** — trait-level tags in the form O\_low … N\_high, derived from the facet tags by mapping each facet to its parent trait \+ level. **This is the column the OCEAN scorer reads** (§14). Each facet maps to one trait: Openness {nutritional\_curiosity, exercise\_exploration, recovery\_exploration, mind\_body\_exploration, wellness\_learning\_orientation, wellness\_adaptability}; Discipline/C {meal\_planning\_discipline, workout\_adherence, sleep\_routine\_consistency, progress\_tracking, impulse\_control, recovery\_discipline}; Social Energy/E {social\_workout\_preference, wellness\_sharing, healthy\_competition, activity\_energy, group\_recovery\_preference, positive\_wellness\_influence}; Agreeableness {nutrition\_consideration, wellness\_harmony, supportive\_encouragement, respect\_for\_guidance, cooperative\_participation, shared\_recovery\_respect}; Stress Sensitivity/N {health\_anxiety\_sensitivity, emotional\_eating\_response, stress\_impact\_on\_consistency, sleep\_worry\_mental\_overload, wellness\_stability, emotional\_recovery\_resilience}.

A user trait tag matches a rec trait tag when the user's trait band equals the tag's level (e.g., rec N\_high matches a user whose Stress Sensitivity is in the high band).

**8\. Persona Engine  \[DET\]**

Persona \= nearest centroid to the user's 5 OCEAN trait scores by Euclidean distance. Secondary persona \= second-nearest. Persona percentages \= softmax of negative distances across all six (sum 100%).

**8.1 Centroids (authoritative; Shielded Turtle corrected)**

| Persona | O | C | E | A | N | Archetype / key pattern |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| **Steady Elephant** | 3.5 | 6.5 | 4.5 | 5.3 | 1.5 | Self-regulated planner — methodical, consistent |
| **Pack Wolf** | 4.5 | 5.2 | 6.6 | 6.0 | 2.8 | Social motivator — group-driven, externally motivated |
| **Watchful Deer** | 4.5 | 2.8 | 2.9 | 5.2 | 6.0 | Stress-sensitive — easily overwhelmed, needs safety |
| **Curious Fox** | 6.5 | 2.5 | 5.5 | 4.1 | 2.5 | Curious explorer — seeks variety, bores easily |
| **Steadfast Bear** | 3.0 | 5.8 | 2.8 | 4.8 | 2.0 | Resilient performer — gritty, self-reliant |
| **Shielded Turtle** | 2.5 | 2.5 | 2.0 | 3.9 | 6.5 | Brittle / avoidant — withdraws under pressure |

**9\. Fit Score & Blend Analysis  \[DET\]**

**Fit score (0–100):** fit\_score \= MAX(0, MIN(100, (1 − user\_distance / 7.1099) × 100)), where user\_distance is the Euclidean distance to the primary centroid and **7.1099** is the max inter-centroid distance (**Pack Wolf ↔ Shielded Turtle**), recomputed for the corrected centroids (previously 7.1421, Elephant↔Turtle).

| Fit score | Tier | Primary-persona scoring bonus | AI tone |
| :---- | :---- | :---- | :---- |
| **75–100** | Classic | \+25 | Confident — "You naturally…" |
| **65–74** | Core | \+20 | Confident but softer — "You tend to…" |
| **55–64** | Leaning | \+15 | Exploratory — "You may find…" |
| **Below 55** | Exploring | \+10 | Tentative — "Some of your responses suggest…" |

**Note — fit-tier band reconciliation:** the engine's original bands were 75–100 / 50–74 / 25–49 / 0–24; the Plan Generator Framework v1.1 refined them to **75–100 / 65–74 / 55–64 / below 55** (Core inserted, Leaning narrowed). The **Plan Generator bands are canonical** because they are the most recent decision and drive plan adjustments. Tier names: Classic / Core / Leaning / Exploring (Adaptive/Emerging deprecated).

**Blend:** blend\_ratio \= secondary\_distance / primary\_distance. Pure (\>2.0) · Tendencies (1.3–2.0) · Strong Influence (\<1.3). The secondary persona is treated as 'present' for plan modifications when it contributes **\>15%** of the softmax blend. The secondary-persona **scoring** bonus is blend-scaled: Pure \+8 / Tendencies \+12 / Strong \+18 (replaces the former flat \+15).

**10\. Contextual Questionnaire & Tag Mapping — v1.3  \[DET\]**

20 questions in 8 sections (A About You · B Routine & Capacity · C Movement & Fitness · D Sleep · E Nutrition · F Goals & Barriers · G Support & Style · H Health & Safety). Each response emits one or more tags consumed by the engine. Goal options expand to individual tags before scoring; two barrier tags are derived (DR09/DR10).

**10.1 Questions and emitted tags**

| Q | Question | Type | Emitted tags |
| :---- | :---- | :---- | :---- |
| **CQ01** | Date of birth | Date picker | age\_under\_18 / age\_18\_24 / age\_25\_34 / age\_35\_44 / age\_45\_54 / age\_55\_plus |
| **CQ02** | Gender | Single | gender\_male / female / non\_binary / prefer\_not\_to\_say |
| **CQ03** | Work & lifestyle | Multi | work\_desk\_based / work\_shift\_based / work\_physically\_demanding / work\_travel\_heavy / lifestyle\_caregiving / lifestyle\_student / lifestyle\_not\_working |
| **CQ04** | Stress level | Single | stress\_low / stress\_moderate / stress\_high (High also derives barrier\_work\_stress — DR09) |
| **CQ05** | Time available | Single | time\_under\_15\_min / time\_15\_30\_min / time\_30\_45\_min / time\_45\_plus\_min |
| **CQ06** | Fitness level | Single | fitness\_beginner / fitness\_restarting / fitness\_intermediate / fitness\_consistent / fitness\_advanced |
| **CQ07** | Daily activity level | Single | activity\_sedentary / activity\_light / activity\_moderate / activity\_very\_active |
| **CQ08** | Preferred activities | Multi | activity\_pref\_walking / running / strength / cardio / yoga / sports / dance / swimming / cycling / home\_followalong / open |
| **CQ09** | Where to be active | Single | environment\_home / environment\_gym / environment\_outdoors / environment\_no\_preference |
| **CQ10** | Preferred time of day | Single | time\_of\_day\_morning / daytime / evening / latenight / no\_preference |
| **CQ11** | Sleep quality | Scale 1–5 | sleep\_quality\_very\_poor / poor / average / good / excellent (poor/very\_poor derive barrier\_poor\_sleep — DR10) |
| **CQ12** | Sleep hours | Single | sleep\_under\_5\_hours / sleep\_5\_6\_hours / sleep\_6\_7\_hours / sleep\_7\_8\_hours / sleep\_over\_8\_hours |
| **CQ13** | Caffeine habit | Single | caffeine\_none / caffeine\_morning / caffeine\_daytime / caffeine\_evening |
| **CQ14** | Food pattern | Single | food\_vegetarian / food\_vegan / food\_eggetarian / food\_non\_vegetarian / food\_pescatarian / food\_no\_preference |
| **CQ15** | Meal control | Single | meal\_control\_self\_prepared / prepared\_by\_others / frequent\_eating\_out / mixed |
| **CQ16** | Goals (max 3\) | Multi | 11 options → 14 goal tags (Build muscle→goal\_muscle\_gain+goal\_strength; Less stress→goal\_stress\_reduction+goal\_mental\_calm; Consistent routine→goal\_consistency\_discipline+goal\_sustainable\_routines; others 1:1) |
| **CQ17** | Barriers (max 3\) | Multi | 12 direct barrier tags (Hard to get started→barrier\_starting\_difficulty+barrier\_low\_activation\_energy) \+ 2 derived (barrier\_work\_stress, barrier\_poor\_sleep) |
| **CQ18** | Support level | Single | support\_strong / support\_some / support\_neutral / support\_unsupportive |
| **CQ19** | Solo vs social | Single | support\_self\_directed / social\_balanced / social\_preference\_high |
| **CQ20** | Health / safety | Multi | exclude\_none / medical\_condition / injury / pregnancy\_postpartum / doctor\_advised\_restriction / prefer\_not\_to\_say\_health / severe\_fatigue / persistent\_pain |

**Captured-but-non-differentiating by design** (collected for profiling/safety/future, do not steer recs): gender, most food patterns, sleep-duration upper bands, neutral/positive states, caffeine\_none/morning, social\_balanced.

**11\. Recommendation Master v1.13 — Schema  \[DET / DATA\]**

**171 recommendations · 21 columns · 4 pillars · 8 types · 4 strengths.** Pillars: Nutrition, Physical Activity, Sleep & Recovery, Mental Wellness.

| Col | Name | Use | Audience |
| :---- | :---- | :---- | :---- |
| **A** | Recommendation ID | Filtering, audit (SLP/NUT/FIT/MW/PI series) | Internal |
| **B** | Pillar | Filtering, grouping, plan pillar\_distribution | Internal |
| **C** | Recommendation Category | Clustering (primary key) | Internal |
| **D** | Type | Page/phase routing — do, dont, mindset\_shift, safety\_guidance, blind\_spot, pattern\_prediction, success\_condition, strength\_insight | Internal |
| **E** | Recommendation | Engine-facing text — scoring, filtering, clustering; fallback display | Internal (fallback user) |
| **F** | Persona Fit | Persona(s) or all\_personas — scoring, filtering | Internal |
| **G** | Context Fit | Situational tags incl. activity\_pref\_\*, time\_of\_day\_\*, caffeine\_\*, support/social — scoring | Internal |
| **H** | Goal Fit | Goal tags — scoring | Internal |
| **I** | Barrier Fit | Barrier tags — scoring | Internal |
| **J** | Exclude If | HEALTH/SAFETY flags \+ derived guardrails — filtering (NOT 'personas to exclude') | Internal |
| **K** | Recommendation Strength | core / supporting / optional / conditional — scoring, plan distribution (R1) | Internal |
| **L** | OCEAN Category Tags | Facet tags — analytics \+ clustering tertiary key (NOT scoring) | Internal |
| **M** | Notes / Rationale | Author notes incl. BRIDGE marker | Internal |
| **N–S** | 6 Persona Context columns | Pre-written persona-specific framing (Turtle, Fox, Deer, Bear, Elephant, Wolf) — the report-facing text \+ AI synthesis source | User-facing (via AI) |
| **T** | OCEAN Trait Tags | Trait-format tags (O\_low…N\_high) — OCEAN scoring (+4/match) | Internal (scoring) |
| **U** | Effort Level | low / medium / high — effort-fit scoring \+ plan activation-energy mapping | Internal (scoring \+ plan) |

**Recommendation type inventory:** do (largest pool, incl. former first\_action/environment\_change/recovery\_rule merged in) · dont · mindset\_shift (incl. former coach\_note) · safety\_guidance · and the 24 Persona-Insight (PI) records (4 per persona: blind\_spot, pattern\_prediction, success\_condition, strength\_insight). PI records are persona-gated and not scored competitively.

**v1.13 additions over the legacy master:** FIT037 (goal-preference bridge), FIT038/FIT041 (cardio/endurance anchors), FIT039 (sport/dance anchor), FIT040 (yoga anchor); new category cardio\_endurance. (Source docs referencing 144 recs / 19 cols are superseded — see §32–33.)

**12\. Derived Rules & Pre-Processing  \[DET\]**

Run **before scoring**. DR01–DR08 are safety guardrails (suppress a rec when the condition holds); DR09–DR10 derive barrier tags; DR11 is the goal-preference bridge (detail in §21.15).

| Rule | Condition → action |
| :---- | :---- |
| **DR01** | sleep\_quality\_poor/very\_poor \+ high-intensity rec → suppress (exclude\_poor\_sleep\_high\_intensity) |
| **DR02** | fitness\_beginner/restarting \+ advanced-training rec → suppress |
| **DR03** | stress\_high \+ extreme-dieting rec → suppress |
| **DR04** | high-anxiety pattern (Watchful Deer) \+ over-tracking rec → suppress |
| **DR05** | work\_shift\_based \+ strict sleep-timing rec → suppress |
| **DR06** | work\_travel\_heavy \+ rigid-routine rec → suppress |
| **DR07** | time\_under\_15\_min \+ long-workout rec → suppress |
| **DR08** | barrier\_emotional\_eating\_cravings \+ extreme-restriction rec → suppress |
| **DR09** | stress\_high → emit barrier\_work\_stress |
| **DR10** | sleep\_quality\_poor/very\_poor → emit barrier\_poor\_sleep |
| **DR11** | strength/muscle goal \+ no resistance preference → surface bridge rec FIT037 \+ switch on bridging framing (§21.15) |

Also pre-processing: expand CQ16 grouped goal options to individual tags (e.g., 'Build muscle / get stronger' → goal\_muscle\_gain \+ goal\_strength).

**13\. Recommendation Engine — Filtering  \[DET\]**

Filtering is a hard gate run before scoring. If a rec is unsafe or ineligible it is removed, never merely down-scored. The Exclude If column (J) holds **health/safety flags**, not personas.

* **Health/safety flags:** drop any rec whose Exclude If matches a CQ20 health flag (exclude\_injury, exclude\_persistent\_pain, exclude\_severe\_fatigue, exclude\_medical\_condition, exclude\_pregnancy\_postpartum, exclude\_doctor\_advised\_restriction).  
* **Derived guardrails DR01–DR08:** drop recs meeting a derived suppression condition.  
* **Age gate:** apply age-band suitability; age\_under\_18 routes to a minor-safe branch (no intensity/restriction guidance). Age is a gate, not a scoring boost.  
* **PI-series:** include PI001–PI024 only when the primary persona matches.  
* **Feasibility \= eligibility:** hard-feasibility context (time, severe stress, fitness floor) is enforced here, not nudged in scoring.

The surviving set (typically 40–70 recs) is the input to scoring and the plan generator.

**14\. Recommendation Engine — Scoring  \[DET\]**

Score every surviving rec with transparent points. Barriers and personas weigh more than goals because they better explain what will actually work; context is the lowest weight because the hard cases are handled in filtering.

| Component | Points | Cap | Reads |
| :---- | :---- | :---- | :---- |
| **Primary persona (scaled by tier 25/20/15/10)** | \+25 | 40 w/ secondary | Col F |
| **Secondary persona (blend-scaled)** | \+8 / \+12 / \+18 (Pure/Tend./Strong) | 18 | Col F \+ blend |
| **all\_personas** | \+10 | 10 | Col F |
| **Barrier match** | \+12 each | 36 | Col I (+derived) |
| **Goal match** | \+8 each | 24 | Col H |
| **Context-fit (fit-type only)** | \+3 each | 15 | Col G |
| **OCEAN trait match** | \+4 each | 20 | **Col T** (NOT col L) |
| **Effort fit** | \+5 | 5 | Col U |
| **Strength** | core \+10 / supporting \+5 / optional 0 / conditional −5 | 10 | Col K |

**Why caps exist:** caps stop one dimension dominating — without the barrier cap a rec tagged with five barriers (+60) would beat a perfect persona match (+25); caps also encode the priority order (persona/barrier \> goal \> OCEAN \> context) and neutralise over-tagging (e.g., stress\_high on \~half the corpus). **Effort fit:** award \+5 to low-effort recs when the user shows low capacity (barrier\_low\_activation\_energy / overwhelm / stress\_high / time\_under\_15\_min); reserve high-effort recs for disciplined high-capacity profiles. **Maximum normal score ≈ 158** (internal only; never shown).

**15\. Ranking & Tie-Breakers  \[DET\]**

Sort by total score descending within each pillar. Resolve ties in order: (1) higher strength, (2) higher barrier-match count, (3) higher OCEAN alignment, (4) lower effort when user capacity is low, (5) primary \> secondary persona match, (6) less duplication with already-selected, (7) better pillar balance.

**16\. Clustering  \[DET\]**

Group selected recs by **Category** (primary), shared **Barrier** (secondary), **OCEAN trait alignment** (tertiary). Cluster score \= mean of the top-5 rec scores in the cluster — used to rank clusters for Page 8 High-Impact Priorities. De-duplicate clusters that share both category and main barrier. Keep V1 rules simple; no ML.

**17\. Persona Context Resolution  \[DET\]**

* **Standard recs (SLP/NUT/FIT/MW):** look up the primary persona's context column (N–S). If populated, use it as the AI-synthesis framing \+ the rec column (E) for facts. If empty, fall back to the rec column (E).  
* **PI-series (PI001–PI024):** the persona context column is the report-facing text; column E is engine-facing only and must never reach the user.  
* **Strong Influence blend:** pull both primary and secondary persona-context columns for top-scoring items.  
* Store selected rec IDs behind every generated section for audit/traceability.

**18\. AI Synthesis Principles & Canonical System Prompt  \[AI\]**

AI is a composer and structurer, not a generator. It receives selected, persona-context-resolved recommendations and assembles them into coherent, emotionally-intelligent text. It must not add, invent, or extrapolate any behaviour, claim, number, recommendation, phase, readiness signal, or business rule not present in the input.

**18.1 Canonical system prompt (set once per generation; used by every report AI call)**

You are Pausibl's wellness report writer. You COMPOSE and STRUCTURE pre-personalised content into  
warm, clear, emotionally intelligent text for ONE specific person. You never invent advice; all  
substantive content is provided in the input.

1\. SCOPE: wellness guidance only \- no sets/reps/weights/calorie targets/macros/meal plans as the  
   basis of advice. Acknowledge ambitious goals positively and frame progress in stages; never call  
   a goal unrealistic.  
2\. TRACE: use only facts in the input. Every sentence must trace to an input field. Invent nothing.  
3\. SECOND PERSON ('you'/'your').  
4\. TRAIT LABELS: use only Openness, Discipline, Social Energy, Agreeableness, Stress Sensitivity.  
   Never output Conscientiousness, Extraversion, Neuroticism, 'OCEAN', or any trait number.  
5\. PERSONA NAMES: permitted where the section calls for them (titles, plan subtitle/rationale);  
   in behavioural prose, centre the person rather than repeating the animal name.  
6\. FIT SCORE may be shown as 'NN/100 \- \<Tier\> tier' where the section calls for it.  
7\. NEVER output engine internals (activation energy, blend ratio, scoring, centroid, softmax, cluster,  
   rec IDs, strength labels, 'readiness signal', 'pillar distribution') or motivational cliches.  
8\. TONE by {fit\_tier}: Classic confident / Core soft / Leaning exploratory / Exploring invitational.  
9\. SECONDARY content by {blend\_strength}: Pure single-pattern / Tendencies one acknowledging line /  
   Strong substantive dual-pattern.  
10\. Bridge framing (if a goal-preference bridge item is present): present the preferred activity as  
    the base and the added modality as a small, honest addition; never tell the user their preferred  
    activity is wrong.  
11\. OUTPUT: strict valid JSON matching the section schema. No text outside JSON. Respect every length  
    limit (tighten, never truncate mid-sentence). If a required input is empty, follow the section's  
    FALLBACK; never fabricate.

**18.2 Model configuration**

| Parameter | Value | Rationale |
| :---- | :---- | :---- |
| **Model** | GPT-4o or Claude Sonnet (latest) | Quality \> speed |
| **Temperature** | 0.7 | Balance creativity \+ consistency |
| **Max tokens** | ≤500 per section call | Prevents over-generation |
| **Top-p** | 0.9 | Natural text |

**19\. Report Generation Architecture**

The 10-page Wellness Intelligence Report. **9 AI synthesis calls** (Pages 4, 5, 6, 7×4, 8, 9); the remaining pages are deterministic or static template. Pillar order on Page 7 follows the sample: Sleep & Recovery, Nutrition, Physical Activity, Mental Wellness.

| Pg | Title | Type | AI call | Emotional beat |
| :---- | :---- | :---- | :---- | :---- |
| **1** | Cover | \[DET\]/\[TPL\] | — | — |
| **2** | Understanding Your Wellness Personality | \[TPL\] | — | — |
| **3** | Your Pattern Match | \[DET\] | — | Pride / recognition |
| **4** | Your Primary Pattern | \[AI\] | PRIMARY\_PATTERN | Deep understanding |
| **5** | Your Secondary Pattern and Blend | \[AI\] | SECONDARY\_PATTERN | Nuance |
| **6** | What You Don't See | \[AI\] | WHAT\_YOU\_DONT\_SEE | Revelation |
| **7** | Your Key Actions (4 pillars) | \[AI\]×4 | PILLAR\_ACTIONS | Confidence |
| **8** | Your High-Impact Priorities | \[AI\] | HIGH\_IMPACT\_PRIORITIES | Excitement |
| **9** | Your Integrated Plan | \[HYB\] | PLAN\_PAGE | Direction |
| **10** | What Comes Next | \[TPL\] | — | — |

**20\. Report — Page-by-Page Logic**

**20.1 Page 1 — Cover  \[DET/TPL\]**

* Elements: report title; user name; **persona name** \+ animal illustration (asset library); **Persona Title** \= \[Fit Tier\] \[Primary Persona\] with \[Secondary Persona\] tendencies|influence (suffix by blend); **one-line persona description** (static per-persona archetype string); report ID \+ date. No AI.  
* **Validation:** the one-line description must use user-facing trait labels (§4.2) — restate any technical-OCEAN archetype text (e.g., 'High Discipline, low Stress Sensitivity and Social Energy').

**20.2 Page 2 — Understanding Your Wellness Personality  \[TPL\]**

Static 6-persona educational grid (each cell: persona name, 1-line description, archetype label). Identical for all users. No data lookup, no AI.

**20.3 Page 3 — Your Pattern Match  \[DET\]**

* **Pattern Alignment:** all 6 personas with softmax percentages, bars sorted descending.  
* **OCEAN Radar:** user scores vs primary centroid on 5 axes — axes use user-facing labels (§4.2).  
* **Quick Profile (6 attributes), from persona lookup modified by OCEAN:** Wellness Style · Energy Pattern · Motivation Driver · Top Risk Factor · **Best Environment** (a persona-derived \*psychological\* descriptor, e.g. 'Balanced structure with flexibility' — NOT the CQ09 exercise location) · **Persona Fit Score** ('71/100 — Core tier'). No AI.

**20.4 Page 4 — Your Primary Pattern  \[AI\]**

Title: 'Your Primary Pattern: \[Persona name\]'. **Source:** PI success\_condition \+ strength\_insight for primary persona (persona-context text); ocean\_scores; centroid\_scores; goals; barriers. Trait-deviation cards where |user−centroid|\>0.8 (max 2, largest first).

**AI Prompt — PRIMARY\_PATTERN**

**Call:** PRIMARY\_PATTERN  ·  **System prompt:** §18.1 (canonical)  ·  **No-invention:** every output traces to an input field.

**Inputs:** {primary\_persona}, {success\_condition\_text}, {strength\_insight\_text}, {ocean\_scores}, {centroid\_scores}, {goals\[\]}, {barriers\[\]}, {fit\_tier}.

**Task:** Produce a 150–200 word Persona Description; six behavioural boxes; and 0–2 trait-deviation cards.

**Field constraints / forbidden terms:**

* Description 150–200 words, second person, grounded in success\_condition\_text \+ strength\_insight\_text.  
* Exactly six boxes, titles: Behavioural Tendencies · What Motivates You · What Drains You · Default Under Stress · How You Build Habits · Growth Pattern. Each 2–3 sentences.  
* Box sources: Tendencies←success\_condition+OCEAN; Motivates←strength\_insight+goals; Drains←barriers+low OCEAN; Default Under Stress←Stress Sensitivity+barriers; Build Habits←Discipline; Growth←strength\_insight+Openness.  
* Trait cards only for |deviation|\>0.8 (max 2); title '\[user-facing trait\] — higher/lower than typical' \+ exactly 2 sentences. Forbidden: technical trait names, animal names in the boxes.

**Output schema (strict JSON):**

{ "persona\_narrative":"string(150-200w)",  
  "behavioural\_boxes":\[{"title":"string","content":"string"} x6\],  
  "trait\_deviations":\[{"trait":"string","direction":"higher|lower","content":"string(2 sent)"} x0-2\] }

**Fallback:** No qualifying deviation → empty trait\_deviations. A box lacking input → one sentence from the strongest OCEAN signal; never fabricate a behaviour.

**20.5 Page 5 — Your Secondary Pattern and Blend  \[AI\]**

Title: 'Your Secondary Pattern: \[Secondary persona name\]'. Content volume scales with blend.

**AI Prompt — SECONDARY\_PATTERN**

**Call:** SECONDARY\_PATTERN  ·  **System prompt:** §18.1 (canonical)  ·  **No-invention:** every output traces to an input field.

**Inputs:** {secondary\_persona}, {primary\_persona}, {blend\_strength}, {success\_condition\_text}, {strength\_insight\_text}, {goals\[\]}, {barriers\[\]}, {fit\_tier}.

**Task:** Apply blend rules — Pure: 2-sentence summary only. Tendencies: 80–100w description \+ 3 boxes (Behavioural Tendencies, What Motivates You, Growth Pattern) \+ 60–80w 'How Your Two Patterns Interact'. Strong: 100–150w \+ all 6 boxes \+ 100–120w interaction with one concrete example.

**Field constraints / forbidden terms:**

* Do not repeat or contradict Page 4\.  
* Box count exactly 0, 3, or 6 per blend; titles match Page 4\.  
* Interaction uses only both personas' PI texts.

**Output schema (strict JSON):**

{ "secondary\_narrative":"string", "behavioural\_boxes":\[{"title":"string","content":"string"}\], "blend\_narrative":"string|null" }

**Fallback:** Pure → behavioural\_boxes=\[\] and blend\_narrative=null.

**20.6 Page 6 — What You Don't See  \[AI\]**

**AI Prompt — WHAT\_YOU\_DONT\_SEE**

**Call:** WHAT\_YOU\_DONT\_SEE  ·  **System prompt:** §18.1 (canonical)  ·  **No-invention:** every output traces to an input field.

**Inputs:** {primary\_persona}, {blind\_spot\_text}, {pattern\_prediction\_text}, {goals\[\]}, {barriers\[\]}, {fit\_tier}.

**Task:** Two titled sections: 'The Pattern You Don't Notice' (80–100w self-recognition scenario from blind\_spot\_text) and 'What This Means For Your Goals' (60–80w, connect to a named goal via pattern\_prediction\_text, end with a forward look).

**Field constraints / forbidden terms:**

* Never use: blind spot, weakness, flaw, deficiency, problem, limitation. Observational, not critical.  
* Name the specific goal and mechanism; add no prediction beyond pattern\_prediction\_text.

**Output schema (strict JSON):**

{ "pattern\_you\_do\_not\_notice":"string(80-100w)", "what\_this\_means\_for\_your\_goals":"string(60-80w)" }

**Fallback:** Empty pattern\_prediction\_text → write section 2 from the strongest goal \+ blind\_spot\_text; never invent a prediction.

**20.7 Page 7 — Your Key Actions  \[AI ×4\]**

Runs once per pillar. **Selection (engine):** per pillar, top mindset\_shift (1), top 3 do (de-duplicated by category), top 2 dont; persona-context-resolved.

**AI Prompt — PILLAR\_ACTIONS (×4)**

**Call:** PILLAR\_ACTIONS (×4)  ·  **System prompt:** §18.1 (canonical)  ·  **No-invention:** every output traces to an input field.

**Inputs:** {pillar}, {mindset\_shift:{rec\_id,text}}, {do\_recs:\[{rec\_id,text,category} x3\]}, {dont\_recs:\[{rec\_id,text,category} x2\]}, {fit\_tier}, {blend\_strength}.

**Task:** Compose pre-selected items only: a pillar headline (the mindset reframe, ≤15w); 3 DO (action imperative ≤12w \+ why ≤20w); 2 DON'T (named behaviour ≤12w \+ why ≤20w).

**Field constraints / forbidden terms:**

* Add no action/tip not in the input.  
* DON'T items must name a concrete behaviour, not an abstract principle.  
* Every 'why' derives from the supplied text; keep guidance, not prescription.  
* Bridge framing (if a goal-preference bridge item such as FIT037 is present): preferred activity as the base, added modality as a small honest addition; never say the preferred activity is wrong.

**Output schema (strict JSON):**

{ "pillar":"string", "headline":"string(\<=15w)",  
  "do\_items":\[{"action":"string(\<=12w)","why":"string(\<=20w)"} x3\],  
  "dont\_items":\[{"behaviour":"string(\<=12w)","why":"string(\<=20w)"} x2\] }

**Fallback:** If fewer than 3 do / 2 dont supplied (should not occur in v1.13), output exactly what is provided; never pad with invented actions.

**20.8 Page 8 — Your High-Impact Priorities  \[AI\]**

**Selection (engine):** rank pillars by cluster score; take the single highest-impact action per pillar; 3–4 cards (exclude a pillar whose cluster score \<20; min 3, max 4).

**AI Prompt — HIGH\_IMPACT\_PRIORITIES**

**Call:** HIGH\_IMPACT\_PRIORITIES  ·  **System prompt:** §18.1 (canonical)  ·  **No-invention:** every output traces to an input field.

**Inputs:** {priorities:\[{rank,pillar,cluster\_score,rec\_id,rec\_text,category} x3-4\]}, {goals\[\]}, {barriers\[\]}, {fit\_tier}.

**Task:** Per priority a card: label 'PRIORITY n — \[PILLAR\]', headline (≤10w), why\_it\_matters (40–50w tying to pattern/goal/barrier), and a 'First step:' sentence derived from rec\_text.

**Field constraints / forbidden terms:**

* Each card a different pillar; order by cluster\_score.  
* 'First step' must derive from rec\_text, not be invented; concrete and doable this week.

**Output schema (strict JSON):**

{ "priority\_cards":\[{"pillar":"string","rank":int,"headline":"string(\<=10w)","why\_it\_matters":"string(40-50w)","first\_step":"string"}\] }

**Fallback:** Render exactly the number supplied (3 or 4).

**20.9 Page 9 — Your Integrated Plan  \[HYB\]**

The plan generator's plan\_output (§21) rendered for the user. **Deterministic structure with an AI wording layer.** See §22 for rendering rules, blocklist, char limits, error handling.

**Deterministic elements \[DET/DATA\]**

* Title 'Your \[N\]-Week Integrated Plan'. **Guiding Principles** — fixed 5-bullet list: 'Start with the smallest version that still counts' · 'Add one layer only after the previous one feels routine' · 'Use signs you're ready, not fixed dates, to advance' · 'Anchor each phase around a single keystone habit' · 'Never introduce more than your pattern can absorb'.  
* **Phase cards** (from plan\_output): 'Phase n · Weeks x–y', phase name, Anchor Habit (display\_text), Daily Rhythm (display\_text list), Weekly Rhythm (display\_text list), pillar indicators — rendered verbatim from recommendation display\_text, not rewritten by AI.

**AI layer \[AI\]**

**AI Prompt — PLAN\_PAGE**

**Call:** PLAN\_PAGE  ·  **System prompt:** §18.1 (canonical)  ·  **No-invention:** every output traces to an input field.

**Inputs:** {primary\_persona}, {fit\_tier}, {secondary\_persona}, {blend\_percentage}, {goals\[\]}, {barriers\[\]}, {total\_phases}, {total\_duration\_weeks}, per phase {phase\_number,name,approx\_duration\_weeks,intent(engine),anchor\_habit\_text,readiness\_signal(engine)}, {generation\_notes}.

**Task:** Produce plan\_subtitle (≤120 chars; MAY name the persona); per phase phase\_intent\_user (≤200 chars, warm rewrite of engine intent) \+ 'Ready to Advance When' readiness\_signal\_user (≤150 chars, what the user will FEEL); plan\_rationale ('How This Plan Was Built', 60–90w; MAY reference persona name, fit tier, and fit score).

**Field constraints / forbidden terms:**

* Translate engine intent/readiness into user language; never output raw engine terms (activation energy, readiness signal, pillar distribution).  
* Acknowledge ambitious goals positively; frame as staged (incl. the goal-persona misalignment instruction §21.14). Never call a goal unrealistic.  
* plan\_rationale is the one block that may expose the fit score and persona names.

**Output schema (strict JSON):**

{ "plan\_subtitle":"string", "phases":\[{"phase\_number":int,"phase\_intent\_user":"string","readiness\_signal\_user":"string"}\],  
  "plan\_rationale":"string(60-90w)" }

**Fallback:** On invalid JSON / blocked term / over-length: retry once; if still failing, render deterministic content \+ engine intent as plain fallback. 0 phases \= critical error: skip the page and log.

**20.10 Page 10 — What Comes Next  \[TPL\]**

Static closing: three cards (Start Small / Track How You Feel / Revisit in 4 Weeks) \+ the standard medical/nutritional/psychological disclaimer \+ branding. No AI.

**21\. Integrated Plan Generator  \[DET\]**

Generates a personalised 8–12 week phased plan (plan\_output) from the scored, filtered recommendation set. **Fully deterministic** — persona phase structure, phase counts, durations, names, intents, eligible types, activation-energy caps, readiness signals, barrier/goal overrides and plan\_output generation are hardcoded logic and must NOT be treated as AI-generated. AI only rewrites the user-facing phase intent, readiness wording, subtitle and rationale on Page 9 (§20.9). Operates in three stages: Phase Configuration → Recommendation Distribution → Signal Generation.

**21.1 Phase Configuration Matrix  \[DET\]**

The persona determines the plan's fundamental structure. Higher Discipline (C) allows more items per phase and faster progression; higher Stress Sensitivity (N) requires fewer items and longer stabilisation windows; Social Energy (E) determines whether accountability is social or self-directed.

| Parameter | Shielded Turtle | Watchful Deer | Curious Fox | Pack Wolf | Steadfast Bear | Steady Elephant |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| **Phase count** | 4 | 3 | 3 | 3 | 2 | 2–3 |
| **Daily items / phase** | 2 | 3 | 3–4 | 3–4 | 4–5 | 4–5 |
| **Weekly items / phase** | 2 | 3 | 3–4 | 3–4 | 4–5 | 4 |
| **Phase 1 duration** | 3–4 weeks | 3 weeks | 2 weeks | 2–3 weeks | 2 weeks | 2 weeks |
| **Max plan duration** | 12 weeks | 10 weeks | 10 weeks | 8 weeks | 6 weeks | 8 weeks |
| **Progression style** | Ultra-gradual | Steady-cautious | Variety-driven | Social-layered | Intensity-based | System-completion |
| **Anchor habit type** | Environmental | Structural | Exploratory | Social | Performance | Process |
| **Accountability** | Self-only | Written tracker | Novelty-based | Social check-in | Metric-based | System-based |

v1.1 corrections embedded: Watchful Deer Phase-1 duration fixed at **3 weeks** (was 2–3) — the Deer's perfectionism-driven paralysis (N=6.0) needs a reliable 3-week window for the readiness signal to be achievable. Watchful Deer and Curious Fox **max duration extended 8→10 weeks** (the \+2 weeks go to Phase 2, the critical habit-solidification window for low-Discipline personas).

**21.2 Phase Intent by Persona  \[DET\]**

Each persona follows a distinct emotional/behavioural arc. Phase names and intents are not cosmetic — they drive which recommendation types are eligible per phase and how the readiness signal is framed.

**21.2.1 Shielded Turtle — 4 phases**

High Stress Sensitivity (6.5), low Discipline (2.5), low Social Energy (2.0). Brittle, avoidant; needs maximum safety before any action.

| Phase | Name | Intent | Eligible Types | Readiness Signal |
| :---- | :---- | :---- | :---- | :---- |
| **1 (Wk 1–4)** | Create Safety | Environment setup only. No exercise, no diet changes. Just make the space feel manageable. | environment\_change, first\_action | When the environment changes feel normal, not effortful. |
| **2 (Wk 5–7)** | Try Without Pressure | Micro-movement and one nutrition anchor. No tracking, no targets. Just exposure. | first\_action, do (low-activation only) | When attempting a small action no longer triggers avoidance. |
| **3 (Wk 8–10)** | Build a Rhythm | Establish 2–3 day/week structure. Introduce written cues (not tracking). | do, dont, mindset\_shift | When a missed day triggers a restart, not a shutdown. |
| **4 (Wk 11–12)** | Expand at Your Pace | Add supporting recommendations. Introduce gentle self-monitoring. | do, recovery\_rule, success\_condition | When adjusting the plan feels possible, not threatening. |

**21.2.2 Watchful Deer — 3 phases**

High Stress Sensitivity (6.0), low Discipline (2.8), low Social Energy (2.8). Self-aware but prone to perfectionism-driven paralysis.

| Phase | Name | Intent | Eligible Types | Readiness Signal |
| :---- | :---- | :---- | :---- | :---- |
| **1 (Wk 1–3)** | Build the Floor | Minimum viable routine. Prove consistency is possible. Backup systems for missed days. | first\_action, do, environment\_change | When 3 sessions/week feels like a default, not a decision. |
| **2 (Wk 4–8)** | Find Your Rhythm | Extend duration, add structure. The nervous system now trusts the routine. | do, dont, recovery\_rule | When a missed session triggers a backup, not a full stop. |
| **3 (Wk 9–10)** | Expand Your Range | Add personalisation, fine-tuning, and self-monitoring. Foundation is solid. | do, mindset\_shift, success\_condition, strength\_insight | When you adjust the plan instead of abandoning it. |

**21.2.3 Curious Fox — 3 phases**

High Openness (6.5), low Discipline (2.5), moderate Social Energy (5.5). Enthusiastic starter, struggles with repetition and follow-through.

| Phase | Name | Intent | Eligible Types | Readiness Signal |
| :---- | :---- | :---- | :---- | :---- |
| **1 (Wk 1–2)** | Explore What Works | Frame the entire plan as an exploration. Offer 2–3 options per slot to satisfy novelty needs. | first\_action, do, environment\_change | When you have completed at least one full week without switching everything. |
| **2 (Wk 3–7)** | Find What Sticks | Narrow to what worked in Phase 1\. Introduce structure without killing variety. | do, dont, mindset\_shift | When you can name your 3 anchor habits without hesitation. |
| **3 (Wk 8–10)** | Make It Yours | Lock the core, experiment at the edges. Add progression and optional items for depth. | do, recovery\_rule, success\_condition, strength\_insight | When boredom no longer means abandonment. |

**21.2.4 Pack Wolf — 3 phases**

High Social Energy (6.5), high Agreeableness (6.0), moderate Discipline (5.2). Socially motivated; performs well with group accountability.

| Phase | Name | Intent | Eligible Types | Readiness Signal |
| :---- | :---- | :---- | :---- | :---- |
| **1 (Wk 1–3)** | Find Your Pack | Establish social anchors — workout partners, meal-prep groups, accountability buddies. | first\_action, do, environment\_change | When at least one social accountability loop is active. |
| **2 (Wk 4–6)** | Run Together | Build group rhythm. Structure sessions, shared meals, social check-ins. | do, dont, recovery\_rule | When the social structure sustains without you initiating every time. |
| **3 (Wk 7–8)** | Stand Alone When Needed | Build independence within the social frame. Solo backup routines for when the group is unavailable. | do, mindset\_shift, success\_condition, strength\_insight | When a solo week doesn't collapse the routine. |

**21.2.5 Steadfast Bear — 2 phases**

High Discipline (5.8), low Stress Sensitivity (2.0), low Social Energy (3.0). Disciplined, resilient, low anxiety; needs structure and measurable progression.

| Phase | Name | Intent | Eligible Types | Readiness Signal |
| :---- | :---- | :---- | :---- | :---- |
| **1 (Wk 1–3)** | Deploy Your Full Plan | Load the complete structured plan upfront: 3–4 day training split, meal structure, sleep protocol. | do, dont, environment\_change, first\_action, recovery\_rule | When all 4 pillars have been followed for 2 consecutive weeks. |
| **2 (Wk 4–6)** | Optimize Without Overreaching | Add progressive overload, fine-tune nutrition timing, introduce blind spots and pattern predictions. | mindset\_shift, blind\_spot, pattern\_prediction, success\_condition, strength\_insight | When recovery is treated as part of performance, not a weakness. |

**21.2.6 Steady Elephant — 2–3 phases**

High Discipline (6.5), low Stress Sensitivity (1.5), moderate elsewhere. Self-regulated planner who wants a complete system and executes methodically.

| Phase | Name | Intent | Eligible Types | Readiness Signal |
| :---- | :---- | :---- | :---- | :---- |
| **1 (Wk 1–3)** | Lay the System | Present the full architecture: all 4 pillars, structured routines, tracking system. | do, dont, environment\_change, first\_action | When all systems are set up and running for 2 weeks. |
| **2 (Wk 4–6)** | Run the System | Maintain, adjust, refine. Add supporting and optional items as enhancements. | do, recovery\_rule, mindset\_shift, success\_condition | When adjustments happen proactively, not reactively. |
| **3 (Wk 7–8, optional)** | Optimize Your System | Only triggered if goals are not yet met. Fine-tune nutrition timing, progressive overload, advanced recovery. | strength\_insight, blind\_spot, pattern\_prediction | When the system is producing measurable results. |

**21.3 Recommendation Distribution Algorithm  \[DET\]**

A 5-step process. **Step 1 — Score & Filter:** the engine (§13–16) scores all 171 recs and drops those failing the threshold or hitting an exclude condition; the surviving 40–70 recs feed the generator. **Step 2 — Classify by Activation Energy** (21.4). **Step 3 — Phase Assignment** (rules 21.6, caps 21.7). **Step 4 — Anchor selection** (rule R5). **Step 5 — Signal generation** (21.8).

**21.4 Activation Energy Classification  \[DET\]**

Each rec receives an activation\_energy score (1–5) — how much effort, willpower, or environmental change it requires. This is **derived from the master's Effort Level (col U)** by the fixed map below (not recomputed), reconciling the plan's 1–5 scale with the master's 3-level Effort Level.

| Activation Energy | Score | Effort Level (col U) | Types / Categories | Example |
| :---- | :---- | :---- | :---- | :---- |
| **Passive** | 1 | low | environment\_change, first\_action (environment) | Charge phone outside bedroom |
| **Micro** | 2 | low | first\_action (behaviour), do (single-action) | Stand up for 5 min after lunch |
| **Low** | 3 | medium | do (routine), dont (removal) | Eat at regular times on weekdays |
| **Moderate** | 4 | high | do (structured), mindset\_shift, recovery\_rule | Follow a 3-day lifting plan |
| **High** | 5 | high | do (complex), success\_condition, strength\_insight | Track progressive overload weekly |

Mapping rule: Effort low → AE 1–2 (1 for pure environment/mindset cues, else 2); medium → AE 3; high → AE 4–5 (5 for complex/success\_condition/strength\_insight).

**21.5 Phase Assignment Rules R1–R8  \[DET\]**

| Rule | Logic | Rationale |
| :---- | :---- | :---- |
| **R1** | Phase 1 draws from core first, then supporting. Phase 2 draws remaining core \+ supporting. Later phases get optional and conditional. | Core recs are foundational and should be established earliest. |
| **R2** | Each phase has a max activation energy determined by persona (21.7). Phase 1 for Shielded Turtle caps at 1; Phase 1 for Steadfast Bear caps at 4\. | Prevents overloading early phases for sensitive personas. |
| **R3** | Each phase must include at least 1 recommendation from each pillar. | Prevents plans that are exercise-heavy but sleep-absent. |
| **R4** | Each phase has eligible recommendation types (21.2). Non-eligible types are pushed to later phases. | Aligns recommendation type with the emotional arc of the phase. |
| **R5** | The highest-scoring core rec with matching activation energy becomes the anchor habit. One anchor per phase. | Gives the user a single focal point per phase. |
| **R6** | Conditional recs are attached to the phase where their trigger context is most relevant. | Prevents irrelevant recs consuming phase capacity. |
| **R7** | dont recs are paired with the do they complement, placed in the same phase. | A 'stop doing X' only makes sense when the 'start doing Y' is active. |
| **R8** | If a phase is full but high-priority recs remain, extend by 1 item (max once per phase). | Prevents important recs being buried in Phase 3\. |

**21.6 Activation Energy Caps by Persona × Phase  \[DET\]**

The maximum activation-energy score a rec may have to be eligible for a given phase — the primary pacing mechanism.

| Persona | Phase 1 | Phase 2 | Phase 3 | Phase 4 |
| :---- | :---- | :---- | :---- | :---- |
| **Shielded Turtle** | 1 (Passive) | 2 (Micro) | 3 (Low) | 4 (Moderate) |
| **Watchful Deer** | 2 (Micro) | 3 (Low) | 4 (Moderate) | — |
| **Curious Fox** | 3 (Low) | 4 (Moderate) | 5 (High) | — |
| **Pack Wolf** | 3 (Low) | 4 (Moderate) | 5 (High) | — |
| **Steadfast Bear** | 4 (Moderate) | 5 (High) | — | — |
| **Steady Elephant** | 4 (Moderate) | 5 (High) | 5 (High) | — |

Further adjusted by fit tier: **Leaning** shifts the cap down by 1 in Phase 1 only; **Exploring** shifts down by 1 across all phases.

**21.7 Readiness Signal Framework  \[DET\]**

The plan does not advance on fixed dates; each phase has readiness signals — behavioural indicators that the user has absorbed the phase. Durations are guidance, not deadlines.

**21.7.1 Signal categories**

| Signal Type | Description | Best For |
| :---- | :---- | :---- |
| **Consistency** | Completed the phase's anchor habit X times in Y weeks without external prompting. | Watchful Deer, Steady Elephant, Steadfast Bear |
| **Emotional comfort** | The phase's actions no longer feel effortful or anxiety-producing. | Shielded Turtle, Watchful Deer |
| **Recovery** | A disruption did NOT collapse the routine; the user recovered within 48 hours. | Watchful Deer, Curious Fox, Shielded Turtle |
| **Social embedding** | The accountability structure runs without the user initiating every interaction. | Pack Wolf |
| **Performance** | A measurable metric improved: weight lifted, sleep duration, meal consistency rate. | Steadfast Bear, Steady Elephant |
| **Engagement** | Still following the plan without switching to something entirely new. | Curious Fox |

**21.7.2 Signal assignment logic**

Each persona gets a primary and secondary signal per phase. The **primary signal is the gate** — if not met, the user does not advance.

| Persona | Phase 1 Primary | Phase 1 Secondary | Phase 2+ Primary | Phase 2+ Secondary |
| :---- | :---- | :---- | :---- | :---- |
| **Shielded Turtle** | Emotional comfort | Consistency | Emotional comfort | Recovery |
| **Watchful Deer** | Consistency | Emotional comfort | Recovery | Consistency |
| **Curious Fox** | Engagement | Consistency | Consistency | Engagement |
| **Pack Wolf** | Social embedding | Consistency | Social embedding | Recovery |
| **Steadfast Bear** | Consistency | Performance | Performance | Consistency |
| **Steady Elephant** | Consistency | Performance | Performance | Consistency |

**21.8 Fit Tier & Blend Adjustments  \[DET\]**

| Fit Tier | Fit Score | Phase Adjustment | Item Adjustment | Signal Adjustment |
| :---- | :---- | :---- | :---- | :---- |
| **Classic** | 75–100 | No change | No change | No change |
| **Core** | 65–74 | Add 1 week to Phase 1 estimate | No change | No change |
| **Leaning** | 55–64 | Add 1 week to Phase 1 estimate | Reduce Phase 1 daily items by 1 | Activation energy cap −1 in Phase 1 only |
| **Exploring** | Below 55 | Add 1 phase (max 4 total). Add 1–2 weeks to Phase 1 | Reduce all phase items by 1\. Cap at 3 daily/phase | Activation energy cap −1 all phases. Emotional comfort secondary in all phases |

**Core tier (65–74)** provides a smooth gradient between Classic and Leaning: a 1-week Phase-1 buffer without reducing item count or activation energy. **Leaning** narrowed from 55–74 to 55–64 to accommodate Core.

**21.9 Secondary Persona Influence  \[DET\]**

When a secondary persona contributes **\>15%** of the blend, its traits modify the plan:

| Secondary Persona | Modification When Present (\>15%) | Applied To |
| :---- | :---- | :---- |
| **Shielded Turtle** | Reduce Phase 1 activation energy cap by 1\. Add emotional comfort as secondary readiness signal. | All primary personas |
| **Curious Fox** | Add 1 optional/variety item per phase. Allow anchor habit rotation (2 options instead of 1). | All primary personas |
| **Pack Wolf** | Add 1 social accountability item in Phase 2+. Add social embedding as secondary signal. | All except Pack Wolf |
| **Steadfast Bear** | Allow Phase 1 to load 1 additional structured item beyond the cap. | All except Steadfast Bear |
| **Watchful Deer** | Add recovery signal as secondary in Phase 1\. Add 1 backup/fallback recommendation per phase. | All primary personas |
| **Steady Elephant** | Present the full plan overview upfront (even if only Phase 1 is active). Add tracking earlier. | All except Steady Elephant |

**21.10 Barrier Overrides  \[DET\]**

Self-reported barriers override the persona-based structure:

| Barrier | Override Effect |
| :---- | :---- |
| **barrier\_lack\_of\_time** | Cap all Phase 1 recs to actions under 15 minutes. Anchor must be a micro-action (AE ≤ 2). Add backup/short-version for every structured rec. |
| **barrier\_poor\_sleep** | Promote sleep-pillar recs to Phase 1 regardless of activation energy. Sleep becomes the Phase-1 anchor pillar. |
| **barrier\_emotional\_eating** | Include ≥1 emotional\_eating-category rec in Phase 1\. Pair every nutrition do with its corresponding dont. |
| **barrier\_inconsistency** | Add recovery\_rule recs to Phase 1 (not Phase 2+). Every phase must include ≥1 fallback/backup. |
| **barrier\_starting\_difficulty** | Phase 1 anchor must be a first\_action type, not a do. Cap Phase 1 at activation energy 1–2 regardless of persona. |
| **barrier\_perfectionism** | Include ≥1 mindset\_shift in Phase 1 (exception to type eligibility). Frame readiness signals around 'good enough', not 'complete'. |
| **barrier\_overwhelm** | Reduce Phase 1 items by 1 (daily and weekly). Never show the full plan upfront (overrides the Steady Elephant default). |

Note: questionnaire v1.3 barrier tags map onto these override classes — inconsistency←barrier\_lack\_of\_consistency; overwhelm←barrier\_overwhelm\_from\_complexity; starting\_difficulty←barrier\_starting\_difficulty/barrier\_low\_activation\_energy; perfectionism is engine-derived from the Watchful Deer / high-N pattern.

**21.11 Goal Prioritisation  \[DET\]**

The primary goal sets the Phase-1 anchor pillar and the cross-phase recommendation density.

| Goal | Anchor Pillar | Phase 1 Focus | Density Weighting |
| :---- | :---- | :---- | :---- |
| **goal\_fat\_loss** | Nutrition | Meal timing \+ food environment | Nutrition 35%, Physical 30%, Sleep 20%, Mental 15% |
| **goal\_energy** | Sleep & Recovery | Sleep duration \+ wind-down | Sleep 35%, Nutrition 25%, Physical 25%, Mental 15% |
| **goal\_consistency** | Mental Wellness | Motivation \+ behaviour change | Mental 30%, Physical 30%, Nutrition 20%, Sleep 20% |
| **goal\_muscle\_gain** | Physical Activity | Strength training \+ protein | Physical 35%, Nutrition 30%, Sleep 20%, Mental 15% |
| **goal\_stress\_reduction** | Mental Wellness | Stress management \+ mindfulness | Mental 35%, Sleep 25%, Physical 20%, Nutrition 20% |
| **goal\_better\_recovery** | Sleep & Recovery | Sleep \+ recovery protocols | Sleep 35%, Physical 25%, Nutrition 20%, Mental 20% |
| **goal\_sustainable\_routine** | Mental Wellness | Consistency psychology \+ first actions | Mental 30%, Physical 25%, Nutrition 25%, Sleep 20% |

**21.12 Phase 1 Density Override for High Stress Sensitivity (N ≥ 5.5)  \[DET\]**

When the primary persona has Neuroticism ≥ 5.5 (**Shielded Turtle, Watchful Deer**), the goal-based density weighting (21.11) is overridden in **Phase 1 only** with a fixed safety-first distribution:

| Mental Wellness | Sleep & Recovery | Nutrition | Physical Activity |
| :---- | :---- | :---- | :---- |
| **35%** | 25% | 20% | 20% |

Goal-based weighting resumes from Phase 2\. **Rationale:** a Shielded Turtle with goal\_muscle\_gain would otherwise get 35% physical-activity recs in Phase 1 — but at AE cap 1 these are only environment changes, while Mental Wellness (the Turtle's most critical Phase-1 need) would get only 15%. The override ensures Phase 1 always serves the persona's primary psychological need.

**21.13 Goal–Persona Misalignment AI Instruction  \[AI rule\]**

When the user's stated goals imply high-intensity or aggressive timelines misaligned with their behavioural pattern, the PLAN\_PAGE synthesis prompt must include this instruction (verbatim):

"If the user's stated goals imply intensity or timelines that are misaligned with their behavioural  
pattern, acknowledge the goal positively and frame the plan as building toward it in stages.  
Example: 'Your goal of muscle gain is achievable with your pattern \- your plan builds the foundation  
first, so that when structured training begins in Phase 2, it sticks.' Never reject or label a goal  
as unrealistic."

The plan structure (AE caps, phase types, density overrides) keeps the actual actions behaviourally realistic; the AI instruction keeps the user from feeling their goal was dismissed.

**21.14 Goal–Preference Reconciliation  \[DET \+ AI\]**

Handles cases where a goal needs a movement type the user did not pick as a preference (e.g., goal \= muscle but prefers yoga; goal \= strength but prefers walking). Principle: never drop the goal, never force what they'll quit — bridge.

| Goal | Essential modality | Preference can stand alone? |
| :---- | :---- | :---- |
| **Strength / Muscle gain** | Resistance / strength | No — needs some resistance |
| **Flexibility / mobility** | Yoga / stretching | No |
| **Fat loss, Energy, Overall health, Consistency, Stress reduction, Recovery** | Any movement | Yes — honour the preference |

* **DR11 (conflict rule):** if goal ∈ {strength, muscle\_gain} AND the user's activity\_pref\_\* tags exclude activity\_pref\_strength → (a) ensure the bridge rec **FIT037** is included in Physical Activity selection, and (b) switch on the bridging framing rule (system-prompt rule 10).  
* **Resolution \= bridge via phasing:** the preferred activity is the anchor; the goal-essential modality is layered in. Disciplined patterns (Steadfast Bear, Steady Elephant) get resistance in Phase 1; the rest in Phase 2\.  
* **Delivery varies by persona; the message does not.** The physiology (muscle needs resistance) and the bridge strategy are universal; only directness/pace flex — carried by FIT037's six persona-context cells (Bear blunt → Turtle gentle).  
* **Modality coverage (v1.13):** FIT037 (bridge), FIT038/FIT041 (cardio/endurance: cardio, running, cycling, swimming), FIT039 (sport/dance), FIT040 (yoga/mind-body) ensure every activity preference has tailored guidance. New category cardio\_endurance.

**21.15 plan\_output Schema  \[DET\]**

| Field | Type | Description |
| :---- | :---- | :---- |
| **plan\_id** | string | Unique plan identifier linked to report ID |
| **persona** | string | Primary persona used for phase configuration |
| **fit\_tier** | string | Classic / Core / Leaning / Exploring |
| **secondary\_persona** | string | null | Secondary persona if blend \> 15% |
| **total\_phases** | integer | Number of phases (2–4) |
| **phases\[\]** | array | Ordered array of phase objects |
| **phases\[\].phase\_number** | integer | 1-indexed phase number |
| **phases\[\].name** | string | Phase name (e.g., 'Build the Floor') |
| **phases\[\].intent** | string | 1–2 sentence description of phase purpose (engine text) |
| **phases\[\].approx\_duration\_weeks** | string | Estimated duration range (e.g., '2–3 weeks') |
| **phases\[\].anchor\_habit** | object | Single anchor recommendation (rec\_id \+ display\_text) |
| **phases\[\].daily\_rhythm\[\]** | array | Daily recommendations (IDs \+ display text) |
| **phases\[\].weekly\_rhythm\[\]** | array | Weekly recommendations (IDs \+ display text) |
| **phases\[\].readiness\_signal** | object | Primary signal type \+ description \+ secondary signal |
| **phases\[\].activation\_energy\_cap** | integer | Max activation energy for this phase (1–5) |
| **phases\[\].pillar\_distribution** | object | Count of items per pillar in this phase |
| **generation\_notes** | string | Explanation of key decisions (barrier overrides, blend adjustments) |

**21.16 Worked Example — Watchful Deer, Classic, Shielded Turtle tendencies (17%)  \[DET\]**

**User profile:** 77% fit (Classic tier). Primary barrier: lack of time. Goal: muscle gain & strength. Secondary persona: Shielded Turtle (17% \> 15%, so modifications apply).

1. \*\*Phase Configuration:\*\* Watchful Deer base \= 3 phases. Classic \= no adjustment. Shielded Turtle secondary adds: reduce Phase 1 activation-energy cap by 1 (from 2 to 1); add emotional comfort as secondary readiness signal.  
2. \*\*Activation Energy Caps:\*\* Phase 1 \= 1 (adjusted from 2 due to Turtle tendency); Phase 2 \= 3; Phase 3 \= 4\.  
3. \*\*Goal Prioritisation:\*\* muscle\_gain makes Physical Activity the anchor pillar. But Watchful Deer has N \= 6.0 (≥ 5.5), so the Phase 1 density override applies: Mental 35%, Sleep 25%, Nutrition 20%, Physical 20%. Goal-based weighting (Physical 35%) resumes from Phase 2\.  
4. \*\*Barrier Override (lack\_of\_time):\*\* Phase 1 capped to actions under 15 minutes; anchor must be a micro-action (AE ≤ 2, already satisfied by the cap of 1); add a backup/short-version for every structured rec.  
5. \*\*Distribution:\*\* Phase 1 \= 3 daily \+ 3 weekly items (Deer base). Core recs with AE ≤ 1 assigned first: environment changes (phone outside bedroom, lay out workout clothes) \+ passive first\_actions (pick one calming bedtime activity). Phase 2 draws remaining core \+ high-priority supporting; Phase 3 gets remaining supporting \+ optional.  
6. \*\*Readiness Signals:\*\* Phase 1 primary \= consistency (Deer default), secondary \= emotional comfort (Turtle override). Phase 2 primary \= recovery, secondary \= consistency.

**Goal-preference note:** because the goal is muscle gain, DR11 also checks the activity preferences; if no resistance preference is present, FIT037 is surfaced and bridge framing applies — resistance enters in Phase 2 (Watchful Deer is not a disciplined pattern).

**22\. Integrated Plan Page Rendering (Page 9\)  \[HYB\]**

**22.1 Deterministic vs AI split**

| Element | Source type | Notes |
| :---- | :---- | :---- |
| **Page title 'Your N-Week Integrated Plan'** | \[DET\] | From plan\_output.total\_duration\_weeks |
| **Guiding Principles (5 bullets)** | \[TPL\] | Static list (§20.9) |
| **Plan subtitle** | \[AI\] | ≤120 chars; may name persona |
| **Goal framing** | \[AI\] | Within subtitle/rationale |
| **Phase number \+ name \+ duration** | \[DET\] | From plan\_output |
| **Phase intent (user-facing)** | \[AI\] | Rewrite of engine intent, ≤200 chars |
| **Anchor habit / Daily / Weekly rhythm** | \[DET/DATA\] | Verbatim recommendation display\_text |
| **'Ready to Advance When' (user-facing)** | \[AI\] | Translation of engine readiness signal, ≤150 chars |
| **Pillar indicators** | \[DET/DATA\] | From pillar\_distribution |
| **'How This Plan Was Built'** | \[AI\] | plan\_rationale, 60–90w; may expose fit score \+ persona |
| **Disclaimer** | \[TPL\] | Static |

**22.2 Rendering rules**

* Each phase is a distinct visual card with clear separation. Anchor habit is bold/highlighted. Daily and Weekly are two sub-sections within each card.  
* All phases shown; only Phase 1 marked 'Start here'; later phases visually muted with duration estimates. Pillar coverage shown as small colour-coded icons (reuse Pages 7–8 pillar colours).  
* Readiness signal displayed at the bottom of each card in a distinct style (lighter background, italic).

**22.3 Character limits (AI-generated)**

| Element | Max length | Enforcement |
| :---- | :---- | :---- |
| **Plan subtitle** | 120 chars | AI prompt \+ post-validation truncation |
| **Goal framing** | 100 chars | AI prompt \+ truncation |
| **Phase intent (user-facing)** | 200 chars | AI prompt \+ truncation |
| **Readiness signal (user-facing)** | 150 chars | AI prompt \+ truncation |
| **Individual plan note** | 120 chars | AI prompt \+ truncation |
| **Anchor / daily / weekly text** | Per master display\_text | Already enforced upstream |

**22.4 Plan-specific blocklist (in addition to §24)**

* Never user-facing: 'activation energy' → the plan structure already reflects it; 'readiness signal' → 'You'll know you're ready when…'; 'pillar distribution' → 'Your plan covers sleep, nutrition, movement, and mental wellness'; 'phase assignment', 'density weighting'; strength labels.

**22.5 Error handling (Page 9\)**

| Scenario | Behaviour |
| :---- | :---- |
| **AI synthesis call fails** | Render deterministic content only; use engine intent text as fallback for phase descriptions. Log. |
| **AI response contains a blocked term** | Strip and replace with the generic alternative. Log the violation. |
| **AI response exceeds char limit** | Truncate at the nearest sentence boundary; never mid-sentence. |
| **Plan has 0 phases** | Should never happen. Skip the plan page entirely and log a critical error. |
| **A phase has 0 daily items** | Render the card without a 'Daily' sub-section (valid for Shielded Turtle Phase 1). |
| **Anchor habit missing** | Use the highest-scoring item in the phase as the visual anchor. Log the gap. |
| **AI returns invalid JSON** | Retry once with the same prompt; if it fails again, fall back to deterministic-only rendering. |

**23\. API Calls & JSON Schemas (consolidated)**

**9 report AI calls per report** (full prompts in §20): PRIMARY\_PATTERN (1), SECONDARY\_PATTERN (1), WHAT\_YOU\_DONT\_SEE (1), PILLAR\_ACTIONS (4), HIGH\_IMPACT\_PRIORITIES (1), PLAN\_PAGE (1). Each: canonical system prompt (§18.1) \+ section delta; strict-JSON output; per-field length limits; explicit fallback; source rec IDs stored. Token budget ≈ 4,000–6,400 output tokens/report. Calls 4–7 (pillar actions) and the narrative calls may run in parallel; PLAN\_PAGE runs after the plan generator; HIGH\_IMPACT\_PRIORITIES after pillar cluster scores exist.

**24\. Blocklists & Content Guardrails  \[DET\]**

* **Technical trait names:** Conscientiousness, Extraversion, Neuroticism; the words OCEAN, Big Five, facet.  
* **Engine internals:** activation energy, blend ratio, score/scoring, centroid, Euclidean distance, softmax, scoring pipeline/formula, cluster, recommendation master, rec IDs, strength labels (core/supporting/optional/conditional), 'readiness signal', 'pillar distribution', 'density weighting', 'phase assignment'.  
* **Health-jargon:** biohacking, mitochondrial, metabolic adaptation, circadian optimisation, cortisol, macros, glycemic, ketosis, fasted.  
* **Motivational clichés:** "you've got this", "crush your goals", "unleash your potential", "transform your life", "stay positive", "believe in yourself", "no excuses", "push through", "stay disciplined", "stay motivated".  
* **NOT blocked (intentional):** persona/animal names and the numeric fit score — both appear in the approved report.

**25\. Error Handling  \[DET\]**

* **Invalid JSON:** retry once; then deterministic fallback \+ log.  
* **Blocked term in output:** strip/replace \+ log.  
* **Over-length:** truncate at sentence boundary only.  
* **Empty/missing required input:** apply the section FALLBACK; never fabricate.  
* **Persona context empty for matched persona:** fall back to rec column (E).  
* **Plan 0 phases:** critical error, skip Page 9, log. **PI types missing for primary persona:** block report.

**26\. QA & Validation  \[DET\]**

**26.1 Pre-generation gates (block report if failed)**

* All 90 OCEAN items answered · primary \+ secondary persona computed · ≥50 recs scored \>0 (warn if \<50) · all 4 PI types present for the primary persona · 6-persona report-fillability holds (every persona×pillar×type fillable — passes on v1.13).

**26.2 Post-generation checks**

* Word/char count within range (regenerate if outside) · no animal name in deep behavioural prose · no technical trait name anywhere user-facing (incl. radar, cover one-liner) · no blocklist term · no motivational cliché · no duplicate sentence across sections · second-person consistency · every action traces to a rec ID (audit).

**26.3 Emotional-arc verification**

Review the narrative flow: Pride/Recognition (P3) → Deep Understanding (P4) → Nuance (P5) → Revelation (P6) → Confidence (P7) → Excitement (P8) → Direction (P9). If a section breaks the arc (e.g., P6 feels critical instead of revelatory), regenerate with adjusted emphasis.

**27\. Developer Implementation Checklist  \[DET\]**

7. Build user\_profile: persona, secondary, fit\_score/tier, blend, goals\[\], barriers\[\], context\_tags\[\], ocean trait+facet scores, health flags.  
8. Load Master v1.13 (171 rows × 21 cols).  
9. Pre-process: expand grouped goals; run DR09/DR10 (derived barriers); evaluate DR11 (goal-preference).  
10. Filter: health/safety flags \+ DR01–DR08 \+ age gate \+ PI persona match (§13).  
11. Score with the §14 formula and caps (OCEAN reads col T; effort reads col U).  
12. Rank with tie-breakers (§15); cluster (§16).  
13. Resolve persona context for every selected rec (§17).  
14. Run the Plan Generator (§21): config matrix → AE classification (from Effort Level) → phase assignment (R1–R8, caps) → fit-tier/blend/secondary/barrier/goal/density overrides → readiness signals → plan\_output.  
15. Generate report pages: deterministic (1,2,3,10) \+ 9 AI calls (§20) \+ Page-9 hybrid render (§22).  
16. Apply guardrails: blocklist scan, length enforce, JSON validity (retry once), fallbacks, store rec IDs.  
17. Run pre/post validation (§26). Block or regenerate as specified.

**28\. Testing Plan  \[DET\]**

* **Coverage matrix:** 6 personas × 4 fit tiers × 7 goals × key barriers, plus blend \>15% cases. Verify no blocked term appears, every page has content, plan phases match the persona config matrix.  
* **Plan-generator unit tests:** for each persona, assert phase count, durations, AE caps, eligible-type filtering, and readiness-signal assignment match §21.  
* **Overrides:** assert barrier\_lack\_of\_time caps Phase 1 \<15 min; N≥5.5 triggers the density override; secondary \>15% applies the §21.9 modification; goal sets the anchor pillar/density.  
* **Goal-preference:** assert DR11 surfaces FIT037 for muscle/strength goal \+ non-resistance preference, with persona-correct phase placement.  
* **AI guardrails:** assert no persona-context leakage of engine terms; JSON validity; fallback on failure.

**29\. Worked Examples**

**29.1 Plan generator example**

See §21.16 (Watchful Deer, Classic, Shielded Turtle tendencies 17%) — full step-by-step.

**29.2 End-to-end report example (Steadfast Bear, Core)**

PROFILE: primary steadfast\_bear, secondary steady\_elephant (17% \-\> Tendencies), fit 71 \-\> Core.  
OCEAN: O\_low, C high, E low, A mid, N low.  Goals: goal\_energy, goal\_overall\_health.  
Top barrier: barrier\_lack\_of\_knowledge.  Context: work\_desk\_based, time\_15\_30\_min,  
activity\_pref\_strength, time\_of\_day\_morning, sleep\_quality\_average.

* **Engine:** filter (no health flags); score — strength recs (FIT007/008) score high (goal+persona+activity\_pref\_strength); effort-fit modest; OCEAN reads col T.  
* **Plan (§21):** Steadfast Bear → 2 phases; Core tier adds 1 week to Phase 1\. goal\_energy → Sleep & Recovery anchor pillar, density Sleep 35%. N low → no density override. AE cap Phase 1 \= 4 (Moderate). Phase 1 'Deploy Your Full Plan'; Phase 2 'Optimize Without Overreaching'.  
* **Report Page 3:** Quick Profile 'Disciplined & Resilient'; Best Environment 'Balanced structure with flexibility' (persona-derived); Fit Score '71/100 — Core tier'.  
* **Page 4 (PRIMARY\_PATTERN):** narrative in second person; Default-Under-Stress box references 'your low Stress Sensitivity'; Trait Deviation card 'Discipline — lower than typical'; no technical trait/animal name in the boxes.  
* **Page 9 (PLAN\_PAGE):** subtitle 'A phased plan for Steadfast Bear that builds energy with structure first'; plan\_rationale references 'a Core pattern match of 71/100' (permitted here).

**30\. Deterministic vs AI Classification (master table)**

| Component | Class |
| :---- | :---- |
| **Persona phase structure / count / duration / names / intent logic** | \[DET\] |
| **Phase assignment rules R1–R8 / activation-energy caps** | \[DET\] |
| **Readiness-signal logic / barrier overrides / goal prioritisation / density override** | \[DET\] |
| **plan\_output object generation** | \[DET\] |
| **Recommendation filtering / scoring / ranking / clustering** | \[DET\] |
| **Persona context resolution** | \[DET\] |
| **Page rendering structure / phase card layout** | \[DET/DATA\] |
| **Pages 1–3, 10 content** | \[DET/TPL\] |
| **User-facing phase intent rewrite / plan subtitle / goal framing / readiness wording / plan rationale** | \[AI\] |
| **Narrative report sections (Pages 4–8)** | \[AI\] |
| **Goal-persona misalignment reframing** | \[AI rule, on DET structure\] |

AI must never invent new business logic, phases, readiness signals, scoring, or recommendations — it only converts approved deterministic outputs into user-facing language.

**31\. Changelog (what this canonical document incorporates)**

* Master updated 144→166→171 recs; 19→21 cols (added OCEAN Trait Tags col T, Effort Level col U).  
* OCEAN scorer reads col T (trait format), not the facet column — fixes the prior silent 0-score.  
* Exclude column redefined as health/safety \+ derived guardrails (not 'personas to exclude').  
* Secondary-persona scoring bonus blend-scaled (+8/+12/+18) instead of flat \+15.  
* Fit-tier bands updated to 75–100 / 65–74 / 55–64 / below 55 (Core inserted, Leaning narrowed); Adaptive/Emerging deprecated.  
* Shielded Turtle centroid corrected to (2.5, 2.5, 2.0, 3.9, 6.5); max inter-centroid distance recomputed to 7.1099 (Pack Wolf↔Shielded Turtle).  
* Questionnaire v1.3: 8 sections, new tag families (activity\_pref\_\*, time\_of\_day\_\*, caffeine\_\*, support\_self\_directed/social\_\*), re-maps (work/time/meal-control/environment), religious-food tag removed, Derived Rules sheet.  
* Derived rules extended to DR11 (goal-preference); DR09/DR10 derive barrier tags.  
* Goal-preference reconciliation added (map, DR11, phase-bridging, per-persona framing; master FIT037 bridge \+ FIT038–FIT041 anchors; cardio\_endurance category).  
* Report: persona names \+ numeric fit score allowed user-facing; technical OCEAN names remain forbidden; plan is Report Page 9; 'Best Environment' clarified as persona-derived (not CQ09).  
* All AI prompts hardened: explicit inputs, strict JSON, per-field limits, fallbacks, unified blocklist, single canonical system prompt.  
* Activation energy (1–5) reconciled to Effort Level via a fixed map.

**32\. Deprecated / Superseded Logic**

| Deprecated item | Source | Replaced by |
| :---- | :---- | :---- |
| **Master \= 144 recs / 19 columns** | Plan Gen Fwk, Dev Guide | Master v1.13 \= 171 recs / 21 cols (§11) |
| **OCEAN scoring on facet column / O\_low tags absent** | Dev Guide §6.1 | OCEAN Trait Tags col T (§7, §14) |
| **Exclude \= 'personas to exclude'** | Dev Guide §4 | Health/safety flags \+ DR01–DR08 (§11, §13) |
| **Flat secondary \+15** | Dev Guide scoring | Blend-scaled \+8/+12/+18 (§14) |
| **Fit tiers 75/50/25/0 bands** | Dev Guide §3A | 65–74 Core / 55–64 Leaning / \<55 Exploring (§9, §21.8) |
| **Fit names Adaptive / Emerging** | Older drafts | Classic / Core / Leaning / Exploring |
| **Shielded Turtle centroid (…,4.0,6.5)/incomplete; max-dist 7.1421** | Dev Guide / Content Logic | Corrected centroid; max-dist 7.1099 (§8, §9) |
| **food\_religious\_cultural\_restrictions tag** | Questionnaire v1.2 | Removed (§10) |
| **Plan as a standalone artifact / 'Page 10'** | Earlier drafts | Integrated plan \= Report Page 9 (§20.9) |
| **Blanket ban on persona names / fit score user-facing** | Content Logic / Plan Page blocklists | Allowed user-facing (§4.3) — only technical OCEAN names \+ engine internals forbidden |

**33\. Resolved Conflicts Log**

| Conflict | Old | New (adopted) | Reason |
| :---- | :---- | :---- | :---- |
| **Master version/size** | 144/19 (Plan Gen, Dev Guide) | 171/21 (v1.13) | v1.13 is the authoritative data file |
| **OCEAN scoring column** | facet col / O\_low expected but absent | col T trait tags | Only col T fires the scorer |
| **Exclude column meaning** | personas to exclude | health/safety flags | Matches questionnaire CQ20 \+ master data |
| **Secondary persona bonus** | flat \+15 | blend-scaled | Blend should affect selection, not only narrative |
| **Fit-tier bands** | 75/50/25/0 | 75–100/65–74/55–64/\<55 | Plan Gen v1.1 is the most recent decision; drives plan adjustments |
| **Context → AI prompt inputs** | Content Logic passed goals+barriers only; Dev Guide listed context too | Pass selected context for framing; selection stays deterministic | Removes the doc contradiction; keeps no-invention |
| **Page numbering / plan placement** | Plan as Page 10 / standalone | Plan \= Page 9; What Comes Next \= Page 10 | Matches the approved sample report |
| **Persona / fit-score visibility** | blocked user-facing | allowed (branding/feature) | Matches the approved report |
| **Activation energy vs Effort Level** | 1–5 vs 3-level mismatch | Fixed derivation map (§21.4) | Single source of truth |
| **Best Environment** | implied from CQ09 location | persona-derived psychological descriptor | Matches the sample; CQ09 is a separate field |

**34\. Traceability Matrix**

Each final section → its source(s), latest-logic source, disposition, dependent module, consuming output.

| Final section | Source(s) | Latest logic | Disposition | Consumes / feeds |
| :---- | :---- | :---- | :---- | :---- |
| **6 Assessment** | Dev Guide §3 | Dev Guide | Preserved | → Persona, OCEAN scoring |
| **7 OCEAN tagging** | Dev Guide §6.1; corrections | col T fix | Updated | → Scoring §14 |
| **8 Persona / centroids** | Dev Guide §3.3; image | Centroid correction | Updated | → Fit/Plan |
| **9 Fit & blend** | Dev Guide §3A; Plan Gen §6 | Plan Gen v1.1 bands | Merged+Updated | → Plan, Scoring, Report tone |
| **10 Questionnaire** | Questionnaire v1.3 | v1.3 | Preserved | → Tags, Derived rules |
| **11 Master schema** | Dev Guide §4; Master v1.13 | v1.13 | Updated | → Engine, Plan |
| **12 Derived rules** | Questionnaire v1.3; corrections | DR01–DR11 | Updated | → Filter, Scoring |
| **13–17 Engine** | Dev Guide §5–11 | corrections | Updated | → Plan, Report |
| **18 AI principles** | Dev Guide §12; Content Logic §13 | hardened | Updated | → all AI calls |
| **19–20 Report pages** | Content Logic v2.0; sample | sample+corrections | Updated | ← Engine; → user |
| **21 Plan Generator** | Plan Gen Fwk v1.1 (full) | v1.1 \+ reconciliation | Preserved-in-full \+ extended | ← Engine; → Page 9 |
| **22 Plan page render** | Plan Page Guide v1.0 | v1.0 | Preserved | ← plan\_output |
| **24 Blocklist** | Content Logic §14.3; Plan Page §5 | unified | Merged | → guardrails |
| **25–26 Error/QA** | Dev Guide §17; Content Logic §14; Plan Page §9 | merged | Merged | → runtime |

**35\. Source Coverage Audit**

Every source section mapped to its location here. No section omitted except exact duplicates / superseded logic (recorded in §32–33).

**35.1 Integrated Plan Generator Framework v1.1 — full coverage**

| Source section | Here | Status |
| :---- | :---- | :---- |
| **§1.1 Phase Configuration Matrix** | §21.1 | Preserved in full |
| **§2.1–2.6 Phase Intent by Persona (6 tables)** | §21.2.1–21.2.6 | Preserved in full |
| **§3 Distribution algorithm** | §21.3 | Preserved |
| **§3.2 Activation energy classification** | §21.4 | Preserved \+ Effort Level map added |
| **§3.3 Phase Assignment Rules R1–R8** | §21.5 | Preserved in full |
| **§4 Activation Energy Caps** | §21.6 | Preserved in full |
| **§5 Readiness Signal Framework \+ assignment** | §21.7 | Preserved in full |
| **§6 Fit Tier & Blend Adjustments** | §21.8, §9 | Preserved (bands canonical) |
| **§6.1 Secondary Persona Influence** | §21.9 | Preserved in full |
| **§7.1 Barrier Overrides** | §21.10 | Preserved in full |
| **§7.2 Goal Prioritisation** | §21.11 | Preserved in full |
| **§7.3 Phase 1 Density Override** | §21.12 | Preserved in full |
| **§7.4 Goal-Persona Misalignment AI instruction** | §21.13 | Preserved verbatim |
| **§8 Plan Output Specification** | §21.15 | Preserved in full |
| **§9 Worked Example** | §21.16 | Preserved in full |

**35.2 Other sources**

| Source | Here | Status |
| :---- | :---- | :---- |
| **Dev Implementation Guide v2.1 (pipeline, scoring, caps, filtering, ranking, clustering, persona context, PI series, validation)** | §13–18, §26 | Merged \+ updated to v1.13 |
| **Content Logic Guide v2.0 (10-page logic, all prompts, system prompt, blocklist, QA, emotional arc)** | §19–20, §18, §24, §26 | Merged \+ updated (plan→Page 9, labels) |
| **Plan Page Developer Guide v1.0 (layout, blocklist, char limits, error handling, integration)** | §22 | Preserved |
| **Recommendation Master v1.13** | §11 | Authoritative |
| **Contextual Questions & Tags v1.3** | §10, §12 | Authoritative |

**36\. Completeness Checklist**

* Every source document read fully and mapped (§35). ✓  
* Every Integrated Plan phase table included in full — config matrix \+ all 6 persona phase tables (§21.1–21.2). ✓  
* Every activation-energy rule, cap, and R1–R8 assignment rule included (§21.4–21.6). ✓  
* Every readiness-signal category \+ per-persona assignment included (§21.7). ✓  
* Fit-tier, secondary-persona, barrier, goal, and density overrides included in full (§21.8–21.12). ✓  
* Goal-persona misalignment instruction preserved verbatim; goal-preference reconciliation added (§21.13–21.14). ✓  
* plan\_output schema and a worked example included (§21.15–21.16). ✓  
* Every recommendation scoring rule \+ caps included (§14). ✓  
* Every Master v1.13 field defined with use \+ audience (§11). ✓  
* Every report page has a generator, data sources, and (where AI) a full prompt \+ JSON schema \+ fallback (§20). ✓  
* Deterministic vs AI labelled throughout; master classification table (§30). ✓  
* Blocklists, error handling, fallbacks, pre/post validation included (§24–26). ✓  
* Changelog, deprecated logic, resolved conflicts, traceability, source audit included (§31–35). ✓  
* No section reduced to a one-line 'see framework' reference. ✓

**37\. Open Issues Register**

| Issue | Status / decision needed |
| :---- | :---- |
| **Cover one-liner \+ Page-3 radar currently render technical OCEAN names** | Spec mandates user-facing labels (§20.1, §20.3); confirm the rendering change (cosmetic, not logic). |
| **Guidance-only boundary vs light progression cues ('add a small amount of weight every 1–2 weeks') seen in the sample** | Product ruling needed: keep as light guidance, or reword. Spec currently permits modest, optional cues (§2). |
| **Barrier override class names (§21.10) vs questionnaire v1.3 barrier tag names** | Mapping documented (§21.10 note); confirm engine uses the mapping rather than renaming tags. |
| **Effort Level values in the master are a first-pass heuristic** | Human review pass recommended (does not block build). |

No unresolved issue blocks implementation. Everything required to build the engine, plan generator, and report is specified above.