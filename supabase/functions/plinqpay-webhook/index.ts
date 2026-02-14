import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PLINQPAY_SECRET_KEY = Deno.env.get("PLINQPAY_SECRET_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

Deno.serve(async (req: Request) => {
    // 1. Responder rápido à PlinqPay se não for POST
    if (req.method !== "POST") {
        return new Response("Method Not Allowed", { status: 405 });
    }

    try {
        const rawBody = await req.text();
        const payload = JSON.parse(rawBody);

        // PlinqPay assina o payload JSON bruto com a SECRET_KEY
        const receivedSignature = payload.signature || req.headers.get("x-plinq-signature");

        if (!receivedSignature) {
            console.error("[Webhook] Assinatura ausente");
            return new Response(JSON.stringify({ error: "No signature" }), { status: 401 });
        }

        // 2. Validação HMAC-SHA256
        const encoder = new TextEncoder();
        const keyData = encoder.encode(PLINQPAY_SECRET_KEY);
        const cryptoKey = await crypto.subtle.importKey(
            "raw",
            keyData,
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["verify"]
        );

        // Converter Base64 para Uint8Array
        const signatureBytes = Uint8Array.from(atob(receivedSignature), c => c.charCodeAt(0));

        const signatureValid = await crypto.subtle.verify(
            "HMAC",
            cryptoKey,
            signatureBytes,
            encoder.encode(rawBody)
        );

        if (!signatureValid) {
            console.error("[Webhook] Assinatura INVÁLIDA para transação:", payload.externalId);
            return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 401 });
        }

        // 3. Processar apenas status de sucesso
        if (payload.status !== 'PAID' && payload.status !== 'SUCCESS') {
            console.log(`[Webhook] Ignorando status ${payload.status} para ${payload.externalId}`);
            return new Response("OK", { status: 200 });
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // 4. Buscar depósito
        const { data: deposit, error: depError } = await supabase
            .from('deposits')
            .select('id, user_id, amount, status')
            .eq('external_id', payload.externalId)
            .single();

        if (depError || !deposit) {
            console.error(`[Webhook] Depósito não encontrado: ${payload.externalId}`);
            return new Response("Deposit not found", { status: 404 });
        }

        if (deposit.status === 'PAID') {
            return new Response("Already processed", { status: 200 });
        }

        // 5. Crédito Atômico via RPC
        const { error: updateError } = await supabase.rpc('confirm_deposit_and_credit_balance', {
            p_deposit_id: deposit.id,
            p_user_id: deposit.user_id,
            p_amount: deposit.amount
        });

        if (updateError) {
            console.error("[Webhook] Erro no processamento SQL:", updateError);
            return new Response("Database Error", { status: 500 });
        }

        console.log(`✅ [Webhook] DEPÓSITO CONFIRMADO: ${deposit.amount} Kz para usuário ${deposit.user_id}`);
        return new Response("OK", { status: 200 });

    } catch (err: any) {
        console.error("[Webhook] Erro Fatal:", err.message);
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
});
