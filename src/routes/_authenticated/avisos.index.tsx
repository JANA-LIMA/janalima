import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Send, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { run, useMe } from "@/lib/band";
import { Empty, PageHeader } from "@/components/band/ui";
import { PushToggle } from "@/components/band/PushToggle";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/avisos/")({
  head: () => ({
    meta: [
      { title: "Avisos — Banda Jana Lima" },
      { name: "description", content: "Avisos enviados para os músicos da Banda Jana Lima." },
      { property: "og:title", content: "Avisos — Banda Jana Lima" },
      { property: "og:description", content: "Avisos enviados para os músicos da Banda Jana Lima." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Avisos,
});

const GONE = [400, 401, 403, 404, 410];
function Avisos() {
  const { data: me } = useMe();
  const { data: avisos = [] } = useQuery({
    queryKey: ["avisos", me?.isAdmin],
    queryFn: () =>
      run(supabase.from("announcements").select("id,titulo,mensagem,url,publico,total_destinatarios,total_entregues,created_at").order("created_at", { ascending: false }).limit(100)),
  });
  return (
    <div className="space-y-4">
      <PageHeader
        title="Avisos"
        sub={me?.isAdmin ? "Histórico de avisos enviados" : "Avisos que a banda enviou para você"}
        action={me?.isAdmin && <Button asChild><Link to="/avisos/enviar"><Send className="size-4" />Enviar aviso</Link></Button>}
      />
      <PushToggle />
      {me?.isAdmin && <Testes />}
      {avisos.length ? (
        <ul className="space-y-2">
          {avisos.map((a) => (
            <li key={a.id} className="rounded-xl border bg-card p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="font-bold">{a.titulo}</p>
                <span className="shrink-0 text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              <p className="mt-1 whitespace-pre-line text-sm">{a.mensagem}</p>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {me?.isAdmin && <span>{a.publico} · recebido por {a.total_entregues} de {a.total_destinatarios}</span>}
                {me?.isAdmin && <Entregas id={a.id} />}
                {a.url && <a href={a.url} className="flex items-center gap-1 font-semibold text-primary"><ExternalLink className="size-3" />Abrir</a>}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <Empty>Nenhum aviso ainda.</Empty>
      )}
    </div>
  );
}

type Entrega = { id: string; ok: boolean; status: number | null; erro: string | null; user_agent: string | null; endpoint: string; created_at: string; user_id: string | null };

function device(ua: string | null, endpoint: string) {
  const host = (() => { try { return new URL(endpoint).hostname; } catch { return ""; } })();
  const svc = host.includes("apple") ? "Apple" : host.includes("google") ? "Google" : host.includes("mozilla") ? "Mozilla" : host;
  const so = !ua ? "?" : /iPhone|iPad/.test(ua) ? "iPhone" : /Android/.test(ua) ? "Android" : /Macintosh/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : "Navegador";
  return `${so} · ${svc}`;
}

function Linhas({ rows: all }: { rows: Entrega[] }) {
  // Hide subscriptions removed as invalid (400/401/403/404/410) and list successes first.
  const rows = all.filter((r) => !GONE.includes(r.status ?? 0)).sort((a, b) => Number(b.ok) - Number(a.ok));
  const { data: nomes = {} } = useQuery({
    queryKey: ["entregas-nomes"],
    queryFn: async () => {
      const ms = await run(supabase.from("musicians").select("nome,user_id"));
      return Object.fromEntries(ms.filter((m) => m.user_id).map((m) => [m.user_id as string, m.nome]));
    },
  });
  if (!rows.length) return <p className="text-xs text-muted-foreground">Nenhum aparelho com notificações ativas recebeu tentativa de envio.</p>;
  return (
    <ul className="mt-2 w-full space-y-1">
      {rows.map((r) => (
        <li key={r.id} className="rounded-lg border p-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded px-1.5 py-0.5 font-bold ${r.ok ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"}`}>
              {r.ok ? "Sucesso" : "Erro"} {r.status ?? "—"}
            </span>
            <span className="font-semibold text-foreground">{(r.user_id && nomes[r.user_id]) || "?"}</span>
            <span>{device(r.user_agent, r.endpoint)}</span>
          </div>
          {r.erro && <p className="mt-1 break-all font-mono text-destructive">{r.erro}</p>}
        </li>
      ))}
    </ul>
  );
}

function Entregas({ id }: { id: string }) {
  const { data = [] } = useQuery({
    queryKey: ["entregas", id],
    queryFn: () => run(supabase.from("push_deliveries").select("*").eq("announcement_id", id).order("created_at")),
  });
  return (
    <details className="w-full">
      <summary className="cursor-pointer font-semibold text-primary">Status por aparelho ({data.filter((d) => d.status === 201).length}/{data.filter((d) => !GONE.includes(d.status ?? 0)).length})</summary>
      <Linhas rows={data as Entrega[]} />
    </details>
  );
}

function Testes() {
  const { data = [] } = useQuery({
    queryKey: ["entregas-teste"],
    queryFn: () => run(supabase.from("push_deliveries").select("*").is("announcement_id", null).order("created_at", { ascending: false }).limit(10)),
  });
  if (!data.length) return null;
  return (
    <details className="rounded-xl border bg-card p-3 text-xs text-muted-foreground">
      <summary className="cursor-pointer font-semibold text-primary">Últimos envios de teste</summary>
      <Linhas rows={data as Entrega[]} />
    </details>
  );
}
