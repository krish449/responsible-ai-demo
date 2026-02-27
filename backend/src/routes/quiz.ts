import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { quizQueries } from "../db/database";
import { requireAuth } from "../middleware/auth";

export const quizRouter = Router();

// All quiz routes require auth
quizRouter.use(requireAuth);

// POST /api/quiz/attempts — save a completed quiz attempt
quizRouter.post("/attempts", (req: Request, res: Response) => {
  const { score, totalQuestions, percentage } = req.body;
  if (score === undefined || !totalQuestions || percentage === undefined) {
    res.status(400).json({ error: "score, totalQuestions, and percentage are required" });
    return;
  }

  const id = uuidv4();
  quizQueries.create.run(id, req.user!.id, score, totalQuestions, percentage);

  res.json({
    attempt: {
      id,
      userId: req.user!.id,
      score,
      totalQuestions,
      percentage,
    },
  });
});

// GET /api/quiz/attempts/me — get current user's attempts
quizRouter.get("/attempts/me", (req: Request, res: Response) => {
  const attempts = quizQueries.byUser.all(req.user!.id);
  res.json({ attempts });
});

// GET /api/quiz/leaderboard — top scores across all users
quizRouter.get("/leaderboard", (req: Request, res: Response) => {
  const leaderboard = quizQueries.leaderboard.all();
  res.json({ leaderboard });
});
