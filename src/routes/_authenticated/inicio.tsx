import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, MapPin, Mic2, Plus, Music2, Layers, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fmtDate, hhmm, run, today, useMe } from "@/lib/band";
import { Empty, Panel } from "@/components/band/ui";

export const Route = createFileRoute("/_authenticated/inicio")({
  head: () => ({
    meta: [
      { title: "Início — Banda Jana Lima" },
      { name: "description", content: "Agenda de shows e ensaios da Banda Jana Lima." },
      { property: "og:title", content: "Início — Banda Jana Lima" },
      { property: "og:description", content: "Agenda de shows e ensaios da Banda Jana Lima." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Inicio,
});

function Inicio() {
  const { data: me } = useMe();
  const t = today();

  const { data: shows = [] } = useQuery({
    queryKey: ["home-shows", t],
    queryFn: () =>
      run(
        supabase
          .from("shows")
          .select("id,nome,data,local,horario_palco,show_lineup(id,status,musician_id,musicians(nome))")
          .gte("data", t)
          .order("data"),
      ),
  });
  const { data: ensaios = [] } = useQuery({
    queryKey: ["home-ensaios", t],
    queryFn: () =>
      run(
        supabase
          .from("rehearsals")
          .select("id,data,horario,local,show_id,shows(nome),rehearsal_attendance(id,status,musician_id)")
          .gte("data", t)
          .order("data"),
      ),
  });

  const nextShow = shows[0];
  const nextEnsaio = ensaios[0];

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-muted-foreground">Olá{me?.nome ? `, ${me.nome}` : ""} 👋</p>
        <h1 className="text-3xl font-bold">Bora pro palco</h1>
      </div>

      <section className="relative overflow-hidden rounded-3xl bg-gradient-axe p-5 text-primary-foreground shadow-glow">
        <p className="text-xs font-bold uppercase tracking-widest opacity-80">Próximo show</p>
        {nextShow ? (
          <Link to="/shows/$id" params={{ id: nextShow.id }} className="block">
            <h2 className="mt-1 text-3xl font-extrabold">{nextShow.nome}</h2>
            <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-semibold">
              <span className="flex items-center gap-1"><CalendarDays className="size-4" />{fmtDate(nextShow.data)}</span>
              {nextShow.local && <span className="flex items-center gap-1"><MapPin className="size-4" />{nextShow.local}</span>}
              {nextShow.horario_palco && <span className="flex items-center gap-1"><Mic2 className="size-4" />Palco {hhmm(nextShow.horario_palco)}</span>}
            </p>
          </Link>
        ) : (
          <p className="mt-1 font-semibold">Nenhum show agendado.</p>
        )}
      </section>

      <Panel>
        <p className="text-xs font-bold uppercase tracking-widest text-sun">Próximo ensaio</p>
        {nextEnsaio ? (
          <>
            <Link to="/shows/$id" params={{ id: nextEnsaio.show_id }}>
              <h3 className="mt-1 text-xl font-bold">{fmtDate(nextEnsaio.data)} {hhmm(nextEnsaio.horario)}</h3>
              <p className="text-sm text-muted-foreground">
                {nextEnsaio.local} · para {nextEnsaio.shows?.nome}
              </p>
            </Link>
          </>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">Nenhum ensaio marcado.</p>
        )}
      </Panel>

      {me?.isAdmin && (
        <>
          <div className="grid grid-cols-4 gap-2">
            {[
              { to: "/shows", label: "Show", icon: CalendarDays },
              { to: "/repertorio", label: "Música", icon: Music2 },
              { to: "/blocos", label: "Bloco", icon: Layers },
              { to: "/musicos", label: "Músico", icon: Users },
            ].map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to} className="flex flex-col items-center gap-1 rounded-2xl border bg-card p-3 text-xs font-semibold">
                <span className="relative">
                  <Icon className="size-5 text-primary" />
                  <Plus className="absolute -right-2 -top-2 size-3 text-sun" />
                </span>
                {label}
              </Link>
            ))}
          </div>

          <section>
            <h2 className="mb-2 text-lg font-bold">Shows futuros</h2>
            {shows.length ? (
              <ul className="space-y-2">
                {shows.map((s) => {
                  return (
                    <li key={s.id}>
                      <Link to="/shows/$id" params={{ id: s.id }} className="flex items-center justify-between rounded-xl border bg-card p-3">
                        <div>
                          <p className="font-semibold">{s.nome}</p>
                          <p className="text-xs text-muted-foreground">{fmtDate(s.data)} · {s.local}</p>
                        </div>

                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <Empty>Sem shows futuros.</Empty>
            )}
          </section>
        </>
      )}
    </div>
  );
}
