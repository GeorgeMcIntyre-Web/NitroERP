import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('email').unique().notNullable();
    table.string('password_hash').notNullable();
    table.string('first_name').notNullable();
    table.string('last_name').notNullable();
    table.enum('role', ['super_admin', 'admin', 'manager', 'employee', 'viewer']).notNullable().defaultTo('employee');
    table.enum('department', ['finance', 'hr', 'engineering', 'manufacturing', 'control', 'sales', 'it', 'quality']).notNullable();
    table.string('position').notNullable();
    table.string('employee_id').unique();
    table.string('phone');
    table.string('avatar');
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('last_login');
    table.timestamp('email_verified_at');
    table.string('password_reset_token');
    table.timestamp('password_reset_expires');
    table.jsonb('preferences').defaultTo('{}');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at');
    table.uuid('deleted_by');

    // Indexes
    table.index(['email']);
    table.index(['role']);
    table.index(['department']);
    table.index(['is_active']);
    table.index(['deleted_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('users');
} 