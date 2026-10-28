import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import janaAsset from "@/assets/jana-cut.webp.asset.json";
import logoAsset from "@/assets/logo.webp.asset.json";

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
    <div className="relative min-h-dvh overflow-hidden">
      {/* luzes de palco */}
      <div aria-hidden className="login-aura pointer-events-none absolute inset-0" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-background via-background/80 to-transparent"
      />

      <div className="relative mx-auto flex min-h-dvh w-full max-w-sm flex-col px-6 md:grid md:max-w-5xl md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] md:items-center md:gap-14 md:px-10">
        {/* marca + retrato */}
        <div className="relative flex min-h-0 flex-1 flex-col items-center pt-8 md:flex-none md:pt-0">
          <img
            src={logoAsset.url}
            alt="Jana Lima"
            width={1200}
            height={417}
            className="h-11 w-auto drop-shadow-[0_0_28px_color-mix(in_oklab,var(--orchid)_55%,transparent)] md:h-16"
          />
          <p className="mt-2 text-[0.62rem] font-semibold uppercase tracking-[0.42em] text-sun/80">Axé · Banda</p>

          <div className="relative mt-1 min-h-0 w-full flex-1 md:h-[76vh] md:flex-none">
            <img
              src={janaAsset.url}
              alt="Jana Lima"
              width={720}
              height={1332}
              className="mask-fade-bottom absolute inset-x-0 bottom-0 mx-auto h-full w-auto max-w-full object-contain"
            />
          </div>
        </div>

        {/* acesso */}
        <div className="relative z-10 mt-2 pb-8 md:mt-0 md:pb-0">
          {sent ? (
            <div className="rounded-2xl border border-orchid/25 bg-card/60 p-5 text-sm backdrop-blur-xl">
              <Mail className="mb-2 size-6 text-orchid" />
              {sent}
            </div>
          ) : (
            <form
              onSubmit={submit}
              className="space-y-4 rounded-2xl border border-orchid/20 bg-card/55 p-5 shadow-glow backdrop-blur-2xl"
            >
              <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted/70 p-1 text-sm">
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
                <Input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Senha</Label>
                <Input
                  type="password"
                  required
                  minLength={6}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
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
    </div>
  );
}
