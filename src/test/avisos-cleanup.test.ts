import { afterEach, describe, expect, it, vi } from "vitest";

const { sb, sendPush } = vi.hoisted(() => ({ sb: { rpc: vi.fn(), from: vi.fn() }, sendPush: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      middleware: () => builder,
      inputValidator: () => builder,
      handler: (fn: (input: unknown) => unknown) => (input: { data: unknown }) => fn({ ...input, context: { supabase: sb, userId: "admin" } }),
    };
    return builder;
  },
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/lib/push", () => ({ VAPID_PUBLIC_KEY: "public-key" }));
vi.mock("@/lib/webpush.server", () => ({ sendPush }));
import { sendAviso, sendTeste } from "@/lib/avisos.functions";

function setup(cleanup: "ok" | "error" | "throw" = "ok") {
  vi.stubEnv("VAPID_PRIVATE_KEY", "test-only-key");
  const entries = [201, 404, 410, 500].map((status) => ({ user_id: "admin", endpoint: `https://push.example/${status}`, p256dh: "test", auth: "test" }));
  const insert = vi.fn(() => ({ select: () => ({ single: async () => ({ data: { id: "announcement" }, error: null }) }) }));
  sb.from.mockImplementation((table: string) => {
    if (table === "push_subscriptions") return { select: () => ({ eq: async () => ({ data: entries }), in: async () => ({ data: entries }) }) };
    if (table === "musicians") return { select: () => ({ eq: async () => ({ data: [{ id: "musician", user_id: "admin" }], error: null }) }) };
    if (table === "announcements") return { insert, update: () => ({ eq: async () => ({ error: null }) }) };
    return { insert: vi.fn(async () => ({ error: null })) };
  });
  sb.rpc.mockImplementation(async (name: string) => {
    if (name === "is_admin") return { data: true };
    if (cleanup === "throw") throw new Error("Network failure");
    return cleanup === "error" ? { data: null, error: { code: "42501", message: "denied" } } : { data: 2, error: null };
  });
  sendPush.mockImplementation(async (s: { endpoint: string }) => ({ status: Number(s.endpoint.split("/").pop()), text: "push response" }));
}

afterEach(() => { vi.resetAllMocks(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe("Limpeza de inscrições push", () => {
  it("cleans only 404 and 410 through the authenticated RPC and preserves successful delivery", async () => {
    setup();
    const result = await sendAviso({ data: { titulo: "Teste", mensagem: "Teste", audience: { tipo: "todos" }, publico: "Todos" } });
    expect(sb.rpc).toHaveBeenCalledWith("cleanup_invalid_push_subscriptions", { _endpoints: ["https://push.example/404", "https://push.example/410"] });
    expect(result).toEqual({ total: 1, entregues: 1, removed: 2 });
  });
  it.each(["error", "throw"] as const)("logs %s cleanup failures without failing the send", async (failure) => {
    setup(failure);
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(sendTeste({ data: { titulo: "Teste", mensagem: "Teste" } })).resolves.toEqual({ ok: true });
    expect(log).toHaveBeenCalledWith("[push] Falha na limpeza de inscrições inválidas", { code: failure === "error" ? "42501" : "unknown", total: 2 });
  });
  it("rejects a non-admin before delivery or cleanup", async () => {
    setup();
    sb.rpc.mockResolvedValue({ data: false });
    await expect(sendTeste({ data: { titulo: "Teste", mensagem: "Teste" } })).rejects.toThrow("Somente o admin");
    expect(sendPush).not.toHaveBeenCalled();
    expect(sb.rpc).not.toHaveBeenCalledWith("cleanup_invalid_push_subscriptions", expect.anything());
  });
});