import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, LayoutGrid, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { run } from "@/lib/band";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/shows_/$id/palco")({
  head: () => ({
    meta: [
      { title: "Modo Palco — Banda Jana Lima" },
      { name: "description", content: "Setlist em tela cheia com tons e anotações para o palco." },
      { property: "og:title", content: "Modo Palco — Banda Jana Lima" },
      { property: "og:description", content: "Setlist em tela cheia com tons e anotações para o palco." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Palco,
});

type Song = { titulo: string; tom: string | null; observacoes: string | null };
type Item = {
  id: string;
  blocks: { nome: string; block_songs: { position: number; songs: Song | null }[] } | null;
  songs: Song | null;
};

function Palco() {
  const { id } = Route.useParams();
  const [idx, setIdx] = useState(0);
  const [grid, setGrid] = useState(false);

  const { data: items = [] } = useQuery({
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

  // Keep the screen awake while on stage
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let lock: any = null;
    const req = async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        lock = await (navigator as any).wakeLock?.request("screen");
      } catch {
        /* unsupported */
      }
    };
    req();
    const onVis = () => document.visibilityState === "visible" && req();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      lock?.release?.();
    };
  }, []);

  const label = (it?: Item) => (it ? (it.blocks?.nome ?? it.songs?.titulo ?? "") : "");
  const short = (it: Item, i: number) => it.blocks?.nome.match(/\d+/)?.[0] ?? String(i + 1);
  const cur = items[idx];
  const next = items[idx + 1];
  const songs: Song[] = cur
    ? cur.blocks
      ? [...cur.blocks.block_songs].sort((a, b) => a.position - b.position).flatMap((b) => (b.songs ? [b.songs] : []))
      : cur.songs
        ? [cur.songs]
        : []
    : [];
  const go = (i: number) => {
    setIdx(Math.max(0, Math.min(items.length - 1, i)));
    setGrid(false);
    window.scrollTo(0, 0);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <header className="flex items-center gap-2 border-b px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <Link to="/shows/$id" params={{ id }} className="rounded-lg p-2 text-muted-foreground" aria-label="Sair do Modo Palco">
          <X className="size-6" />
        </Link>
        <button
          onClick={() => setGrid((g) => !g)}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-axe py-2 text-2xl font-extrabold text-primary-foreground"
        >
          <LayoutGrid className="size-5" /> {label(cur) || "Setlist vazio"}
        </button>
        <span className="w-10 text-center text-sm font-bold text-muted-foreground">
          {items.length ? `${idx + 1}/${items.length}` : ""}
        </span>
      </header>

      {grid ? (
        <div className="grid flex-1 auto-rows-min grid-cols-4 gap-2 overflow-y-auto p-3 sm:grid-cols-6">
          {items.map((it, i) => (
            <button
              key={it.id}
              onClick={() => go(i)}
              className={cn(
                "rounded-xl border py-5 font-display text-3xl font-extrabold",
                i === idx ? "border-primary bg-primary text-primary-foreground" : "bg-card",
              )}
            >
              {short(it, i)}
            </button>
          ))}
        </div>
      ) : (
        <ol className="flex-1 space-y-3 overflow-y-auto p-4">
          {songs.map((s, i) => (
            <li key={i} className="rounded-2xl border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-2xl font-bold leading-tight sm:text-3xl">{s.titulo}</p>
                {s.tom && (
                  <span className="shrink-0 rounded-lg bg-sun px-3 py-1 font-display text-2xl font-extrabold text-background">
                    {s.tom}
                  </span>
                )}
              </div>
              {s.observacoes && <p className="mt-2 whitespace-pre-wrap text-base text-sun">{s.observacoes}</p>}
            </li>
          ))}
        </ol>
      )}

      <footer className="border-t p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <p className="mb-2 text-center text-sm text-muted-foreground">
          A seguir: <b className="text-foreground">{next ? label(next) : "fim do show"}</b>
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button disabled={idx === 0} onClick={() => go(idx - 1)} className="flex items-center justify-center gap-1 rounded-xl border bg-card py-4 text-lg font-bold disabled:opacity-30">
            <ChevronLeft /> Anterior
          </button>
          <button disabled={!next} onClick={() => go(idx + 1)} className="flex items-center justify-center gap-1 rounded-xl bg-primary py-4 text-lg font-bold text-primary-foreground disabled:opacity-30">
            Próximo <ChevronRight />
          </button>
        </div>
      </footer>
    </div>
  );
}
