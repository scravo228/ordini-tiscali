require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
    throw new Error(
        "SUPABASE_URL non configurata nelle variabili d'ambiente"
    );
}

if (!supabaseKey) {
    throw new Error(
        "SUPABASE_SERVICE_ROLE_KEY non configurata nelle variabili d'ambiente"
    );
}

const supabase = createClient(
    supabaseUrl,
    supabaseKey,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

console.log("Connessione Supabase configurata");

module.exports = supabase;
