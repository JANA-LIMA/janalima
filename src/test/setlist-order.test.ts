import { describe, expect, it } from "vitest";
import { blockTheme, setlistNumber } from "@/lib/setlist";

describe("numeração pela ordem do show", () => {
  it("renumbers a saved block 2 to position 3 and then position 1 without renaming it", () => {
    const blocks = [{ id: "a", nome: "Bloco 01" }, { id: "b", nome: "Bloco 02" }, { id: "c", nome: "Bloco 03" }];
    const reordered = [blocks[0], blocks[2], blocks[1]];
    expect(setlistNumber(reordered.findIndex((b) => b?.id === "b"))).toBe(3);
    const movedFirst = [blocks[1], blocks[0], blocks[2]];
    expect(setlistNumber(movedFirst.findIndex((b) => b?.id === "b"))).toBe(1);
    expect(blocks[1]?.nome).toBe("Bloco 02");
  });

  it("removes only a saved block prefix and retains the theme", () => {
    expect(blockTheme("Bloco 02")).toBe("");
    expect(blockTheme("Bloco 02 · Axé Retrô")).toBe("Axé Retrô");
    expect(blockTheme("Bloco")).toBe("");
    expect(blockTheme("Anos 2000")).toBe("Anos 2000");
  });
});