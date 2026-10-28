import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { CalendarDays, Clock, Layers, MapPin, Music2, Pencil, Plus, Shirt, Trash2, Truck, Mic2, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { db, fmtDate, hhmm, INSTRUMENTOS, run, useInvalidate, useMe } from "@/lib/band";
import { Button } from "@/components/ui/button";
import { Empty, FormDialog, Panel, SortableList } from "@/components/band/ui";
import { rehearsalFields, showFields } from "@/components/band/fields";

export const Route = createFileRoute("/_authenticated/shows/$id")({
  head: () => ({ meta: [{ title: "Show — Banda Jana Lima" }] }),
  component: ShowPage,
});

type SetItem = {
  id: string;
  position: number;
  blocks: { id: string; nome: string; block_songs: { position: number; songs: { titulo: string; tom: string | null } | null }[] } | null;
  songs: { id: string; titulo: string; tom: string | null } | null;
};

function ShowPage() {
  const { id } = Route.useParams();
  const { data: me } = useMe();
  const inv = useInvalidate();
  const navigate = useNavigate();
  const admin = !!me?.isAdmin;

  const { data: show, isLoading } = useQuery({
    queryKey: ["show", id],
    queryFn: () => run(supabase.from("shows").select("*").eq("id", id).maybeSingle()),
  });
  const { data: setlist = [] } = useQuery({
    queryKey: ["setlist", id],
    queryFn: () =>
      run(
        supabase
          .from("setlist_items")
          .select("id,position,blocks(id,nome,block_songs(position,songs(titulo,tom))),songs(id,titulo,tom)")
          .eq("show_id", id)
          .order("position"),
      ),
  });
  const { data: lineup = [] } = useQuery({
    queryKey: ["lineup", id],
    queryFn: () => run(supabase.from("show_lineup").select("id,status,musician_id,musicians(nome,instrumento)").eq("show_id", id)),
  });
  const { data: ensaios = [] } = useQuery({
    queryKey: ["ensaios", id],
    queryFn: () =>
      run(
        supabase
          .from("rehearsals")
          .select("*")
          .eq("show_id", id)
          .order("data"),
      ),
  });
  const { data: opts } = useQuery({
    queryKey: ["show-opts"],
    enabled: admin,
    queryFn: async () => ({
      blocks: await run(supabase.from("blocks").select("id,nome").order("nome")),
      songs: await run(supabase.from("songs").select("id,titulo").order("titulo")),
      musicians: await run(supabase.from("musicians").select("id,nome,instrumento").eq("ativo", true).order("nome")),
    }),
  });

  const [items, setItems] = useState<SetItem[]>([]);
  useEffect(() => setItems(setlist as SetItem[]), [setlist]);

  if (isLoading) return null;
  if (!show) return <Empty>Show não encontrado ou seu acesso expirou.</Empty>;


  const reorder = async (next: SetItem[]) => {
    setItems(next);
    await Promise.all(next.map((r, i) => db.from("setlist_items").update({ position: i }).eq("id", r.id)));
    inv();
  };

  const share = () => {
    const lines = [
      `🎤 *${show.nome}*`,
      `📅 ${fmtDate(show.data)}`,
      show.local && `📍 ${show.local}${show.endereco ? ` — ${show.endereco}` : ""}`,
      show.horario_saida && `🚐 Saída: ${hhmm(show.horario_saida)}`,
      show.horario_passagem && `🔊 Passagem: ${hhmm(show.horario_passagem)}`,
      show.horario_palco && `🎶 Palco: ${hhmm(show.horario_palco)}`,
      show.duracao && `⏱️ Duração: ${show.duracao}`,
      show.traje && `👕 Traje: ${show.traje}`,
      "",
      "*SETLIST*",
      ...items.flatMap((it, i) =>
        it.blocks
          ? [
              `${i + 1}. ${it.blocks.nome}`,
              ...[...it.blocks.block_songs]
                .sort((a, b) => a.position - b.position)
                .map((bs) => `   • ${bs.songs?.titulo}${bs.songs?.tom ? ` (${bs.songs.tom})` : ""}`),
            ]
          : [`${i + 1}. ${it.songs?.titulo}${it.songs?.tom ? ` (${it.songs.tom})` : ""} — avulsa`],
      ),
      show.observacoes ? `\n📝 ${show.observacoes}` : "",
    ].filter((l): l is string => typeof l === "string");
    window.open(`https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`, "_blank");
  };

  const grouped = INSTRUMENTOS.map((ins) => ({
    ins,
    list: lineup.filter((l) => l.musicians?.instrumento === ins),
  })).filter((g) => g.list.length);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-axe p-5 text-primary-foreground shadow-glow">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-1 text-sm font-bold"><CalendarDays className="size-4" />{fmtDate(show.data)}</p>
            <h1 className="mt-1 text-3xl font-extrabold">{show.nome}</h1>
            {show.local && <p className="mt-1 flex items-center gap-1 text-sm font-semibold"><MapPin className="size-4" />{show.local}</p>}
            {show.endereco && <p className="text-xs opacity-80">{show.endereco}</p>}
          </div>
          {admin && (
            <div className="flex gap-1">
              <FormDialog
                title="Editar show"
                fields={showFields}
                initial={show}
                trigger={<Button size="icon" variant="secondary" aria-label="Editar"><Pencil /></Button>}
                onSubmit={async (v) => {
                  const { error } = await db.from("shows").update(v).eq("id", id);
                  if (error) throw error;
                  inv();
                }}
              />
              <Button
                size="icon"
                variant="secondary"
                aria-label="Excluir"
                onClick={async () => {
                  if (!confirm("Excluir este show?")) return;
                  await db.from("shows").delete().eq("id", id);
                  inv();
                  navigate({ to: "/shows" });
                }}
              >
                <Trash2 />
              </Button>
            </div>
          )}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          {[
            [Truck, "Saída", hhmm(show.horario_saida)],
            [Clock, "Passagem", hhmm(show.horario_passagem)],
            [Mic2, "Palco", hhmm(show.horario_palco)],
          ].map(([Icon, l, v]) => {
            const I = Icon as typeof Truck;
            return (
              <div key={l as string} className="rounded-xl bg-background/90 p-2 text-foreground">
                <I className="mx-auto size-4 text-primary" />
                <p className="text-[10px] uppercase text-muted-foreground">{l as string}</p>
                <p className="font-display text-lg font-bold">{(v as string) || "—"}</p>
              </div>
            );
          })}
        </div>
      </section>

      {(show.traje || show.duracao || show.observacoes) && (
        <Panel className="space-y-1 text-sm">
          {show.duracao && <p><b>Duração:</b> {show.duracao}</p>}
          {show.traje && <p className="flex items-center gap-1"><Shirt className="size-4 text-sun" /><b>Traje:</b> {show.traje}</p>}
          {show.observacoes && <p className="whitespace-pre-wrap text-muted-foreground">{show.observacoes}</p>}
        </Panel>
      )}


      <Button variant="hero" className="w-full" onClick={share}>
        <Share2 /> Compartilhar no WhatsApp
      </Button>

      <section>
        <h2 className="mb-2 text-xl font-bold">Setlist</h2>
        {items.length === 0 && <Empty>Setlist vazio.</Empty>}
        <SortableList
          items={items}
          disabled={!admin}
          onReorder={reorder}
          render={(it, i) => (
            <div className="flex items-start gap-3">
              <span className="mt-0.5 w-5 text-sm font-bold text-muted-foreground">{i + 1}</span>
              <div className="min-w-0 flex-1">
                {it.blocks ? (
                  <>
                    <Link to="/blocos/$id" params={{ id: it.blocks.id }} className="flex items-center gap-1 font-semibold">
                      <Layers className="size-4 text-primary" /> {it.blocks.nome}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {[...it.blocks.block_songs].sort((a, b) => a.position - b.position).map((b) => b.songs?.titulo).join(" → ")}
                    </p>
                  </>
                ) : (
                  it.songs && (
                    <Link to="/repertorio/$id" params={{ id: it.songs.id }} className="flex items-center gap-1 font-semibold">
                      <Music2 className="size-4 text-sun" /> {it.songs.titulo}
                      {it.songs.tom && <span className="text-xs text-primary">({it.songs.tom})</span>}
                      <span className="text-xs font-normal text-muted-foreground">· avulsa, sem VS</span>
                    </Link>
                  )
                )}
              </div>
              {admin && (
                <button
                  className="text-muted-foreground"
                  aria-label="Remover"
                  onClick={async () => {
                    await db.from("setlist_items").delete().eq("id", it.id);
                    inv();
                  }}
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
          )}
        />
        {admin && opts && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <FormDialog
              title="Adicionar bloco"
              fields={[{ name: "block_id", label: "Bloco", type: "select", required: true, options: opts.blocks.map((b) => ({ value: b.id, label: b.nome })) }]}
              trigger={<Button variant="outline"><Plus /> Bloco</Button>}
              onSubmit={async (v) => {
                const { error } = await db.from("setlist_items").insert({ show_id: id, block_id: v.block_id, position: items.length });
                if (error) throw error;
                inv();
              }}
            />
            <FormDialog
              title="Música avulsa (sem VS)"
              fields={[{ name: "song_id", label: "Música", type: "select", required: true, options: opts.songs.map((s) => ({ value: s.id, label: s.titulo })) }]}
              trigger={<Button variant="outline"><Plus /> Avulsa</Button>}
              onSubmit={async (v) => {
                const { error } = await db.from("setlist_items").insert({ show_id: id, song_id: v.song_id, position: items.length });
                if (error) throw error;
                inv();
              }}
            />
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-xl font-bold">Escalação</h2>
        {lineup.length === 0 && <Empty>Ninguém no show.</Empty>}
        <div className="space-y-3">
          {grouped.map((g) => (
            <div key={g.ins}>
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">{g.ins}</p>
              <ul className="space-y-1.5">
                {g.list.map((l) => (
                  <li key={l.id} className="flex items-center justify-between rounded-xl border bg-card px-3 py-2 text-sm">
                    <span className="font-semibold">{l.musicians?.nome}</span>
                    <span className="flex items-center gap-2">
                      {admin && (
                        <button
                          className="text-muted-foreground"
                          aria-label="Remover do show"
                          onClick={async () => {
                            await db.from("show_lineup").delete().eq("id", l.id);
                            inv();
                          }}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        {admin && opts && (
          <div className="mt-3">
            <FormDialog
              title="Adicionar integrante"
              fields={[
                {
                  name: "musician_id",
                  label: "Músico",
                  type: "select",
                  required: true,
                  options: [...opts.musicians]
                    .filter((m) => !lineup.some((l) => l.musician_id === m.id))
                    .sort((a, b) => INSTRUMENTOS.indexOf(a.instrumento) - INSTRUMENTOS.indexOf(b.instrumento))
                    .map((m) => ({ value: m.id, label: `${m.instrumento} — ${m.nome}` })),
                },
              ]}
              trigger={<Button variant="outline" className="w-full"><Plus /> Adicionar integrante</Button>}
              onSubmit={async (v) => {
                const { error } = await db.from("show_lineup").insert({ show_id: id, musician_id: v.musician_id });
                if (error) throw error;
                inv();
              }}
            />
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-xl font-bold">Ensaios</h2>
        {ensaios.length === 0 && <Empty>Nenhum ensaio marcado.</Empty>}
        <div className="space-y-3">
          {ensaios.map((e) => {
            return (
              <Panel key={e.id}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-display text-lg font-bold">{fmtDate(e.data)} {hhmm(e.horario)}</p>
                    {e.local && <p className="text-sm text-muted-foreground">{e.local}</p>}
                    {e.observacoes && <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{e.observacoes}</p>}
                  </div>
                  {admin && (
                    <div className="flex">
                      <FormDialog
                        title="Editar ensaio"
                        fields={rehearsalFields}
                        initial={e}
                        trigger={<button className="p-1.5 text-muted-foreground" aria-label="Editar"><Pencil className="size-4" /></button>}
                        onSubmit={async (v) => {
                          const { error } = await db.from("rehearsals").update(v).eq("id", e.id);
                          if (error) throw error;
                          inv();
                        }}
                      />
                      <button
                        className="p-1.5 text-muted-foreground"
                        aria-label="Excluir"
                        onClick={async () => {
                          if (!confirm("Excluir ensaio?")) return;
                          await db.from("rehearsals").delete().eq("id", e.id);
                          inv();
                        }}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  )}
                </div>
              </Panel>
            );
          })}
        </div>
        {admin && (
          <div className="mt-3">
            <FormDialog
              title="Novo ensaio"
              fields={rehearsalFields}
              trigger={<Button variant="outline" className="w-full"><Plus /> Marcar ensaio</Button>}
              onSubmit={async (v) => {
                const { error } = await db.from("rehearsals").insert({ ...v, show_id: id });
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
