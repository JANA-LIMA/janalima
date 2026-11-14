import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { run, type Me } from "@/lib/band";
import { canControlStage, countStageMusicians, stageCacheKey, type StageItem, type StageSession } from "@/lib/stage";

export function useStageLive(showId: string, me: Me | null | undefined) {
  const qc = useQueryClient();
  const [session, setSession] = useState<StageSession | null>(null);
  const [connected, setConnected] = useState(false);
  const [resync, setResync] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [musicians, setMusicians] = useState(0);
  const scrollRef = useRef<HTMLOListElement>(null);
  const userId = me?.userId;
  const isAdmin = !!me?.isAdmin;
  const queryKey = ["palco", showId, userId];
  const query = useQuery({
    queryKey,
    enabled: !!me?.isStaff,
    queryFn: async () => (await run(supabase.from("setlist_items")
      .select("id,blocks(nome,block_songs(position,songs(titulo,tom,observacoes))),songs(titulo,tom,observacoes)")
      .eq("show_id", showId).order("position"))) as unknown as StageItem[],
  });

  useEffect(() => {
    if (!userId || !me?.isStaff) return;
    const key = stageCacheKey(userId, showId);
    try {
      if (query.isSuccess) {
        localStorage.setItem(key, JSON.stringify({ at: Date.now(), items: query.data }));
      } else if (!qc.getQueryData(queryKey)) {
        const cached = JSON.parse(localStorage.getItem(key) ?? "null");
        if (cached && Date.now() - cached.at < 43_200_000 && Array.isArray(cached.items)) {
          qc.setQueryData(queryKey, cached.items);
        }
      }
    } catch { /* Storage may be disabled or full. */ }
  }, [userId, showId, me?.isStaff, query.data, query.isSuccess, qc]);

  useEffect(() => {
    if (!userId || !me?.isStaff) return;
    let disposed = false;
    let subscribed = false;
    const deviceId = crypto.randomUUID();
    let generation = 0;
    const readSession = async (force = false) => {
      const request = ++generation;
      const { data, error: readError } = await supabase.from("stage_sessions").select("*").eq("show_id", showId).maybeSingle();
      if (disposed || request !== generation) return;
      if (readError) { setConnected(false); return; }
      setSession(data);
      setConnected(subscribed && navigator.onLine);
      if (force) setResync((value) => value + 1);
    };
    const heartbeat = async () => {
      if (disposed || !subscribed || !navigator.onLine || document.visibilityState !== "visible") return;
      await supabase.from("stage_presence").upsert({ id: deviceId, show_id: showId, user_id: userId });
      // Prevent a late write from leaving this closed screen marked as connected.
      if (disposed) await supabase.from("stage_presence").delete().eq("id", deviceId);
    };
    const readPresence = async () => {
      if (!isAdmin || disposed) return;
      const [{ data: rows }, { data: roster }] = await Promise.all([
        supabase.from("stage_presence").select("user_id,last_seen").eq("show_id", showId).gte("last_seen", new Date(Date.now() - 60_000).toISOString()),
        supabase.from("musicians").select("user_id").eq("ativo", true),
      ]);
      if (!disposed) setMusicians(countStageMusicians(rows ?? [], (roster ?? []).flatMap((m) => m.user_id && m.user_id !== userId ? [m.user_id] : []), Date.now()));
    };
    const channel = supabase.channel(`palco-${showId}-${deviceId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "stage_sessions", filter: `show_id=eq.${showId}` }, () => { void readSession(); });
    if (isAdmin) channel.on("postgres_changes", { event: "*", schema: "public", table: "stage_presence", filter: `show_id=eq.${showId}` }, () => { void readPresence(); });
    channel.subscribe((status) => {
      subscribed = status === "SUBSCRIBED";
      if (disposed) return;
      if (subscribed) { void readSession(true); void heartbeat(); void readPresence(); }
      else { setConnected(false); setMusicians(0); }
    });
    void readSession(true);
    const offline = () => { setConnected(false); setMusicians(0); };
    const restore = () => {
      if (document.visibilityState === "visible" && navigator.onLine) {
        void readSession(true); void heartbeat(); void readPresence();
        void qc.invalidateQueries({ queryKey: ["palco", showId, userId] });
      }
    };
    window.addEventListener("offline", offline);
    window.addEventListener("online", restore);
    document.addEventListener("visibilitychange", restore);
    const timer = window.setInterval(() => { void heartbeat(); void readPresence(); void readSession(); }, 20_000);
    return () => {
      disposed = true;
      window.clearInterval(timer);
      window.removeEventListener("offline", offline);
      window.removeEventListener("online", restore);
      document.removeEventListener("visibilitychange", restore);
      void supabase.removeChannel(channel);
      void supabase.from("stage_presence").delete().eq("id", deviceId);
    };
  }, [showId, userId, isAdmin, me?.isStaff, qc]);

  const writeSession = async (itemId: string | null, active: boolean) => {
    if (!canControlStage(isAdmin, connected, busy)) return false;
    setBusy(true);
    setError("");
    try {
      const data = await run(supabase.from("stage_sessions").upsert({ show_id: showId, current_item_id: itemId, active }).select().single());
      setSession(data);
      return true;
    } catch {
      setError("Não foi possível atualizar a sessão ao vivo. Tente novamente.");
      return false;
    } finally { setBusy(false); }
  };
  return { items: query.data ?? [], loading: query.isPending, loadError: query.isError, session, connected, resync, busy, error, musicians, writeSession, scrollRef };
}