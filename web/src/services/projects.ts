import type { Project } from "@shared";

import { apiRequest, shouldUseLocalBackend } from "@/lib/api";

export type { Project };

export interface ProjectResult {
  data: Project[] | null;
  error: string | null;
}

const DEMO_KEY = "multimod-demo-projects";

function readDemoProjects(): Project[] {
  try {
    const raw = localStorage.getItem(DEMO_KEY);
    return raw ? (JSON.parse(raw) as Project[]) : [];
  } catch {
    return [];
  }
}

function writeDemoProjects(projects: Project[]) {
  localStorage.setItem(DEMO_KEY, JSON.stringify(projects));
}

function nowIso() {
  return new Date().toISOString();
}

export async function listProjects(): Promise<ProjectResult> {
  if (shouldUseLocalBackend()) {
    return { data: readDemoProjects(), error: null };
  }
  try {
    const { data } = await apiRequest<{ data: Project[] }>("/api/projects");
    return { data, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

export async function createProject(input: {
  title: string;
  vibe_prompt?: string;
  modules?: string[];
}): Promise<{ data: Project | null; error: string | null }> {
  if (shouldUseLocalBackend()) {
    const project: Project = {
      id: crypto.randomUUID(),
      title: input.title,
      vibe_prompt: input.vibe_prompt ?? "",
      modules: input.modules ?? [],
      style_params: null,
      status: "draft",
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    const projects = readDemoProjects();
    projects.unshift(project);
    writeDemoProjects(projects);
    return { data: project, error: null };
  }
  try {
    const { data } = await apiRequest<{ data: Project }>("/api/projects", {
      method: "POST",
      body: {
        title: input.title,
        vibe_prompt: input.vibe_prompt ?? "",
        modules: input.modules ?? [],
      },
    });
    return { data, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

export async function renameProject(
  id: string,
  title: string,
): Promise<{ error: string | null }> {
  if (shouldUseLocalBackend()) {
    const projects = readDemoProjects();
    const next = projects.map((project) =>
      project.id === id ? { ...project, title, updated_at: nowIso() } : project,
    );
    writeDemoProjects(next);
    return { error: null };
  }
  try {
    await apiRequest(`/api/projects/${id}`, {
      method: "PATCH",
      body: { title },
    });
    return { error: null };
  } catch (error) {
    return { error: (error as Error).message };
  }
}

export async function deleteProject(
  id: string,
): Promise<{ error: string | null }> {
  if (shouldUseLocalBackend()) {
    writeDemoProjects(
      readDemoProjects().filter((project) => project.id !== id),
    );
    return { error: null };
  }
  try {
    await apiRequest(`/api/projects/${id}`, { method: "DELETE" });
    return { error: null };
  } catch (error) {
    return { error: (error as Error).message };
  }
}

export async function getProject(
  id: string,
): Promise<{ data: Project | null; error: string | null }> {
  if (shouldUseLocalBackend()) {
    const project = readDemoProjects().find((item) => item.id === id);
    return { data: project ?? null, error: project ? null : "项目不存在" };
  }
  try {
    const { data } = await apiRequest<{ data: Project }>(`/api/projects/${id}`);
    return { data, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

export async function updateProject(
  id: string,
  patch: Partial<
    Pick<
      Project,
      "title" | "vibe_prompt" | "modules" | "status" | "style_params"
    >
  >,
): Promise<{ error: string | null }> {
  if (shouldUseLocalBackend()) {
    const projects = readDemoProjects();
    writeDemoProjects(
      projects.map((project) =>
        project.id === id
          ? { ...project, ...patch, updated_at: nowIso() }
          : project,
      ),
    );
    return { error: null };
  }
  try {
    await apiRequest(`/api/projects/${id}`, {
      method: "PATCH",
      body: patch,
    });
    return { error: null };
  } catch (error) {
    return { error: (error as Error).message };
  }
}
