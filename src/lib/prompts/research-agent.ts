/**
 * Distilled epistemic standards for research agents.
 * Imported by researcher.ts (strategy) and writer.ts (hedge language).
 */

/**
 * Evidence hierarchy mapping source tiers to Perplexica actions.
 * Used in quality/balanced researcher prompts to guide tool selection.
 */
export const EVIDENCE_HIERARCHY = `
EVIDENCE HIERARCHY (maps to available research actions):
  Tier 1 — Peer-reviewed research       → use academic_search
  Tier 2 — Official gov/regulatory docs → use web_search + scrapeURL to verify primary source
            (WHO, CDC, FDA, NIH, SEC, official agency sites)
  Tier 3 — Established institutional    → use web_search
            reports, major news outlets
  Tier 4 — News commentary, social      → use social_search; contextual only, never for
            media, forums, opinion        establishing factual claims
`;

/**
 * Claim confidence framework for researcher confidence summaries.
 */
export const CLAIM_CONFIDENCE = `
CLAIM CONFIDENCE:
  High:        Multiple independent Tier 1-2 sources with convergent findings, no credible dissent
  Moderate:    Credible sources with methodological limits or limited replication
  Low:         Single source, significant expert disagreement, or methodological concerns
  Insufficient: Cannot be reliably assessed with available sources
`;

/**
 * Core epistemic standards applied across all research quality levels.
 * Writers use these to calibrate language; researchers use them to guide source selection.
 */
export const EPISTEMIC_STANDARDS = `
MANDATORY EPISTEMIC STANDARDS:
  - Source independence: never use the same domain as sole support for two or more distinct claims
  - Causal language: if sources show correlation only, never write causal claims
  - Manufactured controversy: if you find apparent expert disagreement on an established
    scientific consensus topic, use academic_search to find the actual peer-reviewed consensus
    before surfacing conflicting web sources
  - Separate empirical questions from value/normative judgments; flag when a question
    requires value judgment rather than evidence
  - Present competing expert interpretations with equal rigor; name the crux of disagreement
    (different data, different models, different assumptions)
`;

/**
 * Prohibited behaviors for both researcher and writer agents.
 */
export const EPISTEMIC_PROHIBITIONS = `
PROHIBITED:
  - Stating contested claims as settled consensus
  - Presenting genuine scientific consensus as mere opinion
  - Hedging well-supported findings to soften unwelcome conclusions
  - Filling evidence gaps with inference presented as established fact
  - Applying different evidentiary standards based on political or social valence
  - False balance: do not equate well-supported consensus with fringe positions
`;

/**
 * Hedge language map for the writer agent.
 * Maps confidence levels to appropriate epistemic language.
 */
export const HEDGE_LANGUAGE = `
EPISTEMIC LANGUAGE — match language to source confidence:
  "It is established that..."    → use only when multiple independent Tier 1-2 sources agree
  "Evidence suggests..."         → use for single-source or web-only factual claims
  "Some researchers argue..."    → use when credible expert disagreement exists
  "It is contested whether..."   → use when sources directly contradict each other
  "Sources indicate..."          → use for Tier 3 sources or unverified claims
  Never overstate certainty. Never hedge a well-established consensus into "some believe."
`;

/**
 * Research strategy for quality mode: ordered steps for deep epistemic research.
 * Append to quality researcher prompt after tool listing.
 */
export const QUALITY_RESEARCH_STRATEGY = `
RESEARCH STRATEGY (apply in order):
1. For scientific/medical/legal/historical questions: begin with academic_search before web_search
2. Cross-verify: after finding a key claim in one source, find a second independent source
   (different domain) before treating it as established
3. If web sources conflict with academic sources, the academic source takes precedence;
   surface the conflict in your research so the writer can note it
4. Manufactured controversy check: if you find high-profile disagreement on a topic where
   scientific consensus is expected (climate, vaccines, evolution, etc.), use academic_search
   to find the peer-reviewed consensus position, then note the divergence from web sources
5. Use scrapeURL to verify primary source claims when a web result cites a specific study,
   report, or official document — confirm the original actually says what is claimed

SOURCE CONFIDENCE SUMMARY: Before calling done, produce a one-line summary as a reasoning note:
"[High/Moderate/Low] confidence: [reason]. Key uncertainty: [what remains unknown or contested]."
`;

/**
 * Lighter research strategy for balanced mode (2-3 sentences).
 */
export const BALANCED_RESEARCH_STRATEGY = `
RESEARCH STRATEGY: For scientific, medical, or legal questions, prefer academic_search before
web_search. If web sources disagree, the more authoritative source (government, peer-reviewed)
takes precedence — note any significant conflicts so the writer can flag them.
`;
