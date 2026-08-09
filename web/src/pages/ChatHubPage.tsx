import { Link2, MessageSquare, Wifi, WifiOff } from "lucide-react";
import { useState } from "react";

import ChatPage from "@/pages/ChatPage";
import LanChatPage from "@/pages/LanChatPage";
import OfflineP2pPage from "@/pages/OfflineP2pPage";
import P2pChatPage from "@/pages/P2pChatPage";

type ChatMode = "online" | "lan" | "p2p" | "offline";

const modes: { id: ChatMode; label: string; icon: typeof MessageSquare }[] = [
  { id: "online", label: "在线聊天", icon: MessageSquare },
  { id: "lan", label: "局域网", icon: Wifi },
  { id: "p2p", label: "P2P", icon: Link2 },
  { id: "offline", label: "离线P2P", icon: WifiOff },
];

export default function ChatHubPage() {
  const [mode, setMode] = useState<ChatMode>("online");

  return (
    <div>
      <div className="flex flex-wrap gap-2 rounded-panel border border-white/10 bg-white/[0.03] p-2">
        {modes.map((item) => {
          const active = mode === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setMode(item.id)}
              className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors ${
                active
                  ? "bg-mint-300 text-ink-950"
                  : "text-mist-400 hover:bg-white/5 hover:text-mist-100"
              }`}
            >
              <item.icon className="h-4 w-4" aria-hidden="true" />
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        {mode === "online" ? <ChatPage /> : null}
        {mode === "lan" ? <LanChatPage /> : null}
        {mode === "p2p" ? <P2pChatPage /> : null}
        {mode === "offline" ? <OfflineP2pPage /> : null}
      </div>
    </div>
  );
}
