import { describe, expect, test } from "bun:test";
import { getEditorFilePath } from "@/cm6/editor-identity";
import { normalizeSelectionRange } from "@/cm6/selection-utils";
import { isMarkdownTableBlock } from "@/cm6/table-detection";
import { inspectTransactionState } from "@/cm6/transaction-state";

describe("editor identity", () => {
  test("reads the file from the editor-owned info", () => {
    const info = { file: { path: "notes/a.md" } };

    expect(getEditorFilePath(info)).toBe("notes/a.md");
  });

  test("does not invent a file when the editor has no file", () => {
    expect(getEditorFilePath(undefined)).toBeNull();
    expect(getEditorFilePath({ file: null })).toBeNull();
  });
});

describe("saved cursor selection", () => {
  test("rejects malformed positions and clamps shortened documents", () => {
    expect(normalizeSelectionRange({ anchor: 4.5, head: 2 }, 10)).toBeNull();
    expect(normalizeSelectionRange({ anchor: -2, head: 20 }, 10)).toEqual({
      anchor: 0,
      head: 10,
    });
  });
});

describe("markdown table detection", () => {
  test("keeps ordinary wrapped prose eligible for highlighting", () => {
    expect(
      isMarkdownTableBlock(
        ["A long paragraph that wraps visually but has no table syntax."],
        1
      )
    ).toBe(false);
  });

  test("rejects an incomplete table without throwing", () => {
    expect(isMarkdownTableBlock(["| Name | Value |"], 1)).toBe(false);
  });

  test("recognizes a contiguous table body", () => {
    expect(
      isMarkdownTableBlock(
        ["| Name | Value |", "| --- | --- |", "| A | B |"],
        3
      )
    ).toBe(true);
  });

  test("does not recognize table-looking text inside a fenced code block", () => {
    expect(
      isMarkdownTableBlock(
        ["```md", "| Name | Value |", "| --- | --- |", "```"],
        3
      )
    ).toBe(false);
  });

  test("does not recognize table-looking text inside an indented code block", () => {
    expect(
      isMarkdownTableBlock(
        ["    | Name | Value |", "    | --- | --- |", "    | A | B |"],
        3
      )
    ).toBe(false);
  });
});

describe("transaction inspection", () => {
  test("preserves reconfiguration when input is in the same update", () => {
    expect(
      inspectTransactionState(
        [{ reconfigured: true }, { userEvent: "input.type" }],
        () => true
      )
    ).toEqual({
      isReconfigured: true,
      isUserEvent: true,
      allowedUserEvents: true,
    });
  });
});
