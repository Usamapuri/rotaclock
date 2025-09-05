-- Add new employee to RotaClock Demo
INSERT INTO employees (
    tenant_id,
    organization_id,
    employee_code,
    first_name,
    last_name,
    email,
    password_hash,
    role,
    department,
    job_position,
    is_active
) VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', -- RotaClock Demo tenant_id
    '11111111-1111-1111-1111-111111111111', -- RotaClock Demo org_id
    'EMP003',
    'Mike',
    'Johnson',
    'mike.johnson@rotaclock.demo',
    crypt('password123', gen_salt('bf')),
    'employee',
    'Customer Support',
    'Support Agent',
    true
);