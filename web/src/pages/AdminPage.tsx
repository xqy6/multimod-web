import {
  Ban,
  Download,
  FileText,
  FolderKanban,
  Loader2,
  Megaphone,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Unlock,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import {
  deleteAdminMessages,
  deleteAdminProject,
  deleteAdminRoom,
  deleteAdminUser,
  getAdminMessages,
  getAdminProjects,
  getAdminRooms,
  getAdminStats,
  getAdminUsers,
  getAnnouncement,
  getBackupJson,
  saveAnnouncement,
  setAdminUserBan,
  type AdminMessage,
  type AdminProject,
  type AdminRoom,
  type AdminStats,
  type AdminUser,
} from "@/services/admin";
import { useAuthStore } from "@/stores/auth";
import { useToastStore } from "@/stores/toast";

function formatDate(value: string) {
  return new Date(value).toLocaleString("zh-CN", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default function AdminPage() {
  const user = useAuthStore((state) => state.user);
  const pushToast = useToastStore((state) => state.push);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [rooms, setRooms] = useState<AdminRoom[]>([]);
  const [announcement, setAnnouncement] = useState("");
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(
    new Set(),
  );
  const [messageRoomId, setMessageRoomId] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [backupLoading, setBackupLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsResult, usersResult, projectsResult, roomsResult, announcementResult, messagesResult] =
        await Promise.all([
          getAdminStats(),
          getAdminUsers(),
          getAdminProjects(),
          getAdminRooms(),
          getAnnouncement(),
          getAdminMessages(),
        ]);
      setStats(statsResult.data);
      setUsers(usersResult.data ?? []);
      setProjects(projectsResult.data ?? []);
      setRooms(roomsResult.data ?? []);
      setAnnouncement(announcementResult.data ?? "");
      setMessages(messagesResult.data ?? []);
    } catch (loadError) {
      setError((loadError as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.isAdmin) void load();
  }, [load, user?.isAdmin]);

  useEffect(() => {
    const container = messagesEndRef.current?.parentElement;
    if (container) container.scrollTop = container.scrollHeight;
  }, [messages.length, messageRoomId]);

  const handleDeleteUser = async (target: AdminUser) => {
    if (target.role === "admin") {
      pushToast("error", "不能删除管理员账号");
      return;
    }
    if (!window.confirm(`确认删除用户 ${target.email} 吗？其项目、消息和素材会一并删除。`)) {
      return;
    }
    try {
      await deleteAdminUser(target.id);
      pushToast("success", "用户已删除");
      await load();
    } catch (deleteError) {
      pushToast("error", (deleteError as Error).message);
    }
  };

  const handleDeleteProject = async (project: AdminProject) => {
    if (!window.confirm(`确认删除项目 ${project.title} 吗？`)) return;
    try {
      await deleteAdminProject(project.id);
      pushToast("success", "项目已删除");
      await load();
    } catch (deleteError) {
      pushToast("error", (deleteError as Error).message);
    }
  };

  const handleDeleteRoom = async (room: AdminRoom) => {
    if (!window.confirm(`确认删除房间 ${room.name} 吗？`)) return;
    try {
      await deleteAdminRoom(room.id);
      pushToast("success", "房间已删除");
      await load();
    } catch (deleteError) {
      pushToast("error", (deleteError as Error).message);
    }
  };

  const handleToggleBan = async (target: AdminUser) => {
    const nextBanned = !target.banned;
    if (!window.confirm(`确认${nextBanned ? "封禁" : "解封"}用户 ${target.email} 吗？`)) {
      return;
    }
    try {
      await setAdminUserBan(target.id, nextBanned);
      pushToast("success", nextBanned ? "用户已封禁" : "用户已解封");
      await load();
    } catch (banError) {
      pushToast("error", (banError as Error).message);
    }
  };

  const loadMessages = async (roomId?: string) => {
    try {
      const result = await getAdminMessages(roomId);
      setMessages(result.data ?? []);
      setSelectedMessageIds(new Set());
    } catch (messageError) {
      pushToast("error", (messageError as Error).message);
    }
  };

  const handleDeleteMessages = async () => {
    const ids = [...selectedMessageIds];
    if (ids.length === 0) return;
    if (!window.confirm(`确认删除选中的 ${ids.length} 条消息吗？`)) return;
    try {
      await deleteAdminMessages(ids);
      pushToast("success", "消息已删除");
      await load();
      await loadMessages(messageRoomId || undefined);
    } catch (deleteError) {
      pushToast("error", (deleteError as Error).message);
    }
  };

  const toggleMessageSelection = (id: string) => {
    setSelectedMessageIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSaveAnnouncement = async () => {
    try {
      const result = await saveAnnouncement(announcement);
      setAnnouncement(result.data ?? "");
      pushToast("success", "公告已保存");
    } catch (announcementError) {
      pushToast("error", (announcementError as Error).message);
    }
  };

  const handleDownloadBackup = async () => {
    setBackupLoading(true);
    try {
      const backup = await getBackupJson();
      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `backup-${new Date().toISOString().slice(0, 19)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      pushToast("success", "备份已导出");
    } catch (backupError) {
      pushToast("error", (backupError as Error).message);
    } finally {
      setBackupLoading(false);
    }
  };

  if (!user?.isAdmin) {
    return (
      <div className="rounded-panel border border-white/10 bg-white/[0.03] p-10 text-center">
        <ShieldCheck className="mx-auto h-10 w-10 text-mint-300" aria-hidden="true" />
        <h1 className="mt-4 text-xl font-bold">需要管理员权限</h1>
      </div>
    );
  }

  const statCards = [
    { label: "注册用户", value: stats?.users ?? 0, icon: Users },
    { label: "项目", value: stats?.projects ?? 0, icon: FolderKanban },
    { label: "聊天房间", value: stats?.rooms ?? 0, icon: MessageSquare },
    { label: "消息", value: stats?.messages ?? 0, icon: MessageSquare },
    { label: "成绩", value: stats?.scores ?? 0, icon: ShieldCheck },
    { label: "网盘文件", value: stats?.files ?? 0, icon: FileText },
  ];

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mint-300">
            管理后台
          </p>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">平台管理</h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            onClick={() => void handleDownloadBackup()}
            disabled={backupLoading}
          >
            {backupLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Download className="h-4 w-4" aria-hidden="true" />
            )}
            导出备份
          </Button>
          <Button variant="ghost" onClick={() => void load()}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            刷新
          </Button>
        </div>
      </div>

      {error ? (
        <p className="mt-6 rounded-xl bg-red-400/10 px-4 py-3 text-sm text-red-200 ring-1 ring-red-400/20">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center gap-3 py-24 text-mist-400">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          <span className="text-sm">加载管理数据</span>
        </div>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
            {statCards.map((card) => (
              <div
                key={card.label}
                className="rounded-card border border-white/10 bg-white/[0.03] p-4"
              >
                <card.icon className="h-5 w-5 text-mint-300" aria-hidden="true" />
                <p className="mt-4 text-2xl font-bold">{card.value}</p>
                <p className="mt-1 text-xs text-mist-400">{card.label}</p>
              </div>
            ))}
          </div>

          <section className="mt-8 rounded-panel border border-white/10 bg-white/[0.02] p-5">
            <h2 className="flex items-center gap-2 text-base font-bold">
              <Megaphone className="h-4 w-4 text-mint-300" aria-hidden="true" />
              全站公告
            </h2>
            <textarea
              value={announcement}
              onChange={(event) => setAnnouncement(event.target.value)}
              className="mt-4 h-24 w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-mist-100 focus:border-mint-300/50 focus:outline-none"
              placeholder="留空则不显示公告"
            />
            <Button className="mt-3" onClick={() => void handleSaveAnnouncement()}>
              保存公告
            </Button>
          </section>

          <section className="mt-8 rounded-panel border border-white/10 bg-white/[0.02]">
            <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <h2 className="flex items-center gap-2 text-base font-bold">
                <Users className="h-4 w-4 text-mint-300" aria-hidden="true" />
                用户
              </h2>
              <span className="text-xs text-mist-500">{users.length} 个</span>
            </header>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="text-xs text-mist-500">
                  <tr className="border-b border-white/5">
                    <th className="px-5 py-3 font-medium">账号</th>
                    <th className="px-5 py-3 font-medium">昵称</th>
                    <th className="px-5 py-3 font-medium">角色</th>
                    <th className="px-5 py-3 font-medium">注册时间</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {users.map((item) => (
                    <tr key={item.id}>
                      <td className="px-5 py-3 text-mist-100">{item.email || item.username}</td>
                      <td className="px-5 py-3 text-mist-300">{item.display_name || "-"}</td>
                      <td className="px-5 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs ${
                            item.role === "admin"
                              ? "bg-lilac-300/10 text-lilac-200 ring-1 ring-lilac-300/20"
                              : "bg-white/5 text-mist-300 ring-1 ring-white/10"
                          }`}
                        >
                          {item.role === "admin" ? "管理员" : "用户"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-mist-500">
                        {formatDate(item.created_at)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {item.role !== "admin" ? (
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => void handleToggleBan(item)}
                              className={`flex h-8 w-8 items-center justify-center rounded-full ${
                                item.banned
                                  ? "text-amber-200 hover:bg-amber-300/10"
                                  : "text-mist-500 hover:bg-amber-300/10 hover:text-amber-200"
                              }`}
                              aria-label={`${item.banned ? "解封" : "封禁"}用户 ${item.email}`}
                            >
                              {item.banned ? (
                                <Unlock className="h-4 w-4" aria-hidden="true" />
                              ) : (
                                <Ban className="h-4 w-4" aria-hidden="true" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDeleteUser(item)}
                              className="flex h-8 w-8 items-center justify-center rounded-full text-mist-500 hover:bg-red-400/10 hover:text-red-200"
                              aria-label={`删除用户 ${item.email}`}
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </button>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-8 rounded-panel border border-white/10 bg-white/[0.02]">
            <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <h2 className="flex items-center gap-2 text-base font-bold">
                <FolderKanban className="h-4 w-4 text-mint-300" aria-hidden="true" />
                项目
              </h2>
              <span className="text-xs text-mist-500">{projects.length} 个</span>
            </header>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="text-xs text-mist-500">
                  <tr className="border-b border-white/5">
                    <th className="px-5 py-3 font-medium">标题</th>
                    <th className="px-5 py-3 font-medium">所有者</th>
                    <th className="px-5 py-3 font-medium">状态</th>
                    <th className="px-5 py-3 font-medium">更新时间</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {projects.map((project) => (
                    <tr key={project.id}>
                      <td className="px-5 py-3 text-mist-100">{project.title}</td>
                      <td className="px-5 py-3 text-mist-300">
                        {project.owner_name || project.owner_email}
                      </td>
                      <td className="px-5 py-3 text-xs text-mist-400">{project.status}</td>
                      <td className="px-5 py-3 text-xs text-mist-500">
                        {formatDate(project.updated_at)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => void handleDeleteProject(project)}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-mist-500 hover:bg-red-400/10 hover:text-red-200"
                          aria-label={`删除项目 ${project.title}`}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-8 rounded-panel border border-white/10 bg-white/[0.02]">
            <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <h2 className="flex items-center gap-2 text-base font-bold">
                <MessageSquare className="h-4 w-4 text-mint-300" aria-hidden="true" />
                聊天房间
              </h2>
              <span className="text-xs text-mist-500">{rooms.length} 个</span>
            </header>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="text-xs text-mist-500">
                  <tr className="border-b border-white/5">
                    <th className="px-5 py-3 font-medium">房间</th>
                    <th className="px-5 py-3 font-medium">创建者</th>
                    <th className="px-5 py-3 font-medium">成员</th>
                    <th className="px-5 py-3 font-medium">消息</th>
                    <th className="px-5 py-3 font-medium">创建时间</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {rooms.map((room) => (
                    <tr key={room.id}>
                      <td className="px-5 py-3 text-mist-100">{room.name}</td>
                      <td className="px-5 py-3 text-mist-300">
                        {room.owner_name || room.owner_email}
                      </td>
                      <td className="px-5 py-3 text-xs text-mist-400">{room.member_count}</td>
                      <td className="px-5 py-3 text-xs text-mist-400">{room.message_count}</td>
                      <td className="px-5 py-3 text-xs text-mist-500">
                        {formatDate(room.created_at)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => void handleDeleteRoom(room)}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-mist-500 hover:bg-red-400/10 hover:text-red-200"
                          aria-label={`删除房间 ${room.name}`}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-8 flex h-[560px] min-h-[420px] max-h-[70vh] flex-col overflow-hidden rounded-panel border border-white/10 bg-ink-900/40">
            <header className="flex flex-col gap-3 border-b border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="flex items-center gap-2 text-base font-bold">
                <MessageSquare className="h-4 w-4 text-mint-300" aria-hidden="true" />
                聊天记录
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={messageRoomId}
                  onChange={(event) => {
                    const roomId = event.target.value;
                    setMessageRoomId(roomId);
                    void loadMessages(roomId || undefined);
                  }}
                  className="h-10 rounded-xl border border-white/10 bg-ink-900 px-3 text-sm text-mist-200 focus:border-mint-300/50 focus:outline-none"
                >
                  <option value="">全部房间</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name}
                    </option>
                  ))}
                </select>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={selectedMessageIds.size === 0}
                  onClick={() => void handleDeleteMessages()}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  删除选中
                </Button>
              </div>
            </header>

            <div className="flex min-h-0 flex-1 touch-pan-y flex-col overflow-y-auto overscroll-contain p-4">
              {messages.length === 0 ? (
                <div className="flex flex-1 items-center justify-center text-center text-sm text-mist-500">
                  暂无聊天记录
                </div>
              ) : (
                messages.map((message) => {
                  const selected = selectedMessageIds.has(message.id);
                  const room = rooms.find((item) => item.id === message.room_id);
                  return (
                    <div
                      key={message.id}
                      className={`mb-4 flex items-start gap-3 rounded-2xl p-2 transition-colors ${
                        selected ? "bg-mint-300/5 ring-1 ring-mint-300/20" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleMessageSelection(message.id)}
                        className="mt-3 h-4 w-4 shrink-0 accent-mint-300"
                        aria-label={`选择消息 ${message.id}`}
                      />
                      <div className="max-w-[82%] min-w-0 rounded-2xl bg-white/5 px-4 py-3 ring-1 ring-white/10">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                          <span className="text-xs font-semibold text-mint-200">
                            {message.display_name || message.email || "用户"}
                          </span>
                          <span className="text-[10px] text-mist-500">
                            {room?.name ?? "未知房间"}
                          </span>
                          <span className="text-[10px] text-mist-500">
                            {formatDate(message.created_at)}
                          </span>
                        </div>
                        <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-6 text-mist-100">
                          {message.body}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
