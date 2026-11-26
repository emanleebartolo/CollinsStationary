import { json, error, requireUser, randomHex, passwordHash, safeText, validPassword } from "../_lib.js";
export async function onRequestPost({ request, env }) {
  const auth = await requireUser(request, env, ["admin"]);
  if (auth.response) return auth.response;
  let b; try { b = await request.json(); } catch { return error("Invalid request body."); }
  const username = safeText(b.username, 80).toLowerCase();
  const displayName = safeText(b.displayName, 100);
  const role = b.role === "admin" ? "admin" : "owner";
  if (!/^[a-z0-9._-]{3,80}$/.test(username) || !displayName || !validPassword(b.password)) return error("Enter a valid username, display name and password of at least 12 characters.");
  const salt = randomHex(16), hash = await passwordHash(b.password, salt), id = randomHex(16);
  try {
    await env.DB.prepare("INSERT INTO users (id, username, display_name, role, password_hash, password_salt) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(id, username, displayName, role, hash, salt).run();
  } catch { return error("Could not create account. Username may already be in use.", 409); }
  return json({ ok: true }, 201);
}
