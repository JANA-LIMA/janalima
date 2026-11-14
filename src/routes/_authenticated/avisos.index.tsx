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
