import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { v4 as uuidv4 } from "uuid";
import { db, userQueries, UserRow } from "../db/database";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";
const JWT_EXPIRES_IN = "7d";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// ── Public user shape (no password hash) ──────────────────────────────────────

export interface PublicUser {
  id: string;
  username: string;
  email: string | null;
  role: "user" | "admin";
  createdAt: string;
  lastLogin: string | null;
}

function toPublicUser(row: UserRow): PublicUser {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    role: row.role,
    createdAt: row.created_at,
    lastLogin: row.last_login,
  };
}

// ── JWT ────────────────────────────────────────────────────────────────────────

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): { sub: string } {
  return jwt.verify(token, JWT_SECRET) as { sub: string };
}

// ── Register ───────────────────────────────────────────────────────────────────

export async function register(
  username: string,
  password: string,
  email?: string
): Promise<{ token: string; user: PublicUser }> {
  // Validate username length/format
  if (!username || username.length < 3 || username.length > 32) {
    throw new Error("Username must be 3–32 characters");
  }
  if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
    throw new Error("Username may only contain letters, numbers, underscores, dots, hyphens");
  }
  if (!password || password.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }

  // Check uniqueness
  if (userQueries.findByUsername.get(username)) {
    throw new Error("Username already taken");
  }
  if (email && userQueries.findByEmail.get(email)) {
    throw new Error("Email already registered");
  }

  const hash = await bcrypt.hash(password, 12);
  const id = uuidv4();
  userQueries.create.run(id, username, email ?? null, hash, null, "user");
  userQueries.updateLastLogin.run(id);

  const row = userQueries.findById.get(id) as UserRow;
  const token = signToken(id);
  return { token, user: toPublicUser(row) };
}

// ── Login ──────────────────────────────────────────────────────────────────────

export async function login(
  usernameOrEmail: string,
  password: string
): Promise<{ token: string; user: PublicUser }> {
  // Try username first, then email
  let row = userQueries.findByUsername.get(usernameOrEmail) as UserRow | undefined;
  if (!row) {
    row = userQueries.findByEmail.get(usernameOrEmail) as UserRow | undefined;
  }

  if (!row || !row.password_hash) {
    throw new Error("Invalid username or password");
  }

  const valid = await bcrypt.compare(password, row.password_hash);
  if (!valid) {
    throw new Error("Invalid username or password");
  }

  userQueries.updateLastLogin.run(row.id);
  const token = signToken(row.id);
  return { token, user: toPublicUser(row) };
}

// ── Google OAuth ───────────────────────────────────────────────────────────────

export async function googleAuth(
  credential: string
): Promise<{ token: string; user: PublicUser }> {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error("Google OAuth not configured — set GOOGLE_CLIENT_ID in .env");
  }

  let payload: { sub?: string; email?: string; name?: string; given_name?: string };
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload() ?? {};
  } catch {
    throw new Error("Invalid Google credential");
  }

  const googleId = payload.sub!;
  const email = payload.email;
  const displayName = payload.given_name ?? payload.name ?? "user";

  // Find existing user by Google ID
  let row = userQueries.findByGoogleId.get(googleId) as UserRow | undefined;

  if (!row && email) {
    // Link to existing account with same email
    const existing = userQueries.findByEmail.get(email) as UserRow | undefined;
    if (existing) {
      userQueries.linkGoogleId.run(googleId, existing.id);
      row = userQueries.findById.get(existing.id) as UserRow;
    }
  }

  if (!row) {
    // Create new account
    let username = displayName.toLowerCase().replace(/[^a-z0-9_.-]/g, "_");
    if (username.length < 3) username = `user_${username}`;
    // Ensure uniqueness
    let attempt = username;
    let counter = 1;
    while (userQueries.findByUsername.get(attempt)) {
      attempt = `${username}${counter++}`;
    }
    const id = uuidv4();
    userQueries.create.run(id, attempt, email ?? null, null, googleId, "user");
    row = userQueries.findById.get(id) as UserRow;
  }

  userQueries.updateLastLogin.run(row.id);
  const token = signToken(row.id);
  return { token, user: toPublicUser(row) };
}

// ── Get current user ───────────────────────────────────────────────────────────

export function getUserById(id: string): PublicUser | null {
  const row = userQueries.findById.get(id) as UserRow | undefined;
  return row ? toPublicUser(row) : null;
}
