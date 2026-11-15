import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AudioLines, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { db, run, useInvalidate, useMe } from "@/lib/band";
import { Button } from "@/components/ui/button";
import { Empty, FormDialog, PageHeader } from "@/components/band/ui";
import { blockFields } from "@/components/band/fields";

export const Route = createFileRoute("/_authenticated/blocos/")({
  head: () => ({
    meta: [
      { title: "Blocos — Banda Jana Lima" },
      { name: "description", content: "Blocos do repertório e VS da Banda Jana Lima." },
      { property: "og:title", content: "Blocos — Banda Jana Lima" },
      { property: "og:description", content: "Blocos do repertório e VS da Banda Jana Lima." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Blocos,
});

function Blocos() {
  const { data: me } = useMe();
  const inv = useInvalidate();
  const navigate = useNavigate();
  const { data = [] } = useQuery({
    queryKey: ["blocks"],
    queryFn: () =>
      run(supabase.from("blocks").select("id,nome,duracao,vs_path,block_songs(position,songs(titulo))").order("nome")),
  });

  return (
    <div>
      <PageHeader
        title="Blocos"
        sub="Sequências de VS"
        action={
          me?.isAdmin && (
            <FormDialog
              title="Novo bloco"
              fields={blockFields}
              trigger={<Button variant="hero" size="sm"><Plus /> Novo</Button>}
              onSubmit={async (v) => {
                const { data, error } = await db.from("blocks").insert({ ...v, nome: v.nome?.trim() || "Bloco" }).select("id").single();
                if (error) throw error;
                inv();
                navigate({ to: "/blocos/$id", params: { id: data.id } });
              }}
            />
          )
        }
      />
      {data.length === 0 && <Empty>Nenhum bloco ainda.</Empty>}
      <ul className="space-y-2">
        {data.map((b) => {
          const songs = [...b.block_songs].sort((x, y) => x.position - y.position);
          return (
            <li key={b.id}>
              <Link to="/blocos/$id" params={{ id: b.id }} className="block rounded-2xl border bg-card p-4">
                <div className="flex items-center justify-between">
                  <p className="font-display text-lg font-bold">{b.nome}</p>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    {b.vs_path && <AudioLines className="size-4 text-primary" />}
                    {b.duracao}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {songs.map((s) => s.songs?.titulo).join(" → ") || "Sem músicas"}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
