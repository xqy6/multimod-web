import {
  CheckSquare,
  ListChecks,
  LogIn,
  LogOut,
  MessageSquare,
  Plus,
  Search,
  Send,
  Trash2,
  Users,
  Wifi,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { shouldUseLocalBackend } from "@/lib/api";
import {
  clearMyMessages,
  createRoom,
  deleteMessage,
  deleteMessages,
  getMessageContext,
  getUnreadCounts,
  joinRoom,
  leaveRoom,
  listMembers,
  listMessages,
  listRooms,
  markRoomRead,
  searchMessages,
  sendMessage,
  subscribeChatMessages,
  subscribePresence,
  setTyping,
  subscribeTyping,
  type ChatMember,
  type ChatMessage,
  type ChatRoom,
} from "@/services/chat";
import { useAuthStore } from "@/stores/auth";

export default function ChatPage() {
  const user = useAuthStore((state) => state.user);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [roomName, setRoomName] = useState("");
  const [members, setMembers] = useState<ChatMember[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onlineMembers, setOnlineMembers] = useState<ChatMember[]>([]);
  const [typingUsers, setTypingUsers] = useState<ChatMember[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ChatMessage[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [manageMode, setManageMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(
    new Set(),
  );
  const [highlightedMessageId, setHighlightedMessageId] = useState<
    string | null
  >(null);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef(new Map<string, HTMLDivElement>());
  const highlightScrollDoneRef = useRef(false);
  const initialRoomRef = useRef(false);

  const userId = user?.id ?? "demo-user";
  const displayName = user?.display_name ?? "演示用户";
  const activeRoom = rooms.find((room) => room.id === activeRoomId);
  const isMember = members.some((member) => member.user_id === userId);
  const ownMessageCount = messages.filter(
    (message) => message.user_id === userId,
  ).length;

  useEffect(() => {
    let cancelled = false;
    void listRooms().then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (result.error) {
        setError(result.error);
      } else {
        setRooms(result.data ?? []);
        void getUnreadCounts(userId).then((counts) => {
          if (!cancelled) setUnreadCounts(counts);
        });
        if (
          (result.data ?? []).length > 0 &&
          !activeRoomId &&
          !initialRoomRef.current
        ) {
          setActiveRoomId(result.data[0].id);
          initialRoomRef.current = true;
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, [activeRoomId, userId]);

  useEffect(() => {
    if (!activeRoomId) return;
    let cancelled = false;

    void Promise.all([
      joinRoom(activeRoomId, userId),
      listMembers(activeRoomId),
      listMessages(activeRoomId),
    ]).then(([joinResult, memberResult, messageResult]) => {
      if (cancelled) return;
      if (joinResult.error) setError(joinResult.error);
      if (!memberResult.error) setMembers(memberResult.data ?? []);
      if (!messageResult.error) {
        setMessages(messageResult.data ?? []);
        setHasMore((messageResult.data ?? []).length >= 200);
      }
      void markRoomRead(activeRoomId, userId).then(() => {
        setUnreadCounts((current) => ({ ...current, [activeRoomId]: 0 }));
      });
    });

    const unsubscribeMessages = subscribeChatMessages(
      activeRoomId,
      (message) => {
        if (message) {
          setMessages((current) => [...current, message]);
          void markRoomRead(activeRoomId, userId).then(() => {
            setUnreadCounts((current) => ({ ...current, [activeRoomId]: 0 }));
          });
        } else {
          void Promise.all([
            listMessages(activeRoomId),
            listMembers(activeRoomId),
          ]).then(([messageResult, memberResult]) => {
            if (!messageResult.error) setMessages(messageResult.data ?? []);
            if (!memberResult.error) setMembers(memberResult.data ?? []);
          });
        }
      },
    );
    const unsubscribePresence = subscribePresence(
      activeRoomId,
      userId,
      displayName,
      setOnlineMembers,
    );
    const unsubscribeTyping = subscribeTyping(activeRoomId, (users) => {
      setTypingUsers(users.filter((item) => item.user_id !== userId));
    });

    return () => {
      cancelled = true;
      unsubscribeMessages();
      unsubscribePresence();
      unsubscribeTyping();
    };
  }, [activeRoomId, displayName, userId]);

  useEffect(() => {
    setSearchQuery("");
    setSearchResults([]);
    setSearchError(null);
    setSearching(false);
    setManageMode(false);
    setSelectedMessageIds(new Set());
    setHighlightedMessageId(null);
    highlightScrollDoneRef.current = false;
  }, [activeRoomId]);

  useEffect(() => {
    const term = searchQuery.trim();
    if (!activeRoomId || term.length < 2) {
      setSearchResults([]);
      setSearchError(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    setSearchError(null);
    const timer = window.setTimeout(() => {
      void searchMessages(activeRoomId, term).then((result) => {
        if (result.error) {
          setSearchError(result.error);
          setSearchResults([]);
        } else {
          setSearchResults(result.data);
        }
        setSearching(false);
      });
    }, 300);
    return () => {
      window.clearTimeout(timer);
      setSearching(false);
    };
  }, [activeRoomId, searchQuery]);

  useEffect(() => {
    if (highlightedMessageId) return;
    const container = messagesScrollRef.current;
    if (
      container &&
      container.scrollHeight - container.scrollTop - container.clientHeight <
        120
    ) {
      container.scrollTop = container.scrollHeight;
      messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeRoomId, highlightedMessageId, messages.length]);

  useEffect(() => {
    if (!highlightedMessageId || highlightScrollDoneRef.current) return;
    const node = messageRefs.current.get(highlightedMessageId);
    if (!node) return;
    node.scrollIntoView({ behavior: "smooth", block: "center" });
    highlightScrollDoneRef.current = true;
  }, [highlightedMessageId, messages]);

  const refreshRooms = async () => {
    const result = await listRooms();
    if (!result.error) setRooms(result.data);
  };

  const handleCreateRoom = async (event: FormEvent) => {
    event.preventDefault();
    const name = roomName.trim();
    if (!name) return;
    const result = await createRoom(name, userId);
    if (result.error) {
      setError(result.error);
      return;
    }
    setRoomName("");
    if (result.data) {
      setActiveRoomId(result.data.id);
      await refreshRooms();
    }
  };

  const handleSend = async (event: FormEvent) => {
    event.preventDefault();
    const text = body.trim();
    if (!activeRoomId || !text) return;
    const result = await sendMessage(activeRoomId, userId, text);
    if (result.error) {
      setError(result.error);
      return;
    }
    setBody("");
    await markRoomRead(activeRoomId, userId);
    setUnreadCounts((current) => ({ ...current, [activeRoomId]: 0 }));
  };

  const loadOlder = async () => {
    if (!activeRoomId || messages.length === 0) return;
    setLoadingOlder(true);
    const oldest = messages[0].created_at;
    const result = await listMessages(activeRoomId, oldest);
    setLoadingOlder(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    const older = result.data ?? [];
    setHasMore(older.length >= 50);
    setMessages((current) => [...older, ...current]);
  };

  const handleLeave = async () => {
    if (!activeRoomId) return;
    const result = await leaveRoom(activeRoomId, userId);
    if (result.error) {
      setError(result.error);
      return;
    }
    setActiveRoomId(null);
    await refreshRooms();
  };

  const handleJoin = async () => {
    if (!activeRoomId) return;
    await joinRoom(activeRoomId, userId);
    await refreshRooms();
    const memberResult = await listMembers(activeRoomId);
    if (!memberResult.error) setMembers(memberResult.data);
  };

  const handleDeleteMessage = async (message: ChatMessage) => {
    if (!activeRoomId) return;
    const result = await deleteMessage(activeRoomId, message.id);
    if (result.error) {
      setError(result.error);
      return;
    }
    setMessages((current) => current.filter((item) => item.id !== message.id));
  };

  const handleJumpToMessage = async (message: ChatMessage) => {
    if (!activeRoomId) return;
    setSearching(true);
    setSearchError(null);
    const context = await getMessageContext(activeRoomId, message.id);
    setSearching(false);
    if (context.error) {
      setSearchError(context.error);
      return;
    }
    if (!context.target) {
      setSearchError("这条消息不存在或已被删除");
      return;
    }
    setMessages([...context.before, context.target, ...context.after]);
    setHasMore(false);
    setHighlightedMessageId(message.id);
    highlightScrollDoneRef.current = false;
    setSearchQuery("");
    setSearchResults([]);
  };

  const toggleMessageSelection = (message: ChatMessage) => {
    if (message.user_id !== userId) return;
    setSelectedMessageIds((current) => {
      const next = new Set(current);
      if (next.has(message.id)) next.delete(message.id);
      else next.add(message.id);
      return next;
    });
  };

  const selectAllMyMessages = () => {
    setSelectedMessageIds((current) => {
      const ownIds = messages
        .filter((message) => message.user_id === userId)
        .map((message) => message.id);
      const allSelected =
        ownIds.length > 0 && ownIds.every((id) => current.has(id));
      return allSelected ? new Set() : new Set(ownIds);
    });
  };

  const handleBatchDelete = async () => {
    if (!activeRoomId || selectedMessageIds.size === 0) return;
    const ids = [...selectedMessageIds];
    const result = await deleteMessages(activeRoomId, userId, ids);
    if (result.error) {
      setError(result.error);
      return;
    }
    setMessages((current) =>
      current.filter((message) => !selectedMessageIds.has(message.id)),
    );
    setSelectedMessageIds(new Set());
    setManageMode(false);
  };

  const handleClearMyMessages = async () => {
    if (!activeRoomId) return;
    if (!window.confirm("确认清空你在本房间发送的所有消息吗？")) return;
    const result = await clearMyMessages(activeRoomId, userId);
    if (result.error) {
      setError(result.error);
      return;
    }
    setMessages((current) =>
      current.filter((message) => message.user_id !== userId),
    );
    setSelectedMessageIds(new Set());
    setManageMode(false);
  };

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mint-300">
            实时在线聊天室
          </p>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">聊天室</h1>
          <p className="mt-3 text-sm leading-6 text-mist-400">
            多房间实时消息与在线状态；未配置后端时使用本地演示模式。
          </p>
        </div>
        <Link
          to="/lan-chat"
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-mint-300/10 px-5 text-sm font-semibold text-mint-200 ring-1 ring-mint-300/25 transition-colors hover:bg-mint-300/15"
        >
          <Wifi className="h-4 w-4" aria-hidden="true" />
          局域网实时聊天
        </Link>
      </div>

      {shouldUseLocalBackend() ? (
        <div className="mt-6 flex flex-col gap-3 rounded-xl border border-amber-300/20 bg-amber-300/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-amber-200">
            当前离线：本页只能同一浏览器多标签同步。要跨设备实时聊天，请使用局域网聊天。
          </p>
          <Link
            to="/lan-chat"
            className="shrink-0 rounded-full bg-amber-200 px-4 py-2 text-sm font-semibold text-ink-950"
          >
            打开局域网聊天
          </Link>
        </div>
      ) : null}

      {error ? (
        <p className="mt-6 rounded-xl bg-red-400/10 px-4 py-3 text-sm text-red-200 ring-1 ring-red-400/20">
          {error}
        </p>
      ) : null}

      <div className="mt-8 grid min-h-[560px] gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="rounded-panel border border-white/10 bg-white/[0.03] p-4">
          <form onSubmit={handleCreateRoom} className="flex gap-2">
            <Input
              value={roomName}
              onChange={(event) => setRoomName(event.target.value)}
              placeholder="新房间名称"
              aria-label="新房间名称"
            />
            <Button
              type="submit"
              disabled={!roomName.trim()}
              aria-label="创建房间"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
            </Button>
          </form>
          <p className="mt-2 text-xs text-mist-500">
            每个用户最多创建 10 个房间
          </p>

          <div className="mt-5 space-y-2">
            {loading ? (
              <p className="text-sm text-mist-400">加载中…</p>
            ) : rooms.length === 0 ? (
              <p className="text-sm leading-6 text-mist-400">
                还没有房间，创建一个开始聊天。
              </p>
            ) : (
              rooms.map((room) => (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => setActiveRoomId(room.id)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                    room.id === activeRoomId
                      ? "border-mint-300/40 bg-mint-300/10"
                      : "border-white/10 bg-white/[0.02] hover:border-white/20"
                  }`}
                >
                  <MessageSquare
                    className="h-4 w-4 shrink-0 text-mint-300"
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-mist-100">
                      {room.name}
                    </span>
                    <span className="mt-1 flex items-center gap-1 text-xs text-mist-500">
                      <Users className="h-3 w-3" aria-hidden="true" />
                      {room.member_count ?? 0} 位成员
                    </span>
                  </span>
                  {unreadCounts[room.id] ? (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-mint-300 px-1.5 text-[10px] font-bold text-ink-950">
                      {unreadCounts[room.id] > 99
                        ? "99+"
                        : unreadCounts[room.id]}
                    </span>
                  ) : null}
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="flex h-[560px] min-h-[420px] max-h-[70vh] flex-col overflow-hidden rounded-panel border border-white/10 bg-ink-900/50">
          {activeRoom ? (
            <>
              <header className="flex flex-col gap-3 border-b border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-mist-100">
                    {activeRoom.name}
                  </h2>
                  <p className="mt-1 text-xs text-mist-500">
                    {!shouldUseLocalBackend()
                      ? `${onlineMembers.length} 人在线`
                      : `${members.length} 位成员（本地演示）`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {isMember ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void handleLeave()}
                    >
                      <LogOut className="h-4 w-4" aria-hidden="true" />
                      离开
                    </Button>
                  ) : (
                    <Button
                      variant="soft"
                      size="sm"
                      onClick={() => void handleJoin()}
                    >
                      <LogIn className="h-4 w-4" aria-hidden="true" />
                      加入
                    </Button>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setManageMode((open) => !open)}
                >
                  {manageMode ? (
                    <X className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <ListChecks className="h-4 w-4" aria-hidden="true" />
                  )}
                  {manageMode ? "完成" : "管理"}
                </Button>
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mist-500"
                    aria-hidden="true"
                  />
                  <Input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="搜索本房间聊天记录"
                    className="pl-10 pr-10"
                    aria-label="搜索本房间聊天记录"
                  />
                  {searchQuery ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        setSearchResults([]);
                      }}
                      className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-mist-500 hover:bg-white/5 hover:text-mist-100"
                      aria-label="清除搜索"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  ) : null}
                </div>

                {manageMode ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-mist-300">
                      已选 {selectedMessageIds.size} 条
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={selectAllMyMessages}
                    >
                      {selectedMessageIds.size === ownMessageCount &&
                      ownMessageCount > 0
                        ? "取消全选"
                        : "全选我的"}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => void handleBatchDelete()}
                      disabled={selectedMessageIds.size === 0}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      删除选中
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void handleClearMyMessages()}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      清空我的
                    </Button>
                  </div>
                ) : null}

                {searchError ? (
                  <p className="text-xs text-red-200">{searchError}</p>
                ) : null}

                {searchQuery.trim().length >= 2 ? (
                  <div className="max-h-48 overflow-y-auto rounded-xl border border-white/10 bg-white/[0.03]">
                    <div className="flex items-center justify-between border-b border-white/10 px-3 py-2 text-xs text-mist-400">
                      <span>搜索结果</span>
                      <span>
                        {searching ? "搜索中..." : `${searchResults.length} 条`}
                      </span>
                    </div>
                    {searching ? (
                      <p className="px-3 py-4 text-center text-xs text-mist-500">
                        搜索中...
                      </p>
                    ) : searchResults.length === 0 ? (
                      <p className="px-3 py-4 text-center text-xs text-mist-500">
                        没有匹配的消息
                      </p>
                    ) : (
                      searchResults.map((result) => (
                        <button
                          key={result.id}
                          type="button"
                          onClick={() => void handleJumpToMessage(result)}
                          className="block w-full border-b border-white/5 px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-white/5"
                        >
                          <span className="block text-xs text-mist-400">
                            {result.display_name || "用户"} ·{" "}
                            {result.created_at.slice(0, 16).replace("T", " ")}
                          </span>
                          <span className="mt-1 line-clamp-2 block text-sm text-mist-100">
                            {result.body}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                ) : null}
              </header>

              <div
                ref={messagesScrollRef}
                className="flex min-h-0 flex-1 touch-pan-y flex-col overflow-y-auto overscroll-contain p-4"
              >
                {hasMore ? (
                  <button
                    type="button"
                    onClick={() => void loadOlder()}
                    disabled={loadingOlder}
                    className="mb-3 self-center rounded-full bg-white/5 px-4 py-2 text-xs text-mist-300 ring-1 ring-white/10 transition-colors hover:bg-white/10"
                  >
                    {loadingOlder ? "加载中…" : "加载更早消息"}
                  </button>
                ) : null}
                {messages.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center text-sm text-mist-500">
                    还没有消息，说点什么吧。
                  </div>
                ) : (
                  messages.map((message) => {
                    const own = message.user_id === userId;
                    const selected = selectedMessageIds.has(message.id);
                    const highlighted = highlightedMessageId === message.id;
                    const read = members.some(
                      (member) =>
                        member.user_id !== userId &&
                        member.last_read_at &&
                        new Date(member.last_read_at) >=
                          new Date(message.created_at),
                    );
                    return (
                      <div
                        key={message.id}
                        ref={(node) => {
                          if (node) messageRefs.current.set(message.id, node);
                          else messageRefs.current.delete(message.id);
                        }}
                        data-message-id={message.id}
                        className={`group mb-3 flex flex-col rounded-2xl transition-shadow ${
                          highlighted ? "ring-2 ring-amber-300/70" : ""
                        }`}
                      >
                        <div
                          className={`flex items-end gap-2 ${
                            own ? "justify-end" : "justify-start"
                          }`}
                        >
                          {manageMode && own ? (
                            <button
                              type="button"
                              onClick={() => toggleMessageSelection(message)}
                              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${
                                selected
                                  ? "border-mint-300 bg-mint-300 text-ink-950"
                                  : "border-white/25 text-transparent hover:border-mint-300/60"
                              }`}
                              aria-label={selected ? "取消选择" : "选择消息"}
                              aria-pressed={selected}
                            >
                              <CheckSquare
                                className="h-4 w-4"
                                aria-hidden="true"
                              />
                            </button>
                          ) : null}
                          <div
                            className={`max-w-[78%] rounded-2xl px-4 py-3 ${
                              own
                                ? "bg-mint-300 text-ink-950"
                                : "bg-white/5 text-mist-100 ring-1 ring-white/10"
                            }`}
                          >
                            <p className="text-xs font-semibold opacity-70">
                              {message.display_name || (own ? "你" : "用户")}
                            </p>
                            <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6">
                              {message.body}
                            </p>
                            {own && read ? (
                              <span className="mt-1 block text-right text-[10px] font-semibold opacity-60">
                                已读
                              </span>
                            ) : null}
                          </div>
                          {own && !manageMode ? (
                            <button
                              type="button"
                              onClick={() => void handleDeleteMessage(message)}
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-mist-500 opacity-0 transition-opacity hover:bg-red-400/10 hover:text-red-200 group-hover:opacity-100"
                              aria-label="删除消息"
                            >
                              <Trash2
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                              />
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messageEndRef} />
              </div>

              {typingUsers.length > 0 ? (
                <p className="border-t border-white/10 px-4 py-2 text-xs text-mist-500">
                  {typingUsers
                    .map((member) => member.display_name || "用户")
                    .join("、")}{" "}
                  正在输入…
                </p>
              ) : null}

              <form
                onSubmit={handleSend}
                className="flex gap-2 border-t border-white/10 p-4"
              >
                <Input
                  value={body}
                  onChange={(event) => {
                    setBody(event.target.value);
                    if (activeRoomId) {
                      setTyping(activeRoomId, userId, displayName);
                    }
                  }}
                  placeholder="输入消息，Enter 发送"
                  aria-label="聊天消息"
                />
                <Button type="submit" disabled={!body.trim()}>
                  <Send className="h-4 w-4" aria-hidden="true" />
                  发送
                </Button>
              </form>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-8 text-center">
              <div>
                <MessageSquare
                  className="mx-auto h-8 w-8 text-mint-300"
                  aria-hidden="true"
                />
                <h2 className="mt-4 text-lg font-bold text-mist-100">
                  选择或创建一个房间
                </h2>
                <p className="mt-2 text-sm leading-6 text-mist-400">
                  左侧输入房间名称即可开始。
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
