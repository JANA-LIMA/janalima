type NamedItem = { blocks: { nome: string } | null; songs: { titulo: string } | null };

export function setlistNumber(index: number) {
  return index + 1;
}

export function blockTheme(name: string) {
  return name.trim().replace(/^bloco(?:\s*\d+)?(?:\s*[-–—:·]\s*|\s+|$)/i, "").trim();
}

export function setlistLabel(item: NamedItem | undefined, index: number) {
  if (!item) return "";
  if (!item.blocks) return item.songs?.titulo ?? "";
  const theme = blockTheme(item.blocks.nome);
  return `Bloco ${String(setlistNumber(index)).padStart(2, "0")}${theme ? ` · ${theme}` : ""}`;
}