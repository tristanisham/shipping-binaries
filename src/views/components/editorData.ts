export type EditorData = {
  blocks: unknown[];
  time?: number;
  version?: string;
};

// Parses a stored post body as Editor.js output. Returns null for legacy
// bodies, which are plain text rather than Editor.js JSON.
export const parseEditorData = (value: string): EditorData | null => {
  try {
    const parsed = JSON.parse(value) as unknown;

    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "blocks" in parsed &&
      Array.isArray(parsed.blocks)
    ) {
      return parsed as EditorData;
    }
  } catch {
    // Not Editor.js data; fall through to null.
  }

  return null;
};

// Returns true when an Editor.js body has at least one block whose text is
// non-empty once HTML tags and &nbsp; are stripped. Legacy plain-text bodies
// (parseEditorData returns null) count as empty.
export const editorDataHasText = (value: string): boolean => {
  const data = parseEditorData(value);
  if (!data) return false;

  return data.blocks.some((block) => {
    if (typeof block !== "object" || block === null || !("data" in block)) {
      return false;
    }

    const blockData = block.data;
    if (typeof blockData !== "object" || blockData === null) return false;

    const text = "text" in blockData && typeof blockData.text === "string"
      ? blockData.text
      : "";
    return text
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/gi, " ")
      .trim()
      .length > 0;
  });
};
