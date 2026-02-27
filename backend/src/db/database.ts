import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";

// ── Database path ─────────────────────────────────────────────────────────────
// On Railway: mount a volume at /data and set RAILWAY_VOLUME_MOUNT_PATH=/data
// Locally: uses <project>/backend/data/app.db
const DB_DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH
  ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH)
  : path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "app.db");

// Ensure data directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// ── Open connection ────────────────────────────────────────────────────────────
export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ── Migrations ─────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    password_hash TEXT,
    google_id TEXT UNIQUE,
    role TEXT DEFAULT 'user' NOT NULL,
    created_at TEXT DEFAULT (datetime('now')) NOT NULL,
    last_login TEXT
  );

  CREATE TABLE IF NOT EXISTS quiz_attempts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    score INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    percentage REAL NOT NULL,
    completed_at TEXT DEFAULT (datetime('now')) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// ── Seed admin account ─────────────────────────────────────────────────────────
const adminExists = db.prepare("SELECT id FROM users WHERE username = 'admin'").get();
if (!adminExists) {
  const hash = bcrypt.hashSync("Admin@123", 12);
  db.prepare(
    "INSERT INTO users (id, username, email, password_hash, role) VALUES (?, ?, ?, ?, ?)"
  ).run(uuidv4(), "admin", null, hash, "admin");
  console.log("  ✅ Admin account created: admin / Admin@123");
}

// ── User queries ───────────────────────────────────────────────────────────────

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

export const userQueries = {
  findById: db.prepare<[string]>("SELECT * FROM users WHERE id = ?"),
  findByUsername: db.prepare<[string]>("SELECT * FROM users WHERE username = ?"),
  findByEmail: db.prepare<[string]>("SELECT * FROM users WHERE email = ?"),
  findByGoogleId: db.prepare<[string]>("SELECT * FROM users WHERE google_id = ?"),
  create: db.prepare<[string, string, string | null, string | null, string | null, string]>(
    "INSERT INTO users (id, username, email, password_hash, google_id, role) VALUES (?, ?, ?, ?, ?, ?)"
  ),
  updateLastLogin: db.prepare<[string]>(
    "UPDATE users SET last_login = datetime('now') WHERE id = ?"
  ),
  linkGoogleId: db.prepare<[string, string]>(
    "UPDATE users SET google_id = ? WHERE id = ?"
  ),
  all: db.prepare(
    "SELECT id, username, email, role, created_at, last_login FROM users ORDER BY created_at DESC"
  ),
};

export const quizQueries = {
  create: db.prepare<[string, string, number, number, number]>(
    "INSERT INTO quiz_attempts (id, user_id, score, total_questions, percentage) VALUES (?, ?, ?, ?, ?)"
  ),
  byUser: db.prepare<[string]>(
    "SELECT * FROM quiz_attempts WHERE user_id = ? ORDER BY completed_at DESC"
  ),
  all: db.prepare(`
    SELECT qa.*, u.username, u.email
    FROM quiz_attempts qa
    JOIN users u ON qa.user_id = u.id
    ORDER BY qa.completed_at DESC
  `),
  leaderboard: db.prepare(`
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
  `),
};
