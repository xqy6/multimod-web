import type Peer from "peerjs";
import type { DataConnection } from "peerjs";
import {
  Copy,
  Link2,
  Loader2,
  MessageSquare,
  Plus,
  Send,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface ChatMessage {
  nickname: string;
  body: string;
  timestamp: string;
}

const NICKNAME_KEY = "multimod-p2p-nickname";

export default function P2pChatPage() {
  const [nickname, setNickname] = useState(
    () => localStorage.getItem(NICKNAME_KEY) ?? "",
  );
  const [mode, setMode] = useState<"home" | "host" | "guest">("home");
  const [roomCode, setRoomCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const peerRef = useRef<Peer | null>(null);
  const connectionsRef = useRef<DataConnection[]>([]);
  const ownConnectionRef = useRef<DataConnection | null>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem(NICKNAME_KEY, nickname);
  }, [nickname]);

  useEffect(() => {
    const container = messagesScrollRef.current;
    if (
      container &&
      container.scrollHeight - container.scrollTop - container.clientHeight <
        120
    ) {
      container.scrollTop = container.scrollHeight;
      messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]);

  useEffect(() => {
    return () => {
      for (const connection of connectionsRef.current) connection.close();
      ownConnectionRef.current?.close();
      peerRef.current?.destroy();
    };
  }, []);

  const addMessage = (message: ChatMessage) => {
    setMessages((current) => [...current, message]);
  };

  const createRoom = async () => {
    if (!nickname.trim()) {
      setError("请先填写昵称");
      return;
    }
    const { default: PeerClass } = await import("peerjs");
    setError(null);
    setLoading(true);
    const peer = new PeerClass();
    peerRef.current = peer;
    peer.on("open", (id) => {
      setRoomCode(id);
      setMode("host");
      setLoading(false);
    });
    peer.on("connection", (connection) => {
      connection.on("open", () => {
        connectionsRef.current.push(connection);
      });
      connection.on("data", (data) => {
        const message = data as ChatMessage;
        addMessage(message);
        for (const target of connectionsRef.current) {
          if (target !== connection && target.open) target.send(message);
        }
      });
      connection.on("close", () => {
        connectionsRef.current = connectionsRef.current.filter(
          (item) => item !== connection,
        );
      });
    });
    peer.on("error", (peerError) => {
      setError(peerError.type);
      setLoading(false);
    });
  };

  const joinRoom = async () => {
    if (!nickname.trim()) {
      setError("请先填写昵称");
      return;
    }
    const { default: PeerClass } = await import("peerjs");
    const code = joinCode.trim();
    if (!code) {
      setError("请输入房间码");
      return;
    }
    setError(null);
    setLoading(true);
    const peer = new PeerClass();
    peerRef.current = peer;
    peer.on("open", () => {
      const connection = peer.connect(code, { reliable: true });
      ownConnectionRef.current = connection;
      connection.on("open", () => {
        setRoomCode(code);
        setMode("guest");
        setLoading(false);
      });
      connection.on("data", (data) => {
        addMessage(data as ChatMessage);
      });
      connection.on("error", () => {
        setError("连接失败，请检查房间码");
        setLoading(false);
      });
    });
    peer.on("error", (peerError) => {
      setError(peerError.type);
      setLoading(false);
    });
  };

  const leave = () => {
    for (const connection of connectionsRef.current) connection.close();
    ownConnectionRef.current?.close();
    peerRef.current?.destroy();
    peerRef.current = null;
    ownConnectionRef.current = null;
    connectionsRef.current = [];
    setMode("home");
    setMessages([]);
    setError(null);
  };

  const send = (event: FormEvent) => {
    event.preventDefault();
    const text = body.trim();
    if (!text || !nickname.trim()) return;
    const message: ChatMessage = {
      nickname: nickname.trim(),
      body: text,
      timestamp: new Date().toISOString(),
    };
    addMessage(message);
    if (mode === "host") {
      for (const connection of connectionsRef.current) {
        if (connection.open) connection.send(message);
      }
    } else {
      ownConnectionRef.current?.send(message);
    }
    setBody("");
  };

  const copyRoomCode = async () => {
    await navigator.clipboard.writeText(roomCode);
  };

  return (
    <div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mint-300">
          WebRTC 点对点聊天
        </p>
        <h1 className="mt-3 text-3xl font-bold sm:text-4xl">P2P 实时聊天</h1>
        <p className="mt-3 text-sm leading-6 text-mist-400">
          浏览器之间直接传输消息，不经过自己的服务器；需要公共信令服务完成连接。
        </p>
      </div>

      {error ? (
        <p className="mt-6 rounded-xl bg-red-400/10 px-4 py-3 text-sm text-red-200 ring-1 ring-red-400/20">
          {error}
        </p>
      ) : null}

      {mode === "home" ? (
        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-panel border border-white/10 bg-white/[0.03] p-6">
            <h2 className="flex items-center gap-2 text-base font-bold">
              <Plus className="h-4 w-4 text-mint-300" aria-hidden="true" />
              创建房间
            </h2>
            <div className="mt-5 space-y-3">
              <Input
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                placeholder="你的昵称"
                aria-label="昵称"
              />
              <Button onClick={() => void createRoom()} disabled={loading} className="w-full">
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Plus className="h-4 w-4" aria-hidden="true" />
                )}
                创建房间
              </Button>
            </div>
          </div>

          <div className="rounded-panel border border-white/10 bg-white/[0.03] p-6">
            <h2 className="flex items-center gap-2 text-base font-bold">
              <Link2 className="h-4 w-4 text-mint-300" aria-hidden="true" />
              加入房间
            </h2>
            <div className="mt-5 space-y-3">
              <Input
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                placeholder="你的昵称"
                aria-label="昵称"
              />
              <Input
                value={joinCode}
                onChange={(event) => setJoinCode(event.target.value)}
                placeholder="房间码"
                aria-label="房间码"
              />
              <Button onClick={() => void joinRoom()} disabled={loading} className="w-full">
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Link2 className="h-4 w-4" aria-hidden="true" />
                )}
                加入房间
              </Button>
            </div>
          </div>
        </section>
      ) : (
        <section className="mt-8 flex h-[560px] min-h-[420px] max-h-[70vh] flex-col overflow-hidden rounded-panel border border-white/10 bg-ink-900/50">
          <header className="flex flex-col gap-3 border-b border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold">
                {mode === "host" ? "房间已创建" : "已加入房间"}
              </h2>
              <div className="mt-2 flex items-center gap-2">
                <span className="rounded-full bg-white/5 px-3 py-1 font-mono text-xs text-mint-200 ring-1 ring-white/10">
                  {roomCode}
                </span>
                <Button variant="ghost" size="sm" onClick={() => void copyRoomCode()}>
                  <Copy className="h-4 w-4" aria-hidden="true" />
                  复制
                </Button>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={leave}>
              离开
            </Button>
          </header>

          <div
            ref={messagesScrollRef}
            className="flex min-h-0 flex-1 touch-pan-y flex-col overflow-y-auto overscroll-contain p-4"
          >
            {messages.length === 0 ? (
              <div className="flex flex-1 items-center justify-center text-sm text-mist-500">
                把房间码发给朋友，连接后即可实时聊天。
              </div>
            ) : (
              messages.map((message, index) => {
                const own = message.nickname === nickname;
                return (
                  <div
                    key={`${message.timestamp}-${index}`}
                    className={`mb-3 flex ${own ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[78%] rounded-2xl px-4 py-3 ${
                        own
                          ? "bg-mint-300 text-ink-950"
                          : "bg-white/5 text-mist-100 ring-1 ring-white/10"
                      }`}
                    >
                      <p className="text-xs font-semibold opacity-70">
                        {message.nickname}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6">
                        {message.body}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messageEndRef} />
          </div>

          <form
            onSubmit={send}
            className="flex gap-2 border-t border-white/10 p-4"
          >
            <Input
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="输入消息，Enter 发送"
              aria-label="P2P 聊天消息"
            />
            <Button type="submit" disabled={!body.trim()}>
              <Send className="h-4 w-4" aria-hidden="true" />
              发送
            </Button>
          </form>
        </section>
      )}

      {mode === "host" ? (
        <div className="mt-6 flex items-center gap-3 text-sm text-mist-400">
          <MessageSquare className="h-4 w-4 text-mint-300" aria-hidden="true" />
          把房间码发给朋友，对方输入后加入。
        </div>
      ) : null}
    </div>
  );
}
