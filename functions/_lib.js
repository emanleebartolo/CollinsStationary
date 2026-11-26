const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers }
  });

const error = (message, status = 400) => json({ error: message }, status);

function cookieValue(request, name) {
  const raw = request.headers.get("Cookie") || "";
  const found = raw.split(";").map(v => v.trim()).find(v => v.startsWith(name + "="));
  return found ? decodeURIComponent(found.slice(name.length + 1)) : null;
}
function bytesToHex(bytes) {
  return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, "0")).join("");
}
function randomHex(length = 32) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}
async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bytesToHex(digest);
}
async function passwordHash(password, saltHex) {
  const salt = new Uint8Array(saltHex.match(/.{2}/g).map(x => parseInt(x, 16)));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 310000, hash: "SHA-256" }, key, 256);
  return bytesToHex(bits);
}
async function getUser(request, env) {
  const token = cookieValue(request, "collins_session");
  if (!token) return null;
  const tokenHash = await sha256(token);
  const row = await env.DB.prepare(
    `SELECT users.id, users.username, users.display_name, users.role
     FROM sessions JOIN users ON users.id = sessions.user_id
     WHERE sessions.token_hash = ? AND sessions.expires_at > datetime('now') AND users.active = 1`
  ).bind(tokenHash).first();
  return row || null;
}
async function requireUser(request, env, roles = ["admin", "owner"]) {
  const user = await getUser(request, env);
  if (!user) return { response: error("Please sign in.", 401) };
  if (!roles.includes(user.role)) return { response: error("You do not have permission for this action.", 403) };
  return { user };
}
function sessionCookie(token, maxAge = 604800) {
  return `collins_session=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}
function clearSessionCookie() {
  return "collins_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0";
}
function safeText(value, max = 180) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
function validPassword(password) {
  return typeof password === "string" && password.length >= 12 && password.length <= 200;
}
export { json, error, randomHex, sha256, passwordHash, getUser, requireUser, sessionCookie, clearSessionCookie, safeText, validPassword };
