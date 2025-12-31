const { Client } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

async function checkManagerCreds() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected to database\n');

        const res = await client.query('SELECT id, email, password_hash, role FROM employees WHERE email = $1', ['m@logicode.com']);

        if (res.rows.length === 0) {
            console.log('Manager not found');
            return;
        }

        const user = res.rows[0];
        console.log('Manager found:', {
            id: user.id,
            email: user.email,
            role: user.role,
            has_password: !!user.password_hash
        });

        // Test common passwords
        const testPasswords = ['password', 'Password123', '123456', 'admin', user.email.split('@')[0]];

        if (user.password_hash) {
            console.log('\nTesting common passwords...');
            for (const pwd of testPasswords) {
                const match = bcrypt.compareSync(pwd, user.password_hash);
                if (match) {
                    console.log(`✓ Password is: "${pwd}"`);
                    break;
                }
            }
        } else {
            console.log('\nNo password set for this user');
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

checkManagerCreds();
