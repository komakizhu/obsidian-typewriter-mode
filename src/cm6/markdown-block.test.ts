import { describe, expect, test } from "bun:test";
import { getMarkdownBlockAtLine, sectionMatchesBlock } from "./markdown-block";

describe("reading-mode markdown block mapping", () => {
  test("uses the source line to distinguish repeated paragraphs", () => {
    const source = "same text\n\nother text\n\nsame text";
    const first = getMarkdownBlockAtLine(source, 0);
    const second = getMarkdownBlockAtLine(source, 4);
    expect(first).toEqual({ kind: "paragraph", startLine: 0, endLine: 1 });
    expect(second).toEqual({ kind: "paragraph", startLine: 4, endLine: 5 });
    expect(sectionMatchesBlock({ lineStart: 4, lineEnd: 5 }, second)).toBe(
      true
    );
    expect(sectionMatchesBlock({ lineStart: 0, lineEnd: 1 }, second)).toBe(
      false
    );
  });

  test("groups soft-wrapped source lines into one paragraph", () => {
    expect(
      getMarkdownBlockAtLine("first line\nsecond line\n\nnext", 1)
    ).toEqual({
      kind: "paragraph",
      startLine: 0,
      endLine: 2,
    });
  });

  test("uses the outer list range for nested items", () => {
    expect(
      getMarkdownBlockAtLine("- outer\n  - inner\n  - second\n- next", 1)
    ).toEqual({
      kind: "list",
      startLine: 0,
      endLine: 4,
    });
  });

  test("groups a multi-paragraph quote as one block", () => {
    expect(getMarkdownBlockAtLine("> first\n>\n> second", 2)).toEqual({
      kind: "blockquote",
      startLine: 0,
      endLine: 3,
    });
  });

  test("groups all rows of a table", () => {
    expect(
      getMarkdownBlockAtLine("| A | B |\n| --- | --- |\n| 1 | 2 |", 2)
    ).toEqual({ kind: "table", startLine: 0, endLine: 3 });
  });

  test("maps headings and fenced code blocks", () => {
    expect(getMarkdownBlockAtLine("# Heading\n\ntext", 0)).toEqual({
      kind: "heading",
      startLine: 0,
      endLine: 1,
    });
    expect(getMarkdownBlockAtLine("```ts\nconst x = 1;\n```", 1)).toEqual({
      kind: "code",
      startLine: 0,
      endLine: 3,
    });
  });

  test("does not map blank lines, frontmatter, or embeds", () => {
    const source = "---\ntitle: note\n---\n\n![[other note]]";
    expect(getMarkdownBlockAtLine(source, 1)).toBeNull();
    expect(getMarkdownBlockAtLine(source, 3)).toBeNull();
    expect(getMarkdownBlockAtLine(source, 4)).toBeNull();
  });

  test("rejects missing or stale section ranges", () => {
    const block = getMarkdownBlockAtLine("paragraph", 0);
    expect(sectionMatchesBlock(null, block)).toBe(false);
    expect(sectionMatchesBlock({ lineStart: 1, lineEnd: 2 }, block)).toBe(
      false
    );
    expect(sectionMatchesBlock({ lineStart: 0, lineEnd: 20 }, block)).toBe(
      false
    );
  });
});
