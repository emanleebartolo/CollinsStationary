import { json, requireUser } from "../_lib.js";
export async function onRequestGet({ request, env }) {
  const auth = await requireUser(request, env, ["admin", "owner"]);
  if (auth.response) return auth.response;
  const { results = [] } = await env.DB.prepare(
    `SELECT id, order_number, customer_name, customer_email, customer_phone, fulfilment,
            delivery_address, subtotal_cents, status, payment_status, created_at
     FROM orders ORDER BY created_at DESC LIMIT 200`
  ).all();
  return json({ orders: results });
}
