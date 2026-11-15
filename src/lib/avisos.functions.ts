import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { VAPID_PUBLIC_KEY } from "@/lib/push";

const audience = z.object({
  tipo: z.enum(["todos", "show", "ensaio", "instrumento", "musicos"]),
  ref: z.string().max(100).optional(),
  ids: z.array(z.string().uuid()).max(500).optional(),
});
type Audience = z.infer<typeof audience>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;

async function assertAdmin(sb: Db) {
  const { data } = await sb.rpc("is_admin");
  if (!data) throw new Error("Somente o admin pode enviar avisos");
}

async function resolve(sb: Db, a: Audience) {
  let q = sb.from("musicians").select("id,user_id,nome").eq("ativo", true);
  if (a.tipo === "instrumento") q = q.eq("instrumento", a.ref ?? "");
  if (a.tipo === "musicos") q = q.in("id", a.ids?.length ? a.ids : ["00000000-0000-0000-0000-000000000000"]);
  if (a.tipo === "show" || a.tipo === "ensaio") {
    let showId = a.ref ?? "";
    if (a.tipo === "ensaio") {
      const { data: r } = await sb.from("rehearsals").select("show_id").eq("id", showId).maybeSingle();
      showId = r?.show_id ?? "00000000-0000-0000-0000-000000000000";
    }
    const { data: l } = await sb.from("show_lineup").select("musician_id").eq("show_id", showId);
    const ids = (l ?? []).map((x: { musician_id: string }) => x.musician_id);
    q = q.in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
  }
  const { data: ms, error } = await q;
  if (error) throw error;
  const musicians = (ms ?? []) as { id: string; user_id: string | null }[];
  const userIds = musicians.map((m) => m.user_id).filter(Boolean) as string[];
  const { data: subs } = userIds.length
    ? await sb.from("push_subscriptions").select("user_id,endpoint,p256dh,auth,user_agent").in("user_id", userIds)
    : { data: [] };
  return { musicians, subs: (subs ?? []) as SubRow[] };
}

type SubRow = { user_id: string; endpoint: string; p256dh: string; auth: string; user_agent?: string | null };

async function deliver(sb: Db, subs: SubRow[], payload: unknown, announcementId: string | null) {
  const priv = (process.env["VAPID_PRIVATE_KEY"] ?? "").trim();
  const { sendPush } = await import("@/lib/webpush.server");
  const vapid = { pub: VAPID_PUBLIC_KEY, priv, subject: "mailto:contato@janalima.app" };
  const ok = new Set<string>();
  const gone: string[] = [];
  const log: { announcement_id: string | null; user_id: string; endpoint: string; user_agent: string | null; ok: boolean; status: number | null; erro: string | null }[] = [];
  await Promise.all(
    subs.map(async (s) => {
      const base = { announcement_id: announcementId, user_id: s.user_id, endpoint: s.endpoint, user_agent: s.user_agent ?? null };
      try {
        if (!priv) throw new Error("VAPID_PRIVATE_KEY não configurada no servidor");
        const { status, text } = await sendPush(s, payload, vapid);
        const good = status >= 200 && status < 300;
        if (status === 201) ok.add(s.user_id);
        else if ([400, 401, 403, 404, 410].includes(status)) gone.push(s.endpoint);
        log.push({ ...base, ok: good, status, erro: good ? null : text || `HTTP ${status}` });
      } catch (e) {
        const m = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
        log.push({ ...base, ok: false, status: null, erro: `Erro local (chave VAPID inválida?): ${m}`.slice(0, 500) });
      }
    }),
  );
  if (log.length) await sb.from("push_deliveries").insert(log);
  let removed = 0;
  if (gone.length) {
    try {
      const { data, error } = await sb.rpc("cleanup_invalid_push_subscriptions", { _endpoints: gone });
      if (error) throw error;
      removed = data ?? 0;
    } catch (error) {
      // Cleanup is best-effort: never mask delivery results or expose endpoints/keys in logs.
      const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "unknown";
      console.error("[push] Falha na limpeza de inscrições inválidas", { code, total: gone.length });
    }
  }
  return { okUsers: ok, removed };
}

export const previewAviso = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => audience.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase);
    const { musicians, subs } = await resolve(context.supabase, data);
    const withSub = new Set(subs.map((s) => s.user_id));
    const ativos = musicians.filter((m) => m.user_id && withSub.has(m.user_id)).length;
    return { total: musicians.length, ativos, semNotif: musicians.length - ativos };
  });

const msg = z.object({
  titulo: z.string().trim().min(1).max(80),
  mensagem: z.string().trim().min(1).max(400),
  url: z.string().regex(/^\/[a-zA-Z0-9/_-]*$/).max(200).optional().nullable(),
});

export const sendAviso = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => msg.extend({ audience, publico: z.string().max(200) }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    await assertAdmin(sb);
    const { musicians, subs } = await resolve(sb, data.audience);
    if (!musicians.length) throw new Error("Nenhum músico nesse público");
    const { data: ann, error } = await sb
      .from("announcements")
      .insert({ titulo: data.titulo, mensagem: data.mensagem, url: data.url ?? null, publico: data.publico, enviado_por: context.userId, total_destinatarios: musicians.length })
      .select("id")
      .single();
    if (error) throw error;
    await sb.from("announcement_recipients").insert(musicians.map((m) => ({ announcement_id: ann.id, musician_id: m.id })));
    const { okUsers, removed } = await deliver(sb, subs, { title: data.titulo, body: data.mensagem, url: data.url || "/avisos", tag: ann.id }, ann.id);
    const entregues = musicians.filter((m) => m.user_id && okUsers.has(m.user_id)).length;
    await sb.from("announcements").update({ total_entregues: entregues }).eq("id", ann.id);
    return { total: musicians.length, entregues, removed };
  });

export const sendTeste = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => msg.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase);
    const { data: subs } = await context.supabase
      .from("push_subscriptions").select("user_id,endpoint,p256dh,auth,user_agent").eq("user_id", context.userId);
    if (!subs?.length) throw new Error("Ative as notificações neste aparelho primeiro");
    const { okUsers } = await deliver(context.supabase, subs, { title: `[Teste] ${data.titulo}`, body: data.mensagem, url: data.url || "/avisos", tag: `teste-${Date.now()}` }, null);
    if (!okUsers.size) throw new Error("Falha no envio do teste. Veja os detalhes no histórico de Avisos.");
    return { ok: true };
  });
