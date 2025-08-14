const { Pool } = require('pg');

const pool = new Pool({
  host: 'maglev.proxy.rlwy.net',
  port: 36050,
  database: 'railway',
  user: 'postgres',
  password: 'tIxWwsJpAlklxQGfDbxtDEheAxQmBlbz',
  ssl: {
    rejectUnauthorized: false
  }
});

const checkPasswords = async () => {
  try {
    const result = await pool.query('SELECT employee_id, first_name, last_name, password_hash FROM employees LIMIT 10');
    
    console.log('Available employees for login:');
    console.log('==============================');
    
    result.rows.forEach(emp => {
      if (emp.password_hash) {
        const password = Buffer.from(emp.password_hash, 'base64').toString();
        console.log(`${emp.employee_id}: ${emp.first_name} ${emp.last_name} (password: ${password})`);
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
};

checkPasswords();
