import { login, logout, register } from "../services/authService.js";

export function registerUser(req, res, next) {
  try {
    const { username, password } = req.body ?? {};
    const result = register(String(username), String(password));
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export function loginUser(req, res, next) {
  try {
    const { username, password } = req.body ?? {};
    res.json(login(String(username), String(password)));
  } catch (error) {
    next(error);
  }
}

export function logoutUser(req, res, next) {
  try {
    const token = req.headers.authorization?.slice(7);
    if (token) logout(token);
    res.json({ message: "已退出登录" });
  } catch (error) {
    next(error);
  }
}
