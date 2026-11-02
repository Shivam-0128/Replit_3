import { pgTable, serial, text, boolean, integer, timestamp, date, primaryKey } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const habitsTable = pgTable("habits", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  whenIDoIt: text("when_i_do_it").notNull(),
  shared: boolean("shared").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const completionsTable = pgTable("completions", {
  habitId: integer("habit_id").references(() => habitsTable.id, { onDelete: "cascade" }).notNull(),
  date: date("date", { mode: "string" }).notNull(),
}, (table) => [primaryKey({ columns: [table.habitId, table.date] })]);
