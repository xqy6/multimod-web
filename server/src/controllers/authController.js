import {
  currentUser,
  login,
  logout,
  register,
} from "../services/authService.js";
import {
  clearLoginFailures,
  isLoginLocked,
  loginKey,
  recordLoginFailure,
} from "../services/securityService.js";

export function registerUser(req, res, next) {
  try {
    const { email, password, displayName } = req.body ?? {};
    const result = register(
      String(email || ""),
      String(password || ""),
      String(displayName || ""),
    );
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export function loginUser(req, res, next) {
  const identifier = String(req.body?.email || "");
  const key = loginKey(identifier, req.ip);
  try {
    if (isLoginLocked(key)) {
      const lockedError = new Error("登录失败次数过多，请 15 分钟后再试");
      lockedError.status = 429;
      throw lockedError;
    }
    const { password } = req.body ?? {};
    const result = login(identifier, String(password || ""));
    clearLoginFailures(key);
    res.json(result);
  } catch (error) {
    if (error.status === 401) recordLoginFailure(key);
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

export function me(req, res) {
  res.json({ user: currentUser(req.user.id) });
}
