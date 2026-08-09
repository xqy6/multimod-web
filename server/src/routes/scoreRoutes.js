import { Router } from "express";

import {
  getBestScore,
  getLeaderboard,
  submitScore,
} from "../services/platformService.js";
import { HttpError } from "../utils/httpError.js";

export const scoreRouter = Router();

scoreRouter.get("/leaderboard", (req, res, next) => {
  try {
    const gameId = String(req.query.game_id || "");
    if (!gameId) throw new HttpError(400, "缺少 game_id");
    res.json({ data: getLeaderboard(gameId) });
  } catch (error) {
    next(error);
  }
});

scoreRouter.get("/best", (req, res, next) => {
  try {
    const gameId = String(req.query.game_id || "");
    if (!gameId) throw new HttpError(400, "缺少 game_id");
    res.json({ score: getBestScore(req.user.id, gameId) });
  } catch (error) {
    next(error);
  }
});

scoreRouter.post("/", (req, res, next) => {
  try {
    const { game_id: gameId, score } = req.body ?? {};
    if (!gameId) throw new HttpError(400, "缺少 game_id");
    submitScore(req.user.id, String(gameId), Number(score || 0));
    res.status(201).json({ message: "成绩已保存" });
  } catch (error) {
    next(error);
  }
});
