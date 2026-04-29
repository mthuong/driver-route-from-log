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

export function colorForUserId(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}
