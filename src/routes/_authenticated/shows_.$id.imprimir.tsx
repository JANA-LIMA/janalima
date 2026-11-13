import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useLayoutEffect, useRef, useState } from "react";
import { Printer, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fmtDate, run } from "@/lib/band";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/shows_/$id/imprimir")({
  head: () => ({
    meta: [
      { title: "Imprimir setlist — Banda Jana Lima" },
      { name: "description", content: "Setlist do show em uma folha A4 para imprimir ou salvar em PDF." },
      { property: "og:title", content: "Imprimir setlist — Banda Jana Lima" },
      { property: "og:description", content: "Setlist do show em uma folha A4 para imprimir ou salvar em PDF." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Imprimir,
});

type Song = { titulo: string; tom: string | null; observacoes: string | null };
type Item = {
  id: string;
  blocks: { nome: string; block_songs: { position: number; songs: Song | null }[] } | null;
  songs: Song | null;
};

// A4 usable area with 8mm margins, at 96dpi
const MM = 96 / 25.4;
const PAGE_W = 194 * MM;
const PAGE_H = 281 * MM;

function Imprimir() {
  const { id } = Route.useParams();
  const { data: show } = useQuery({
    queryKey: ["show", id],
    queryFn: () => run(supabase.from("shows").select("*").eq("id", id).maybeSingle()),
  });
  const { data: items = [], isSuccess } = useQuery({
    queryKey: ["palco", id],
    queryFn: async () =>
      (await run(
        supabase
          .from("setlist_items")
          .select("id,blocks(nome,block_songs(position,songs(titulo,tom,observacoes))),songs(titulo,tom,observacoes)")
          .eq("show_id", id)
          .order("position"),
      )) as unknown as Item[],
  });

  const sheet = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(13);

  // Shrink the font until everything fits on one A4 page
  useLayoutEffect(() => {
    if (!isSuccess || !show) return;
    const el = sheet.current;
    if (!el) return;
    let s = 14;
    el.style.fontSize = `${s}px`;
    while (el.scrollHeight > PAGE_H && s > 6) {
      s -= 0.25;
      el.style.fontSize = `${s}px`;
    }
    setSize(s);
  }, [isSuccess, show, items]);

  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-muted print-host">
      <div className="no-print sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-border bg-background/95 p-3 backdrop-blur">
        <Link to="/shows/$id" params={{ id }} className="flex items-center gap-1 text-sm text-muted-foreground">
          <X className="size-5" /> Fechar
        </Link>
        <Button onClick={() => window.print()} variant="hero">
          <Printer /> Imprimir / Salvar PDF
        </Button>
      </div>
      <div className="flex justify-center p-4">
        <div
          ref={sheet}
          className="print-sheet"
          style={{ width: PAGE_W, height: PAGE_H, fontSize: size }}
        >
          <header className="print-head">
            <h1>REPERTÓRIO JL{show ? ` — ${show.nome}` : ""}</h1>
            {show && <span>{fmtDate(show.data)}</span>}
          </header>
          <div className="print-cols">
            {items.map((it, i) => {
              const songs = it.blocks
                ? [...it.blocks.block_songs].sort((a, b) => a.position - b.position).map((b) => b.songs)
                : [it.songs];
              return (
                <section key={it.id} className="print-block">
                  <div className="print-num">{i + 1}</div>
                  <ul>
                    {songs.map((s, j) => (s ? <li key={j}>{s.titulo}</li> : null))}
                  </ul>
                </section>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
