import { Router, Request, Response } from "express";
import { register, login, googleAuth } from "../services/authService";
import { requireAuth } from "../middleware/auth";

export const authRouter = Router();

// POST /api/auth/register
authRouter.post("/register", async (req: Request, res: Response) => {
  const { username, password, email } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: "username and password are required" });
    return;
  }
  try {
    const result = await register(username, password, email);
    res.json(result);
  } catch (err: unknown) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// POST /api/auth/login
authRouter.post("/login", async (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: "username and password are required" });
    return;
  }
  try {
    const result = await login(username, password);
    res.json(result);
  } catch (err: unknown) {
    res.status(401).json({ error: (err as Error).message });
  }
});

// POST /api/auth/google
authRouter.post("/google", async (req: Request, res: Response) => {
  const { credential } = req.body;
  if (!credential) {
    res.status(400).json({ error: "credential is required" });
    return;
  }
  try {
    const result = await googleAuth(credential);
    res.json(result);
  } catch (err: unknown) {
    res.status(401).json({ error: (err as Error).message });
  }
});

// GET /api/auth/me
authRouter.get("/me", requireAuth, (req: Request, res: Response) => {
  res.json({ user: req.user });
});
