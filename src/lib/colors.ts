export const PALETTE = [
  "#e85d4a", // red
  "#3a82f7", // blue
  "#2bb673", // green
  "#f5a623", // amber
  "#9b59b6", // purple
  "#1abc9c", // teal
  "#e67e22", // orange
  "#34495e", // slate
] as const;

export function pickColor(usedColors: readonly string[]): string {
  const available = PALETTE.find((c) => !usedColors.includes(c));
  if (available) return available;
  return PALETTE[usedColors.length % PALETTE.length];
}
