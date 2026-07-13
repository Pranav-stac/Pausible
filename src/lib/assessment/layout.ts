/** Shared max-width shell for assessment + wellness flows (desktop-friendly). */
export const assessmentShellClass =
  "mx-auto w-full max-w-[860px] md:max-w-[980px] lg:max-w-[1100px] xl:max-w-[1200px]";

export const assessmentShellPadClass = "px-5 sm:px-8 lg:px-10 xl:px-12";

/** Set when navigating from completed OCEAN → wellness; clears stale wc_* answers once. */
export const WELLNESS_FRESH_ATTEMPT_KEY = "pausable_wellness_fresh_attempt";
