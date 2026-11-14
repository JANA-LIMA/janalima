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
    ? await sb.from("push_subscriptions").select("user_id,endpoint,p256dh,auth").in("user_id", userIds)
    : { data: [] };
  return { musicians, subs: (subs ?? []) as { user_id: string; endpoint: string; p256dh: string; auth: string }[] };
}

async function deliver(subs: { user_id: string; endpoint: string; p256dh: string; auth: string }[], payload: unknown) {
  const priv = process.env["VAPID_PRIVATE_KEY"];
  if (!priv) throw new Error("VAPID_PRIVATE_KEY não configurada");
  const { sendPush } = await import("@/lib/webpush.server");
  const vapid = { pub: VAPID_PUBLIC_KEY, priv, subject: "mailto:contato@janalima.app" };
  const ok = new Set<string>();
  const gone: string[] = [];
  await Promise.all(
    subs.map(async (s) => {
      try {
        const st = await sendPush(s, payload, vapid);
        if (st >= 200 && st < 300) ok.add(s.user_id);
        else if (st === 404 || st === 410) gone.push(s.endpoint);
        else console.error("push status", st);
      } catch (e) {
        console.error("push fail", e);
      }
    }),
  );
  if (gone.length) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("push_subscriptions").delete().in("endpoint", gone);
  }
  return { okUsers: ok, removed: gone.length };
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
    const { okUsers, removed } = await deliver(subs, { title: data.titulo, body: data.mensagem, url: data.url || "/avisos", tag: ann.id });
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
      .from("push_subscriptions").select("user_id,endpoint,p256dh,auth").eq("user_id", context.userId);
    if (!subs?.length) throw new Error("Ative as notificações neste aparelho primeiro");
    const { okUsers } = await deliver(subs, { title: `[Teste] ${data.titulo}`, body: data.mensagem, url: data.url || "/avisos" });
    return { ok: okUsers.size > 0 };
  });
