import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@14";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return respond({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) return respond({ error: "Unauthorized" }, 401);

    const { items, pkb_discount = 0, shipping_state = "", shipping_country = "US" } = await req.json() as {
      items: { product_id: string; quantity: number }[];
      pkb_discount?: number;
      shipping_state?: string;
      shipping_country?: string;
    };

    if (!items || items.length === 0) return respond({ error: "No items provided" }, 400);

    // Fetch actual prices — never trust client amounts
    const { data: products, error: prodError } = await supabase
      .from("products")
      .select("id, price, name, in_stock, quantity")
      .in("id", items.map((i) => i.product_id));

    if (prodError || !products) return respond({ error: "Failed to fetch products" }, 500);

    let subtotalCents = 0;
    for (const item of items) {
      const product = products.find((p) => p.id === item.product_id);
      if (!product) return respond({ error: `Product not found: ${item.product_id}` }, 400);
      if (!product.in_stock || product.quantity < item.quantity) {
        return respond({ error: `${product.name} is out of stock` }, 400);
      }
      subtotalCents += Math.round(product.price * 100) * item.quantity;
    }

    // Validate and apply PKB discount (10 PKB = $1 = 100 cents)
    let discountCents = 0;
    const pkbApplied = Math.floor(pkb_discount ?? 0);
    if (pkbApplied > 0) {
      const { data: ledger } = await supabase
        .from("rewards_ledger")
        .select("amount")
        .eq("user_id", user.id);

      const balance = (ledger ?? []).reduce((sum: number, r: { amount: number }) => sum + Number(r.amount), 0);
      if (pkbApplied > balance) {
        return respond({ error: "Insufficient PokeBucks balance" }, 400);
      }
      discountCents = Math.floor(pkbApplied / 10) * 100;
    }

    const afterDiscountCents = Math.max(subtotalCents - discountCents, 50);

    // ── Resolve tax rate based on shipping location ──────────────────────────
    const stateCode  = shipping_state.trim().toUpperCase();
    const countryCode = shipping_country.trim().toUpperCase();

    const { data: taxRules } = await supabase
      .from("tax_config")
      .select("applies_to, region_code, rate")
      .eq("is_active", true);

    let taxRate = 0;
    if (taxRules && taxRules.length > 0) {
      // Priority 1: state-specific match
      const stateRule = stateCode
        ? taxRules.find((r) => r.applies_to === "state" && r.region_code === stateCode)
        : null;
      // Priority 2: country-specific match
      const countryRule = countryCode
        ? taxRules.find((r) => r.applies_to === "country" && r.region_code === countryCode)
        : null;
      // Priority 3: catch-all
      const allRule = taxRules.find((r) => r.applies_to === "all");

      const matched = stateRule ?? countryRule ?? allRule ?? null;
      taxRate = matched ? Number(matched.rate) : 0;
    }

    // Tax is applied to the after-discount amount
    const taxCents = Math.round(afterDiscountCents * taxRate);
    const chargedCents = afterDiscountCents + taxCents;

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2024-06-20",
    });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: chargedCents,
      currency: "usd",
      metadata: {
        user_id: user.id,
        pkb_discount: String(pkbApplied),
        subtotal_cents: String(subtotalCents),
        tax_cents: String(taxCents),
        tax_rate: String(taxRate),
        shipping_state: stateCode,
        shipping_country: countryCode,
      },
    });

    return respond({
      client_secret: paymentIntent.client_secret,
      total_cents: chargedCents,
      subtotal_cents: subtotalCents,
      discount_cents: discountCents,
      tax_cents: taxCents,
      tax_rate: taxRate,
    });
  } catch (err) {
    return respond({ error: (err as Error).message }, 500);
  }
});
