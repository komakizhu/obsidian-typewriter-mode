import { expect, test } from "bun:test";
import {
  getRenderedSourceLineStart,
  getTableRenderedRowIndex,
  getVisibleMarkdownLine,
  normalizeReadingText,
} from "@/cm6/reading-line";

test("maps common Markdown source lines to their rendered text", () => {
  expect(getVisibleMarkdownLine("### A **bold** heading", "heading")).toBe(
    "A bold heading"
  );
  expect(getVisibleMarkdownLine("- Read [the note](note.md)", "list")).toBe(
    "Read the note"
  );
  expect(getVisibleMarkdownLine("- [ ] Read the note", "list")).toBe(
    "Read the note"
  );
  expect(getVisibleMarkdownLine("> - [x] Read the note", "blockquote")).toBe(
    "Read the note"
  );
  expect(getVisibleMarkdownLine("> A `short` quote", "blockquote")).toBe(
    "A short quote"
  );
  expect(
    getVisibleMarkdownLine("[[Folder/Note|Visible name]]", "paragraph")
  ).toBe("Visible name");
  expect(getVisibleMarkdownLine("A &amp; B", "paragraph")).toBe("A & B");
  expect(getVisibleMarkdownLine("const value = &amp;", "code")).toBe(
    "const value = &amp;"
  );
  expect(getVisibleMarkdownLine("```ts", "code")).toBeNull();
  expect(getVisibleMarkdownLine("&#x110000;", "paragraph")).toBe("&#x110000;");
});

test("finds the matching occurrence in a multi-line rendered block", () => {
  const source = "foo\nfoo foo\nfoo";
  expect(
    getRenderedSourceLineStart(source, 2, 0, "paragraph", "foo foo foo foo")
  ).toBe(12);
  expect(normalizeReadingText("  First\n line  ")).toBe("First line");
});

test("maps Markdown table source rows to rendered table rows", () => {
  const source = "| A | B |\n| --- | --- |\n| C | D |";
  expect(getTableRenderedRowIndex(source, 0, 0)).toBe(0);
  expect(getTableRenderedRowIndex(source, 1, 0)).toBe(0);
  expect(getTableRenderedRowIndex(source, 2, 0)).toBe(1);
});
