import { useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Link2, MessageCircle, Pencil, Plus, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { db, filtrarPorInstrumento, INSTRUMENTOS, instrumentosPresentes, run, useInvalidate, useMe } from "@/lib/band";
import { Button } from "@/components/ui/button";
import { Empty, FormDialog, PageHeader, type Field } from "@/components/band/ui";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/musicos")({
  head: () => ({
    meta: [
      { title: "Músicos — Banda Jana Lima" },
      { name: "description", content: "Cadastro e acesso dos músicos da Banda Jana Lima." },
      { property: "og:title", content: "Músicos — Banda Jana Lima" },
      { property: "og:description", content: "Cadastro e acesso dos músicos da Banda Jana Lima." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Musicos,
});

const fields: Field[] = [
  { name: "nome", label: "Nome", required: true },
  { name: "instrumento", label: "Instrumento", type: "select", required: true, options: INSTRUMENTOS.map((i) => ({ value: i, label: i })) },
  { name: "whatsapp", label: "WhatsApp", placeholder: "71999998888" },
  { name: "email", label: "E-mail", type: "email" },
  { name: "ativo", label: "Acesso ao app liberado", type: "checkbox" },
];

function Musicos() {
  const { data: me } = useMe();
  const inv = useInvalidate();
  const { data = [] } = useQuery({
    queryKey: ["musicians"],
    queryFn: () => run(supabase.from("musicians").select("*").order("ativo", { ascending: false }).order("nome")),
  });

  const [filtro, setFiltro] = useState<string | null>(null);
  const instrumentos = instrumentosPresentes(data);
  const visiveis = filtrarPorInstrumento(data, filtro);

  const invite = (email: string | null) => {
    const url = `${window.location.origin}/auth?modo=cadastro${email ? `&email=${encodeURIComponent(email)}` : ""}`;
    navigator.clipboard.writeText(url);
    toast.success("Link de convite copiado");
  };

  const inviteWhats = (m: { nome: string; email: string | null; whatsapp: string | null }) => {
    const url = `${window.location.origin}/auth?modo=cadastro${m.email ? `&email=${encodeURIComponent(m.email)}` : ""}`;
    const primeiro = m.nome.split(" ")[0];
    const msg = `Fala ${primeiro}! Aqui é da Banda Jana Lima. Segue seu acesso ao app da banda com nosso repertório, tons e VS dos blocos. É só clicar, criar sua senha e pronto: ${url}`;
    window.open(`https://wa.me/55${(m.whatsapp ?? "").replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <div>
      <PageHeader
        title="Músicos"
        sub={`${data.filter((m) => m.ativo).length} com acesso`}
        action={
          me?.isAdmin && (
            <FormDialog
              title="Novo músico"
              fields={fields}
              initial={{ tipo: "fixo", ativo: true }}
              trigger={<Button variant="hero" size="sm"><Plus /> Novo</Button>}
              onSubmit={async (v) => {
                const { error } = await db.from("musicians").insert(v);
                if (error) throw error;
                inv();
              }}
            />
          )
        }
      />
      <p className="mb-3 text-xs text-muted-foreground">
        O músico cria a conta com o mesmo e-mail cadastrado aqui e ganha acesso enquanto estiver liberado.
      </p>
      {data.length > 0 && (
        <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Chip active={filtro === null} onClick={() => setFiltro(null)}>
            Todos <span className="opacity-60">{data.length}</span>
          </Chip>
          {instrumentos.map((i) => (
            <Chip key={i} active={filtro === i} onClick={() => setFiltro(filtro === i ? null : i)}>
              {i} <span className="opacity-60">{data.filter((m) => m.instrumento === i).length}</span>
            </Chip>
          ))}
        </div>
      )}
      {data.length === 0 && <Empty>Nenhum músico cadastrado.</Empty>}
      {data.length > 0 && visiveis.length === 0 && <Empty>Nenhum músico com esse instrumento.</Empty>}
      <ul className="space-y-2">
        {visiveis.map((m) => (
          <li key={m.id} className={cn("flex items-center gap-3 rounded-xl border bg-card p-3", !m.ativo && "opacity-50")}>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{m.nome}</p>
              <p className="text-xs capitalize text-muted-foreground">
                {m.instrumento} · {m.ativo ? "acesso liberado" : "sem acesso"} {m.user_id ? "· conta criada" : ""}
              </p>
            </div>
            {m.whatsapp && !m.user_id && (
              <button onClick={() => inviteWhats(m)} className="flex items-center gap-1 rounded-full bg-success/15 px-2 py-1 text-xs font-semibold text-success" aria-label="Convidar pelo WhatsApp">
                <Send className="size-3.5" /> Convidar
              </button>
            )}
            {m.whatsapp && m.user_id && (
              <a href={`https://wa.me/55${m.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="p-2 text-success" aria-label="WhatsApp">
                <MessageCircle className="size-4" />
              </a>
            )}
            {!m.user_id && (
              <button onClick={() => invite(m.email)} className="p-2 text-sun" aria-label="Copiar convite">
                <Link2 className="size-4" />
              </button>
            )}
            {me?.isAdmin && (
              <button
                onClick={async () => {
                  await db.from("musicians").update({ ativo: !m.ativo }).eq("id", m.id);
                  inv();
                }}
                className={cn("rounded-full border px-2 py-1 text-xs font-semibold", m.ativo ? "border-success text-success" : "text-muted-foreground")}
              >
                {m.ativo ? "Liberado" : "Bloqueado"}
              </button>
            )}
            <FormDialog
              title="Editar músico"
              fields={fields}
              initial={m}
              trigger={<button className="p-2 text-muted-foreground" aria-label="Editar"><Pencil className="size-4" /></button>}
              onSubmit={async (v) => {
                const { error } = await db.from("musicians").update(v).eq("id", m.id);
                if (error) throw error;
                inv();
              }}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition-colors",
        active
          ? "border-transparent bg-primary text-primary-foreground shadow-glow"
          : "border-border text-muted-foreground",
      )}
    >
      {children}
    </button>
  );
}
