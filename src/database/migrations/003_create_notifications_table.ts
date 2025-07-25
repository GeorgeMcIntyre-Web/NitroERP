import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('notifications', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable();
    table.enum('type', ['info', 'success', 'warning', 'error', 'task', 'approval']).notNullable();
    table.string('title').notNullable();
    table.text('message').notNullable();
    table.jsonb('data');
    table.boolean('is_read').notNullable().defaultTo(false);
    table.timestamp('read_at');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Indexes
    table.index(['user_id']);
    table.index(['type']);
    table.index(['is_read']);
    table.index(['created_at']);

    // Foreign key
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('notifications');
} 