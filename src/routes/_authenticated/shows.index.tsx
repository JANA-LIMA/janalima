import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { db, fmtDate, run, today, useInvalidate, useMe } from "@/lib/band";
import { Button } from "@/components/ui/button";
import { Empty, FormDialog, PageHeader } from "@/components/band/ui";
import { showFields } from "@/components/band/fields";

export const Route = createFileRoute("/_authenticated/shows/")({
  head: () => ({ meta: [{ title: "Shows — Banda Jana Lima" }] }),
  component: Shows,
});

function Shows() {
  const { data: me } = useMe();
  const inv = useInvalidate();
  const navigate = useNavigate();
  const [past, setPast] = useState(false);
  const t = today();
  const { data = [] } = useQuery({
    queryKey: ["shows", past, t],
    queryFn: () => {
      const q = supabase.from("shows").select("id,nome,data,local,show_lineup(status,musician_id)");
      return run(past ? q.lt("data", t).order("data", { ascending: false }) : q.gte("data", t).order("data"));
    },
  });

  return (
    <div>
      <PageHeader
        title="Shows"
        action={
          me?.isAdmin && (
            <FormDialog
              title="Novo show"
              fields={showFields}
              trigger={<Button variant="hero" size="sm"><Plus /> Novo</Button>}
              onSubmit={async (v) => {
                const { data, error } = await db.from("shows").insert(v).select("id").single();
                if (error) throw error;
                inv();
                navigate({ to: "/shows/$id", params: { id: data.id } });
              }}
            />
          )
        }
      />
      <div className="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 text-sm">
        {[false, true].map((p) => (
          <button
            key={String(p)}
            onClick={() => setPast(p)}
            className={`rounded-md py-1.5 font-semibold ${past === p ? "bg-card" : "text-muted-foreground"}`}
          >
            {p ? "Anteriores" : "Próximos"}
          </button>
        ))}
      </div>
      {data.length === 0 && <Empty>Nenhum show aqui.</Empty>}
      <ul className="space-y-2">
        {data.map((s) => {
          const [, m, d] = s.data.split("-");
          return (
            <li key={s.id}>
              <Link to="/shows/$id" params={{ id: s.id }} className="flex items-center gap-4 rounded-2xl border bg-card p-3">
                <div className="flex size-14 shrink-0 flex-col items-center justify-center rounded-xl bg-gradient-axe font-display text-primary-foreground">
                  <span className="text-xl font-extrabold leading-none">{d}</span>
                  <span className="text-[10px] font-bold">/{m}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{s.nome}</p>
                  <p className="truncate text-xs text-muted-foreground">{fmtDate(s.data)} · {s.local}</p>
                </div>

              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
