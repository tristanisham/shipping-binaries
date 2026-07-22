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
