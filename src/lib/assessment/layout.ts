/** Shared max-width shell for assessment + wellness flows (desktop-friendly). */
export const assessmentShellClass =
  "mx-auto w-full max-w-3xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl";

export const assessmentShellPadClass = "px-4 sm:px-6 lg:px-8";

/** Set when navigating from completed OCEAN → wellness; clears stale wc_* answers once. */
export const WELLNESS_FRESH_ATTEMPT_KEY = "pausable_wellness_fresh_attempt";
