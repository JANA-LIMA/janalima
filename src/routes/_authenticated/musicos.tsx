import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Link2, MessageCircle, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { db, INSTRUMENTOS, run, useInvalidate, useMe } from "@/lib/band";
import { Button } from "@/components/ui/button";
import { Empty, FormDialog, PageHeader, type Field } from "@/components/band/ui";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/musicos")({
  head: () => ({ meta: [{ title: "Músicos — Banda Jana Lima" }] }),
  component: Musicos,
});

const fields: Field[] = [
  { name: "nome", label: "Nome", required: true },
  { name: "instrumento", label: "Instrumento", type: "select", required: true, options: INSTRUMENTOS.map((i) => ({ value: i, label: i })) },
  { name: "whatsapp", label: "WhatsApp", placeholder: "71999998888" },
  { name: "email", label: "E-mail", type: "email" },
  { name: "tipo", label: "Tipo", type: "select", required: true, options: [{ value: "fixo", label: "Fixo" }, { value: "freela", label: "Freela" }] },
  { name: "ativo", label: "Ativo", type: "checkbox" },
];

function Musicos() {
  const { data: me } = useMe();
  const inv = useInvalidate();
  const { data = [] } = useQuery({
    queryKey: ["musicians"],
    queryFn: () => run(supabase.from("musicians").select("*").order("ativo", { ascending: false }).order("nome")),
  });

  const invite = (email: string | null) => {
    const url = `${window.location.origin}/auth?modo=cadastro${email ? `&email=${encodeURIComponent(email)}` : ""}`;
    navigator.clipboard.writeText(url);
    toast.success("Link de convite copiado");
  };

  return (
    <div>
      <PageHeader
        title="Músicos"
        sub={`${data.filter((m) => m.ativo).length} ativos`}
        action={
          me?.isAdmin && (
            <FormDialog
              title="Novo músico"
              fields={fields}
              initial={{ tipo: "freela", ativo: true }}
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
      <p className="mb-4 text-xs text-muted-foreground">
        O músico cria a conta com o mesmo e-mail cadastrado aqui e ganha acesso automaticamente.
      </p>
      {data.length === 0 && <Empty>Nenhum músico cadastrado.</Empty>}
      <ul className="space-y-2">
        {data.map((m) => (
          <li key={m.id} className={cn("flex items-center gap-3 rounded-xl border bg-card p-3", !m.ativo && "opacity-50")}>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{m.nome}</p>
              <p className="text-xs capitalize text-muted-foreground">
                {m.instrumento} · {m.tipo} {!m.ativo && "· inativo"} {m.user_id ? "· conta ativa" : ""}
              </p>
            </div>
            {m.whatsapp && (
              <a href={`https://wa.me/55${m.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="p-2 text-success" aria-label="WhatsApp">
                <MessageCircle className="size-4" />
              </a>
            )}
            {!m.user_id && (
              <button onClick={() => invite(m.email)} className="p-2 text-sun" aria-label="Copiar convite">
                <Link2 className="size-4" />
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
