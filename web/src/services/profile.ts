import { apiRequest, serverApiUrl } from "@/lib/api";

export async function updateProfile(displayName: string) {
  return apiRequest<{ profile: { display_name: string } }>("/api/profile", {
    method: "PUT",
    body: { displayName },
  });
}

export async function uploadAvatar(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const result = await apiRequest<{ avatarUrl: string }>("/api/profile/avatar", {
    method: "POST",
    body: form,
  });
  return `${serverApiUrl}${result.avatarUrl}`;
}

export function profileAvatarUrl(userId: string): string {
  return `${serverApiUrl}/api/profile/${userId}/avatar?ts=${Date.now()}`;
}
