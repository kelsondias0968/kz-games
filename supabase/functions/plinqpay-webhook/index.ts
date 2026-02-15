
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PLINQPAY_SECRET_KEY = Deno.env.get("PLINQPAY_SECRET_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

Deno.serve(async (req: Request) => {
    if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

    try {
        const payload = await req.json();

        // 1. Validar Assinatura HMAC conforme documentação
        const signature = payload.signature || req.headers.get("x-plinq-signature");

        // Estrutura canónica para validação
        const payloadToVerify = {
            externalId: payload.externalId || payload.externId,
            amount: payload.amount,
            method: payload.method,
            callbackUrl: payload.callbackUrl,
        };

        const encoder = new TextEncoder();
        const keyData = encoder.encode(PLINQPAY_SECRET_KEY);
        const cryptoKey = await crypto.subtle.importKey(
            "raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["verify"]
        );

        const canonical = JSON.stringify(payloadToVerify);
        const signatureBytes = Uint8Array.from(atob(signature), c => c.charCodeAt(0));

        const isSignatureValid = await crypto.subtle.verify(
            "HMAC", cryptoKey, signatureBytes, encoder.encode(canonical)
        );

        if (!isSignatureValid) {
            console.error("[Webhook] Assinatura Inválida");
            return new Response("Invalid Signature", { status: 401 });
        }

        // 2. Processar apenas status de sucesso (SUCCESS conforme docs)
        if (payload.status !== 'SUCCESS' && payload.status !== 'PAID') {
            return new Response("OK", { status: 200 });
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // 3. Atualizar Depósito e Saldo
        const extId = payload.externalId || payload.externId;
        const { data: deposit } = await supabase.from('deposits').select('id, user_id, amount').eq('external_id', extId).single();

        if (deposit) {
            await supabase.rpc('confirm_deposit_and_credit_balance', {
                p_deposit_id: deposit.id,
                p_user_id: deposit.user_id,
                p_amount: deposit.amount
            });
            console.log(`✅ [Webhook] Sucesso: ${deposit.amount} creditados para ${deposit.user_id}`);
        }

        return new Response("OK", { status: 200 });

    } catch (err) {
        console.error("[Webhook Error]", err.message);
        return new Response(err.message, { status: 500 });
    }
});
