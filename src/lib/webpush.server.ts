// Web Push (RFC 8291 aes128gcm + RFC 8292 VAPID) using WebCrypto only (Workers-safe).
const enc = new TextEncoder();
// Uint8Array<ArrayBufferLike> vs BufferSource typing friction; runtime values are plain ArrayBuffers.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const subtle = crypto.subtle as any;
const b64u = (b: Uint8Array) =>
  btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64u = (s: string) =>
  Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4)), (c) => c.charCodeAt(0));
const cat = (...a: Uint8Array[]) => {
  const o = new Uint8Array(a.reduce((n, x) => n + x.length, 0));
  let i = 0;
  for (const x of a) { o.set(x, i); i += x.length; }
  return o;
};
async function hmac(key: Uint8Array, data: Uint8Array) {
  const k = await subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await subtle.sign("HMAC", k, data));
}

async function vapidJwt(aud: string, pub: string, priv: string, subject: string) {
  const p = fromB64u(pub);
  const key = await subtle.importKey(
    "jwk",
    { kty: "EC", crv: "P-256", d: priv, x: b64u(p.slice(1, 33)), y: b64u(p.slice(33, 65)), ext: true },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const h = b64u(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const c = b64u(enc.encode(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: subject })));
  const sig = new Uint8Array(await subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(`${h}.${c}`)));
  return `${h}.${c}.${b64u(sig)}`;
}

async function encrypt(payload: Uint8Array, p256dh: string, authSecret: string) {
  const uaPub = fromB64u(p256dh);
  const auth = fromB64u(authSecret);
  const as = (await subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"])) as CryptoKeyPair;
  const asPub = new Uint8Array(await subtle.exportKey("raw", as.publicKey));
  const uaKey = await subtle.importKey("raw", uaPub, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const shared = new Uint8Array(await subtle.deriveBits({ name: "ECDH", public: uaKey }, as.privateKey, 256));
  const prkKey = await hmac(auth, shared);
  const ikm = await hmac(prkKey, cat(enc.encode("WebPush: info\0"), uaPub, asPub, new Uint8Array([1])));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const prk = await hmac(salt, ikm);
  const cek = (await hmac(prk, cat(enc.encode("Content-Encoding: aes128gcm\0"), new Uint8Array([1])))).slice(0, 16);
  const nonce = (await hmac(prk, cat(enc.encode("Content-Encoding: nonce\0"), new Uint8Array([1])))).slice(0, 12);
  const k = await subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const ct = new Uint8Array(await subtle.encrypt({ name: "AES-GCM", iv: nonce }, k, cat(payload, new Uint8Array([2]))));
  const rs = new Uint8Array([0, 0, 0x10, 0]);
  return cat(salt, rs, new Uint8Array([asPub.length]), asPub, ct);
}

export type Sub = { endpoint: string; p256dh: string; auth: string };

/** Returns the HTTP status from the push service (201 = ok, 404/410 = gone). */
export async function sendPush(sub: Sub, data: unknown, vapid: { pub: string; priv: string; subject: string }) {
  const url = new URL(sub.endpoint);
  const jwt = await vapidJwt(url.origin, vapid.pub, vapid.priv, vapid.subject);
  const body = await encrypt(enc.encode(JSON.stringify(data)), sub.p256dh, sub.auth);
  const r = await fetch(sub.endpoint, {
    method: "POST",
    headers: {
      TTL: "86400",
      Urgency: "high",
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      Authorization: `vapid t=${jwt}, k=${vapid.pub}`,
    },
    body,
  });
  return r.status;
}
