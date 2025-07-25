import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('chat_messages', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('room').notNullable();
    table.uuid('user_id').notNullable();
    table.text('message').notNullable();
    table.enum('type', ['text', 'file', 'image', 'system']).notNullable().defaultTo('text');
    table.jsonb('metadata');
    table.boolean('is_edited').notNullable().defaultTo(false);
    table.timestamp('edited_at');
    table.boolean('is_deleted').notNullable().defaultTo(false);
    table.timestamp('deleted_at');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Indexes
    table.index(['room']);
    table.index(['user_id']);
    table.index(['created_at']);
    table.index(['is_deleted']);

    // Foreign key
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('chat_messages');
} 