
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        );

        // 1. Check if the user making the request is an admin
        const {
            data: { user },
        } = await supabaseClient.auth.getUser();

        if (!user) {
            return new Response("Unauthorized", { status: 401, headers: corsHeaders });
        }

        // You might also want to check the 'admins' table here to be doubly sure
        // But since this function is only callable by authenticated users, and the logic inside uses service role...
        // Let's verify against the admins table using the service role client just to be safe, 
        // or rely on the caller having passed the RLS check if we were using the client directly.
        // Better to check explicitly.

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const { data: adminCheck } = await supabaseAdmin
            .from('admins')
            .select('email')
            .eq('email', user.email)
            .single();

        if (!adminCheck) {
            return new Response("Forbidden: Not an admin", { status: 403, headers: corsHeaders });
        }

        // 2. Get the new admin details from the request body
        const { email, password } = await req.json();

        if (!email || !password) {
            return new Response("Email and password are required", { status: 400, headers: corsHeaders });
        }

        if (password.length < 6) {
            return new Response("Password must be at least 6 characters", { status: 400, headers: corsHeaders });
        }

        // 3. Create the user (or get existing ID if they exist - though createUser usually fails if exists)
        // We want to create or update? Usually invite = create.
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true // Auto-confirm email
        });

        if (createError) {
            // If user already exists, we might want to just ensuring they are in the admins table?
            // But the requirement was "colocar nova senha".
            // If user exists, we can use updateUserById if we knew the ID, or just tell the user "User already exists".
            return new Response(JSON.stringify({ error: createError.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // 4. Add to admins table
        const { error: insertError } = await supabaseAdmin
            .from('admins')
            .insert([{ email: email }]);

        if (insertError) {
            // If insert fails (unlikely unless duplicate email in admins table), we should probably warn
            // But if they are compliant with unique constraint, it might just fail if already there.
            // We can ignore if it's unique violation, or return error.
            // Assuming unique constraint on email.
            if (insertError.code === '23505') { // Unique violation
                return new Response(JSON.stringify({ message: "User created, but was already in admins list." }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }
            return new Response(JSON.stringify({ error: insertError.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        return new Response(JSON.stringify({ message: "Admin user created successfully", user: newUser }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});
