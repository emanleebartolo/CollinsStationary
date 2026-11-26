import { json, error, requireUser, safeText, randomHex } from "../_lib.js";

export async function onRequestGet({ env }) {
  const { results = [] } = await env.DB.prepare(
    "SELECT id, sku, name, category, description, price_cents, stock, icon FROM products WHERE active = 1 ORDER BY category, name"
  ).all();
  return json({ products: results });
}

export async function onRequestPost({ request, env }) {
  const auth = await requireUser(request, env, ["admin"]);
  if (auth.response) return auth.response;
  let b; try { b = await request.json(); } catch { return error("Invalid request body."); }
  const name = safeText(b.name, 180), category = safeText(b.category, 80);
  const price = Number(b.price_cents), stock = Number(b.stock);
  if (!name || !category || !Number.isInteger(price) || price < 0 || !Number.isInteger(stock) || stock < 0) return error("Provide a product name, category, price in cents and stock quantity.");
  const id = randomHex(12), sku = safeText(b.sku, 80) || null;
  try {
    await env.DB.prepare("INSERT INTO products (id, sku, name, category, description, price_cents, stock, icon) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(id, sku, name, category, safeText(b.description, 1200), price, stock, safeText(b.icon, 16) || "📦").run();
  } catch { return error("Could not add product. Check whether the SKU is already in use.", 409); }
  return json({ ok: true, id }, 201);
}

export async function onRequestPatch({ request, env }) {
  const auth = await requireUser(request, env, ["admin", "owner"]);
  if (auth.response) return auth.response;
  let b; try { b = await request.json(); } catch { return error("Invalid request body."); }
  const id = safeText(b.id, 64);
  if (!id) return error("Product ID is required.");
  const existing = await env.DB.prepare("SELECT * FROM products WHERE id = ?").bind(id).first();
  if (!existing) return error("Product not found.", 404);

  if (auth.user.role === "owner") {
    const allowed = Object.keys(b).every(k => ["id", "price_cents", "stock"].includes(k));
    if (!allowed) return error("Owner accounts can update price and stock only.", 403);
  }
  const name = b.name === undefined ? existing.name : safeText(b.name, 180);
  const category = b.category === undefined ? existing.category : safeText(b.category, 80);
  const description = b.description === undefined ? existing.description : safeText(b.description, 1200);
  const price = b.price_cents === undefined ? existing.price_cents : Number(b.price_cents);
  const stock = b.stock === undefined ? existing.stock : Number(b.stock);
  const icon = b.icon === undefined ? existing.icon : safeText(b.icon, 16);
  const active = b.active === undefined ? existing.active : (b.active ? 1 : 0);
  if (!name || !category || !Number.isInteger(price) || price < 0 || !Number.isInteger(stock) || stock < 0) return error("Invalid product values.");
  await env.DB.prepare("UPDATE products SET name=?, category=?, description=?, price_cents=?, stock=?, icon=?, active=?, updated_at=datetime('now') WHERE id=?")
    .bind(name, category, description, price, stock, icon, active, id).run();
  return json({ ok: true });
}

export async function onRequestDelete({ request, env }) {
  const auth = await requireUser(request, env, ["admin"]);
  if (auth.response) return auth.response;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return error("Product ID is required.");
  await env.DB.prepare("UPDATE products SET active=0, updated_at=datetime('now') WHERE id=?").bind(id).run();
  return json({ ok: true });
}
