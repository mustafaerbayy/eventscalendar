
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY!
);

async function checkTable() {
  const { data, error } = await supabase
    .from('event_memories')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('Error fetching event_memories:', error.message);
    if (error.message.includes('relation "public.event_memories" does not exist')) {
      console.log('TABLE DOES NOT EXIST ON REMOTE');
    }
  } else {
    console.log('TABLE EXISTS');
  }
}

checkTable();
