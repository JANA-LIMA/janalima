import { describe, expect, it } from "vitest";

import { filtrarPorInstrumento, instrumentosPresentes } from "@/lib/band";

const lista = [
  { instrumento: "baixo" },
  { instrumento: "percussão" },
  { instrumento: "bateria" },
  { instrumento: "percussão" },
  { instrumento: null },
];

describe("Filtro de músicos por instrumento", () => {
  it("lists only instruments that have musicians, in INSTRUMENTOS order", () => {
    expect(instrumentosPresentes(lista)).toEqual(["bateria", "percussão", "baixo"]);
  });

  it("keeps an instrument that is not in the known list", () => {
    expect(instrumentosPresentes([{ instrumento: "cajón" }, { instrumento: "bateria" }])).toEqual(["bateria", "cajón"]);
  });

  it("returns every musician when no instrument is selected", () => {
    expect(filtrarPorInstrumento(lista, null)).toHaveLength(5);
  });

  it("returns only the musicians with the selected instrument", () => {
    expect(filtrarPorInstrumento(lista, "percussão").map((m) => m.instrumento)).toEqual(["percussão", "percussão"]);
    expect(filtrarPorInstrumento(lista, "sax")).toEqual([]);
  });
});
