import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { SignUpBody, SignInBody, GetMeResponse } from "@workspace/api-zod";
import { hashPassword, checkPassword, newSession, endSession, requireUser, authLimit } from "../lib/auth";

const router: IRouter = Router();
router.get("/auth/me", requireUser, (_req, res): void => {
  res.json(GetMeResponse.parse(res.locals.user));
});
router.post("/auth/signup", authLimit, async (req, res): Promise<void> => {
  const parsed = SignUpBody.safeParse(req.body);
  if (!parsed.success || !parsed.data.displayName.trim()) {
    res.status(400).json({ error: "Enter a display name, a valid email, and a password of at least 8 characters." }); return;
  }
  const { email, password, displayName } = parsed.data;
  const passwordHash = await hashPassword(password);
  const [user] = await db.insert(usersTable).values({
    email: email.trim().toLowerCase(), displayName: displayName.trim(), passwordHash,
  }).onConflictDoNothing({ target: usersTable.email })
    .returning({ id: usersTable.id, displayName: usersTable.displayName, email: usersTable.email });
  if (!user) { res.status(409).json({ error: "An account with this email already exists. Please sign in." }); return; }
  await newSession(req, res, user.id);
  res.status(201).json(GetMeResponse.parse(user));
});
router.post("/auth/signin", authLimit, async (req, res): Promise<void> => {
  const parsed = SignInBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Enter your email and password." }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, parsed.data.email.trim().toLowerCase()));
  // Perform password derivation even for unknown accounts to reduce timing differences.
  const stored = user?.passwordHash ?? `00000000000000000000000000000000:${"0".repeat(128)}`;
  const valid = await checkPassword(parsed.data.password, stored);
  if (!user || !valid) { res.status(401).json({ error: "Email or password is incorrect." }); return; }
  await newSession(req, res, user.id);
  res.json(GetMeResponse.parse(user));
});
router.post("/auth/signout", async (req, res): Promise<void> => {
  await endSession(req, res); res.sendStatus(204);
});
export default router;
