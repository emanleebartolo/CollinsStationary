import { json, error, randomHex, sha256, passwordHash, getUser, sessionCookie, clearSessionCookie, safeText, validPassword } from "../../_lib.js";

export async function onRequestGet({ request, env }) {
  const user = await getUser(request, env);
  return json({ user: user ? { username: user.username, displayName: user.display_name, role: user.role } : null });
}

export async function onRequestPost({ request, env }) {
  const url = new URL(request.url);
  let body;
  try { body = await request.json(); } catch { return error("Invalid request body."); }

  if (url.pathname.endsWith("/setup")) {
    const existing = await env.DB.prepare("SELECT COUNT(*) AS n FROM users").first();
    if (existing?.n > 0) return error("Initial setup has already been completed.", 409);
    if (!env.SETUP_SECRET || body.setupSecret !== env.SETUP_SECRET) return error("Invalid setup secret.", 403);
    const username = safeText(body.username, 80).toLowerCase();
    const displayName = safeText(body.displayName, 100);
    const password = body.password;
    if (!/^[a-z0-9._-]{3,80}$/.test(username)) return error("Username must be 3–80 characters and use letters, numbers, dots, dashes or underscores.");
    if (!displayName || !validPassword(password)) return error("Enter a display name and a password of at least 12 characters.");
    const salt = randomHex(16), hash = await passwordHash(password, salt), id = randomHex(16);
    try {
      await env.DB.prepare("INSERT INTO users (id, username, display_name, role, password_hash, password_salt) VALUES (?, ?, ?, 'admin', ?, ?)")
        .bind(id, username, displayName, hash, salt).run();
    } catch { return error("Could not create the administrator. The username may already exist or setup has already completed.", 409); }
    return json({ ok: true, message: "Administrator created. You can now sign in." }, 201);
  }

  if (url.pathname.endsWith("/login")) {
    const username = safeText(body.username, 80).toLowerCase();
    const password = body.password;
    const ipHash = await sha256(request.headers.get("CF-Connecting-IP") || "unknown");
    const usernameHash = await sha256(username || "empty");
    const recent = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM login_attempts WHERE (ip_hash = ? OR username_hash = ?) AND created_at > datetime('now', '-15 minutes')"
    ).bind(ipHash, usernameHash).first();
    if ((recent?.n || 0) >= 10) return error("Too many sign-in attempts. Please wait 15 minutes and try again.", 429);
    const row = await env.DB.prepare("SELECT * FROM users WHERE username = ? AND active = 1").bind(username).first();
    if (!row || typeof password !== "string" || await passwordHash(password, row.password_salt) !== row.password_hash) {
      await env.DB.prepare("INSERT INTO login_attempts (id, ip_hash, username_hash) VALUES (?, ?, ?)")
        .bind(randomHex(12), ipHash, usernameHash).run();
      return error("Incorrect username or password.", 401);
    }
    await env.DB.prepare("DELETE FROM login_attempts WHERE ip_hash = ? OR username_hash = ?").bind(ipHash, usernameHash).run();
    const token = randomHex(32), tokenHash = await sha256(token);
    await env.DB.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, datetime('now', '+7 days'))")
      .bind(tokenHash, row.id).run();
    return json({ ok: true, user: { username: row.username, displayName: row.display_name, role: row.role } }, 200, {
      "set-cookie": sessionCookie(token)
    });
  }

  if (url.pathname.endsWith("/logout")) {
    const raw = request.headers.get("Cookie") || "";
    const match = raw.match(/(?:^|;\s*)collins_session=([^;]+)/);
    if (match) {
      const token = decodeURIComponent(match[1]);
      await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(token)).run();
    }
    return json({ ok: true }, 200, { "set-cookie": clearSessionCookie() });
  }
  return error("Not found.", 404);
}
