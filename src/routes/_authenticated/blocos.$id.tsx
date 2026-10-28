import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { db, run, useInvalidate, useMe } from "@/lib/band";
import { Button } from "@/components/ui/button";
import { Empty, FormDialog, Panel, SortableList } from "@/components/band/ui";
import { blockFields } from "@/components/band/fields";
import { VsPlayer } from "@/components/band/VsPlayer";

export const Route = createFileRoute("/_authenticated/blocos/$id")({
  head: () => ({
    meta: [
      { title: "Bloco — Banda Jana Lima" },
      { name: "description", content: "Sequência de músicas e áudio VS de um bloco da Banda Jana Lima." },
      { property: "og:title", content: "Bloco — Banda Jana Lima" },
      { property: "og:description", content: "Sequência de músicas e áudio VS de um bloco da Banda Jana Lima." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BlockPage,
});

type Row = { id: string; position: number; songs: { id: string; titulo: string; tom: string | null; observacoes: string | null } | null };

function BlockPage() {
  const { id } = Route.useParams();
  const { data: me } = useMe();
  const inv = useInvalidate();
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);

  const { data: block } = useQuery({
    queryKey: ["block", id],
    queryFn: () => run(supabase.from("blocks").select("*").eq("id", id).maybeSingle()),
  });
  const { data: rows = [] } = useQuery({
    queryKey: ["block-songs", id],
    queryFn: () =>
      run(supabase.from("block_songs").select("id,position,songs(id,titulo,tom,observacoes)").eq("block_id", id).order("position")),
  });
  const { data: allSongs = [] } = useQuery({
    queryKey: ["songs-min"],
    enabled: !!me?.isAdmin,
    queryFn: () => run(supabase.from("songs").select("id,titulo").order("titulo")),
  });

  const [items, setItems] = useState<Row[]>([]);
  useEffect(() => setItems(rows as Row[]), [rows]);

  if (!block) return <Empty>Bloco não encontrado.</Empty>;
  const admin = !!me?.isAdmin;

  const reorder = async (next: Row[]) => {
    setItems(next);
    await Promise.all(next.map((r, i) => db.from("block_songs").update({ position: i }).eq("id", r.id)));
    inv();
  };

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const path = `${id}/${Date.now()}.mp3`;
      const { error } = await supabase.storage.from("vs").upload(path, file, { contentType: "audio/mpeg" });
      if (error) throw error;
      if (block.vs_path) await supabase.storage.from("vs").remove([block.vs_path]);
      await db.from("blocks").update({ vs_path: path }).eq("id", id);
      toast.success("VS enviado");
      inv();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-sun">Bloco</p>
          <h1 className="text-3xl font-bold">{block.nome}</h1>
          {block.duracao && <p className="text-sm text-muted-foreground">Duração: {block.duracao}</p>}
        </div>
        {admin && (
          <div className="flex gap-2">
            <FormDialog
              title="Editar bloco"
              fields={blockFields}
              initial={block}
              trigger={<Button size="icon" variant="outline" aria-label="Editar"><Pencil /></Button>}
              onSubmit={async (v) => {
                const { error } = await db.from("blocks").update(v).eq("id", id);
                if (error) throw error;
                inv();
              }}
            />
            <Button
              size="icon"
              variant="outline"
              aria-label="Excluir"
              onClick={async () => {
                if (!confirm("Excluir este bloco?")) return;
                if (block.vs_path) await supabase.storage.from("vs").remove([block.vs_path]);
                await db.from("blocks").delete().eq("id", id);
                inv();
                navigate({ to: "/blocos" });
              }}
            >
              <Trash2 />
            </Button>
          </div>
        )}
      </div>

      {block.vs_path ? <VsPlayer path={block.vs_path} /> : <Empty>Sem arquivo de VS.</Empty>}
      {admin && (
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed p-3 text-sm font-semibold text-muted-foreground">
          <Upload className="size-4" />
          {uploading ? "Enviando…" : block.vs_path ? "Substituir MP3" : "Enviar MP3 do VS"}
          <input
            type="file"
            accept="audio/mpeg,.mp3"
            className="hidden"
            disabled={uploading}
            onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
          />
        </label>
      )}

      {block.observacoes && (
        <Panel>
          <p className="whitespace-pre-wrap text-sm">{block.observacoes}</p>
        </Panel>
      )}

      <section>
        <h2 className="mb-2 text-lg font-bold">Músicas</h2>
        {items.length === 0 && <Empty>Nenhuma música neste bloco.</Empty>}
        <SortableList
          items={items}
          disabled={!admin}
          onReorder={reorder}
          render={(r, i) => (
            <div className="flex items-start gap-3">
              <span className="mt-0.5 w-5 text-sm font-bold text-muted-foreground">{i + 1}</span>
              <div className="min-w-0 flex-1">
                {r.songs && (
                  <Link to="/repertorio/$id" params={{ id: r.songs.id }} className="font-semibold">
                    {r.songs.titulo}
                  </Link>
                )}
                {r.songs?.observacoes && <p className="text-xs text-muted-foreground">{r.songs.observacoes}</p>}
              </div>
              {r.songs?.tom && <span className="rounded-md bg-primary/15 px-2 py-0.5 text-xs font-bold text-primary">{r.songs.tom}</span>}
              {admin && (
                <button
                  className="text-muted-foreground"
                  aria-label="Remover"
                  onClick={async () => {
                    await db.from("block_songs").delete().eq("id", r.id);
                    inv();
                  }}
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
          )}
        />
        {admin && (
          <div className="mt-3">
            <FormDialog
              title="Adicionar música"
              fields={[
                { name: "song_id", label: "Música", type: "select", required: true, options: allSongs.map((s) => ({ value: s.id, label: s.titulo })) },
              ]}
              trigger={<Button variant="outline" className="w-full"><Plus /> Adicionar música</Button>}
              onSubmit={async (v) => {
                const { error } = await db.from("block_songs").insert({ block_id: id, song_id: v.song_id, position: items.length });
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
