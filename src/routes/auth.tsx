import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Search = { email?: string | undefined; modo?: string | undefined };

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>): Search => ({
    email: typeof s["email"] === "string" ? s["email"] : undefined,
    modo: typeof s["modo"] === "string" ? s["modo"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Entrar — Banda Jana Lima" },
      { name: "description", content: "Acesse a área da banda de Jana Lima." },
      { property: "og:title", content: "Entrar — Banda Jana Lima" },
      { property: "og:description", content: "Acesse a área da banda de Jana Lima." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"entrar" | "cadastro">(search.modo === "cadastro" ? "cadastro" : "entrar");
  const [email, setEmail] = useState(search.email ?? "");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/inicio", replace: true });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "entrar") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/inicio", replace: true });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (data.session) navigate({ to: "/inicio", replace: true });
        else setSent("Enviamos um e-mail de confirmação. Abra o link para ativar sua conta.");
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const magic = async () => {
    if (!email) {
      toast.error("Digite seu e-mail");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else setSent("Link mágico enviado! Confira seu e-mail.");
  };

  return (
    <div className="relative flex min-h-screen flex-col justify-center overflow-hidden px-6 py-10">
      <div className="pointer-events-none absolute -top-32 -right-24 size-80 rounded-full bg-gradient-axe opacity-30 blur-3xl" />
      <div className="relative mx-auto w-full max-w-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sun">Axé · Banda</p>
        <h1 className="mt-2 text-5xl font-extrabold leading-none">
          Banda <span className="text-gradient-axe">Jana Lima</span>
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">Repertório, VS, shows e ensaios num só lugar.</p>

        {sent ? (
          <div className="mt-8 rounded-2xl border bg-card p-5 text-sm">
            <Mail className="mb-2 size-6 text-primary" />
            {sent}
          </div>
        ) : (
          <form onSubmit={submit} className="mt-8 space-y-4 rounded-2xl border bg-card p-5">
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 text-sm">
              {(["entrar", "cadastro"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`rounded-md py-1.5 font-semibold ${mode === m ? "bg-card text-foreground" : "text-muted-foreground"}`}
                >
                  {m === "entrar" ? "Entrar" : "Criar conta"}
                </button>
              ))}
            </div>
            <div className="space-y-1">
              <Label>E-mail</Label>
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Senha</Label>
              <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" variant="hero" className="w-full" disabled={busy}>
              {mode === "entrar" ? "Entrar" : "Criar conta"}
            </Button>
            <Button type="button" variant="outline" className="w-full" onClick={magic} disabled={busy}>
              <Mail /> Receber link mágico
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
