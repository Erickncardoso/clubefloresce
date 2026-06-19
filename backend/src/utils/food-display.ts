const TBCA_DISPLAY_NOISE = /^(in\s+natura|brasil|m[eé]dia.*|variedades?.*)$/i;

/** Nome curto para UI — remove boilerplate TBCA (in natura, Brasil, etc.). */
export function formatFoodDisplayName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "";

  const withoutNotes = trimmed.replace(/\s*\([^)]*\)\s*/g, " ").trim();

  if (withoutNotes.includes(",")) {
    const parts = withoutNotes
      .split(",")
      .map((part) => part.trim())
      .filter((part) => part && !TBCA_DISPLAY_NOISE.test(part));

    if (parts.length) {
      return parts.join(" ").replace(/\s+/g, " ").trim();
    }
  }

  return withoutNotes
    .replace(/,?\s*in\s+natura\s*,?/gi, " ")
    .replace(/,?\s*brasil\s*,?/gi, " ")
    .replace(/,/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
