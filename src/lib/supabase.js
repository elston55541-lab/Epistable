import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://gfmrzcfajuwxishfnbur.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_rymg6uYPUH3WMferT4UpNw_BaFSnSxS";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
