
const SUPABASE_URL = "https://ppupvxuvxqrbdqawfaup.supabase.co";

const SUPABASE_KEY = "sb_publishable_YLtAvG5oSZ4HYKiAKUXWUw_rMuoxcay";

// Θα φορτώσουμε τη βιβλιοθήκη Supabase από CDN.
const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);
