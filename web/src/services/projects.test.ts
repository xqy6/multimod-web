import { beforeEach, describe, expect, it } from "vitest";

import {
  createProject,
  deleteProject,
  listProjects,
  renameProject,
} from "./projects";

describe("projects demo mode", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("creates, lists, renames and deletes projects", async () => {
    const created = await createProject({ title: "测试项目" });
    expect(created.error).toBeNull();
    expect(created.data?.title).toBe("测试项目");

    const renamed = await renameProject(created.data!.id, "改名的项目");
    expect(renamed.error).toBeNull();

    const listed = await listProjects();
    expect(listed.error).toBeNull();
    expect(listed.data).toHaveLength(1);
    expect(listed.data![0].title).toBe("改名的项目");

    const removed = await deleteProject(created.data!.id);
    expect(removed.error).toBeNull();
    expect((await listProjects()).data).toHaveLength(0);
  });
});
