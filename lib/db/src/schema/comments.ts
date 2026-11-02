import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { habitsTable } from "./habits";

export const commentsTable = pgTable("comments", {
  id: serial("id").primaryKey(),
  habitId: integer("habit_id").references(() => habitsTable.id, { onDelete: "cascade" }).notNull(),
  authorId: integer("author_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  text: text("text").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
