import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";

// ── Database path ─────────────────────────────────────────────────────────────
const DB_DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH
  ? process.env.RAILWAY_VOLUME_MOUNT_PATH
  : path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "app.db");

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// ── Open connection ────────────────────────────────────────────────────────────
export const db = createClient({ url: `file:${DB_PATH}` });

// ── Types ──────────────────────────────────────────────────────────────────────
export interface UserRow {
  id: string;
  username: string;
  email: string | null;
  password_hash: string | null;
  google_id: string | null;
  role: "user" | "admin";
  created_at: string;
  last_login: string | null;
}

export interface QuizAttemptRow {
  id: string;
  user_id: string;
  score: number;
  total_questions: number;
  percentage: number;
  completed_at: string;
}

// ── Migrations + seed ─────────────────────────────────────────────────────────
export async function initDB(): Promise<void> {
  await db.batch(
    [
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE,
        password_hash TEXT,
        google_id TEXT UNIQUE,
        role TEXT DEFAULT 'user' NOT NULL,
        created_at TEXT DEFAULT (datetime('now')) NOT NULL,
        last_login TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS quiz_attempts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        score INTEGER NOT NULL,
        total_questions INTEGER NOT NULL,
        percentage REAL NOT NULL,
        completed_at TEXT DEFAULT (datetime('now')) NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
    ],
    "write"
  );

  // Seed admin account
  const adminResult = await db.execute(
    "SELECT id FROM users WHERE username = 'admin'"
  );
  if (adminResult.rows.length === 0) {
    const hash = await bcrypt.hash("Admin@123", 12);
    await db.execute({
      sql: "INSERT INTO users (id, username, email, password_hash, role) VALUES (?, ?, ?, ?, ?)",
      args: [uuidv4(), "admin", null, hash, "admin"],
    });
    console.log("  ✅ Admin account created: admin / Admin@123");
  }
}

// ── User queries ───────────────────────────────────────────────────────────────
export const userQueries = {
  findById: async (id: string): Promise<UserRow | undefined> => {
    const r = await db.execute({
      sql: "SELECT * FROM users WHERE id = ?",
      args: [id],
    });
    return r.rows[0] as unknown as UserRow | undefined;
  },

  findByUsername: async (username: string): Promise<UserRow | undefined> => {
    const r = await db.execute({
      sql: "SELECT * FROM users WHERE username = ?",
      args: [username],
    });
    return r.rows[0] as unknown as UserRow | undefined;
  },

  findByEmail: async (email: string): Promise<UserRow | undefined> => {
    const r = await db.execute({
      sql: "SELECT * FROM users WHERE email = ?",
      args: [email],
    });
    return r.rows[0] as unknown as UserRow | undefined;
  },

  findByGoogleId: async (googleId: string): Promise<UserRow | undefined> => {
    const r = await db.execute({
      sql: "SELECT * FROM users WHERE google_id = ?",
      args: [googleId],
    });
    return r.rows[0] as unknown as UserRow | undefined;
  },

  create: async (
    id: string,
    username: string,
    email: string | null,
    passwordHash: string | null,
    googleId: string | null,
    role: string
  ): Promise<void> => {
    await db.execute({
      sql: "INSERT INTO users (id, username, email, password_hash, google_id, role) VALUES (?, ?, ?, ?, ?, ?)",
      args: [id, username, email, passwordHash, googleId, role],
    });
  },

  updateLastLogin: async (id: string): Promise<void> => {
    await db.execute({
      sql: "UPDATE users SET last_login = datetime('now') WHERE id = ?",
      args: [id],
    });
  },

  linkGoogleId: async (googleId: string, userId: string): Promise<void> => {
    await db.execute({
      sql: "UPDATE users SET google_id = ? WHERE id = ?",
      args: [googleId, userId],
    });
  },

  all: async (): Promise<UserRow[]> => {
    const r = await db.execute(
      "SELECT id, username, email, role, created_at, last_login FROM users ORDER BY created_at DESC"
    );
    return r.rows as unknown as UserRow[];
  },
};

// ── Quiz queries ───────────────────────────────────────────────────────────────
export const quizQueries = {
  create: async (
    id: string,
    userId: string,
    score: number,
    totalQuestions: number,
    percentage: number
  ): Promise<void> => {
    await db.execute({
      sql: "INSERT INTO quiz_attempts (id, user_id, score, total_questions, percentage) VALUES (?, ?, ?, ?, ?)",
      args: [id, userId, score, totalQuestions, percentage],
    });
  },

  byUser: async (userId: string): Promise<QuizAttemptRow[]> => {
    const r = await db.execute({
      sql: "SELECT * FROM quiz_attempts WHERE user_id = ? ORDER BY completed_at DESC",
      args: [userId],
    });
    return r.rows as unknown as QuizAttemptRow[];
  },

  all: async (): Promise<unknown[]> => {
    const r = await db.execute(`
      SELECT qa.*, u.username, u.email
      FROM quiz_attempts qa
      JOIN users u ON qa.user_id = u.id
      ORDER BY qa.completed_at DESC
    `);
    return r.rows as unknown[];
  },

  leaderboard: async (): Promise<unknown[]> => {
    const r = await db.execute(`
      SELECT
        u.id as user_id,
        u.username,
        MAX(qa.percentage) as best_percentage,
        COUNT(qa.id) as attempt_count,
        MAX(qa.score) as best_score,
        MAX(qa.total_questions) as total_questions
      FROM quiz_attempts qa
      JOIN users u ON qa.user_id = u.id
      GROUP BY u.id
      ORDER BY best_percentage DESC, attempt_count ASC
      LIMIT 50
    `);
    return r.rows as unknown[];
  },
};
