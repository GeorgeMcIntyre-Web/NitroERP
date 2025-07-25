import { Knex } from 'knex';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export async function seed(knex: Knex): Promise<void> {
  // Clear existing data
  await knex('refresh_tokens').del();
  await knex('user_sessions').del();
  await knex('audit_logs').del();
  await knex('notifications').del();
  await knex('chat_messages').del();
  await knex('announcements').del();
  await knex('users').del();

  // Create super admin user
  const superAdminId = uuidv4();
  const superAdminPassword = await bcrypt.hash('Admin123!', 12);

  await knex('users').insert({
    id: superAdminId,
    email: 'admin@nitroerp.com',
    password_hash: superAdminPassword,
    first_name: 'System',
    last_name: 'Administrator',
    role: 'super_admin',
    department: 'it',
    position: 'System Administrator',
    employee_id: 'EMP001',
    phone: '+1234567890',
    is_active: true,
    email_verified_at: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
  });

  // Create department managers
  const managers = [
    {
      id: uuidv4(),
      email: 'finance.manager@nitroerp.com',
      first_name: 'Sarah',
      last_name: 'Johnson',
      role: 'manager',
      department: 'finance',
      position: 'Finance Manager',
      employee_id: 'EMP002',
    },
    {
      id: uuidv4(),
      email: 'hr.manager@nitroerp.com',
      first_name: 'Michael',
      last_name: 'Chen',
      role: 'manager',
      department: 'hr',
      position: 'HR Manager',
      employee_id: 'EMP003',
    },
    {
      id: uuidv4(),
      email: 'engineering.manager@nitroerp.com',
      first_name: 'Emily',
      last_name: 'Rodriguez',
      role: 'manager',
      department: 'engineering',
      position: 'Engineering Manager',
      employee_id: 'EMP004',
    },
    {
      id: uuidv4(),
      email: 'manufacturing.manager@nitroerp.com',
      first_name: 'David',
      last_name: 'Thompson',
      role: 'manager',
      department: 'manufacturing',
      position: 'Manufacturing Manager',
      employee_id: 'EMP005',
    },
    {
      id: uuidv4(),
      email: 'control.manager@nitroerp.com',
      first_name: 'Lisa',
      last_name: 'Wang',
      role: 'manager',
      department: 'control',
      position: 'Control Systems Manager',
      employee_id: 'EMP006',
    },
  ];

  for (const manager of managers) {
    const password = await bcrypt.hash('Manager123!', 12);
    await knex('users').insert({
      ...manager,
      password_hash: password,
      is_active: true,
      email_verified_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  // Create sample employees
  const employees = [
    // Finance Department
    {
      email: 'accountant1@nitroerp.com',
      first_name: 'Jennifer',
      last_name: 'Smith',
      role: 'employee',
      department: 'finance',
      position: 'Senior Accountant',
      employee_id: 'EMP007',
    },
    {
      email: 'accountant2@nitroerp.com',
      first_name: 'Robert',
      last_name: 'Brown',
      role: 'employee',
      department: 'finance',
      position: 'Accountant',
      employee_id: 'EMP008',
    },

    // HR Department
    {
      email: 'hr.specialist@nitroerp.com',
      first_name: 'Amanda',
      last_name: 'Davis',
      role: 'employee',
      department: 'hr',
      position: 'HR Specialist',
      employee_id: 'EMP009',
    },
    {
      email: 'recruiter@nitroerp.com',
      first_name: 'James',
      last_name: 'Wilson',
      role: 'employee',
      department: 'hr',
      position: 'Recruiter',
      employee_id: 'EMP010',
    },

    // Engineering Department
    {
      email: 'designer1@nitroerp.com',
      first_name: 'Alex',
      last_name: 'Garcia',
      role: 'employee',
      department: 'engineering',
      position: 'Senior Design Engineer',
      employee_id: 'EMP011',
    },
    {
      email: 'designer2@nitroerp.com',
      first_name: 'Maria',
      last_name: 'Martinez',
      role: 'employee',
      department: 'engineering',
      position: 'Design Engineer',
      employee_id: 'EMP012',
    },
    {
      email: 'project.engineer@nitroerp.com',
      first_name: 'Kevin',
      last_name: 'Taylor',
      role: 'employee',
      department: 'engineering',
      position: 'Project Engineer',
      employee_id: 'EMP013',
    },

    // Manufacturing Department
    {
      email: 'production.supervisor@nitroerp.com',
      first_name: 'Rachel',
      last_name: 'Anderson',
      role: 'employee',
      department: 'manufacturing',
      position: 'Production Supervisor',
      employee_id: 'EMP014',
    },
    {
      email: 'quality.engineer@nitroerp.com',
      first_name: 'Daniel',
      last_name: 'Lee',
      role: 'employee',
      department: 'manufacturing',
      position: 'Quality Engineer',
      employee_id: 'EMP015',
    },
    {
      email: 'machinist@nitroerp.com',
      first_name: 'Thomas',
      last_name: 'White',
      role: 'employee',
      department: 'manufacturing',
      position: 'Senior Machinist',
      employee_id: 'EMP016',
    },

    // Control Department
    {
      email: 'electrical.engineer@nitroerp.com',
      first_name: 'Sophie',
      last_name: 'Clark',
      role: 'employee',
      department: 'control',
      position: 'Electrical Engineer',
      employee_id: 'EMP017',
    },
    {
      email: 'plc.programmer@nitroerp.com',
      first_name: 'Christopher',
      last_name: 'Lewis',
      role: 'employee',
      department: 'control',
      position: 'PLC Programmer',
      employee_id: 'EMP018',
    },
    {
      email: 'maintenance.tech@nitroerp.com',
      first_name: 'Jessica',
      last_name: 'Hall',
      role: 'employee',
      department: 'control',
      position: 'Maintenance Technician',
      employee_id: 'EMP019',
    },

    // IT Department
    {
      email: 'developer@nitroerp.com',
      first_name: 'Ryan',
      last_name: 'Young',
      role: 'employee',
      department: 'it',
      position: 'Software Developer',
      employee_id: 'EMP020',
    },
    {
      email: 'sysadmin@nitroerp.com',
      first_name: 'Nicole',
      last_name: 'King',
      role: 'employee',
      department: 'it',
      position: 'System Administrator',
      employee_id: 'EMP021',
    },

    // Sales Department
    {
      email: 'sales.rep@nitroerp.com',
      first_name: 'Brandon',
      last_name: 'Wright',
      role: 'employee',
      department: 'sales',
      position: 'Sales Representative',
      employee_id: 'EMP022',
    },

    // Quality Department
    {
      email: 'quality.manager@nitroerp.com',
      first_name: 'Stephanie',
      last_name: 'Lopez',
      role: 'manager',
      department: 'quality',
      position: 'Quality Manager',
      employee_id: 'EMP023',
    },
  ];

  for (const employee of employees) {
    const password = await bcrypt.hash('Employee123!', 12);
    await knex('users').insert({
      id: uuidv4(),
      ...employee,
      password_hash: password,
      is_active: true,
      email_verified_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  // Create sample announcements
  await knex('announcements').insert([
    {
      id: uuidv4(),
      title: 'Welcome to NitroERP!',
      message: 'Welcome to our new enterprise resource planning system. This platform will help streamline our operations and improve productivity across all departments.',
      priority: 'medium',
      is_active: true,
      created_by: superAdminId,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: uuidv4(),
      title: 'System Maintenance Notice',
      message: 'Scheduled maintenance will be performed on Sunday, 2:00 AM - 4:00 AM. The system may be temporarily unavailable during this time.',
      priority: 'low',
      is_active: true,
      created_by: superAdminId,
      created_at: new Date(),
      updated_at: new Date(),
    },
  ]);

  // Create sample notifications
  const sampleNotifications = [
    {
      id: uuidv4(),
      user_id: superAdminId,
      type: 'info',
      title: 'System Setup Complete',
      message: 'NitroERP has been successfully initialized with default settings.',
      is_read: false,
      created_at: new Date(),
    },
    {
      id: uuidv4(),
      user_id: superAdminId,
      type: 'success',
      title: 'Database Migration Successful',
      message: 'All database tables have been created and initial data has been seeded.',
      is_read: false,
      created_at: new Date(),
    },
  ];

  await knex('notifications').insert(sampleNotifications);

  console.log('✅ Initial data seeded successfully!');
  console.log('📧 Super Admin: admin@nitroerp.com / Admin123!');
  console.log('👥 Sample users created for all departments');
  console.log('📢 Sample announcements and notifications added');
} 