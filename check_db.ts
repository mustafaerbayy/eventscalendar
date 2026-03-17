
import { supabase } from "./src/integrations/supabase/client";

async function checkMemories() {
  const { data, error, count } = await supabase
    .from("event_memories")
    .select("*", { count: 'exact' });
  
  if (error) {
    console.error("Error fetching memories:", error);
  } else {
    console.log("Total memories found:", count);
    console.log("Sample memories:", data?.slice(0, 2));
  }
}

checkMemories();
