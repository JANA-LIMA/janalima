import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Send, FlaskConical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fmtDate, run, today, useMe } from "@/lib/band";
import { Panel } from "@/components/band/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { previewAviso, sendAviso, sendTeste } from "@/lib/avisos.functions";

export const Route = createFileRoute("/_authenticated/avisos/enviar")({
  head: () => ({
    meta: [
      { title: "Enviar aviso — Banda Jana Lima" },
      { name: "description", content: "Envie notificações para os músicos da Banda Jana Lima." },
      { property: "og:title", content: "Enviar aviso — Banda Jana Lima" },
      { property: "og:description", content: "Envie notificações para os músicos da Banda Jana Lima." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Enviar,
});

const MODELOS: [string, string, string][] = [
  ["Confirme presença", "Confirme sua presença", "Confirme com o admin se você estará no próximo compromisso da banda."],
  ["Setlist atualizado", "Setlist atualizado", "O setlist foi atualizado. Confira a ordem dos blocos no app."],
  ["VS novo disponível", "VS novo disponível", "Tem VS novo no app. Dá uma ouvida antes do ensaio!"],
  ["Vídeo do show disponível", "Vídeo do show disponível", "O vídeo do último show já está no app."],
  ["Mudança de horário", "Mudança de horário", "Atenção: o horário mudou. Confira os detalhes no app."],
  ["Van saindo", "Van saindo!", "A van está saindo. Corre pro ponto de encontro!"],
  ["Aviso geral", "Aviso da banda", ""],
];

type Tipo = "todos" | "show" | "ensaio" | "instrumento" | "musicos";
type LinkTipo = "" | "show" | "ensaio" | "bloco" | "musica" | "video";
const sel = "h-10 w-full rounded-md border bg-background px-3 text-sm";

function Enviar() {
  const { data: me } = useMe();
  const navigate = useNavigate();
  const t = today();
  const [tipo, setTipo] = useState<Tipo>("todos");
  const [ref, setRef] = useState("");
  const [ids, setIds] = useState<string[]>([]);
  const [titulo, setTitulo] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [linkTipo, setLinkTipo] = useState<LinkTipo>("");
  const [linkRef, setLinkRef] = useState("");
  const [busy, setBusy] = useState(false);
  const preview = useServerFn(previewAviso);
  const send = useServerFn(sendAviso);
  const teste = useServerFn(sendTeste);

  const lists = useQuery({
    queryKey: ["avisos-lists", t],
    queryFn: async () => {
      const [shows, ensaios, musicos, blocos, songs, videos] = await Promise.all([
        run(supabase.from("shows").select("id,nome,data").order("data", { ascending: false }).limit(50)),
        run(supabase.from("rehearsals").select("id,data,show_id,shows(nome)").order("data", { ascending: false }).limit(50)),
        run(supabase.from("musicians").select("id,nome,instrumento").eq("ativo", true).order("nome")),
        run(supabase.from("blocks").select("id,nome").order("nome")),
        run(supabase.from("songs").select("id,titulo").order("titulo")),
        run(supabase.from("live_videos").select("id,titulo").order("created_at", { ascending: false })),
      ]);
      return { shows, ensaios, musicos, blocos, songs, videos };
    },
  });
  const L = lists.data;
  const instrumentos = useMemo(() => [...new Set((L?.musicos ?? []).map((m) => m.instrumento))].sort(), [L]);

  const audience = { tipo, ref: ref || undefined, ids: tipo === "musicos" ? ids : undefined };
  const audKey = JSON.stringify(audience);
  const { data: count } = useQuery({
    queryKey: ["aviso-preview", audKey],
    enabled: !!me?.isAdmin && (tipo === "todos" || (tipo === "musicos" ? ids.length > 0 : !!ref)),
    queryFn: () => preview({ data: audience }),
  });

  useEffect(() => setRef(""), [tipo]);
  useEffect(() => setLinkRef(""), [linkTipo]);

  if (me && !me.isAdmin) return <p className="text-sm text-muted-foreground">Somente o admin envia avisos.</p>;

  const url = (() => {
    if (!linkTipo || !linkRef) return null;
    if (linkTipo === "show") return `/shows/${linkRef}`;
    if (linkTipo === "ensaio") return `/shows/${L?.ensaios.find((e) => e.id === linkRef)?.show_id}`;
    if (linkTipo === "bloco") return `/blocos/${linkRef}`;
    if (linkTipo === "musica") return `/repertorio/${linkRef}`;
    return `/videos/${linkRef}`;
  })();

  const publico = (() => {
    if (tipo === "todos") return "Todos os músicos ativos";
    if (tipo === "show") return `Escalados: ${L?.shows.find((s) => s.id === ref)?.nome ?? "show"}`;
    if (tipo === "ensaio") { const e = L?.ensaios.find((x) => x.id === ref); return `Ensaio ${e ? fmtDate(e.data) : ""}`; }
    if (tipo === "instrumento") return `Instrumento: ${ref}`;
    return `Músicos: ${(L?.musicos ?? []).filter((m) => ids.includes(m.id)).map((m) => m.nome).join(", ")}`.slice(0, 200);
  })();

  const valid = titulo.trim() && mensagem.trim();
  const doTeste = async () => {
    setBusy(true);
    try { await teste({ data: { titulo, mensagem, url } }); toast.success("Teste enviado para você"); }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  const doSend = async () => {
    if (!count?.total) { toast.error("Escolha um público com músicos"); return; }
    if (!confirm(`Enviar para ${count.total} músico(s)?`)) return;
    setBusy(true);
    try {
      const r = await send({ data: { titulo, mensagem, url, audience, publico } });
      toast.success(`Aviso enviado: ${r.entregues} de ${r.total} receberam no celular`);
      navigate({ to: "/avisos" });
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <Link to="/avisos" className="flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="size-4" />Avisos</Link>
      <h1 className="text-3xl font-bold">Enviar aviso</h1>

      <Panel className="space-y-3">
        <Label>Público</Label>
        <select className={sel} value={tipo} onChange={(e) => setTipo(e.target.value as Tipo)}>
          <option value="todos">Todos os músicos ativos</option>
          <option value="show">Escalados de um show</option>
          <option value="ensaio">Escalados de um ensaio</option>
          <option value="instrumento">Por instrumento</option>
          <option value="musicos">Músicos específicos</option>
        </select>
        {tipo === "show" && (
          <select className={sel} value={ref} onChange={(e) => setRef(e.target.value)}>
            <option value="">Escolha o show…</option>
            {L?.shows.map((s) => <option key={s.id} value={s.id}>{fmtDate(s.data)} · {s.nome}</option>)}
          </select>
        )}
        {tipo === "ensaio" && (
          <select className={sel} value={ref} onChange={(e) => setRef(e.target.value)}>
            <option value="">Escolha o ensaio…</option>
            {L?.ensaios.map((s) => <option key={s.id} value={s.id}>{fmtDate(s.data)} · {s.shows?.nome}</option>)}
          </select>
        )}
        {tipo === "instrumento" && (
          <select className={sel} value={ref} onChange={(e) => setRef(e.target.value)}>
            <option value="">Escolha o instrumento…</option>
            {instrumentos.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
        )}
        {tipo === "musicos" && (
          <div className="grid max-h-64 grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2">
            {L?.musicos.map((m) => (
              <label key={m.id} className="flex items-center gap-2 rounded-lg border p-2 text-sm">
                <input type="checkbox" checked={ids.includes(m.id)} onChange={(e) => setIds((p) => (e.target.checked ? [...p, m.id] : p.filter((x) => x !== m.id)))} />
                {m.nome} <span className="text-xs text-muted-foreground">{m.instrumento}</span>
              </label>
            ))}
          </div>
        )}
        {count && (
          <p className="rounded-lg bg-muted p-2 text-sm">
            <b>{count.total}</b> músico(s) vão receber · <span className="text-success">{count.ativos} com notificações ativas</span>
            {count.semNotif > 0 && <> · <span className="text-sun">{count.semNotif} ainda não ativaram</span> (verão na aba Avisos)</>}
          </p>
        )}
      </Panel>

      <Panel className="space-y-3">
        <Label>Modelos</Label>
        <div className="flex flex-wrap gap-2">
          {MODELOS.map(([nome, ti, msg]) => (
            <button key={nome} type="button" onClick={() => { setTitulo(ti); setMensagem(msg); }} className="rounded-full border px-3 py-1 text-xs font-semibold hover:border-primary">{nome}</button>
          ))}
        </div>
        <div><Label>Título</Label><Input value={titulo} maxLength={80} onChange={(e) => setTitulo(e.target.value)} /></div>
        <div><Label>Mensagem</Label><Textarea value={mensagem} maxLength={400} rows={4} onChange={(e) => setMensagem(e.target.value)} /></div>
        <Label>Link (opcional)</Label>
        <select className={sel} value={linkTipo} onChange={(e) => setLinkTipo(e.target.value as LinkTipo)}>
          <option value="">Sem link (abre o app)</option>
          <option value="show">Show</option>
          <option value="ensaio">Ensaio</option>
          <option value="bloco">Bloco</option>
          <option value="musica">Música</option>
          <option value="video">Vídeo ao vivo</option>
        </select>
        {linkTipo && (
          <select className={sel} value={linkRef} onChange={(e) => setLinkRef(e.target.value)}>
            <option value="">Escolha…</option>
            {linkTipo === "show" && L?.shows.map((s) => <option key={s.id} value={s.id}>{fmtDate(s.data)} · {s.nome}</option>)}
            {linkTipo === "ensaio" && L?.ensaios.map((s) => <option key={s.id} value={s.id}>{fmtDate(s.data)} · {s.shows?.nome}</option>)}
            {linkTipo === "bloco" && L?.blocos.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
            {linkTipo === "musica" && L?.songs.map((s) => <option key={s.id} value={s.id}>{s.titulo}</option>)}
            {linkTipo === "video" && L?.videos.map((s) => <option key={s.id} value={s.id}>{s.titulo}</option>)}
          </select>
        )}
      </Panel>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button variant="outline" disabled={busy || !valid} onClick={doTeste}><FlaskConical className="size-4" />Enviar teste para mim</Button>
        <Button className="flex-1" disabled={busy || !valid || !count?.total} onClick={doSend}><Send className="size-4" />Enviar aviso{count?.total ? ` para ${count.total}` : ""}</Button>
      </div>
    </div>
  );
}
