
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

        // No polling oficial da PlinqPay (eles recomendam Webhook), 
        // esta função serve para o frontend confirmar se o status no DB mudou.
        const authHeader = req.headers.get('Authorization');
        let userId = null;

        if (authHeader) {
            const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
            userId = user?.id;
        }

        const query = supabase.from('deposits').select('id').eq('status', 'PAID');
        if (userId) query.eq('user_id', userId);

        const { data: paidDeposits } = await query;

        return new Response(JSON.stringify({
            processed: paidDeposits?.length || 0,
            message: "Verificação concluída via Webhook sincronizado."
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
        });

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
        });
    }
});
