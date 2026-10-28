import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Pencil, Play, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { db, embedUrl, fmtDate, fmtTime, parseTime, run, useInvalidate, useMe } from "@/lib/band";
import { Button } from "@/components/ui/button";
import { Empty, FormDialog, YouTube } from "@/components/band/ui";
import { videoFields } from "@/components/band/fields";

export const Route = createFileRoute("/_authenticated/videos/$id")({
  head: () => ({
    meta: [
      { title: "Vídeo ao vivo — Banda Jana Lima" },
      { name: "description", content: "Apresentação ao vivo e marcações de músicas da Banda Jana Lima." },
      { property: "og:title", content: "Vídeo ao vivo — Banda Jana Lima" },
      { property: "og:description", content: "Apresentação ao vivo e marcações de músicas da Banda Jana Lima." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VideoPage,
});

function VideoPage() {
  const { id } = Route.useParams();
  const { data: me } = useMe();
  const inv = useInvalidate();
  const navigate = useNavigate();
  const [start, setStart] = useState<{ t: number; n: number }>({ t: 0, n: 0 });

  const { data: video } = useQuery({
    queryKey: ["video", id],
    queryFn: () => run(supabase.from("live_videos").select("*").eq("id", id).maybeSingle()),
  });
  const { data: marks = [] } = useQuery({
    queryKey: ["video-marks", id],
    queryFn: () => run(supabase.from("video_marks").select("id,segundos,songs(id,titulo)").eq("video_id", id).order("segundos")),
  });
  const { data: songs = [] } = useQuery({
    queryKey: ["songs-min"],
    enabled: !!me?.isAdmin,
    queryFn: () => run(supabase.from("songs").select("id,titulo").order("titulo")),
  });

  if (!video) return <Empty>Vídeo não encontrado.</Empty>;
  const admin = !!me?.isAdmin;
  const src = embedUrl(video.youtube_url, start.t, start.n > 0);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{video.titulo}</h1>
          <p className="text-sm text-muted-foreground">{fmtDate(video.data_show)}</p>
        </div>
        {admin && (
          <div className="flex gap-2">
            <FormDialog
              title="Editar vídeo"
              fields={videoFields}
              initial={video}
              trigger={<Button size="icon" variant="outline" aria-label="Editar"><Pencil /></Button>}
              onSubmit={async (v) => {
                const { error } = await db.from("live_videos").update(v).eq("id", id);
                if (error) throw error;
                inv();
              }}
            />
            <Button
              size="icon"
              variant="outline"
              aria-label="Excluir"
              onClick={async () => {
                if (!confirm("Excluir este vídeo?")) return;
                await db.from("live_videos").delete().eq("id", id);
                inv();
                navigate({ to: "/videos" });
              }}
            >
              <Trash2 />
            </Button>
          </div>
        )}
      </div>

      <div key={start.n}>
        <YouTube src={src} title={video.titulo} />
      </div>

      <section>
        <h2 className="mb-2 text-lg font-bold">Marcações</h2>
        {marks.length === 0 && <Empty>Nenhuma música marcada.</Empty>}
        <ul className="space-y-2">
          {marks.map((m) => (
            <li key={m.id} className="flex items-center gap-2 rounded-xl border bg-card p-2.5">
              <button
                onClick={() => setStart((s) => ({ t: m.segundos, n: s.n + 1 }))}
                className="flex items-center gap-2 rounded-lg bg-primary/15 px-2.5 py-1 text-sm font-bold text-primary"
              >
                <Play className="size-3" />
                {fmtTime(m.segundos)}
              </button>
              {m.songs && (
                <Link to="/repertorio/$id" params={{ id: m.songs.id }} className="flex-1 text-sm font-semibold">
                  {m.songs.titulo}
                </Link>
              )}
              {admin && (
                <button
                  className="p-1 text-muted-foreground"
                  aria-label="Remover"
                  onClick={async () => {
                    await db.from("video_marks").delete().eq("id", m.id);
                    inv();
                  }}
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
        {admin && (
          <div className="mt-3">
            <FormDialog
              title="Nova marcação"
              fields={[
                { name: "song_id", label: "Música", type: "select", required: true, options: songs.map((s) => ({ value: s.id, label: s.titulo })) },
                { name: "tempo", label: "Tempo (mm:ss ou h:mm:ss)", required: true, placeholder: "12:40" },
              ]}
              trigger={<Button variant="outline" className="w-full"><Plus /> Marcar música</Button>}
              onSubmit={async (v) => {
                const { error } = await db
                  .from("video_marks")
                  .insert({ video_id: id, song_id: v.song_id, segundos: parseTime(String(v.tempo)) });
                if (error) throw error;
                inv();
              }}
            />
          </div>
        )}
      </section>
    </div>
  );
}
