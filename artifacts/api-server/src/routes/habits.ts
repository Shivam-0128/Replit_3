import { Router, type IRouter } from "express";
import { and, eq, or, asc } from "drizzle-orm";
import { db, habitsTable, completionsTable, commentsTable, usersTable } from "@workspace/db";
import {
  AddHabitBody, SetCompletionBody, GetHabitParams, PostCommentBody,
  GetHabitResponse, ListMyHabitsResponse, ListCommunityHabitsResponse,
  ListCommentsResponse, PostCommentResponse,
} from "@workspace/api-zod";
import { requireUser } from "../lib/auth";
import { readHabits } from "../lib/habits";

const router: IRouter = Router();
router.use(["/habits", "/community"], requireUser);
router.get("/habits", async (_req, res): Promise<void> => {
  res.json(ListMyHabitsResponse.parse(await readHabits(eq(habitsTable.ownerId, res.locals.user.id))));
});
router.get("/community", async (_req, res): Promise<void> => {
  res.json(ListCommunityHabitsResponse.parse(await readHabits(eq(habitsTable.shared, true))));
});
router.post("/habits", async (req, res): Promise<void> => {
  const parsed = AddHabitBody.safeParse(req.body);
  if (!parsed.success || !parsed.data.name.trim() || !parsed.data.whenIDoIt.trim()) {
    res.status(400).json({ error: "Enter a habit name and when you do it." }); return;
  }
  const [habit] = await db.insert(habitsTable).values({
    name: parsed.data.name.trim(), whenIDoIt: parsed.data.whenIDoIt.trim(),
    shared: parsed.data.shared, ownerId: res.locals.user.id,
  }).returning();
  res.status(201).json(GetHabitResponse.parse((await readHabits(eq(habitsTable.id, habit.id)))[0]));
});

// Check visibility for every detail subroute, including comments and completion.
router.use("/habits/:id", async (req, res, next): Promise<void> => {
  const parsed = GetHabitParams.safeParse(req.params);
  if (!parsed.success || !Number.isSafeInteger(parsed.data.id) || parsed.data.id < 1) {
    res.status(400).json({ error: "Invalid habit." }); return;
  }
  const [habit] = await db.select().from(habitsTable).where(and(
    eq(habitsTable.id, parsed.data.id),
    or(eq(habitsTable.ownerId, res.locals.user.id), eq(habitsTable.shared, true)),
  ));
  if (!habit) { res.status(404).json({ error: "Habit not found." }); return; }
  res.locals.habit = habit;
  next();
});
router.get("/habits/:id", async (_req, res): Promise<void> => {
  res.json(GetHabitResponse.parse((await readHabits(eq(habitsTable.id, res.locals.habit.id)))[0]));
});
router.put("/habits/:id/completion", async (req, res): Promise<void> => {
  const habit = res.locals.habit;
  if (habit.ownerId !== res.locals.user.id) { res.status(403).json({ error: "Only the owner can track this habit." }); return; }
  const parsed = SetCompletionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Enter a valid date and completion status." }); return; }
  const { date, done } = parsed.data;
  const instant = Date.parse(`${date}T00:00:00Z`);
  if (!Number.isFinite(instant) || new Date(instant).toISOString().slice(0, 10) !== date) {
    res.status(400).json({ error: "Enter a valid calendar date." }); return;
  }
  // Allow the seven-day local-calendar window anywhere in the world.
  const now = Date.now();
  if (instant < now - 8 * 86400000 || instant > now + 86400000) {
    res.status(400).json({ error: "Only the last seven days can be changed." }); return;
  }
  if (done) await db.insert(completionsTable).values({ habitId: habit.id, date }).onConflictDoNothing();
  else await db.delete(completionsTable).where(and(eq(completionsTable.habitId, habit.id), eq(completionsTable.date, date)));
  res.json(GetHabitResponse.parse((await readHabits(eq(habitsTable.id, habit.id)))[0]));
});
router.get("/habits/:id/comments", async (_req, res): Promise<void> => {
  const habit = res.locals.habit;
  if (!habit.shared) { res.json([]); return; }
  const rows = await db.select({
    id: commentsTable.id, habitId: commentsTable.habitId, authorId: commentsTable.authorId,
    authorName: usersTable.displayName, text: commentsTable.text, createdAt: commentsTable.createdAt,
  }).from(commentsTable).innerJoin(usersTable, eq(usersTable.id, commentsTable.authorId))
    .where(eq(commentsTable.habitId, habit.id)).orderBy(asc(commentsTable.createdAt), asc(commentsTable.id));
  res.json(ListCommentsResponse.parse(rows.map(row => ({ ...row, createdAt: row.createdAt.toISOString() }))));
});
router.post("/habits/:id/comments", async (req, res): Promise<void> => {
  const habit = res.locals.habit;
  if (!habit.shared) { res.status(403).json({ error: "Comments are only available on shared habits." }); return; }
  const parsed = PostCommentBody.safeParse(req.body);
  if (!parsed.success || !parsed.data.text.trim()) { res.status(400).json({ error: "Enter a comment first." }); return; }
  const [comment] = await db.insert(commentsTable).values({
    habitId: habit.id, authorId: res.locals.user.id, text: parsed.data.text.trim(),
  }).returning();
  res.status(201).json(PostCommentResponse.parse({
    ...comment, createdAt: comment.createdAt.toISOString(), authorName: res.locals.user.displayName,
  }));
});
export default router;
