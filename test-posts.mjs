import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://wclytfjwutaebpmkxbgn.supabase.co";
const supabaseKey = "sb_publishable__n4Ofcj3hNd7igHVvXoChA_A-Bdm1hB";

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPosts() {
    console.log("Fetching posts...");
    const { data, error } = await supabase
        .from('posts')
        .select('*');

    console.log("Error:", error);
    console.log("Data total count:", data?.length);
    console.log("Data:", data);
}

testPosts();
