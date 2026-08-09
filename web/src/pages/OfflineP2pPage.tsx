import { Copy, Send, WifiOff } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface ChatMessage {
  nickname: string;
  body: string;
  timestamp: string;
}

interface SignalPayload {
  type: "offer" | "answer";
  sdp: string;
  candidates: RTCIceCandidateInit[];
}

const NICKNAME_KEY = "multimod-offline-p2p-nickname";

export default function OfflineP2pPage() {
  const [nickname, setNickname] = useState(
    () => localStorage.getItem(NICKNAME_KEY) ?? "",
  );
  const [role, setRole] = useState<"initiator" | "responder" | null>(null);
  const [signalOutput, setSignalOutput] = useState("");
  const [signalInput, setSignalInput] = useState("");
  const [signalReady, setSignalReady] = useState(false);
  const [generating, setGenerating] = useState<"offer" | "answer" | null>(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
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
      channelRef.current?.close();
      pcRef.current?.close();
    };
  }, []);

  const setupChannel = (channel: RTCDataChannel) => {
    channelRef.current = channel;
    channel.onopen = () => {
      setConnected(true);
      setSignalOutput("");
    };
    channel.onmessage = (event) => {
      try {
        setMessages((current) => [
          ...current,
          JSON.parse(String(event.data)) as ChatMessage,
        ]);
      } catch {
        // ignore malformed payloads
      }
    };
    channel.onerror = () => {
      setError("数据通道连接失败");
    };
  };

  const collectSignal = (
    pc: RTCPeerConnection,
    type: "offer" | "answer",
  ): Promise<SignalPayload> => {
    return new Promise((resolve) => {
      const candidates: RTCIceCandidateInit[] = [];
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        resolve({
          type,
          sdp: pc.localDescription?.sdp ?? "",
          candidates,
        });
      };
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          candidates.push(event.candidate.toJSON());
        } else {
          finish();
        }
      };
      window.setTimeout(() => {
        if (!pc.localDescription) {
          window.setTimeout(finish, 600);
        } else {
          finish();
        }
      }, 1500);
    });
  };

  const withTimeout = <T,>(
    promise: Promise<T>,
    ms: number,
    message: string,
  ): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        window.setTimeout(() => reject(new Error(message)), ms);
      }),
    ]);
  };

  const createOffer = async () => {
    if (!nickname.trim()) {
      setError("请先填写昵称");
      return;
    }
    if (typeof RTCPeerConnection === "undefined") {
      setError("当前浏览器不支持 WebRTC，请使用 Chrome 或 Edge");
      return;
    }
    setError(null);
    setGenerating("offer");
    setSignalOutput("");
    setSignalReady(false);
    try {
      const pc = new RTCPeerConnection({ iceServers: [] });
      pcRef.current = pc;
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") setConnected(true);
      };
      const channel = pc.createDataChannel("offline-chat");
      setupChannel(channel);
      const offer = await withTimeout(
        pc.createOffer(),
        5000,
        "生成连接码超时",
      );
      await withTimeout(pc.setLocalDescription(offer), 5000, "生成连接码超时");
      const signal = await withTimeout(
        collectSignal(pc, "offer"),
        5000,
        "生成连接码超时",
      );
      setRole("initiator");
      setSignalOutput(JSON.stringify(signal));
      setSignalReady(true);
    } catch (offerError) {
      setError((offerError as Error).message || "生成连接码失败");
    } finally {
      setGenerating(null);
    }
  };

  const createAnswer = async () => {
    if (!nickname.trim()) {
      setError("请先填写昵称");
      return;
    }
    if (!signalInput.trim()) {
      setError("请先粘贴对方发来的连接码");
      return;
    }
    if (typeof RTCPeerConnection === "undefined") {
      setError("当前浏览器不支持 WebRTC，请使用 Chrome 或 Edge");
      return;
    }
    let offer: SignalPayload;
    try {
      offer = JSON.parse(signalInput) as SignalPayload;
    } catch {
      setError("连接码格式不正确");
      return;
    }
    setError(null);
    setGenerating("answer");
    setSignalOutput("");
    setSignalReady(false);
    try {
      const pc = new RTCPeerConnection({ iceServers: [] });
      pcRef.current = pc;
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") setConnected(true);
      };
      pc.ondatachannel = (event) => setupChannel(event.channel);
      await withTimeout(pc.setRemoteDescription(offer), 5000, "生成应答码超时");
      for (const candidate of offer.candidates ?? []) {
        await pc.addIceCandidate(candidate).catch(() => undefined);
      }
      const answer = await withTimeout(
        pc.createAnswer(),
        5000,
        "生成应答码超时",
      );
      await withTimeout(pc.setLocalDescription(answer), 5000, "生成应答码超时");
      const signal = await withTimeout(
        collectSignal(pc, "answer"),
        5000,
        "生成应答码超时",
      );
      setRole("responder");
      setSignalOutput(JSON.stringify(signal));
      setSignalReady(true);
    } catch (answerError) {
      setError((answerError as Error).message || "生成应答码失败");
    } finally {
      setGenerating(null);
    }
  };

  const completeConnection = async () => {
    if (!signalInput.trim()) {
      setError("请先粘贴对方发来的应答码");
      return;
    }
    let answer: SignalPayload;
    try {
      answer = JSON.parse(signalInput) as SignalPayload;
    } catch {
      setError("应答码格式不正确");
      return;
    }
    const pc = pcRef.current;
    if (!pc) return;
    if (pc.signalingState === "stable") {
      if (channelRef.current?.readyState === "open") setConnected(true);
      return;
    }
    if (pc.signalingState !== "have-local-offer") {
      setError("当前状态无法粘贴应答码，请重新发起连接");
      return;
    }
    try {
      await pc.setRemoteDescription(answer);
      for (const candidate of answer.candidates ?? []) {
        await pc.addIceCandidate(candidate).catch(() => undefined);
      }
    } catch (completeError) {
      setError((completeError as Error).message || "完成连接失败");
    }
  };

  const send = (event: FormEvent) => {
    event.preventDefault();
    const text = body.trim();
    if (!text || !nickname.trim() || !channelRef.current) return;
    const message: ChatMessage = {
      nickname: nickname.trim(),
      body: text,
      timestamp: new Date().toISOString(),
    };
    channelRef.current.send(JSON.stringify(message));
    setMessages((current) => [...current, message]);
    setBody("");
  };

  const copySignal = async (value: string) => {
    await navigator.clipboard.writeText(value);
  };

  if (connected) {
    return (
      <div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mint-300">
            离线 P2P
          </p>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">已连接</h1>
          <p className="mt-3 text-sm text-mist-400">
            两台设备已经直接连通，当前不需要外网。
          </p>
        </div>

        <section className="mt-8 flex h-[520px] min-h-[420px] max-h-[70vh] flex-col overflow-hidden rounded-panel border border-white/10 bg-ink-900/50">
          <div
            ref={messagesScrollRef}
            className="flex min-h-0 flex-1 touch-pan-y flex-col overflow-y-auto overscroll-contain p-4"
          >
            {messages.length === 0 ? (
              <div className="flex flex-1 items-center justify-center text-sm text-mist-500">
                已连接，开始聊天吧。
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
              aria-label="离线 P2P 消息"
            />
            <Button type="submit" disabled={!body.trim()}>
              <Send className="h-4 w-4" aria-hidden="true" />
              发送
            </Button>
          </form>
        </section>
      </div>
    );
  }

  return (
    <div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mint-300">
          离线 P2P
        </p>
        <h1 className="mt-3 text-3xl font-bold sm:text-4xl">完全离线直连</h1>
        <p className="mt-3 text-sm leading-6 text-mist-400">
          两台设备都打开这个页面，互相复制粘贴连接码即可直连，不需要服务器，也不需要外网。
        </p>
      </div>

      {error ? (
        <p className="mt-6 rounded-xl bg-red-400/10 px-4 py-3 text-sm text-red-200 ring-1 ring-red-400/20">
          {error}
        </p>
      ) : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-panel border border-white/10 bg-white/[0.03] p-6">
          <h2 className="flex items-center gap-2 text-base font-bold">
            <WifiOff className="h-4 w-4 text-mint-300" aria-hidden="true" />
            发起连接
          </h2>
          <div className="mt-5 space-y-3">
            <Input
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              placeholder="你的昵称"
              aria-label="昵称"
            />
            <Button
              type="button"
              onClick={() => void createOffer()}
              disabled={generating !== null}
              className="w-full"
            >
              {generating === "offer" ? "生成中…" : "生成连接码"}
            </Button>
            {role === "initiator" ? (
              <>
                <p className="text-xs text-mist-400">
                  把下面的连接码发给对方
                </p>
                <div className="flex gap-2">
                  <textarea
                    readOnly
                    value={signalOutput}
                    className="h-32 min-w-0 flex-1 resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-xs text-mist-200 focus:outline-none"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={!signalReady}
                    onClick={() => void copySignal(signalOutput)}
                  >
                    <Copy className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
                {!signalReady ? (
                  <p className="text-xs text-mint-300">正在生成，请稍候…</p>
                ) : null}
                <Input
                  value={signalInput}
                  onChange={(event) => setSignalInput(event.target.value)}
                  placeholder="粘贴对方的应答码"
                  aria-label="应答码"
                />
                <Button
                  type="button"
                  onClick={() => void completeConnection()}
                  className="w-full"
                >
                  完成连接
                </Button>
              </>
            ) : null}
          </div>
        </section>

        <section className="rounded-panel border border-white/10 bg-white/[0.03] p-6">
          <h2 className="flex items-center gap-2 text-base font-bold">
            <WifiOff className="h-4 w-4 text-mint-300" aria-hidden="true" />
            接受连接
          </h2>
          <div className="mt-5 space-y-3">
            <Input
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              placeholder="你的昵称"
              aria-label="昵称"
            />
            <Input
              value={signalInput}
              onChange={(event) => setSignalInput(event.target.value)}
              placeholder="粘贴对方发来的连接码"
              aria-label="连接码"
            />
            <Button
              type="button"
              onClick={() => void createAnswer()}
              disabled={generating !== null}
              className="w-full"
            >
              {generating === "answer" ? "生成中…" : "生成应答码"}
            </Button>
            {role === "responder" ? (
              <>
                <p className="text-xs text-mist-400">
                  把下面的应答码发回给对方
                </p>
                <div className="flex gap-2">
                  <textarea
                    readOnly
                    value={signalOutput}
                    className="h-32 min-w-0 flex-1 resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-xs text-mist-200 focus:outline-none"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={!signalReady}
                    onClick={() => void copySignal(signalOutput)}
                  >
                    <Copy className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
                {!signalReady ? (
                  <p className="text-xs text-mint-300">正在生成，请稍候…</p>
                ) : null}
              </>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
