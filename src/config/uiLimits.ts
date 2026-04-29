// UI rendering thresholds for long sessions.
//
// In a long session the canvas can hold dozens of tool results, each
// mounting a heavy plugin (iframe, ECharts, Markdown render). Mounting
// them all eagerly tanks scroll perf and memory. We render only the
// most recent N as full plugin views; everything older shows as a
// 1-line collapsed card the user can click to expand individually,
// or expand in batches via the "show older" button at the top.

/** How many of the newest tool results render as full plugin views
 *  on initial load. Older results show as collapsed cards. Tuned so
 *  a typical scroll session boots fast even with 100+ messages. */
export const INITIAL_VISIBLE_RESULTS = 30;

/** When the user clicks "Show N older", expand this many additional
 *  results into full plugin views, oldest-pending first. */
export const EXPAND_BATCH_SIZE = 50;
