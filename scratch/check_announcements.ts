import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

function loadEnv() {
  const envPath = path.join(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || "";
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        }
        process.env[key] = value;
      }
    }
  }
}

loadEnv();

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

const supabase = createClient(supabaseUrl, supabaseKey);

const failedEmails = [
  "58elikkayhan@gmail.com",
  "mehhmetcayir@gmail.com",
  "nebiresulerkann@gmail.com",
  "niyaziozen007@gmail.com",
  "yigitceten95123456@gmail.com"
];

async function check() {
  for (const email of failedEmails) {
    const { data, error } = await supabase.rpc("check_email_identity", { p_email: email });
    if (error) {
      console.error(`Error checking ${email}:`, error);
    } else {
      console.log(`Identity info for ${email}:`, data);
    }
  }
}

check();
