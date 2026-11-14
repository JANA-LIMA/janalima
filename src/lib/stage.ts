export type StageSong = { titulo: string; tom: string | null; observacoes: string | null };
export type StageItem = {
  id: string;
  blocks: { nome: string; block_songs: { position: number; songs: StageSong | null }[] } | null;
  songs: StageSong | null;
};
export type StageSession = { show_id: string; current_item_id: string | null; active: boolean; updated_at: string };

export function liveIndex(items: StageItem[], session: StageSession | null) {
  return session?.active ? items.findIndex((item) => item.id === session.current_item_id) : -1;
}

export function canControlStage(isAdmin: boolean, connected: boolean, busy: boolean) {
  return isAdmin && connected && !busy;
}

export function countStageMusicians(rows: { user_id: string; last_seen: string }[], musicianUsers: string[], now: number) {
  const allowed = new Set(musicianUsers);
  return new Set(rows.filter((row) => allowed.has(row.user_id) && now - Date.parse(row.last_seen) < 60_000).map((row) => row.user_id)).size;
}

export function stageCacheKey(userId: string, showId: string) {
  return `jana-palco:${userId}:${showId}`;
}