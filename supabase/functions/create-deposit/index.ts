
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const { amount } = await req.json();
        if (!amount || amount <= 0) throw new Error("Valor inválido");

        // 1. Obter dados do usuário autenticado
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) throw new Error("Sem cabeçalho de autorização");

        const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
        if (userError || !user) throw new Error("Sessão inválida ou expirada. Faça login novamente.");

        // 2. Buscar perfil
        const { data: profile } = await supabase.from('profiles').select('name, phone, email').eq('id', user.id).single();

        const externalId = `DEP_${Date.now()}_${user.id.slice(0, 8)}`;
        const callbackUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/plinqpay-webhook`;

        console.log(`[CreateDeposit] Iniciando depósito para ${user.email} - Valor: ${amount}`);

        const apiKey = Deno.env.get('PLINQPAY_API_KEY');
        if (!apiKey) throw new Error("Configuração ausente: PLINQPAY_API_KEY não encontrada nas Secrets do Supabase.");

        // 3. Chamar API da PlinqPay
        const plinqResponse = await fetch('https://api.plinqpay.com/v1/transaction', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': apiKey
            },
            body: JSON.stringify({
                externalId: externalId,
                callbackUrl: callbackUrl,
                method: 'REFERENCE',
                client: {
                    name: profile?.name || user.email?.split('@')[0] || 'Cliente',
                    email: user.email || profile?.email,
                    phone: profile?.phone || '+244900000000'
                },
                items: [{ title: 'Depósito em Wallet', price: amount, quantity: 1 }],
                amount: amount
            })
        });

        const plinqData = await plinqResponse.json();

        if (!plinqResponse.ok) {
            console.error("[PlinqPay Error]", plinqData);
            throw new Error(plinqData.message || `Erro PlinqPay: ${plinqResponse.status}`);
        }

        // 4. Salvar no banco
        const { error: dbError } = await supabase.from('deposits').insert({
            user_id: user.id,
            external_id: externalId,
            amount: amount,
            status: 'PENDING',
            entity: plinqData.entity,
            reference: plinqData.reference
        });

        if (dbError) {
            console.error("[DB Error]", dbError);
            throw new Error("Erro ao salvar depósito no banco de dados.");
        }

        return new Response(JSON.stringify({
            entity: plinqData.entity,
            reference: plinqData.reference,
            externalId: externalId
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
        });

    } catch (err) {
        console.error("[Fatal Error]", err.message);
        return new Response(JSON.stringify({ error: err.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
        });
    }
});
