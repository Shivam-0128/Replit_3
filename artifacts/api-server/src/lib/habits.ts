import { db, habitsTable, usersTable, completionsTable } from "@workspace/db";
import { eq, inArray, type SQL, desc } from "drizzle-orm";

export async function readHabits(where: SQL) {
  const rows = await db.select({
    id: habitsTable.id, name: habitsTable.name, whenIDoIt: habitsTable.whenIDoIt,
    shared: habitsTable.shared, ownerId: habitsTable.ownerId,
    ownerName: usersTable.displayName, createdAt: habitsTable.createdAt,
  }).from(habitsTable).innerJoin(usersTable, eq(habitsTable.ownerId, usersTable.id))
    .where(where).orderBy(desc(habitsTable.createdAt), desc(habitsTable.id));
  if (!rows.length) return [];
  const completions = await db.select().from(completionsTable).where(inArray(completionsTable.habitId, rows.map(row => row.id)));
  return rows.map(row => {
    const completedDates = completions.filter(c => c.habitId === row.id).map(c => c.date).sort().reverse();
    let currentStreak = completedDates.length ? 1 : 0;
    for (let index = 1; index < completedDates.length; index++) {
      const difference = Date.parse(`${completedDates[index - 1]}T00:00:00Z`) - Date.parse(`${completedDates[index]}T00:00:00Z`);
      if (difference !== 86400000) break;
      currentStreak++;
    }
    return { ...row, createdAt: row.createdAt.toISOString(), completedDates, daysDone: completedDates.length, currentStreak };
  });
}
