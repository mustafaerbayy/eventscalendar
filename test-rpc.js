const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://wclytfjwutaebpmkxbgn.supabase.co";
const supabaseKey = "sb_publishable__n4Ofcj3hNd7igHVvXoChA_A-Bdm1hB";

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    const email = "m.abdullaherbay32@gmail.com";
    console.log("Testing check_email_identity for:", email)
    const { data, error } = await supabase.rpc('check_email_identity', { p_email: email });
    console.log("RPC Data:", JSON.stringify(data, null, 2));
    console.log("RPC Error:", error);
}

test();
