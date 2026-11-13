import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Untyped handle for generic CRUD helpers; RLS enforces access server-side.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db = supabase as any;

export const INSTRUMENTOS = [
  "bateria",
  "percussão",
  "baixo",
  "guitarra",
  "teclado",
  "sax",
  "trompete",
  "trombone",
  "backing vocal",
  "outro",
];

export type Me = {
  userId: string;
  email: string;
  isAdmin: boolean;
  isStaff: boolean;
  musicianId: string | null;
  nome: string | null;
};

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async (): Promise<Me | null> => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const [{ data: roles }, { data: mus }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", u.user.id),
        supabase.from("musicians").select("id,nome,ativo").eq("user_id", u.user.id).maybeSingle(),
      ]);
      const r = (roles ?? []).map((x) => x.role);
      const isAdmin = r.includes("admin");
      return {
        userId: u.user.id,
        email: u.user.email ?? "",
        isAdmin,
        isStaff: isAdmin || !!mus?.ativo,
        musicianId: mus?.id ?? null,
        nome: mus?.nome ?? null,
      };
    },
  });
}

/** Instruments that actually appear in the list, in INSTRUMENTOS order (unknown ones last, A–Z). */
export function instrumentosPresentes<T extends { instrumento?: string | null }>(ms: T[]) {
  const presentes = new Set(ms.map((m) => m.instrumento).filter(Boolean) as string[]);
  const conhecidos = INSTRUMENTOS.filter((i) => presentes.has(i));
  const extras = [...presentes].filter((i) => !INSTRUMENTOS.includes(i)).sort();
  return [...conhecidos, ...extras];
}

/** Musicians matching the chosen instrument; null means "no filter". */
export function filtrarPorInstrumento<T extends { instrumento?: string | null }>(ms: T[], instrumento: string | null) {
  return instrumento ? ms.filter((m) => m.instrumento === instrumento) : ms;
}

/** Run a supabase query and throw on error. */
export async function run<T>(p: PromiseLike<{ data: T; error: unknown }>): Promise<NonNullable<T>> {
  const { data, error } = await p;
  if (error) throw error;
  return data as NonNullable<T>;
}

export function useInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries();
}

export function youtubeId(url?: string | null) {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/|live\/)([\w-]{11})/);
  return m ? m[1] : null;
}

export function embedUrl(url: string | null | undefined, start = 0, autoplay = false) {
  const id = youtubeId(url);
  if (!id) return null;
  return `https://www.youtube.com/embed/${id}?start=${Math.max(0, Math.floor(start))}${autoplay ? "&autoplay=1" : ""}&rel=0`;
}

export function fmtTime(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

export function parseTime(v: string) {
  const parts = v.trim().split(":").map((x) => parseInt(x, 10) || 0);
  return parts.reduce((acc, n) => acc * 60 + n, 0);
}

export function fmtDate(d?: string | null) {
  if (!d) return "";
  const [y = 0, m = 1, day = 1] = d.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

export const hhmm = (t?: string | null) => (t ? t.slice(0, 5) : "");

export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
