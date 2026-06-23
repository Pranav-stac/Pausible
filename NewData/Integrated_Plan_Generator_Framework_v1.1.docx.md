

**Pausibl**

Internal Framework Document

**Integrated Plan Generator**

Phase Architecture & Distribution Logic

Version 1.1 — June 2026

*This document defines the logic for generating a personalised 8–12 week integrated plan from the recommendation engine output. The plan takes the scored, filtered recommendations from the master (144 recommendations, 4 pillars, 4 strengths) and sequences them into time-bound phases calibrated to the user’s persona, fit tier, barriers, and goals.*

# **Version Changelog**

v1.1 Changes (June 2026):

* Watchful Deer Phase 1 duration changed from “2–3 weeks” to “3 weeks” (default).  
* Watchful Deer and Curious Fox max plan duration extended from 8 to 10 weeks (Phase 2 extended by 2 weeks).  
* Phase names updated to use verb-first format across all personas.  
* Core fit tier (65–74) defined with plan generation adjustments.  
* Phase 1 density override added for high-neuroticism personas (N ≥ 5.5).  
* AI synthesis instruction added for goal-persona misalignment reframing.

# **1\. Core Architecture**

The plan generator operates in three stages: Phase Configuration (how many phases, what duration, how many items), Recommendation Distribution (which recommendations go into which phase), and Signal Generation (when the user advances between phases). Each stage is persona-driven.

## **1.1 Phase Configuration Matrix**

The persona determines the fundamental structure of the plan. Higher conscientiousness allows more items per phase and faster progression. Higher neuroticism requires fewer items and longer stabilisation windows. Extraversion determines whether accountability is social or self-directed.

| Parameter | Shielded Turtle | Watchful Deer | Curious Fox | Pack Wolf | Steadfast Bear | Steady Elephant |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| Phase count | 4 | 3 | 3 | 3 | 2 | 2–3 |
| Daily items / phase | 2 | 3 | 3–4 | 3–4 | 4–5 | 4–5 |
| Weekly items / phase | 2 | 3 | 3–4 | 3–4 | 4–5 | 4 |
| Phase 1 duration | **3–4 weeks** | **3 weeks** | **2 weeks** | 2–3 weeks | 2 weeks | 2 weeks |
| Max plan duration | **12 weeks** | **10 weeks** | **10 weeks** | 8 weeks | 6 weeks | 8 weeks |
| Progression style | Ultra-gradual | Steady-cautious | Variety-driven | Social-layered | Intensity-based | System-completion |
| Anchor habit type | Environmental | Structural | Exploratory | Social | Performance | Process |
| Accountability | Self-only | Written tracker | Novelty-based | Social check-in | Metric-based | System-based |

**UPDATED:** Watchful Deer Phase 1 duration changed from “2–3 weeks” to “3 weeks”. The Deer’s perfectionism-driven paralysis (N=6.0) requires a reliable 3-week window for the readiness signal (“3 sessions/week feels like a default”) to be achievable.

**UPDATED:** Watchful Deer and Curious Fox max plan duration extended from 8 to 10 weeks. The extra 2 weeks are added to Phase 2 — the critical habit-solidification window where low-discipline personas need the most support.

# **2\. Phase Intent by Persona**

Each persona follows a different emotional and behavioural arc across their phases. The phase names and intents are not cosmetic — they drive which recommendation types are eligible for each phase and how the readiness signal is framed.

## **2.1 Shielded Turtle — 4 Phases**

High neuroticism (6.5), low conscientiousness (2.5), low extraversion (2.0). Brittle, avoidant, needs maximum safety before any action.

| Phase | Name | Intent | Eligible Types | Readiness Signal |
| :---- | :---- | :---- | :---- | :---- |
| 1 (Wk 1–4) | Create Safety | Environment setup only. No exercise, no diet changes. Just make the space feel manageable. | environment\_change, first\_action | When the environment changes feel normal, not effortful. |
| 2 (Wk 5–7) | Try Without Pressure | Micro-movement and one nutrition anchor. No tracking, no targets. Just exposure. | first\_action, do (low-activation only) | When attempting a small action no longer triggers avoidance. |
| 3 (Wk 8–10) | Build a Rhythm | Establish 2–3 day/week structure. Introduce written cues (not tracking). | do, dont, mindset\_shift | When a missed day triggers a restart, not a shutdown. |
| 4 (Wk 11–12) | **Expand at Your Pace** | Add supporting recommendations. Introduce gentle self-monitoring. | do, recovery\_rule, success\_condition | When adjusting the plan feels possible, not threatening. |

**UPDATED:** Phase names updated to verb-first format: “Creating Safety” → “Create Safety”, “Trying Without Pressure” → “Try Without Pressure”, “Building a Rhythm” → “Build a Rhythm”, “Quiet Expansion” → “Expand at Your Pace”.

## **2.2 Watchful Deer — 3 Phases**

High neuroticism (6.0), low conscientiousness (2.8), low extraversion (2.8). Self-aware but prone to perfectionism-driven paralysis.

| Phase | Name | Intent | Eligible Types | Readiness Signal |
| :---- | :---- | :---- | :---- | :---- |
| 1 (Wk 1–3) | Build the Floor | Minimum viable routine. Prove consistency is possible. Backup systems for missed days. | first\_action, do, environment\_change | When 3 sessions/week feels like a default, not a decision. |
| **2 (Wk 4–8)** | Find Your Rhythm | Extend duration, add structure. The nervous system now trusts the routine. | do, dont, recovery\_rule | When a missed session triggers a backup, not a full stop. |
| 3 (Wk 9–10) | Expand Your Range | Add personalisation, fine-tuning, and self-monitoring. Foundation is solid. | do, mindset\_shift, success\_condition, strength\_insight | When you adjust the plan instead of abandoning it. |

**UPDATED:** Phase 1 duration fixed at 3 weeks (was 2–3). Phase 2 extended from Wk 4–6 to Wk 4–8 (+2 weeks). Phase 3 shifted to Wk 9–10. Total plan duration: 10 weeks.

## **2.3 Curious Fox — 3 Phases**

High openness (6.5), low conscientiousness (2.5), moderate extraversion (5.5). Enthusiastic starter, struggles with repetition and follow-through.

| Phase | Name | Intent | Eligible Types | Readiness Signal |
| :---- | :---- | :---- | :---- | :---- |
| 1 (Wk 1–2) | **Explore What Works** | Frame the entire plan as an exploration. Offer 2–3 options per slot to satisfy novelty needs. | first\_action, do, environment\_change | When you have completed at least one full week without switching everything. |
| **2 (Wk 3–7)** | Find What Sticks | Narrow to what worked in Phase 1\. Introduce structure without killing variety. | do, dont, mindset\_shift | When you can name your 3 anchor habits without hesitation. |
| **3 (Wk 8–10)** | Make It Yours | Lock the core, experiment at the edges. Add progression and optional items for depth. | do, recovery\_rule, success\_condition, strength\_insight | When boredom no longer means abandonment. |

**UPDATED:** Phase name “The Experiment” → “Explore What Works” (verb-first). Phase 2 extended from Wk 3–5 to Wk 3–7 (+2 weeks). Phase 3 shifted to Wk 8–10. Total plan duration: 10 weeks.

## **2.4 Pack Wolf — 3 Phases**

High extraversion (6.5), high agreeableness (6.0), moderate conscientiousness (5.2). Socially motivated, performs well with group accountability.

| Phase | Name | Intent | Eligible Types | Readiness Signal |
| :---- | :---- | :---- | :---- | :---- |
| 1 (Wk 1–3) | Find Your Pack | Establish social anchors — workout partners, meal prep groups, accountability buddies. | first\_action, do, environment\_change | When at least one social accountability loop is active. |
| 2 (Wk 4–6) | Run Together | Build group rhythm. Structure sessions, shared meals, social check-ins. | do, dont, recovery\_rule | When the social structure sustains without you initiating every time. |
| 3 (Wk 7–8) | Stand Alone When Needed | Build independence within the social frame. Solo backup routines for when the group is unavailable. | do, mindset\_shift, success\_condition, strength\_insight | When a solo week doesn’t collapse the routine. |

## **2.5 Steadfast Bear — 2 Phases**

High conscientiousness (5.8), low neuroticism (2.0), low extraversion (3.0). Disciplined, resilient, low anxiety. Needs structure and measurable progression.

| Phase | Name | Intent | Eligible Types | Readiness Signal |
| :---- | :---- | :---- | :---- | :---- |
| 1 (Wk 1–3) | **Deploy Your Full Plan** | Load the complete structured plan upfront: 3–4 day training split, meal structure, sleep protocol. | do, dont, environment\_change, first\_action, recovery\_rule | When all 4 pillars have been followed for 2 consecutive weeks. |
| 2 (Wk 4–6) | **Optimize Without Overreaching** | Add progressive overload, fine-tune nutrition timing, introduce blind spots and pattern predictions. | mindset\_shift, blind\_spot, pattern\_prediction, success\_condition, strength\_insight | When recovery is treated as part of performance, not a weakness. |

**UPDATED:** Phase names updated: “Full Deployment” → “Deploy Your Full Plan”, “Optimisation & Overreach Guard” → “Optimize Without Overreaching”.

## **2.6 Steady Elephant — 2–3 Phases**

High conscientiousness (6.5), low neuroticism (1.5), moderate across others. Self-regulated planner who wants a complete system and will execute methodically.

| Phase | Name | Intent | Eligible Types | Readiness Signal |
| :---- | :---- | :---- | :---- | :---- |
| 1 (Wk 1–3) | Lay the System | Present the full architecture: all 4 pillars, structured routines, tracking system. | do, dont, environment\_change, first\_action | When all systems are set up and running for 2 weeks. |
| 2 (Wk 4–6) | Run the System | Maintain, adjust, refine. Add supporting and optional items as enhancements. | do, recovery\_rule, mindset\_shift, success\_condition | When adjustments happen proactively, not reactively. |
| 3 (Wk 7–8, optional) | **Optimize Your System** | Only triggered if goals are not yet met. Fine-tune nutrition timing, progressive overload, advanced recovery. | strength\_insight, blind\_spot, pattern\_prediction | When the system is producing measurable results. |

**UPDATED:** Phase 3 name updated: “System Optimisation” → “Optimize Your System”.

# **3\. Recommendation Distribution Algorithm**

After the phase structure is determined, the engine distributes the user’s scored recommendations into the appropriate phases. This is a 5-step process.

## **3.1 Step 1 — Score and Filter**

The existing recommendation engine scores all 144 recommendations using persona fit, context fit, goal fit, barrier fit, and OCEAN tag matching. Recommendations that don’t pass the minimum threshold or hit an exclude\_if condition are dropped. The surviving set (typically 40–70 recommendations) becomes the input to the plan generator.

## **3.2 Step 2 — Classify by Activation Energy**

Each recommendation receives an activation\_energy score (1–5) based on how much effort, willpower, or environmental change it requires.

| Activation Energy | Score | Types / Categories | Example |
| :---- | :---- | :---- | :---- |
| Passive | 1 | environment\_change, first\_action (environment) | Charge phone outside bedroom |
| Micro | 2 | first\_action (behaviour), do (single-action) | Stand up for 5 min after lunch |
| Low | 3 | do (routine), dont (removal) | Eat at regular times on weekdays |
| Moderate | 4 | do (structured), mindset\_shift, recovery\_rule | Follow a 3-day lifting plan |
| High | 5 | do (complex), success\_condition, strength\_insight | Track progressive overload weekly |

## **3.3 Step 3 — Phase Assignment Rules**

Recommendations are assigned to phases using a priority queue. The algorithm walks through phases sequentially, filling each phase up to its capacity.

| Rule | Logic | Rationale |
| :---- | :---- | :---- |
| R1 | Phase 1 draws from core first, then supporting. Phase 2 draws remaining core \+ supporting. Later phases get optional and conditional. | Core recommendations are foundational and should be established earliest. |
| R2 | Each phase has a max activation energy determined by persona. Phase 1 for Shielded Turtle caps at 1\. Phase 1 for Steadfast Bear caps at 4\. | Prevents overloading early phases for sensitive personas. |
| R3 | Each phase must include at least 1 recommendation from each pillar. | Prevents plans that are exercise-heavy-but-sleep-absent. |
| R4 | Each phase has eligible recommendation types (see Section 2). Non-eligible types are pushed to later phases. | Aligns recommendation type with the emotional arc of the phase. |
| R5 | The highest-scoring core recommendation with matching activation energy becomes the anchor habit. One anchor per phase. | Gives the user a single focal point per phase. |
| R6 | Conditional recommendations are attached to the phase where their trigger context is most relevant. | Prevents irrelevant recommendations from consuming phase capacity. |
| R7 | dont recommendations are paired with the do recommendation they complement, placed in the same phase. | A ‘stop doing X’ only makes sense when the ‘start doing Y’ is active. |
| R8 | If a phase is full but high-priority recommendations remain, extend by 1 item (max once per phase). | Prevents important recommendations from being buried in Phase 3\. |

# **4\. Activation Energy Caps by Persona × Phase**

This matrix determines the maximum activation energy score a recommendation can have to be eligible for a given phase. This is the primary mechanism that controls pacing.

| Persona | Phase 1 | Phase 2 | Phase 3 | Phase 4 |
| :---- | :---- | :---- | :---- | :---- |
| Shielded Turtle | 1 (Passive) | 2 (Micro) | 3 (Low) | 4 (Moderate) |
| Watchful Deer | 2 (Micro) | 3 (Low) | 4 (Moderate) | — |
| Curious Fox | 3 (Low) | 4 (Moderate) | 5 (High) | — |
| Pack Wolf | 3 (Low) | 4 (Moderate) | 5 (High) | — |
| Steadfast Bear | 4 (Moderate) | 5 (High) | — | — |
| Steady Elephant | 4 (Moderate) | 5 (High) | 5 (High) | — |

The activation energy cap is further adjusted by fit tier. A Leaning fit shifts the cap down by 1 in Phase 1 only. An Exploring fit shifts down by 1 across all phases.

# **5\. Readiness Signal Framework**

The plan does not advance on fixed dates. Instead, each phase has readiness signals — behavioural indicators that the user has absorbed the current phase and is ready for the next one. The approximate durations are guidance for the user, not hard deadlines.

## **5.1 Signal Categories**

| Signal Type | Description | Best For |
| :---- | :---- | :---- |
| Consistency signal | The user has completed the phase’s anchor habit X times in Y weeks without external prompting. | Watchful Deer, Steady Elephant, Steadfast Bear |
| Emotional comfort signal | The phase’s actions no longer feel effortful or anxiety-producing. | Shielded Turtle, Watchful Deer |
| Recovery signal | A disruption did NOT collapse the routine. The user recovered within 48 hours. | Watchful Deer, Curious Fox, Shielded Turtle |
| Social embedding signal | The accountability structure runs without the user initiating every interaction. | Pack Wolf |
| Performance signal | A measurable metric has improved: weight lifted, sleep duration, meal consistency rate. | Steadfast Bear, Steady Elephant |
| Engagement signal | The user is still following the plan without having switched to something entirely new. | Curious Fox |

## **5.2 Signal Assignment Logic**

Each persona gets a primary and secondary signal type per phase. The primary signal is the gate — if not met, the user does not advance.

| Persona | Phase 1 Primary | Phase 1 Secondary | Phase 2+ Primary | Phase 2+ Secondary |
| :---- | :---- | :---- | :---- | :---- |
| Shielded Turtle | Emotional comfort | Consistency | Emotional comfort | Recovery |
| Watchful Deer | Consistency | Emotional comfort | Recovery | Consistency |
| Curious Fox | Engagement | Consistency | Consistency | Engagement |
| Pack Wolf | Social embedding | Consistency | Social embedding | Recovery |
| Steadfast Bear | Consistency | Performance | Performance | Consistency |
| Steady Elephant | Consistency | Performance | Performance | Consistency |

# **6\. Fit Tier & Blend Adjustments**

The user’s fit tier (Classic, Core, Leaning, Exploring) and secondary persona tendencies modify the plan in specific ways. This ensures the plan accounts for behavioural blending.

| Fit Tier | Fit Score | Phase Adjustment | Item Adjustment | Signal Adjustment |
| :---- | :---- | :---- | :---- | :---- |
| Classic | 75–100 | No change | No change | No change |
| **Core** | **65–74** | **Add 1 week to Phase 1 estimate** | **No change** | **No change** |
| Leaning | 55–64 | Add 1 week to Phase 1 estimate | Reduce Phase 1 daily items by 1 | Activation energy cap −1 in Phase 1 only |
| Exploring | Below 55 | Add 1 phase (max 4 total). Add 1–2 weeks to Phase 1 | Reduce all phase items by 1\. Cap at 3 daily/phase | Activation energy cap −1 all phases. Emotional comfort secondary in all phases |

**NEW:** Core tier (65–74) defined. Provides a smooth gradient between Classic and Leaning. Previously, a user at 74% received no adjustments while 73% triggered significant changes. Core adds a 1-week Phase 1 buffer without reducing item count or activation energy.

**UPDATED:** Leaning tier range narrowed from 55–74 to 55–64 to accommodate Core tier insertion.

## **6.1 Secondary Persona Influence**

When a secondary persona contributes more than 15% to the blend, its traits modify the plan within specific rules:

| Secondary Persona | Modification When Present (\>15%) | Applied To |
| :---- | :---- | :---- |
| Shielded Turtle | Reduce Phase 1 activation energy cap by 1\. Add emotional comfort as secondary readiness signal. | All primary personas |
| Curious Fox | Add 1 optional/variety item per phase. Allow anchor habit rotation (2 options instead of 1). | All primary personas |
| Pack Wolf | Add 1 social accountability item in Phase 2+. Add social embedding as secondary signal. | All except Pack Wolf |
| Steadfast Bear | Allow Phase 1 to load 1 additional structured item beyond the cap. | All except Steadfast Bear |
| Watchful Deer | Add recovery signal as secondary in Phase 1\. Add 1 backup/fallback recommendation per phase. | All primary personas |
| Steady Elephant | Present the full plan overview upfront (even if only Phase 1 is active). Add tracking earlier. | All except Steady Elephant |

# **7\. Barrier & Goal Modifiers**

The user’s self-reported barriers and goals further adjust the plan. These operate as overrides on top of the persona-based structure.

## **7.1 Barrier Overrides**

| Barrier | Override Effect |
| :---- | :---- |
| barrier\_lack\_of\_time | Cap all Phase 1 recommendations to actions under 15 minutes. Anchor must be a micro-action (AE ≤ 2). Add backup/short-version for every structured recommendation. |
| barrier\_poor\_sleep | Promote sleep pillar recommendations to Phase 1 regardless of activation energy. Sleep becomes anchor pillar for Phase 1\. |
| barrier\_emotional\_eating | Include at least 1 emotional\_eating category recommendation in Phase 1\. Pair every nutrition do with its corresponding dont. |
| barrier\_inconsistency | Add recovery\_rule recommendations to Phase 1 instead of Phase 2+. Every phase must include at least 1 fallback/backup. |
| barrier\_starting\_difficulty | Phase 1 anchor must be a first\_action type, not a do. Cap Phase 1 at activation energy 1–2 regardless of persona. |
| barrier\_perfectionism | Include at least 1 mindset\_shift in Phase 1 (exception to type eligibility). Frame readiness signals around ‘good enough’ rather than ‘complete’. |
| barrier\_overwhelm | Reduce Phase 1 items by 1 across daily and weekly. Never show the full plan upfront (override Steady Elephant default). |

## **7.2 Goal Prioritisation**

The user’s primary goal determines which pillar gets anchor priority in Phase 1 and receives the highest recommendation density across phases.

| Goal | Anchor Pillar | Phase 1 Focus | Density Weighting |
| :---- | :---- | :---- | :---- |
| goal\_fat\_loss | Nutrition | Meal timing \+ food environment | Nutrition 35%, Physical 30%, Sleep 20%, Mental 15% |
| goal\_energy | Sleep & Recovery | Sleep duration \+ wind-down | Sleep 35%, Nutrition 25%, Physical 25%, Mental 15% |
| goal\_consistency | Mental Wellness | Motivation \+ behaviour change | Mental 30%, Physical 30%, Nutrition 20%, Sleep 20% |
| goal\_muscle\_gain | Physical Activity | Strength training \+ protein | Physical 35%, Nutrition 30%, Sleep 20%, Mental 15% |
| goal\_stress\_reduction | Mental Wellness | Stress management \+ mindfulness | Mental 35%, Sleep 25%, Physical 20%, Nutrition 20% |
| goal\_better\_recovery | Sleep & Recovery | Sleep \+ recovery protocols | Sleep 35%, Physical 25%, Nutrition 20%, Mental 20% |
| goal\_sustainable\_routine | Mental Wellness | Consistency psychology \+ first actions | Mental 30%, Physical 25%, Nutrition 25%, Sleep 20% |

## **7.3 Phase 1 Density Override for High-Neuroticism Personas**

**NEW:** When the primary persona has Neuroticism ≥ 5.5 (Shielded Turtle, Watchful Deer), the goal-based density weighting from Section 7.2 is overridden in Phase 1 only. Phase 1 uses a fixed distribution that prioritises emotional safety:

| Mental Wellness | Sleep & Recovery | Nutrition | Physical Activity |
| :---- | :---- | :---- | :---- |
| 35% | 25% | 20% | 20% |

The user’s goal-based weighting resumes from Phase 2 onwards, where the persona has sufficient emotional capacity to engage with goal-specific actions.

*Rationale: A Shielded Turtle with goal\_muscle\_gain would otherwise receive 35% physical activity recommendations in Phase 1 — but at activation energy cap 1, these are only environment changes. Meanwhile, Mental Wellness (the Turtle’s most critical Phase 1 need) would receive only 15%. The override ensures Phase 1 always serves the persona’s primary psychological need.*

## **7.4 AI Synthesis Instruction for Goal-Persona Misalignment**

**NEW:** When the user’s stated goals suggest high-intensity or aggressive timelines that are misaligned with their behavioural pattern, the AI synthesis prompt must include the following instruction:

*If the user’s stated goals imply intensity or timelines that are misaligned with their behavioural pattern, acknowledge the goal positively and frame the plan as building toward it in stages. Example: “Your goal of muscle gain is achievable with your pattern — your plan builds the foundation first, so that when structured training begins in Phase 2, it sticks.” Never reject or label a goal as unrealistic.*

This ensures the user never feels their goal was dismissed, while the plan structure (activation energy caps, phase types, density overrides) ensures the actual actions remain behaviourally realistic.

# **8\. Plan Output Specification**

The final plan object generated by the engine contains the following structure, which is consumed by the report generator and coaching system.

| Field | Type | Description |
| :---- | :---- | :---- |
| plan\_id | string | Unique plan identifier linked to report ID |
| persona | string | Primary persona used for phase configuration |
| fit\_tier | string | Classic / Core / Leaning / Exploring |
| secondary\_persona | string | null | Secondary persona if blend \> 15% |
| total\_phases | integer | Number of phases (2–4) |
| phases\[\] | array | Ordered array of phase objects |
| phases\[\].phase\_number | integer | 1-indexed phase number |
| phases\[\].name | string | Phase name (e.g., ‘Build the Floor’) |
| phases\[\].intent | string | 1–2 sentence description of phase purpose |
| phases\[\].approx\_duration\_weeks | string | Estimated duration range (e.g., ‘2–3 weeks’) |
| phases\[\].anchor\_habit | object | Single anchor recommendation for the phase |
| phases\[\].daily\_rhythm\[\] | array | Daily recommendations (IDs \+ display text) |
| phases\[\].weekly\_rhythm\[\] | array | Weekly recommendations (IDs \+ display text) |
| phases\[\].readiness\_signal | object | Primary signal type \+ description \+ secondary signal |
| phases\[\].activation\_energy\_cap | integer | Max activation energy for this phase (1–5) |
| phases\[\].pillar\_distribution | object | Count of items per pillar in this phase |
| generation\_notes | string | Explanation of key decisions (barrier overrides, blend adjustments) |

# **9\. Example: Watchful Deer, Classic, Shielded Turtle Tendencies (17%)**

User profile: 77% fit, Classic tier. Primary barrier: lack of time. Goal: muscle gain and strength. Secondary persona: Shielded Turtle (17% \> 15% threshold, so modifications apply).

**Step 1 — Phase Configuration: Watchful Deer base \= 3 phases. Classic tier \= no adjustment. Shielded Turtle secondary adds: reduce Phase 1 activation energy cap by 1 (from 2 to 1), add emotional comfort as secondary readiness signal.**

**Step 2 — Activation Energy Caps: Phase 1 \= 1 (adjusted from 2 due to Turtle tendency). Phase 2 \= 3\. Phase 3 \= 4\.**

**Step 3 — Goal Prioritisation: muscle\_gain makes Physical Activity the anchor pillar. However, because Watchful Deer has N \= 6.0 (≥ 5.5), Phase 1 density override applies: Mental 35%, Sleep 25%, Nutrition 20%, Physical 20%. Goal-based weighting (Physical 35%) resumes from Phase 2\.**

**Step 4 — Barrier Override: lack\_of\_time caps Phase 1 to actions under 15 minutes, anchor must be micro-action (AE ≤ 2, already satisfied by cap of 1). Adds backup/short-version for every structured recommendation.**

**Step 5 — Distribution: Phase 1 gets 3 daily \+ 3 weekly items (Watchful Deer base). Core recommendations with AE ≤ 1 are assigned first: environment changes (phone outside bedroom, lay out workout clothes) and passive first\_actions (pick one calming bedtime activity). Phase 2 draws remaining core \+ high-priority supporting. Phase 3 gets remaining supporting \+ optional items.**

**Step 6 — Readiness Signals: Phase 1 primary \= consistency (Watchful Deer default), secondary \= emotional comfort (Shielded Turtle override). Phase 2 primary \= recovery, secondary \= consistency.**

**UPDATED:** Phase 1 density override now applies to this example. The user’s muscle gain goal influences Phase 2+ distribution but does not dominate Phase 1 for this high-neuroticism persona.

*Pausibl · Integrated Plan Generator Framework · v1.1 · Internal Document · June 2026*