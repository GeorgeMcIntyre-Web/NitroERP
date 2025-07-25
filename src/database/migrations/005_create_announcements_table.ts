import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('announcements', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('title').notNullable();
    table.text('message').notNullable();
    table.jsonb('departments'); // Array of department names
    table.jsonb('roles'); // Array of role names
    table.enum('priority', ['low', 'medium', 'high', 'urgent']).notNullable().defaultTo('medium');
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('expires_at');
    table.uuid('created_by').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index(['is_active']);
    table.index(['priority']);
    table.index(['created_at']);
    table.index(['expires_at']);

    // Foreign key
    table.foreign('created_by').references('id').inTable('users').onDelete('CASCADE');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('announcements');
} 