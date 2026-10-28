import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Home, Music2, Layers, CalendarDays, PlaySquare, Users, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/band";
import logoOfficial from "@/assets/logo-official.webp.asset.json";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: Layout,
});

function Layout() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const nav = [
    { to: "/inicio", label: "Início", icon: Home, show: true },
    { to: "/shows", label: "Shows", icon: CalendarDays, show: true },
    { to: "/repertorio", label: "Músicas", icon: Music2, show: !!me?.isStaff },
    { to: "/blocos", label: "Blocos", icon: Layers, show: !!me?.isStaff },
    { to: "/videos", label: "Vídeos", icon: PlaySquare, show: !!me?.isStaff },
  ].filter((n) => n.show);

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link to="/inicio" aria-label="Banda Jana Lima — Início" className="flex items-center gap-2">
            <img src={logoOfficial.url} alt="Jana Lima" className="logo-pop h-9 w-auto" />
          </Link>
          <div className="flex items-center gap-1">
            {me?.isAdmin && (
              <Link to="/musicos" className="rounded-lg p-2 text-muted-foreground hover:text-foreground" aria-label="Músicos">
                <Users className="size-5" />
              </Link>
            )}
            <button onClick={signOut} className="rounded-lg p-2 text-muted-foreground hover:text-foreground" aria-label="Sair">
              <LogOut className="size-5" />
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 pt-5">
        {me && !me.isStaff ? (
          <div className="rounded-2xl border bg-card p-6 text-center">
            <h2 className="text-xl font-bold">Acesso não liberado</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Sua conta ({me.email}) ainda não tem acesso ao app. Peça ao admin para liberar você na tela Músicos.
            </p>
          </div>
        ) : (
          <Outlet />
        )}
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex max-w-3xl justify-around">
          {nav.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold text-muted-foreground"
              activeProps={{ className: "text-primary" }}
            >
              <Icon className="size-5" />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
