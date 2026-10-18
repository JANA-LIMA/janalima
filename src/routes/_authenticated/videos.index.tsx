import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { db, fmtDate, run, useInvalidate, useMe, youtubeId } from "@/lib/band";
import { Button } from "@/components/ui/button";
import { Empty, FormDialog, PageHeader } from "@/components/band/ui";
import { videoFields } from "@/components/band/fields";

export const Route = createFileRoute("/_authenticated/videos/")({
  head: () => ({ meta: [{ title: "Vídeos ao vivo — Banda Jana Lima" }] }),
  component: Videos,
});

function Videos() {
  const { data: me } = useMe();
  const inv = useInvalidate();
  const { data = [] } = useQuery({
    queryKey: ["videos"],
    queryFn: () => run(supabase.from("live_videos").select("*").order("data_show", { ascending: false })),
  });
  return (
    <div>
      <PageHeader
        title="Ao vivo"
        sub="Vídeos de shows da banda"
        action={
          me?.isAdmin && (
            <FormDialog
              title="Novo vídeo"
              fields={videoFields}
              trigger={<Button variant="hero" size="sm"><Plus /> Novo</Button>}
              onSubmit={async (v) => {
                const { error } = await db.from("live_videos").insert(v);
                if (error) throw error;
                inv();
              }}
            />
          )
        }
      />
      {data.length === 0 && <Empty>Nenhum vídeo cadastrado.</Empty>}
      <ul className="grid gap-3 sm:grid-cols-2">
        {data.map((v) => {
          const yid = youtubeId(v.youtube_url);
          return (
            <li key={v.id}>
              <Link to="/videos/$id" params={{ id: v.id }} className="block overflow-hidden rounded-2xl border bg-card">
                {yid && <img src={`https://i.ytimg.com/vi/${yid}/hqdefault.jpg`} alt={v.titulo} className="aspect-video w-full object-cover" loading="lazy" />}
                <div className="p-3">
                  <p className="font-semibold">{v.titulo}</p>
                  <p className="text-xs text-muted-foreground">{fmtDate(v.data_show)}</p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
