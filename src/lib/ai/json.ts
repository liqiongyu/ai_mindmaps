export function parseFirstJsonObject(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Empty model output");
  }

  const unfenced = stripCodeFences(trimmed);

  try {
    return JSON.parse(unfenced);
  } catch {
    // Fall through to substring extraction.
  }

  const start = unfenced.indexOf("{");
  const end = unfenced.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Could not find a JSON object in model output");
  }

  const candidate = unfenced.slice(start, end + 1);
  return JSON.parse(candidate);
}

function stripCodeFences(value: string): string {
  if (!value.startsWith("```")) return value;
  return value.replace(/^```[a-zA-Z]*\s*/, "").replace(/\s*```$/, "");
}
