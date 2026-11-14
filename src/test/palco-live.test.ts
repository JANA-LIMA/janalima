import { describe, expect, it } from "vitest";
import { canControlStage, countStageMusicians, liveIndex, stageCacheKey } from "@/lib/stage";

describe("Modo Palco ao vivo", () => {
  it("only an online admin can change the session", () => {
    expect(canControlStage(true, true, false)).toBe(true);
    expect(canControlStage(false, true, false)).toBe(false);
    expect(canControlStage(true, false, false)).toBe(false);
    expect(canControlStage(true, true, true)).toBe(false);
  });
  it("follows the current block by identity, not a stale position", () => {
    const items = [{ id: "bloco-9", blocks: null, songs: null }, { id: "bloco-1", blocks: null, songs: null }];
    const session = { show_id: "show", current_item_id: "bloco-9", active: true, updated_at: "" };
    expect(liveIndex(items, session)).toBe(0);
    expect(liveIndex(items, { ...session, active: false })).toBe(-1);
    expect(liveIndex(items, { ...session, current_item_id: "removed" })).toBe(-1);
  });
  it("counts active musicians once across devices and excludes stale presence", () => {
    const now = Date.parse("2026-11-14T23:00:00Z");
    expect(countStageMusicians([
      { user_id: "musico", last_seen: "2026-11-14T22:59:50Z" },
      { user_id: "musico", last_seen: "2026-11-14T22:59:55Z" },
      { user_id: "saiu", last_seen: "2026-11-14T22:58:00Z" },
      { user_id: "admin", last_seen: "2026-11-14T22:59:55Z" },
    ], ["musico", "saiu"], now)).toBe(1);
  });
  it("separates offline setlists by account and show", () => {
    expect(stageCacheKey("a", "show")).not.toBe(stageCacheKey("b", "show"));
    expect(stageCacheKey("a", "show")).not.toBe(stageCacheKey("a", "other"));
  });
});