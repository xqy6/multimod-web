import { apiRequest } from "@/lib/api";

export interface AdminStats {
  users: number;
  projects: number;
  rooms: number;
  messages: number;
  scores: number;
  files: number;
}

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: "user" | "admin";
  display_name: string;
  banned?: boolean;
  created_at: string;
}

export interface AdminProject {
  id: string;
  title: string;
  vibe_prompt: string;
  status: string;
  owner_id: string;
  owner_email: string;
  owner_name: string;
  created_at: string;
  updated_at: string;
}

export interface AdminRoom {
  id: string;
  name: string;
  created_by: string;
  owner_email: string;
  owner_name: string;
  member_count: number;
  message_count: number;
  created_at: string;
}

export interface AdminMessage {
  id: string;
  room_id: string;
  user_id: string;
  body: string;
  created_at: string;
  email: string;
  display_name: string;
}

export function getAdminStats() {
  return apiRequest<{ data: AdminStats }>("/api/admin/stats");
}

export function getAdminUsers() {
  return apiRequest<{ data: AdminUser[] }>("/api/admin/users");
}

export function deleteAdminUser(userId: string) {
  return apiRequest<{ message: string }>(`/api/admin/users/${userId}`, {
    method: "DELETE",
  });
}

export function setAdminUserBan(userId: string, banned: boolean) {
  return apiRequest<{ message: string }>(`/api/admin/users/${userId}/ban`, {
    method: "POST",
    body: { banned },
  });
}

export function getAdminProjects() {
  return apiRequest<{ data: AdminProject[] }>("/api/admin/projects");
}

export function deleteAdminProject(projectId: string) {
  return apiRequest<{ message: string }>(
    `/api/admin/projects/${projectId}`,
    { method: "DELETE" },
  );
}

export function getAdminRooms() {
  return apiRequest<{ data: AdminRoom[] }>("/api/admin/rooms");
}

export function deleteAdminRoom(roomId: string) {
  return apiRequest<{ message: string }>(`/api/admin/rooms/${roomId}`, {
    method: "DELETE",
  });
}

export function getAdminMessages(roomId?: string) {
  const query = roomId
    ? `?roomId=${encodeURIComponent(roomId)}&limit=100`
    : "?limit=100";
  return apiRequest<{ data: AdminMessage[] }>(`/api/admin/messages${query}`);
}

export function deleteAdminMessages(ids: string[]) {
  return apiRequest<{ message: string }>("/api/admin/messages", {
    method: "DELETE",
    body: { ids },
  });
}

export function getAnnouncement() {
  return apiRequest<{ data: string }>("/api/announcement");
}

export function saveAnnouncement(value: string) {
  return apiRequest<{ data: string }>("/api/admin/announcement", {
    method: "PUT",
    body: { value },
  });
}

export function getBackupJson() {
  return apiRequest<Record<string, unknown>>("/api/admin/backup");
}
