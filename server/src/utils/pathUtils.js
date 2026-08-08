import { HttpError } from "./httpError.js";

export function normalizeSegments(input = "") {
  const raw = String(input ?? "").replace(/\\/g, "/");
  const clean = raw.replace(/^\/+/, "").replace(/\/+$/, "");
  const parts = clean.split("/").filter(Boolean);
  if (parts.some((part) => part === "." || part === "..")) {
    throw new HttpError(400, "路径不合法，不能包含 . 或 ..");
  }
  return parts;
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

export function joinApiPath(segments, name) {
  const all = [...segments, name];
  return `/${all.join("/")}`;
}

export function joinSegmentsPath(segments) {
  return `/${segments.join("/")}`;
}
