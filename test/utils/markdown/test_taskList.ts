import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { toggleTaskAt, makeTasksInteractive } from "../../../src/utils/markdown/taskList.js";

describe("toggleTaskAt", () => {
  it("toggles unchecked → checked", () => {
    const out = toggleTaskAt("- [ ] one\n- [ ] two\n", 0);
    assert.equal(out, "- [x] one\n- [ ] two\n");
  });

  it("toggles checked → unchecked", () => {
    const out = toggleTaskAt("- [x] done\n", 0);
    assert.equal(out, "- [ ] done\n");
  });

  it("targets the n-th task by index", () => {
    const markdown = "- [ ] zero\n- [x] one\n- [ ] two\n";
    assert.equal(toggleTaskAt(markdown, 1), "- [ ] zero\n- [ ] one\n- [ ] two\n");
    assert.equal(toggleTaskAt(markdown, 2), "- [ ] zero\n- [x] one\n- [x] two\n");
  });

  it("preserves indentation and bullet style", () => {
    const markdown = "  * [ ] indented star\n  + [X] indented plus\n";
    assert.equal(toggleTaskAt(markdown, 0), "  * [x] indented star\n  + [X] indented plus\n");
    assert.equal(toggleTaskAt(markdown, 1), "  * [ ] indented star\n  + [ ] indented plus\n");
  });

  it("preserves trailing content after the marker", () => {
    const markdown = "- [ ] foo **bold** [link](#)\n";
    assert.equal(toggleTaskAt(markdown, 0), "- [x] foo **bold** [link](#)\n");
  });

  it("ignored ordered-list task syntax counts toward the index", () => {
    const markdown = "1. [ ] alpha\n2. [ ] beta\n";
    assert.equal(toggleTaskAt(markdown, 1), "1. [ ] alpha\n2. [x] beta\n");
  });

  it("skips fenced code blocks (``` … ```) — task-looking lines inside don't count", () => {
    const markdown = ["- [ ] real-1", "```", "- [ ] not-a-task", "- [x] also-not", "```", "- [ ] real-2"].join("\n");
    // Index 1 is real-2 (the inside-fence lines are skipped).
    const out = toggleTaskAt(markdown, 1);
    assert.equal(out, ["- [ ] real-1", "```", "- [ ] not-a-task", "- [x] also-not", "```", "- [x] real-2"].join("\n"));
  });

  it("skips tilde-fenced code blocks", () => {
    const markdown = ["- [ ] real-1", "~~~", "- [ ] inside", "~~~", "- [ ] real-2"].join("\n");
    const out = toggleTaskAt(markdown, 1);
    assert.equal(out, ["- [ ] real-1", "~~~", "- [ ] inside", "~~~", "- [x] real-2"].join("\n"));
  });

  it("opener and closer fence markers must use the same character", () => {
    // ``` opens, ~~~ does NOT close it — anything between the ``` and
    // the matching ``` is fenced.
    const markdown = ["```", "- [ ] inside", "~~~", "- [ ] also-inside", "```", "- [ ] outside"].join("\n");
    const out = toggleTaskAt(markdown, 0);
    assert.equal(out, ["```", "- [ ] inside", "~~~", "- [ ] also-inside", "```", "- [x] outside"].join("\n"));
  });

  it("returns null when index is out of range", () => {
    assert.equal(toggleTaskAt("- [ ] only\n", 1), null);
    assert.equal(toggleTaskAt("no tasks here\n", 0), null);
  });

  it("returns null for negative or non-integer indices", () => {
    assert.equal(toggleTaskAt("- [ ] x\n", -1), null);
    assert.equal(toggleTaskAt("- [ ] x\n", 0.5), null);
    assert.equal(toggleTaskAt("- [ ] x\n", Number.NaN), null);
  });

  it("does not modify lines that aren't task list markers", () => {
    const markdown = "- regular bullet\n- [ ] task\n- another bullet\n";
    assert.equal(toggleTaskAt(markdown, 0), "- regular bullet\n- [x] task\n- another bullet\n");
  });

  it("preserves trailing newline / no-trailing-newline shape", () => {
    assert.equal(toggleTaskAt("- [ ] x", 0), "- [x] x");
    assert.equal(toggleTaskAt("- [ ] x\n", 0), "- [x] x\n");
  });
});

describe("makeTasksInteractive", () => {
  it("strips disabled and adds class on an unchecked task", () => {
    const before = '<li><input disabled="" type="checkbox"> Foo</li>';
    const after = '<li><input class="md-task" type="checkbox"> Foo</li>';
    assert.equal(makeTasksInteractive(before), after);
  });

  it("strips disabled and adds class on a checked task", () => {
    const before = '<li><input checked="" disabled="" type="checkbox"> Bar</li>';
    const after = '<li><input checked="" class="md-task" type="checkbox"> Bar</li>';
    assert.equal(makeTasksInteractive(before), after);
  });

  it("transforms multiple tasks in one HTML blob", () => {
    const before = '<ul><li><input disabled="" type="checkbox"> A</li><li><input checked="" disabled="" type="checkbox"> B</li></ul>';
    const after = '<ul><li><input class="md-task" type="checkbox"> A</li><li><input checked="" class="md-task" type="checkbox"> B</li></ul>';
    assert.equal(makeTasksInteractive(before), after);
  });

  it("leaves non-task inputs alone", () => {
    const html = '<input type="text" name="hi">';
    assert.equal(makeTasksInteractive(html), html);
  });

  it("is idempotent on already-transformed HTML", () => {
    const transformed = '<input class="md-task" type="checkbox">';
    assert.equal(makeTasksInteractive(transformed), transformed);
  });
});
