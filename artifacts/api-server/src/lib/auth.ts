import { randomBytes, scrypt, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";
import type { Request, Response, NextFunction } from "express";
import { and, eq, gt } from "drizzle-orm";
import { db, usersTable, sessionsTable } from "@workspace/db";

const deriveKey = promisify(scrypt);
const COOKIE = "habit_circle_session";
const lifetime = 30 * 24 * 60 * 60 * 1000;
export const digest = (value: string) => createHash("sha256").update(value).digest("hex");

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = await deriveKey(password, salt, 64) as Buffer;
  return `${salt}:${key.toString("hex")}`;
}

export async function checkPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  const key = await deriveKey(password, salt, 64) as Buffer;
  const expected = Buffer.from(hash, "hex");
  return key.length === expected.length && timingSafeEqual(key, expected);
}

function options(req: Request) {
  return { httpOnly: true, secure: req.secure || req.get("x-forwarded-proto") === "https", sameSite: "lax" as const, path: "/" };
}

export async function newSession(req: Request, res: Response, userId: number) {
  const old = req.cookies?.[COOKIE];
  if (typeof old === "string") await db.delete(sessionsTable).where(eq(sessionsTable.tokenHash, digest(old)));
  const token = randomBytes(32).toString("hex");
  await db.insert(sessionsTable).values({ tokenHash: digest(token), userId, expiresAt: new Date(Date.now() + lifetime) });
  res.cookie(COOKIE, token, { ...options(req), maxAge: lifetime });
}

export async function endSession(req: Request, res: Response) {
  const token = req.cookies?.[COOKIE];
  if (typeof token === "string") await db.delete(sessionsTable).where(eq(sessionsTable.tokenHash, digest(token)));
  res.clearCookie(COOKIE, options(req));
}

export async function requireUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  res.setHeader("Cache-Control", "no-store");
  const token = req.cookies?.[COOKIE];
  if (typeof token !== "string" || token.length !== 64) {
    res.status(401).json({ error: "Please sign in to continue." }); return;
  }
  const [row] = await db.select({ id: usersTable.id, displayName: usersTable.displayName, email: usersTable.email })
    .from(sessionsTable).innerJoin(usersTable, eq(usersTable.id, sessionsTable.userId))
    .where(and(eq(sessionsTable.tokenHash, digest(token)), gt(sessionsTable.expiresAt, new Date())));
  if (!row) { res.status(401).json({ error: "Please sign in to continue." }); return; }
  res.locals.user = row;
  next();
}

const attempts = new Map<string, { count: number; until: number }>();
export function authLimit(req: Request, res: Response, next: NextFunction): void {
  const key = req.ip ?? "unknown";
  const now = Date.now();
  if (attempts.size > 10000) for (const [ip, value] of attempts) if (value.until < now) attempts.delete(ip);
  const current = attempts.get(key);
  if (!current || current.until < now) { attempts.set(key, { count: 1, until: now + 15 * 60 * 1000 }); next(); return; }
  current.count++;
  if (current.count > 30) { res.status(429).json({ error: "Too many attempts. Please try again in 15 minutes." }); return; }
  next();
}
