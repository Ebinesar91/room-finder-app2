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

async function testFetch() {
    try {
        const url = `${supabaseUrl}/auth/v1/otp`;
        console.log(`Fetching from: ${url}`);
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseAnonKey,
                'Authorization': `Bearer ${supabaseAnonKey}`
            },
            body: JSON.stringify({ email: 'test@example.com' }) // simplified check
        });
        console.log(`Status: ${response.status}`);
        const text = await response.text();
        console.log(`Body: ${text}`);
    } catch (err) {
        console.error(`Fetch error: ${err.message}`);
        console.error(err);
    }
}

testFetch();
