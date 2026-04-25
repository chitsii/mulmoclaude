// GFM task-list helpers for the markdown viewer (#775).
//
// Two pieces, both pure / DOM-free so they can be unit tested:
//
//  - `toggleTaskAt(markdown, taskIndex)` — toggle the n-th `- [ ]` /
//    `- [x]` line in the source. Walks lines and skips fenced code
//    blocks so a literal task-looking line inside ``` ... ``` is not
//    counted, matching what `marked` renders.
//
//  - `makeTasksInteractive(html)` — strip the `disabled=""` attribute
//    that marked puts on rendered task checkboxes and tag them with
//    `class="md-task"` so the click handler can find them via DOM
//    delegation. We post-process the HTML rather than override
//    marked's renderer to avoid mutating the global `marked` instance
//    (which is also used by wiki/View.vue, where this PR doesn't yet
//    enable interactive tasks).

// Matches a GFM task-list marker at the start of a list line.
//   - [ ] foo
//   * [x] bar
//   1. [ ] baz
// Captures: indent, bullet, separator, mark.
const TASK_LINE = /^(\s*)([-*+]|\d+\.)(\s+)\[([ xX])\]/;

// Fenced code block opener/closer. ``` and ~~~ both legal in GFM; the
// closing fence must use the same marker as the opener.
const FENCE_LINE = /^(\s*)(```+|~~~+)/;

// Mutable state for the line walker. Pulled out so the main toggle
// function reads as a flat loop rather than a state-machine swamp.
interface FenceState {
  inFence: boolean;
  marker: string | null;
}

// Update fence state for a single line. Returns true when the line is
// part of a fence (opener, closer, or interior) and should be skipped
// by the task counter.
function stepFence(line: string, state: FenceState): boolean {
  const fenceMatch = line.match(FENCE_LINE);
  if (fenceMatch) {
    const marker = fenceMatch[2];
    if (!state.inFence) {
      state.inFence = true;
      state.marker = marker;
    } else if (state.marker && marker.startsWith(state.marker[0])) {
      // Closing fence must use the same marker character as the
      // opener and be at least as long, per CommonMark.
      state.inFence = false;
      state.marker = null;
    }
    return true;
  }
  return state.inFence;
}

// Apply the [ ]/[x] flip captured by `TASK_LINE` and rebuild the line
// with the rest of the original text intact.
function flipMark(line: string, match: RegExpMatchArray): string {
  const [whole, indent, bullet, sep, mark] = match;
  const flipped = mark === " " ? "x" : " ";
  return `${indent}${bullet}${sep}[${flipped}]` + line.slice(whole.length);
}

/** Toggle the n-th task-list checkbox in `source`. Returns the new
 *  markdown, or `null` if the index is out of range or the matched
 *  line isn't actually a task line (defensive against source/DOM
 *  drift). Indexing matches `marked`'s render order: top-down,
 *  document order, skipping content inside fenced code blocks.
 */
export function toggleTaskAt(source: string, taskIndex: number): string | null {
  if (!Number.isInteger(taskIndex) || taskIndex < 0) return null;
  const lines = source.split("\n");
  const fence: FenceState = { inFence: false, marker: null };
  let counter = 0;

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    if (stepFence(line, fence)) continue;

    const taskMatch = line.match(TASK_LINE);
    if (!taskMatch) continue;

    if (counter === taskIndex) {
      lines[lineIdx] = flipMark(line, taskMatch);
      return lines.join("\n");
    }
    counter++;
  }
  return null;
}

/** Strip `disabled=""` from rendered GFM task checkboxes and tag them
 *  with `class="md-task"` so the viewer's click delegation can find
 *  them. Idempotent — running twice on the same HTML is a no-op on
 *  the second pass (the `disabled` attribute is gone). */
export function makeTasksInteractive(html: string): string {
  // marked v18 default output:
  //   <input disabled="" type="checkbox">         (unchecked)
  //   <input checked="" disabled="" type="checkbox">  (checked)
  // Both end with ` type="checkbox">`. Capture everything between
  // `<input ` and `disabled=""` (typically empty or `checked="" `)
  // and re-emit with `class="md-task"` in disabled's slot.
  return html.replace(/<input ([^>]*)disabled="" type="checkbox">/g, '<input $1class="md-task" type="checkbox">');
}
