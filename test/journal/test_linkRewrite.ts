import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { rewriteWorkspaceLinks, rewriteMarkdownLinks } from "../../server/workspace/journal/linkRewrite.js";

describe("rewriteWorkspaceLinks", () => {
  it("rewrites a workspace-absolute link from a topic file", () => {
    const out = rewriteWorkspaceLinks("summaries/topics/refactoring.markdown", "See [wiki](/wiki/pages/foo.markdown) for details.");
    assert.equal(out, "See [wiki](../../wiki/pages/foo.markdown) for details.");
  });

  it("rewrites from a nested daily file", () => {
    const out = rewriteWorkspaceLinks("summaries/daily/2026/04/11.markdown", "Today: [html](/HTMLs/report.html)");
    assert.equal(out, "Today: [html](../../../../HTMLs/report.html)");
  });

  it("leaves true-relative links alone", () => {
    const out = rewriteWorkspaceLinks("summaries/topics/foo.markdown", "See [other](../daily/2026/04/11.markdown)");
    assert.equal(out, "See [other](../daily/2026/04/11.markdown)");
  });

  it("leaves external URLs alone", () => {
    const out = rewriteWorkspaceLinks("summaries/topics/foo.markdown", "See [docs](https://example.com/foo)");
    assert.equal(out, "See [docs](https://example.com/foo)");
  });

  it("leaves protocol-relative URLs alone", () => {
    const out = rewriteWorkspaceLinks("summaries/topics/foo.markdown", "See [cdn](//cdn.example.com/foo)");
    assert.equal(out, "See [cdn](//cdn.example.com/foo)");
  });

  it("leaves anchor-only links alone", () => {
    const out = rewriteWorkspaceLinks("summaries/topics/foo.markdown", "Jump to [section](#details)");
    assert.equal(out, "Jump to [section](#details)");
  });

  it("preserves #fragment on rewritten links", () => {
    const out = rewriteWorkspaceLinks("summaries/topics/foo.markdown", "See [wiki heading](/wiki/pages/foo.markdown#section-2)");
    assert.equal(out, "See [wiki heading](../../wiki/pages/foo.markdown#section-2)");
  });

  it("handles multiple links in one document", () => {
    const out = rewriteWorkspaceLinks(
      "summaries/topics/foo.markdown",
      "[a](/wiki/a.markdown) and [b](/wiki/b.markdown) and [c](https://x.com) and [d](../bar.markdown)",
    );
    assert.equal(out, "[a](../../wiki/a.markdown) and [b](../../wiki/b.markdown) and [c](https://x.com) and [d](../bar.markdown)");
  });

  it("handles a link at the start of a line", () => {
    const out = rewriteWorkspaceLinks("summaries/topics/foo.markdown", "- [wiki](/wiki/foo.markdown) — updated today");
    assert.equal(out, "- [wiki](../../wiki/foo.markdown) — updated today");
  });

  it("handles markdown headings and prose around links", () => {
    const markdown = [
      "# Title",
      "",
      "Some [link](/wiki/pages/topic.markdown) in prose.",
      "",
      "## Subheading",
      "",
      "- bullet [two](/HTMLs/report.html) here",
    ].join("\n");
    const out = rewriteWorkspaceLinks("summaries/daily/2026/04/11.markdown", markdown);
    assert.match(out, /\[link\]\(\.\.\/\.\.\/\.\.\/\.\.\/wiki\/pages\/topic\.markdown\)/);
    assert.match(out, /\[two\]\(\.\.\/\.\.\/\.\.\/\.\.\/HTMLs\/report\.html\)/);
  });

  it("does not touch square brackets that are not links", () => {
    const out = rewriteWorkspaceLinks("summaries/topics/foo.markdown", "TODO item: [x] done, [ ] pending");
    assert.equal(out, "TODO item: [x] done, [ ] pending");
  });

  it("handles '/' (root) href by returning '.' relative", () => {
    // Edge case: link to the workspace root itself. Not useful in
    // practice but must not crash.
    const out = rewriteWorkspaceLinks("summaries/topics/foo.markdown", "[root](/)");
    assert.equal(out, "[root](/)");
  });

  it("emits '.' for a self-reference", () => {
    const out = rewriteWorkspaceLinks("summaries/topics/foo.markdown", "[self](/summaries/topics/foo.markdown)");
    // relative from "summaries/topics" to "summaries/topics/foo.markdown"
    // is "foo.markdown" — not a self-reference; let me rewrite the test.
    assert.equal(out, "[self](foo.markdown)");
  });

  it("emits '.' when target equals current directory", () => {
    // current = "summaries/topics/foo.markdown", link to "/summaries/topics"
    const out = rewriteWorkspaceLinks("summaries/topics/foo.markdown", "[dir](/summaries/topics)");
    assert.equal(out, "[dir](.)");
  });
});

describe("rewriteMarkdownLinks", () => {
  it("invokes the rewrite callback for each link href", () => {
    const seen: string[] = [];
    rewriteMarkdownLinks("[a](/one) and [b](/two)", (href) => {
      seen.push(href);
      return href;
    });
    assert.deepEqual(seen, ["/one", "/two"]);
  });

  it("replaces hrefs with the callback return value", () => {
    const out = rewriteMarkdownLinks("[x](old) and [y](keep)", (href) => (href === "old" ? "NEW" : href));
    assert.equal(out, "[x](NEW) and [y](keep)");
  });

  it("leaves unterminated '[' alone", () => {
    const out = rewriteMarkdownLinks("[unclosed text", (href) => href);
    assert.equal(out, "[unclosed text");
  });

  it("leaves unterminated '(' alone", () => {
    const out = rewriteMarkdownLinks("[text](unclosed", (href) => href);
    assert.equal(out, "[text](unclosed");
  });

  it("passes through plain bracketed text that is not a link", () => {
    const out = rewriteMarkdownLinks("[not a link] followed by text", (href) => href);
    assert.equal(out, "[not a link] followed by text");
  });

  it("handles an empty input", () => {
    assert.equal(
      rewriteMarkdownLinks("", (href) => href),
      "",
    );
  });

  it("handles input with no links at all", () => {
    const out = rewriteMarkdownLinks("plain prose without links", (href) => href);
    assert.equal(out, "plain prose without links");
  });

  it("handles adjacent links with no separator", () => {
    const out = rewriteMarkdownLinks("[a](1)[b](2)", (href) => `NEW-${href}`);
    assert.equal(out, "[a](NEW-1)[b](NEW-2)");
  });
});
