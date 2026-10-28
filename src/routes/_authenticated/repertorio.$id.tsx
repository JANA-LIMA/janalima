import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Pencil, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { db, embedUrl, fmtDate, fmtTime, run, useInvalidate, useMe } from "@/lib/band";
import { Button } from "@/components/ui/button";
import { Empty, FormDialog, Panel, YouTube } from "@/components/band/ui";
import { songFields } from "@/components/band/fields";

export const Route = createFileRoute("/_authenticated/repertorio/$id")({
  head: () => ({
    meta: [
      { title: "Música — Banda Jana Lima" },
      { name: "description", content: "Tom, informações e referências de uma música da Banda Jana Lima." },
      { property: "og:title", content: "Música — Banda Jana Lima" },
      { property: "og:description", content: "Tom, informações e referências de uma música da Banda Jana Lima." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SongPage,
});

function SongPage() {
  const { id } = Route.useParams();
  const { data: me } = useMe();
  const inv = useInvalidate();
  const [live, setLive] = useState<{ url: string; t: number; key: string } | null>(null);

  const { data: song } = useQuery({
    queryKey: ["song", id],
    queryFn: () => run(supabase.from("songs").select("*").eq("id", id).maybeSingle()),
  });
  const { data: blocks = [] } = useQuery({
    queryKey: ["song-blocks", id],
    queryFn: () => run(supabase.from("block_songs").select("id,blocks(id,nome)").eq("song_id", id)),
  });
  const { data: marks = [] } = useQuery({
    queryKey: ["song-marks", id],
    enabled: !!me?.isStaff,
    queryFn: () =>
      run(supabase.from("video_marks").select("id,segundos,live_videos(id,titulo,youtube_url,data_show)").eq("song_id", id)),
  });

  if (!song) return <Empty>Música não encontrada.</Empty>;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{song.titulo}</h1>
          {song.artista && <p className="text-muted-foreground">{song.artista}</p>}
        </div>
        {me?.isAdmin && (
          <FormDialog
            title="Editar música"
            fields={songFields}
            initial={song}
            trigger={<Button size="icon" variant="outline" aria-label="Editar"><Pencil /></Button>}
            onSubmit={async (v) => {
              const { error } = await db.from("songs").update(v).eq("id", id);
              if (error) throw error;
              inv();
            }}
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Panel className="text-center">
          <p className="text-xs uppercase text-muted-foreground">Tom</p>
          <p className="text-3xl font-extrabold text-primary">{song.tom || "—"}</p>
        </Panel>
        <Panel className="text-center">
          <p className="text-xs uppercase text-muted-foreground">BPM</p>
          <p className="text-3xl font-extrabold text-sun">{song.bpm || "—"}</p>
        </Panel>
      </div>

      {song.observacoes && (
        <Panel>
          <p className="mb-1 text-xs font-bold uppercase text-muted-foreground">Observações</p>
          <p className="whitespace-pre-wrap text-sm">{song.observacoes}</p>
        </Panel>
      )}

      {song.youtube_url && (
        <section>
          <h2 className="mb-2 text-lg font-bold">Versão original</h2>
          <YouTube src={embedUrl(song.youtube_url)} title={song.titulo} />
        </section>
      )}

      <section>
        <h2 className="mb-2 text-lg font-bold">Blocos</h2>
        {blocks.length ? (
          <div className="flex flex-wrap gap-2">
            {blocks.map((b) =>
              b.blocks ? (
                <Link key={b.id} to="/blocos/$id" params={{ id: b.blocks.id }} className="rounded-full border bg-card px-3 py-1 text-sm font-semibold">
                  {b.blocks.nome}
                </Link>
              ) : null,
            )}
          </div>
        ) : (
          <Empty>Ainda não está em nenhum bloco.</Empty>
        )}
      </section>

      {me?.isStaff && (
        <section>
          <h2 className="mb-2 text-lg font-bold">Ao vivo</h2>
          {live && <div className="mb-3"><YouTube src={embedUrl(live.url, live.t, true)} title="Ao vivo" /></div>}
          {marks.length ? (
            <ul className="space-y-2">
              {marks.map((m) =>
                m.live_videos ? (
                  <li key={m.id}>
                    <button
                      onClick={() => setLive({ url: m.live_videos!.youtube_url, t: m.segundos, key: m.id })}
                      className="flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left"
                    >
                      <Play className="size-4 text-primary" />
                      <span className="flex-1 text-sm font-semibold">{m.live_videos.titulo}</span>
                      <span className="text-xs text-muted-foreground">{fmtDate(m.live_videos.data_show)} · {fmtTime(m.segundos)}</span>
                    </button>
                  </li>
                ) : null,
              )}
            </ul>
          ) : (
            <Empty>Nenhum vídeo ao vivo marcado.</Empty>
          )}
        </section>
      )}
    </div>
  );
}
