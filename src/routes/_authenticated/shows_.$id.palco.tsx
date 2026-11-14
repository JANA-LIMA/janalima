import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, LayoutGrid, X, Radio, Square, Users, WifiOff } from "lucide-react";
import { useMe } from "@/lib/band";
import { Button } from "@/components/ui/button";
import { useStageLive } from "@/hooks/use-stage-live";
import { liveIndex, type StageItem, type StageSong } from "@/lib/stage";
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

function Palco() {
  const { id } = Route.useParams();
  const { data: me } = useMe();
  const [idx, setIdx] = useState(0);
  const [grid, setGrid] = useState(false);
  const [following, setFollowing] = useState(true);
  const { items, session, connected, resync, busy, error, musicians, writeSession, scrollRef, loading, loadError } = useStageLive(id, me);
  const liveIdx = liveIndex(items, session);
  const previousResync = useRef(resync);
  const active = !!session?.active;
  useEffect(() => {
    const reconnected = previousResync.current !== resync;
    previousResync.current = resync;
    if (liveIdx >= 0 && (following || reconnected || me?.isAdmin)) {
      setIdx(liveIdx);
      setGrid(false);
      setFollowing(true);
      scrollRef.current?.scrollTo(0, 0);
    }
  }, [liveIdx, following, resync, me?.isAdmin, scrollRef]);

  // Keep the screen awake while on stage
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    let disposed = false;
    let requesting = false;
    const req = async () => {
      if (disposed || requesting || document.visibilityState !== "visible" || (lock && !lock.released)) return;
      requesting = true;
      try {
        const acquired = await navigator.wakeLock?.request("screen");
        if (disposed) await acquired?.release();
        else lock = acquired ?? null;
      } catch {
        /* unsupported */
      } finally { requesting = false; }
    };
    req();
    const onVis = () => document.visibilityState === "visible" && req();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", onVis);
      lock?.release?.();
    };
  }, []);

  const label = (it?: StageItem) => (it ? (it.blocks?.nome ?? it.songs?.titulo ?? "") : "");
  const short = (it: StageItem, i: number) => it.blocks?.nome.match(/\d+/)?.[0] ?? String(i + 1);
  const currentIdx = Math.max(0, Math.min(idx, items.length - 1));
  const cur = items[currentIdx];
  const next = items[currentIdx + 1];
  const songs: StageSong[] = cur
    ? cur.blocks
      ? [...cur.blocks.block_songs].sort((a, b) => a.position - b.position).flatMap((b) => (b.songs ? [b.songs] : []))
      : cur.songs
        ? [cur.songs]
        : []
    : [];
  const go = async (i: number) => {
    const target = Math.max(0, Math.min(items.length - 1, i));
    if (me?.isAdmin && active && connected) {
      if (!(await writeSession(items[target]?.id ?? null, true))) return;
    } else if (active) setFollowing(false);
    setIdx(target);
    setGrid(false);
    scrollRef.current?.scrollTo(0, 0);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <header className="flex shrink-0 flex-col gap-2 border-b px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
       <div className="flex min-w-0 items-center gap-2">
        <Link to="/shows/$id" params={{ id }} className="rounded-lg p-2 text-muted-foreground" aria-label="Sair do Modo Palco">
          <X className="size-6" />
        </Link>
        <Button variant="hero"
          onClick={() => setGrid((g) => !g)}
          className="h-auto min-w-0 flex-1 whitespace-normal py-2 text-xl font-extrabold sm:text-2xl"
        >
          <LayoutGrid className="size-5" /> {label(cur) || (loading ? "Carregando…" : "Setlist vazio")}
        </Button>
        <span className="w-10 text-center text-sm font-bold text-muted-foreground">
          {items.length ? `${currentIdx + 1}/${items.length}` : ""}
        </span>
       </div>
       <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className={cn("flex items-center gap-1.5 font-semibold", connected ? "text-primary" : "text-muted-foreground")}>
          {connected ? <Radio className="size-4" /> : <WifiOff className="size-4" />}
          {!connected ? "Sem sinal" : active ? "Ao vivo" : "Navegação individual"}
        </span>
        {me?.isAdmin && <span className="flex items-center gap-1 text-muted-foreground"><Users className="size-4" />{musicians} músicos conectados</span>}
        {me?.isAdmin && <Button variant={active ? "outline" : "default"} disabled={!connected || busy || !cur} onClick={() => void writeSession(cur?.id ?? null, !active)}>
          {active ? <Square /> : <Radio />}{active ? "Encerrar sessão ao vivo" : "Iniciar sessão ao vivo"}
        </Button>}
       </div>
       {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
       {loadError && !items.length && <p role="alert" className="text-sm text-destructive">Não foi possível carregar o setlist. Aguarde a conexão.</p>}
      </header>

      {grid ? (
        <div className="grid min-h-0 flex-1 auto-rows-min grid-cols-4 gap-2 overflow-y-auto p-3 sm:grid-cols-6">
          {items.map((it, i) => (
            <Button variant="outline"
              key={it.id}
              onClick={() => void go(i)}
              disabled={busy}
              aria-label={`Ir para ${label(it)}`}
              aria-current={i === currentIdx ? "true" : undefined}
              className={cn(
                "h-20 font-display text-3xl font-extrabold",
                i === currentIdx ? "border-primary bg-primary text-primary-foreground" : "bg-card",
              )}
            >
              {short(it, i)}
            </Button>
          ))}
        </div>
      ) : (
        <ol ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
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

      <footer className="shrink-0 border-t p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {active && !following && liveIdx >= 0 && <Button className="mb-3 h-auto min-h-11 w-full whitespace-normal" onClick={() => { setFollowing(true); setIdx(liveIdx); setGrid(false); scrollRef.current?.scrollTo(0, 0); }}>
          <Radio />Voltar ao vivo · {label(items[liveIdx])}
        </Button>}
        <p className="mb-2 text-center text-sm text-muted-foreground">
          A seguir: <b className="text-foreground">{next ? label(next) : "fim do show"}</b>
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" disabled={currentIdx === 0 || busy} onClick={() => void go(currentIdx - 1)} className="h-16 gap-1 bg-card text-lg font-bold">
            <ChevronLeft /> Anterior
          </Button>
          <Button disabled={!next || busy} onClick={() => void go(currentIdx + 1)} className="h-16 gap-1 text-lg font-bold">
            Próximo <ChevronRight />
          </Button>
        </div>
      </footer>
    </div>
  );
}
