import { Router, Request, Response } from "express";
import { userQueries, quizQueries } from "../db/database";
import { requireAdmin } from "../middleware/auth";

export const adminRouter = Router();

// All admin routes require admin role
adminRouter.use(requireAdmin);

// GET /api/admin/users — list all registered users
adminRouter.get("/users", async (_req: Request, res: Response) => {
  const users = await userQueries.all();
  res.json({ users });
});

// GET /api/admin/quiz-attempts — all quiz attempts with user info
adminRouter.get("/quiz-attempts", async (_req: Request, res: Response) => {
  const attempts = await quizQueries.all();
  res.json({ attempts });
});
