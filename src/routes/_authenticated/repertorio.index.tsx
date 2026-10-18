import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { db, run, useInvalidate, useMe } from "@/lib/band";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormDialog, PageHeader } from "@/components/band/ui";
import { songFields } from "@/components/band/fields";

export const Route = createFileRoute("/_authenticated/repertorio/")({
  head: () => ({ meta: [{ title: "Repertório — Banda Jana Lima" }] }),
  component: Repertorio,
});


function Repertorio() {
  const { data: me } = useMe();
  const inv = useInvalidate();
  const [q, setQ] = useState("");
  const [tom, setTom] = useState("");
  const { data = [] } = useQuery({
    queryKey: ["songs"],
    queryFn: () => run(supabase.from("songs").select("id,titulo,artista,tom,bpm").order("titulo")),
  });
  const toms = useMemo(() => [...new Set(data.map((s) => s.tom).filter(Boolean))].sort() as string[], [data]);
  const list = data.filter(
    (s) => s.titulo.toLowerCase().includes(q.toLowerCase()) && (!tom || s.tom === tom),
  );

  return (
    <div>
      <PageHeader
        title="Repertório"
        sub={`${data.length} músicas`}
        action={
          me?.isAdmin && (
            <FormDialog
              title="Nova música"
              fields={songFields}
              trigger={<Button variant="hero" size="sm"><Plus /> Nova</Button>}
              onSubmit={async (v) => {
                const { error } = await db.from("songs").insert(v);
                if (error) throw error;
                inv();
              }}
            />
          )
        }
      />
      <div className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar título…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          value={tom}
          onChange={(e) => setTom(e.target.value)}
        >
          <option value="">Tom</option>
          {toms.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </div>
      <ul className="divide-y rounded-2xl border bg-card">
        {list.map((s) => (
          <li key={s.id}>
            <Link to="/repertorio/$id" params={{ id: s.id }} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-semibold">{s.titulo}</p>
                {s.artista && <p className="truncate text-xs text-muted-foreground">{s.artista}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-2 text-xs">
                {s.bpm && <span className="text-muted-foreground">{s.bpm} bpm</span>}
                {s.tom && <span className="rounded-md bg-primary/15 px-2 py-0.5 font-bold text-primary">{s.tom}</span>}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
