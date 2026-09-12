import { pgTable, serial, varchar, text, integer, timestamp } from 'drizzle-orm/pg-core';

export const leads = pgTable('leads', {
  id: serial('id').primaryKey(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  phone: varchar('phone', { length: 50 }),
  company: varchar('company', { length: 255 }),
  source: varchar('source', { length: 100 }),
  status: varchar('status', { length: 50 }).notNull().default('NEW'),
  score: integer('score').notNull().default(0),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type LeadRecord = typeof leads.$inferSelect;
export type NewLeadRecord = typeof leads.$inferInsert;
