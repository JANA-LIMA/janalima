import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Bell, BellOff, BellRing, Share, SquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { disablePush, enablePush, getPushState, type PushState } from "@/lib/push";
import { useMe } from "@/lib/band";

export function PushToggle({ compact = false }: { compact?: boolean }) {
  const { data: me } = useMe();
  const [st, setSt] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    getPushState().then(setSt).catch(() => setSt("unsupported"));
  }, []);
  if (!st || (compact && st === "on")) return null;

  const ativar = async () => {
    if (!me) return;
    setBusy(true);
    try {
      await enablePush(me.userId);
      toast.success("Notificações ativadas neste aparelho");
    } catch (e) {
      toast.error((e as Error).message || "Não foi possível ativar");
    } finally {
      setSt(await getPushState());
      setBusy(false);
    }
  };
  const desativar = async () => {
    setBusy(true);
    await disablePush().catch(() => {});
    setSt(await getPushState());
    setBusy(false);
  };

  return (
    <div className="rounded-2xl border bg-card p-4">
      {st === "on" && (
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-success"><BellRing className="size-5" />Notificações ativas neste aparelho</p>
          <Button size="sm" variant="ghost" disabled={busy} onClick={desativar}>Desativar</Button>
        </div>
      )}
      {st === "off" && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm"><b>Avisos da banda</b><br /><span className="text-muted-foreground">Receba avisos de show, setlist e VS no celular.</span></p>
          <Button disabled={busy} onClick={ativar}><Bell className="size-4" />Ativar notificações</Button>
        </div>
      )}
      {st === "ios-install" && (
        <div className="text-sm">
          <p className="flex items-center gap-2 font-bold"><Bell className="size-4 text-primary" />Ativar notificações no iPhone</p>
          <p className="mt-1 text-muted-foreground">No iPhone, os avisos só funcionam com o app na tela de início:</p>
          <ol className="mt-2 space-y-1.5">
            <li>1. Abra este link no <b>Safari</b></li>
            <li className="flex items-center gap-1">2. Toque em <b>Compartilhar</b> <Share className="size-4" /></li>
            <li className="flex items-center gap-1">3. Toque em <b>Adicionar à Tela de Início</b> <SquarePlus className="size-4" /></li>
            <li>4. Abra o app pelo ícone e toque em <b>Ativar notificações</b></li>
          </ol>
        </div>
      )}
      {st === "denied" && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground"><BellOff className="size-5" />Notificações bloqueadas. Libere nos ajustes do aparelho para este app.</p>
      )}
      {st === "unsupported" && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground"><BellOff className="size-5" />Este navegador não aceita notificações.</p>
      )}
    </div>
  );
}
