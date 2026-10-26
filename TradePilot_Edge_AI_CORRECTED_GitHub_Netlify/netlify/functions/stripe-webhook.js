const crypto = require("crypto");

function verifyStripeSignature(rawBody, sigHeader, secret) {
  if(!secret) return false;
  if(!sigHeader) return false;

  const parts = sigHeader.split(",");
  let timestamp = "";
  let signature = "";

  for(const part of parts) {
    const [k, v] = part.split("=");
    if(k === "t") timestamp = v;
    if(k === "v1") signature = v;
  }

  if(!timestamp || !signature || Math.abs(Date.now()/1000-Number(timestamp))>300) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch(e) {
    return false;
  }
}

async function upsertAccess(email, plan, active) {
  const SUPABASE_URL = process.env.SUPABASE_URL || "https://ouilcegadmbduvvureat.supabase.co";
  const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if(!SUPABASE_URL || !SERVICE_ROLE) throw new Error("Missing Supabase environment variables");
  if(!email) throw new Error("Missing customer email");

  const normalizedEmail = email.toLowerCase().trim();
  const isAi = plan === "ai";

  const body = {
    email: normalizedEmail,
    pro_active: active ? true : false,
    ai_active: active && isAi ? true : false,
    updated_at: new Date().toISOString()
  };

  if(active && isAi) body.pro_active = true;

  const url = `${SUPABASE_URL}/rest/v1/user_access?on_conflict=email`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates"
    },
    body: JSON.stringify(body)
  });

  if(!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase write failed: ${text}`);
  }

  return body;
}

function getEmailFromObject(obj) {
  return (
    obj.customer_email ||
    (obj.customer_details && obj.customer_details.email) ||
    obj.client_reference_id ||
    (obj.metadata && obj.metadata.email) ||
    null
  );
}

function getPlanFromObject(obj) {
  const amount = obj.amount_total || obj.amount_paid || obj.total || 0;
  if(amount >= 7900) return "ai";
  return "pro";
}

exports.handler = async function(event) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = event.headers["stripe-signature"] || event.headers["Stripe-Signature"];
  const rawBody = event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body;

  if(!verifyStripeSignature(rawBody, sig, webhookSecret)) {
    return { statusCode: 400, body: "Invalid Stripe signature" };
  }

  let stripeEvent;
  try {
    stripeEvent = JSON.parse(rawBody);
  } catch(e) {
    return { statusCode: 400, body: "Invalid JSON" };
  }

  try {
    const type = stripeEvent.type;
    const obj = stripeEvent.data && stripeEvent.data.object ? stripeEvent.data.object : {};

    if(type === "checkout.session.completed" || type === "invoice.payment_succeeded") {
      const email = getEmailFromObject(obj);
      const plan = getPlanFromObject(obj);
      const result = await upsertAccess(email, plan, true);

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ok:true, unlocked:true, event:type, result })
      };
    }

    if(type === "customer.subscription.deleted") {
      const email = getEmailFromObject(obj);
      if(email) {
        const result = await upsertAccess(email, "pro", false);
        return {
          statusCode: 200,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ok:true, cancelled:true, event:type, result })
        };
      }
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok:true, ignored:true, event:type })
    };
  } catch(e) {
    console.error("Webhook processing error:", e);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok:false, error:e.message })
    };
  }
};
