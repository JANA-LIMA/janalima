import { describe, expect, it } from "vitest";

import { podeExcluirMusico } from "@/lib/band";

describe("Quem pode excluir um músico", () => {
  it("allows the admin", () => {
    expect(podeExcluirMusico({ isAdmin: true })).toBe(true);
  });

  it("blocks a musician with app access", () => {
    expect(podeExcluirMusico({ isAdmin: false })).toBe(false);
  });

  it("blocks nobody else", () => {
    expect(podeExcluirMusico(null)).toBe(false);
    expect(podeExcluirMusico(undefined)).toBe(false);
  });
});
