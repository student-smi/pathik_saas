const { createClient } = require('@supabase/supabase-js');

/**
 * Supabase Admin Client (Service Role)
 * - Used for: Auth management (createUser, getUser, updateUser)
 * - NEVER expose this key to frontend
 */
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

module.exports = { supabaseAdmin };
