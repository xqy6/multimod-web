import type { Project } from "@shared";

import { supabase } from "@/lib/supabase";

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
  if (!supabase) {
    return { data: readDemoProjects(), error: null };
  }
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("updated_at", { ascending: false });
  return { data, error: error?.message ?? null };
}

export async function createProject(input: {
  title: string;
  vibe_prompt?: string;
  modules?: string[];
}): Promise<{ data: Project | null; error: string | null }> {
  if (!supabase) {
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

  const { data, error } = await supabase
    .from("projects")
    .insert({
      title: input.title,
      vibe_prompt: input.vibe_prompt ?? "",
      modules: input.modules ?? [],
      style_params: {},
      status: "draft",
    })
    .select()
    .single();
  return { data, error: error?.message ?? null };
}

export async function renameProject(
  id: string,
  title: string,
): Promise<{ error: string | null }> {
  if (!supabase) {
    const projects = readDemoProjects();
    const next = projects.map((project) =>
      project.id === id ? { ...project, title, updated_at: nowIso() } : project,
    );
    writeDemoProjects(next);
    return { error: null };
  }
  const { error } = await supabase
    .from("projects")
    .update({ title, updated_at: nowIso() })
    .eq("id", id);
  return { error: error?.message ?? null };
}

export async function deleteProject(
  id: string,
): Promise<{ error: string | null }> {
  if (!supabase) {
    writeDemoProjects(
      readDemoProjects().filter((project) => project.id !== id),
    );
    return { error: null };
  }
  const { error } = await supabase.from("projects").delete().eq("id", id);
  return { error: error?.message ?? null };
}

export async function getProject(
  id: string,
): Promise<{ data: Project | null; error: string | null }> {
  if (!supabase) {
    const project = readDemoProjects().find((item) => item.id === id);
    return { data: project ?? null, error: project ? null : "项目不存在" };
  }
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();
  return { data, error: error?.message ?? null };
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
  if (!supabase) {
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
  const { error } = await supabase
    .from("projects")
    .update({ ...patch, updated_at: nowIso() })
    .eq("id", id);
  return { error: error?.message ?? null };
}
