import path from "node:path";

import { STORAGE_ROOT } from "../config.js";
import { HttpError } from "./httpError.js";

export function normalizeRelative(input = "") {
  const raw = String(input ?? "").replace(/\\/g, "/");
  const clean = raw.replace(/^\/+/, "").replace(/\/+$/, "");
  const parts = clean.split("/").filter(Boolean);
  if (parts.some((part) => part === "." || part === "..")) {
    throw new HttpError(400, "路径不合法，不能包含 . 或 ..");
  }
  return parts.join("/");
}

export function resolveSafe(relativePath) {
  const relative = normalizeRelative(relativePath);
  const absolute = path.resolve(STORAGE_ROOT, relative);
  if (
    absolute !== STORAGE_ROOT &&
    !absolute.startsWith(STORAGE_ROOT + path.sep)
  ) {
    throw new HttpError(400, "路径越界");
  }
  return { relative, absolute };
}

export function validateName(name) {
  if (
    typeof name !== "string" ||
    !name.trim() ||
    name.includes("/") ||
    name.includes("\\") ||
    name === "." ||
    name === ".."
  ) {
    throw new HttpError(400, "名称不合法");
  }
  return name.trim();
}

export function joinApiPath(relative, name) {
  return `/${relative ? `${relative}/${name}` : name}`;
}

export function sanitizeFileName(name) {
  const clean = String(name)
    .replace(/[/\\]/g, "-")
    .replace(/[<>:"|?*]/g, "-")
    .trim();
  return clean || `file-${Date.now()}`;
}
