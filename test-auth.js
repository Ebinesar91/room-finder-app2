import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');

let supabaseUrl = '';
let supabaseAnonKey = '';

envContent.split('\n').forEach(line => {
    const [key, ...values] = line.split('=');
    const value = values.join('=').trim();
    if (key === 'VITE_SUPABASE_URL') supabaseUrl = value;
    if (key === 'VITE_SUPABASE_ANON_KEY') supabaseAnonKey = value;
});

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing keys");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
    const result = { url: supabaseUrl, data: null, error: null };
    try {
        const { data, error } = await supabase.auth.signInWithOtp({
            email: 'test@example.com',
            options: {
                shouldCreateUser: true,
            },
        });
        result.data = data;
        result.error = error;
    } catch (err) {
        result.error = { message: err.message, stack: err.stack, name: err.name };
    }

    fs.writeFileSync('auth-result.json', JSON.stringify(result, null, 2));
}

test();
