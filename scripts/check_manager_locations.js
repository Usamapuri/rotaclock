const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function checkManagerLocations() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected to database');

        const email = 'm@logicode.com';

        // 1. Get User
        const userRes = await client.query('SELECT * FROM employees WHERE email = $1', [email]);
        if (userRes.rows.length === 0) {
            console.log(`User ${email} not found`);
            return;
        }
        const user = userRes.rows[0];
        console.log('User found:', { id: user.id, role: user.role, tenant_id: user.tenant_id });

        // 2. Check Manager Locations with EXACT API QUERY
        const assignedLocationsQuery = `
      SELECT l.id, l.name, l.description
      FROM locations l
      JOIN manager_locations ml ON l.id = ml.location_id
      WHERE ml.tenant_id = $1 AND ml.manager_id = $2 AND l.is_active = true
      ORDER BY l.name
    `;

        console.log('Running exact API query with:', { tenant_id: user.tenant_id, user_id: user.id });

        const locRes = await client.query(assignedLocationsQuery, [
            user.tenant_id,
            user.id
        ]);

        console.log('Exact Query Result:', locRes.rows);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

checkManagerLocations();
