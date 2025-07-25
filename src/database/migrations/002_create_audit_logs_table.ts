import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('audit_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('table_name').notNullable();
    table.uuid('record_id').notNullable();
    table.enum('action', ['create', 'update', 'delete']).notNullable();
    table.uuid('user_id').notNullable();
    table.jsonb('old_data');
    table.jsonb('new_data');
    table.string('ip_address');
    table.string('user_agent');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Indexes
    table.index(['table_name']);
    table.index(['record_id']);
    table.index(['user_id']);
    table.index(['action']);
    table.index(['created_at']);

    // Foreign key
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('audit_logs');
} 