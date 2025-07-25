import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('refresh_tokens', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('token').unique().notNullable();
    table.uuid('user_id').notNullable();
    table.timestamp('expires_at').notNullable();
    table.boolean('is_revoked').notNullable().defaultTo(false);
    table.string('ip_address');
    table.string('user_agent');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Indexes
    table.index(['token']);
    table.index(['user_id']);
    table.index(['expires_at']);
    table.index(['is_revoked']);

    // Foreign key
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('refresh_tokens');
} 