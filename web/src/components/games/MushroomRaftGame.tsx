import {
  ArrowUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Droplets,
  Pause,
  Play,
  RotateCcw,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import {
  createMushroomRaftGame,
  MUSHROOM_RAFT_WORLDS,
  RAFT_VIEW_HEIGHT,
  RAFT_VIEW_WIDTH,
  stepMushroomRaftGame,
  WATER_Y,
  type BossState,
  type Enemy,
  type Hazard,
  type Item,
  type MushroomRaftInput,
  type MushroomRaftState,
  type MushroomRaftTheme,
  type Platform,
  type Raft,
} from "@/lib/games/mushroomRaft";

function roundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
) {
  context.beginPath();
  context.roundRect(x, y, w, h, radius);
}

function clampCamera(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function drawText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  color: string,
  align: CanvasTextAlign = "left",
) {
  context.font = `700 ${size}px "PingFang SC", "Microsoft YaHei", sans-serif`;
  context.fillStyle = color;
  context.textAlign = align;
  context.textBaseline = "middle";
  context.fillText(text, x, y);
}

function getThemePalette(theme: MushroomRaftTheme) {
  switch (theme) {
    case "swamp":
      return {
        sky: ["#7b8f6a", "#c3d9a4", "#d8e5b8"],
        water: ["#3f8f6a", "#2d6f52", "#1c4d3a"],
        hill: "#8fad76",
      };
    case "cave":
      return {
        sky: ["#2a3a4d", "#3a4f62", "#4a5a6b"],
        water: ["#1e4f7a", "#163d60", "#0d2944"],
        hill: "#33475a",
      };
    case "waterfall":
      return {
        sky: ["#74c7f0", "#bde9ff", "#e9f8ff"],
        water: ["#3b9fd6", "#2a7fbb", "#195f9a"],
        hill: "#a7d3c4",
      };
    case "fortress":
      return {
        sky: ["#5b5b6e", "#77778c", "#9898a8"],
        water: ["#3f7f9c", "#2d5f78", "#1d4055"],
        hill: "#6a6a7c",
      };
    case "boss":
      return {
        sky: ["#4b3140", "#6a4357", "#8a5469"],
        water: ["#4b3b7a", "#352a5c", "#211a40"],
        hill: "#5a3f56",
      };
    case "rainbow":
      return {
        sky: ["#8fe3ff", "#f7c9ff", "#fff3b8"],
        water: ["#5ec8f0", "#7f9cff", "#b57bff"],
        hill: "#ffd58a",
      };
    case "river":
    default:
      return {
        sky: ["#8fd7ff", "#d9f6ff", "#eaffd7"],
        water: ["#35b8e8", "#2d9ed8", "#1d73b8"],
        hill: "#b9e6a3",
      };
  }
}

function drawBackground(
  context: CanvasRenderingContext2D,
  state: MushroomRaftState,
) {
  const palette = getThemePalette(state.theme);
  const sky = context.createLinearGradient(0, 0, 0, RAFT_VIEW_HEIGHT);
  sky.addColorStop(0, palette.sky[0]);
  sky.addColorStop(0.72, palette.sky[1]);
  sky.addColorStop(1, palette.sky[2]);
  context.fillStyle = sky;
  context.fillRect(0, 0, RAFT_VIEW_WIDTH, RAFT_VIEW_HEIGHT);

  const parallax = state.camera.x * 0.2;
  context.fillStyle =
    state.theme === "cave" || state.theme === "fortress" || state.theme === "boss"
      ? "rgba(255,255,255,0.18)"
      : "rgba(255,255,255,0.8)";
  for (let i = 0; i < 6; i += 1) {
    const x = ((i * 240 - parallax) % 1080 + 1080) % 1080 - 60;
    const y = 70 + (i % 3) * 40;
    context.beginPath();
    context.arc(x, y, 34, 0, Math.PI * 2);
    context.arc(x + 30, y - 14, 26, 0, Math.PI * 2);
    context.arc(x - 30, y - 10, 24, 0, Math.PI * 2);
    context.fill();
  }

  context.fillStyle = palette.hill;
  for (let i = 0; i < 8; i += 1) {
    const x = ((i * 430 - parallax * 1.6) % 1300 + 1300) % 1300 - 120;
    const y = 250 + (i % 3) * 45;
    context.beginPath();
    context.ellipse(x, y, 95, 55, 0, 0, Math.PI * 2);
    context.fill();
  }

  if (state.theme === "waterfall") {
    context.fillStyle = "rgba(150,225,255,0.32)";
    for (let x = 60; x < RAFT_VIEW_WIDTH; x += 72) {
      context.fillRect(x, 70, 14, 350);
      context.fillRect(x + 30, 90, 8, 320);
    }
  }
}

function drawWater(
  context: CanvasRenderingContext2D,
  state: MushroomRaftState,
) {
  const palette = getThemePalette(state.theme);
  const gradient = context.createLinearGradient(0, WATER_Y, 0, RAFT_VIEW_HEIGHT);
  gradient.addColorStop(0, palette.water[0]);
  gradient.addColorStop(0.35, palette.water[1]);
  gradient.addColorStop(1, palette.water[2]);
  context.fillStyle = gradient;
  context.fillRect(0, WATER_Y, RAFT_VIEW_WIDTH, RAFT_VIEW_HEIGHT - WATER_Y);

  context.strokeStyle = "rgba(255,255,255,0.55)";
  context.lineWidth = 2;
  const waveAmplitude = state.current === "fast" ? 8 : 4;
  for (let x = -20; x < RAFT_VIEW_WIDTH + 20; x += 26) {
    const waveY =
      WATER_Y +
      10 +
      Math.sin((x * 0.8 + state.camera.x * 0.5 + state.time * 38) / 28) *
        waveAmplitude;
    context.beginPath();
    context.moveTo(x, waveY);
    context.quadraticCurveTo(x + 13, waveY - 6, x + 26, waveY);
    context.stroke();
  }

  if (state.theme === "swamp" || state.theme === "cave") {
    context.fillStyle = "rgba(200,230,190,0.08)";
    context.fillRect(0, WATER_Y, RAFT_VIEW_WIDTH, 18);
  }
}

function drawFlooding(
  context: CanvasRenderingContext2D,
  state: MushroomRaftState,
) {
  if (!state.boss || state.boss.phase !== 2 || !state.boss.flooding) return;
  const gradient = context.createLinearGradient(
    0,
    WATER_Y - 80,
    0,
    RAFT_VIEW_HEIGHT,
  );
  gradient.addColorStop(0, "rgba(70,170,220,0.2)");
  gradient.addColorStop(0.4, "rgba(45,135,200,0.6)");
  gradient.addColorStop(1, "rgba(25,80,150,0.8)");
  context.fillStyle = gradient;
  context.fillRect(
    0,
    WATER_Y - 80,
    RAFT_VIEW_WIDTH,
    RAFT_VIEW_HEIGHT - (WATER_Y - 80),
  );
  context.strokeStyle = "rgba(255,255,255,0.6)";
  context.lineWidth = 2;
  for (let x = -20; x < RAFT_VIEW_WIDTH + 20; x += 32) {
    const waveY =
      WATER_Y + 8 +
      Math.sin((x * 0.7 + state.camera.x * 0.4 + state.time * 50) / 26) * 5;
    context.beginPath();
    context.moveTo(x, waveY);
    context.quadraticCurveTo(x + 16, waveY - 5, x + 32, waveY);
    context.stroke();
  }
}

function drawPlatform(
  context: CanvasRenderingContext2D,
  platform: Platform,
  cameraX: number,
) {
  const x = platform.x - cameraX;
  if (x + platform.w < -80 || x > RAFT_VIEW_WIDTH + 80) return;
  if (platform.broken) return;

  if (platform.kind === "ground") {
    context.fillStyle = "#8a5a33";
    context.fillRect(x, platform.y, platform.w, platform.h);
    context.fillStyle = "#a76c3f";
    context.fillRect(x, platform.y + 8, platform.w, 14);
    context.fillStyle = "#54b84d";
    context.fillRect(x, platform.y, platform.w, 12);
    context.fillStyle = "#7bd96f";
    context.fillRect(x, platform.y, platform.w, 5);
  } else if (platform.kind === "platform") {
    context.fillStyle = platform.sinking ? "#6f5b3c" : "#c07b3a";
    context.fillRect(x, platform.y, platform.w, platform.h);
    context.fillStyle = platform.sinking ? "#8a7448" : "#e6a45a";
    for (let i = 0; i < platform.w; i += 24) {
      context.fillRect(x + i, platform.y, 18, 4);
    }
    if (platform.sinking) {
      context.fillStyle = "rgba(90,150,70,0.35)";
      context.fillRect(x + 4, platform.y + 6, platform.w - 8, 5);
    }
  } else if (platform.kind === "question") {
    context.fillStyle = platform.used ? "#a97846" : "#f6b73c";
    roundRect(context, x, platform.y, platform.w, platform.h, 6);
    context.fill();
    context.strokeStyle = "#7a4b16";
    context.lineWidth = 3;
    roundRect(context, x, platform.y, platform.w, platform.h, 6);
    context.stroke();
    if (!platform.used) {
      drawText(context, "?", x + platform.w / 2, platform.y + platform.h / 2, 22, "#5b3200", "center");
    }
  } else if (platform.kind === "brick") {
    context.fillStyle = "#d6663a";
    context.fillRect(x, platform.y, platform.w, platform.h);
    context.strokeStyle = "#8f351b";
    context.lineWidth = 2;
    context.strokeRect(x, platform.y, platform.w, platform.h);
    context.beginPath();
    context.moveTo(x, platform.y + platform.h / 2);
    context.lineTo(x + platform.w, platform.y + platform.h / 2);
    context.moveTo(x + platform.w / 2, platform.y);
    context.lineTo(x + platform.w / 2, platform.y + platform.h / 2);
    context.stroke();
  } else if (platform.kind === "pipe") {
    context.fillStyle = "#28b84a";
    context.fillRect(x + 4, platform.y, platform.w - 8, platform.h);
    context.fillStyle = "#7de08d";
    context.fillRect(x + 7, platform.y, 6, platform.h);
    context.fillStyle = "#146b2b";
    context.fillRect(x, platform.y, platform.w, 8);
  } else {
    context.fillStyle = platform.used ? "rgba(255,255,255,0.18)" : "transparent";
    roundRect(context, x, platform.y, platform.w, platform.h, 5);
    context.fill();
    if (platform.used) {
      context.strokeStyle = "rgba(255,255,255,0.35)";
      context.stroke();
    }
  }
}

function drawItem(
  context: CanvasRenderingContext2D,
  item: Item,
  cameraX: number,
  time: number,
) {
  const bob = Math.sin(time * 2.5 + item.bob) * 2;
  const x = item.x - cameraX;
  const y = item.y + bob;
  if (x < -40 || x > RAFT_VIEW_WIDTH + 40) return;

  if (item.kind === "coin") {
    context.fillStyle = "#ffd447";
    context.beginPath();
    context.ellipse(x + item.w / 2, y + item.h / 2, 12, 13, 0, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "#c98b00";
    context.lineWidth = 2;
    context.stroke();
  } else if (item.kind === "celebration") {
    context.fillStyle = "#ffd447";
    context.beginPath();
    context.arc(x + 15, y + 12, 12, Math.PI, 0);
    context.fill();
    context.fillRect(x + 3, y + 12, 24, 6);
    context.fillStyle = "#fff2a8";
    context.beginPath();
    context.arc(x + 15, y + 8, 4, 0, Math.PI * 2);
    context.fill();
    drawText(context, "★", x + 15, y + 16, 18, "#7a5200", "center");
  } else if (item.kind === "mushroom") {
    context.fillStyle = "#e74334";
    context.beginPath();
    context.arc(x + 15, y + 12, 13, Math.PI, 0);
    context.fill();
    context.fillStyle = "#ffe8d6";
    context.fillRect(x + 11, y + 12, 8, 14);
    context.fillStyle = "white";
    context.beginPath();
    context.arc(x + 10, y + 10, 3, 0, Math.PI * 2);
    context.arc(x + 20, y + 10, 3, 0, Math.PI * 2);
    context.fill();
  } else if (item.kind === "raftMushroom") {
    context.fillStyle = "#2f9ed8";
    context.beginPath();
    context.arc(x + 15, y + 12, 15, Math.PI, 0);
    context.fill();
    context.fillStyle = "#ffe8d6";
    context.fillRect(x + 10, y + 12, 10, 17);
    context.fillStyle = "white";
    context.beginPath();
    context.arc(x + 9, y + 9, 4, 0, Math.PI * 2);
    context.arc(x + 21, y + 9, 4, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "#7adcff";
    context.lineWidth = 2;
    for (let i = 0; i < 3; i += 1) {
      context.beginPath();
      context.arc(x + 15, y + 18 + i * 6, 8 + i * 2, 0.2, Math.PI * 0.8);
      context.stroke();
    }
  } else if (item.kind === "flower") {
    context.fillStyle = "#3ab8e8";
    for (let i = 0; i < 5; i += 1) {
      const angle = (i / 5) * Math.PI * 2;
      context.beginPath();
      context.arc(
        x + 15 + Math.cos(angle) * 8,
        y + 14 + Math.sin(angle) * 8,
        7,
        0,
        Math.PI * 2,
      );
      context.fill();
    }
    context.fillStyle = "#ffe97a";
    context.beginPath();
    context.arc(x + 15, y + 14, 6, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#3a8f3d";
    context.fillRect(x + 14, y + 22, 3, 8);
  } else if (item.kind === "leaf") {
    context.fillStyle = "#5fc94f";
    context.beginPath();
    context.ellipse(x + 16, y + 15, 15, 8, -0.4, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "#2d7d2f";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(x + 2, y + 12);
    context.quadraticCurveTo(x + 16, y + 15, x + 30, y + 13);
    context.stroke();
  } else if (item.kind === "plank") {
    context.fillStyle = "#b36b31";
    context.fillRect(x, y, item.w, item.h);
    context.strokeStyle = "#6f3c18";
    context.lineWidth = 2;
    context.strokeRect(x, y, item.w, item.h);
    context.beginPath();
    context.moveTo(x + 11, y);
    context.lineTo(x + 11, y + item.h);
    context.moveTo(x + 23, y);
    context.lineTo(x + 23, y + item.h);
    context.stroke();
  } else if (item.kind === "star") {
    context.fillStyle = "#ffe14d";
    context.beginPath();
    for (let i = 0; i < 10; i += 1) {
      const angle = -Math.PI / 2 + (i * Math.PI) / 5;
      const radius = i % 2 === 0 ? 15 : 7;
      const px = x + 15 + Math.cos(angle) * radius;
      const py = y + 16 + Math.sin(angle) * radius;
      if (i === 0) context.moveTo(px, py);
      else context.lineTo(px, py);
    }
    context.closePath();
    context.fill();
  } else if (item.kind === "toad") {
    context.fillStyle = "#ffd9b0";
    context.beginPath();
    context.arc(x + 15, y + 20, 9, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#e8553f";
    context.beginPath();
    context.arc(x + 15, y + 14, 12, Math.PI, 0);
    context.fill();
    context.fillStyle = "#2b1b10";
    context.beginPath();
    context.arc(x + 11, y + 19, 2, 0, Math.PI * 2);
    context.arc(x + 19, y + 19, 2, 0, Math.PI * 2);
    context.fill();
  } else {
    context.fillStyle = "#45b74c";
    context.beginPath();
    context.arc(x + 15, y + 16, 13, Math.PI, 0);
    context.fill();
    context.fillStyle = "#e7f7d8";
    context.fillRect(x + 11, y + 16, 8, 12);
    drawText(context, "1UP", x + 15, y + 12, 10, "#1c5b1f", "center");
  }
}

function drawRaft(
  context: CanvasRenderingContext2D,
  raft: Raft,
  cameraX: number,
) {
  const x = raft.x - cameraX;
  if (x < -120 || x > RAFT_VIEW_WIDTH + 120) return;

  context.save();
  context.shadowColor = "rgba(0,0,0,0.2)";
  context.shadowBlur = 10;
  context.fillStyle = "#e8553f";
  context.beginPath();
  context.ellipse(
    x + raft.w / 2,
    raft.y + 7,
    raft.w / 2,
    16,
    0,
    0,
    Math.PI * 2,
  );
  context.fill();
  context.fillStyle = "white";
  context.beginPath();
  context.arc(x + 26, raft.y + 4, 5, 0, Math.PI * 2);
  context.arc(x + 64, raft.y + 7, 4, 0, Math.PI * 2);
  context.arc(x + 88, raft.y + 3, 3, 0, Math.PI * 2);
  context.fill();
  context.restore();

  context.fillStyle = "#9c5a24";
  context.fillRect(x, raft.y + raft.h - 3, raft.w, 5);
  for (let i = 0; i < raft.maxHp; i += 1) {
    context.fillStyle = i < raft.hp ? "#7ddf6a" : "rgba(255,255,255,0.35)";
    context.beginPath();
    context.arc(x + 18 + i * 20, raft.y - 8, 4, 0, Math.PI * 2);
    context.fill();
  }
  if (raft.shieldTimer > 0) {
    context.strokeStyle = "rgba(120,220,255,0.9)";
    context.lineWidth = 3;
    context.beginPath();
    context.arc(x + raft.w / 2, raft.y + 8, raft.w / 2 + 6, 0, Math.PI * 2);
    context.stroke();
  }
}

function drawEnemy(
  context: CanvasRenderingContext2D,
  enemy: Enemy,
  cameraX: number,
) {
  const x = enemy.x - cameraX;
  if (x < -60 || x > RAFT_VIEW_WIDTH + 60) return;

  if (enemy.kind === "goomba") {
    context.fillStyle = "#a9602e";
    context.beginPath();
    context.ellipse(x + 16, enemy.y + 18, 15, 13, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#f7d6ad";
    context.beginPath();
    context.arc(x + 11, enemy.y + 11, 4, 0, Math.PI * 2);
    context.arc(x + 22, enemy.y + 11, 4, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#2d1c0e";
    context.beginPath();
    context.arc(x + 10, enemy.y + 11, 2, 0, Math.PI * 2);
    context.arc(x + 21, enemy.y + 11, 2, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#4a2a13";
    context.fillRect(x + 4, enemy.y + 24, 12, 8);
    context.fillRect(x + 18, enemy.y + 24, 12, 8);
  } else if (enemy.kind === "bubble") {
    context.fillStyle = "rgba(160,230,255,0.55)";
    context.beginPath();
    context.arc(x + 17, enemy.y + 17, 16, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "rgba(255,255,255,0.9)";
    context.lineWidth = 2;
    context.stroke();
    context.fillStyle = "rgba(255,255,255,0.85)";
    context.beginPath();
    context.arc(x + 10, enemy.y + 10, 4, 0, Math.PI * 2);
    context.fill();
  } else if (enemy.kind === "koopa") {
    context.fillStyle = "#f7d6ad";
    context.beginPath();
    context.arc(x + 10, enemy.y + 10, 7, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#2f8f3f";
    context.beginPath();
    context.ellipse(x + 22, enemy.y + 17, 11, 9, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#dbe9ff";
    context.beginPath();
    context.moveTo(x + 24, enemy.y + 6);
    context.quadraticCurveTo(x + 34, enemy.y - 4, x + 40, enemy.y + 2);
    context.lineTo(x + 34, enemy.y + 8);
    context.closePath();
    context.fill();
  } else if (enemy.kind === "ghost") {
    context.fillStyle = "rgba(190,220,255,0.55)";
    context.beginPath();
    context.arc(x + 18, enemy.y + 12, 15, Math.PI, 0);
    context.lineTo(x + 33, enemy.y + 34);
    context.quadraticCurveTo(x + 27, enemy.y + 28, x + 21, enemy.y + 34);
    context.quadraticCurveTo(x + 15, enemy.y + 28, x + 9, enemy.y + 34);
    context.quadraticCurveTo(x + 3, enemy.y + 28, x + 3, enemy.y + 34);
    context.lineTo(x + 3, enemy.y + 12);
    context.closePath();
    context.fill();
    context.fillStyle = "#1c2b3a";
    context.beginPath();
    context.arc(x + 12, enemy.y + 10, 3, 0, Math.PI * 2);
    context.arc(x + 24, enemy.y + 10, 3, 0, Math.PI * 2);
    context.fill();
  } else {
    context.fillStyle = "#d9743c";
    context.beginPath();
    context.ellipse(x + 21, enemy.y + 16, 12, 10, 0.2, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "#87401e";
    context.lineWidth = 2;
    context.beginPath();
    context.arc(x + 20, enemy.y + 15, 8, 0.4, Math.PI * 1.4);
    context.stroke();
    context.fillStyle = "#e8553f";
    context.beginPath();
    context.arc(x + 4, enemy.y + 24, 4, 0, Math.PI * 2);
    context.arc(x + 38, enemy.y + 24, 4, 0, Math.PI * 2);
    context.fill();
  }
}

function drawHazards(
  context: CanvasRenderingContext2D,
  hazards: Hazard[],
  cameraX: number,
  time: number,
) {
  for (const hazard of hazards) {
    const x = hazard.x - cameraX;
    if (x < -80 || x > RAFT_VIEW_WIDTH + 80) continue;

    if (hazard.kind === "rock") {
      if (!hazard.active) {
        if (hazard.timer < 60) {
          context.fillStyle = "rgba(255,70,50,0.75)";
          context.beginPath();
          context.moveTo(x + 13, hazard.y);
          context.lineTo(x + 26, hazard.y + 16);
          context.lineTo(x, hazard.y + 16);
          context.closePath();
          context.fill();
          drawText(
            context,
            "!",
            x + 13,
            hazard.y + 11,
            14,
            "#ffffff",
            "center",
          );
        }
        continue;
      }
      context.fillStyle = "#8c8f96";
      context.beginPath();
      context.arc(x + 13, hazard.y + 13, 13, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "rgba(255,255,255,0.3)";
      context.beginPath();
      context.arc(x + 9, hazard.y + 9, 4, 0, Math.PI * 2);
      context.fill();
    } else if (hazard.kind === "whirlpool") {
      context.strokeStyle = "rgba(90,210,255,0.85)";
      context.lineWidth = 3;
      for (let i = 1; i <= 3; i += 1) {
        context.beginPath();
        context.ellipse(
          x + hazard.w / 2,
          hazard.y + hazard.h / 2,
          i * 10,
          i * 6,
          time * 0.8,
          0,
          Math.PI * 2,
        );
        context.stroke();
      }
    } else if (hazard.kind === "cannon") {
      context.fillStyle = "#3d4752";
      context.fillRect(x, hazard.y, hazard.w, hazard.h);
      context.fillStyle = "#252c34";
      context.beginPath();
      context.ellipse(x + hazard.w / 2, hazard.y + 8, 18, 8, 0, 0, Math.PI * 2);
      context.fill();
    } else if (hazard.kind === "flame") {
      const flicker = Math.sin(time * 14 + hazard.x) * 3;
      const gradient = context.createLinearGradient(
        x,
        hazard.y + hazard.h,
        x,
        hazard.y,
      );
      gradient.addColorStop(0, "#ff5a2a");
      gradient.addColorStop(1, "#ffd447");
      context.fillStyle = gradient;
      context.beginPath();
      context.moveTo(x, hazard.y + hazard.h);
      context.quadraticCurveTo(
        x + 8,
        hazard.y + flicker,
        x + hazard.w / 2,
        hazard.y + 4,
      );
      context.quadraticCurveTo(
        x + hazard.w - 8,
        hazard.y + flicker,
        x + hazard.w,
        hazard.y + hazard.h,
      );
      context.closePath();
      context.fill();
    } else if (hazard.kind === "spike") {
      if (!hazard.active) continue;
      context.fillStyle = "#c7ccd2";
      context.strokeStyle = "#7f8890";
      context.lineWidth = 2;
      for (let i = 0; i < 4; i += 1) {
        const sx = x + i * 11;
        context.beginPath();
        context.moveTo(sx, hazard.y + hazard.h);
        context.lineTo(sx + 5.5, hazard.y);
        context.lineTo(sx + 11, hazard.y + hazard.h);
        context.closePath();
        context.fill();
        context.stroke();
      }
    }
  }
}

function drawBoss(
  context: CanvasRenderingContext2D,
  boss: BossState,
  cameraX: number,
) {
  if (!boss.alive) return;
  const x = boss.x - cameraX;
  if (x < -100 || x > RAFT_VIEW_WIDTH + 100) return;
  context.globalAlpha =
    boss.invincible > 0 && Math.floor(boss.timer * 4) % 2 === 0 ? 0.4 : 1;

  if (boss.phase === 1) {
    context.fillStyle = "#4a3522";
    context.beginPath();
    context.moveTo(x + 8, 400);
    context.lineTo(x + boss.w - 8, 400);
    context.lineTo(x + boss.w - 26, 452);
    context.lineTo(x + 26, 452);
    context.closePath();
    context.fill();
    context.fillStyle = "#8a5a33";
    context.fillRect(x + 10, 390, boss.w - 20, 18);
  }

  context.fillStyle = "#3f2b1d";
  context.beginPath();
  context.ellipse(x + boss.w / 2, boss.y + boss.h - 10, boss.w / 2, 16, 0, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#2f8f3f";
  context.beginPath();
  context.ellipse(x + boss.w / 2, boss.y + 50, 38, 30, 0, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#e8553f";
  context.beginPath();
  context.ellipse(x + boss.w / 2, boss.y + 32, 42, 26, 0, Math.PI, 0);
  context.fill();
  context.fillStyle = "#ffd9b0";
  context.beginPath();
  context.arc(x + 26, boss.y + 20, 9, 0, Math.PI * 2);
  context.arc(x + 64, boss.y + 20, 9, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#1c120a";
  context.beginPath();
  context.arc(x + 24, boss.y + 20, 4, 0, Math.PI * 2);
  context.arc(x + 62, boss.y + 20, 4, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#f4d27a";
  context.beginPath();
  context.moveTo(x + 10, boss.y + 58);
  context.lineTo(x + 30, boss.y + 46);
  context.lineTo(x + 30, boss.y + 70);
  context.closePath();
  context.fill();
  context.beginPath();
  context.moveTo(x + 80, boss.y + 58);
  context.lineTo(x + 60, boss.y + 46);
  context.lineTo(x + 60, boss.y + 70);
  context.closePath();
  context.fill();

  context.fillStyle = "#f4d27a";
  context.beginPath();
  context.moveTo(x + boss.w - 20, boss.y + 52);
  context.lineTo(x + boss.w - 2, boss.y + 66);
  context.lineTo(x + boss.w - 22, boss.y + 80);
  context.closePath();
  context.fill();

  for (let i = 0; i < boss.maxHp; i += 1) {
    context.fillStyle = i < boss.hp ? "#ffd447" : "rgba(255,255,255,0.25)";
    context.beginPath();
    context.arc(x + 20 + i * 10, boss.y - 12, 4, 0, Math.PI * 2);
    context.fill();
  }
  if (boss.phase === 1) {
    drawText(
      context,
      "阶段 1 · 河上巨船",
      x + boss.w / 2,
      boss.y - 30,
      13,
      "#ffd447",
      "center",
    );
  } else {
    drawText(
      context,
      "阶段 2",
      x + boss.w / 2,
      boss.y - 28,
      13,
      "#ffd447",
      "center",
    );
  }
  context.globalAlpha = 1;
}

function drawPlayer(
  context: CanvasRenderingContext2D,
  state: MushroomRaftState,
  player: MushroomRaftState["player"],
  isLuigi = false,
) {
  if (player.dead) return;

  const blinking =
    player.invincible > 0 &&
    state.status === "playing" &&
    Math.floor(state.time * 12) % 2 === 0;

  const x = player.x - state.camera.x;
  const y = player.y;
  const big = player.power !== "small";

  context.save();
  context.globalAlpha = blinking ? 0.55 : 1;
  if (player.starTimer > 0) {
    context.shadowColor = "#ffe14d";
    context.shadowBlur = 14;
  }
  context.translate(x + player.w / 2, y + player.h / 2);
  context.scale(player.facing, 1);

  if (player.canGlide && player.vy > 1) {
    context.fillStyle = "rgba(95,201,79,0.75)";
    context.beginPath();
    context.ellipse(-12, -4, 18, 8, -0.5, 0, Math.PI * 2);
    context.fill();
  }

  context.fillStyle = isLuigi ? "#1f9e4b" : "#2d5acf";
  context.fillRect(-13, 4, 26, 14);
  context.fillStyle = "#f3a84b";
  context.beginPath();
  context.arc(-6, -6, 7, 0, Math.PI * 2);
  context.arc(6, -6, 7, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = isLuigi
    ? "#35b24a"
    : big
      ? "#e8553f"
      : "#d63d2e";
  context.beginPath();
  context.arc(0, -10, big ? 14 : 11, Math.PI, 0);
  context.fill();
  context.fillStyle = "#f7f7f7";
  context.fillRect(-2, -18, 5, 4);

  context.fillStyle = "#4a2a13";
  context.fillRect(-12, 16, 10, 8);
  context.fillRect(2, 16, 10, 8);
  context.restore();
}

function drawHud(
  context: CanvasRenderingContext2D,
  state: MushroomRaftState,
) {
  context.fillStyle = "rgba(10,40,60,0.78)";
  roundRect(context, 12, 12, 252, 112, 16);
  context.fill();
  drawText(context, `得分 ${state.score}`, 28, 30, 16, "#fff");
  drawText(context, `金币 ${state.coins}   庆典 ${state.celebration}/3`, 28, 54, 14, "#cdeeff");
  drawText(context, `水弹 x${state.player.waterAmmo}`, 28, 68, 14, "#7adcff");
  if (state.player2) {
    drawText(context, `1P 生命 x${state.player.lives}`, 28, 74, 14, "#ff9d8a");
    drawText(context, `2P 生命 x${state.player2.lives}`, 28, 92, 14, "#8dffa0");
  } else {
    drawText(context, `生命 x${state.player.lives}`, 28, 78, 14, "#ffd98a");
  }

  context.fillStyle = "rgba(10,40,60,0.78)";
  roundRect(context, RAFT_VIEW_WIDTH - 214, 12, 202, 84, 16);
  context.fill();
  drawText(
    context,
    `${state.player2 ? "双人·" : "单人·"}${
      state.mode === "raft"
        ? `漂流模式·${state.current === "fast" ? "急流" : "平缓"}`
        : "陆地模式"
    }`,
    RAFT_VIEW_WIDTH - 198,
    32,
    15,
    state.mode === "raft" ? "#8be0ff" : "#b9f0a0",
  );
  drawText(context, `时间 ${Math.floor(state.time)}s`, RAFT_VIEW_WIDTH - 198, 56, 14, "#fff", "left");
  drawText(
    context,
    state.player.canShoot
      ? "水花攻击"
      : state.player.canGlide
        ? "二段跳可用"
        : "普通形态",
    RAFT_VIEW_WIDTH - 198,
    78,
    13,
    "#bcd8e8",
  );

  if (state.messageTimer > 0 && state.message) {
    context.fillStyle = "rgba(10,40,60,0.82)";
    roundRect(
      context,
      RAFT_VIEW_WIDTH / 2 - 190,
      RAFT_VIEW_HEIGHT - 58,
      380,
      40,
      20,
    );
    context.fill();
    drawText(
      context,
      state.message,
      RAFT_VIEW_WIDTH / 2,
      RAFT_VIEW_HEIGHT - 38,
      15,
      "#ffffff",
      "center",
    );
  }
}

function drawFinishFlag(
  context: CanvasRenderingContext2D,
  state: MushroomRaftState,
) {
  const x = state.finishX - state.camera.x;
  if (x < -40 || x > RAFT_VIEW_WIDTH + 40) return;
  context.strokeStyle = "#6b5634";
  context.lineWidth = 5;
  context.beginPath();
  context.moveTo(x, 470);
  context.lineTo(x, 350);
  context.stroke();
  context.fillStyle = "#f6b73c";
  context.beginPath();
  context.moveTo(x, 350);
  context.lineTo(x + 72, 364);
  context.lineTo(x, 378);
  context.closePath();
  context.fill();
  drawText(context, "终点", x + 40, 330, 15, "#8a5a1a", "center");
}

function drawOverlay(
  context: CanvasRenderingContext2D,
  state: MushroomRaftState,
) {
  if (state.status === "playing") return;
  context.fillStyle = "rgba(5,20,32,0.62)";
  context.fillRect(0, 0, RAFT_VIEW_WIDTH, RAFT_VIEW_HEIGHT);
  const title =
    state.status === "won" ? "庆典蘑菇收集完成！" : "蘑菇漂流失败";
  const subtitle =
    state.status === "won"
      ? `通关得分 ${state.score}`
      : `本局得分 ${state.score}，点击下方重新开始`;
  drawText(context, title, RAFT_VIEW_WIDTH / 2, 240, 40, "#fff", "center");
  drawText(context, subtitle, RAFT_VIEW_WIDTH / 2, 292, 18, "#cdeeff", "center");
}

function drawLighting(
  context: CanvasRenderingContext2D,
  state: MushroomRaftState,
) {
  const players = [state.player, ...(state.player2 ? [state.player2] : [])]
    .filter((player) => !player.dead);

  if (state.theme === "cave") {
    context.save();
    context.fillStyle = "rgba(3,10,20,0.92)";
    context.fillRect(0, 0, RAFT_VIEW_WIDTH, RAFT_VIEW_HEIGHT);
    context.globalCompositeOperation = "destination-out";
    for (const player of players) {
      const px = player.x - state.camera.x;
      const py = player.y + 18;
      const radius = player.canShoot ? 175 : 96;
      const gradient = context.createRadialGradient(
        px,
        py,
        10,
        px,
        py,
        radius,
      );
      gradient.addColorStop(0, "rgba(255,255,255,0.95)");
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      context.fillStyle = gradient;
      context.fillRect(px - radius, py - radius, radius * 2, radius * 2);
    }
    context.restore();
  } else if (state.theme === "swamp") {
    context.fillStyle = "rgba(185,220,190,0.18)";
    context.fillRect(0, 0, RAFT_VIEW_WIDTH, RAFT_VIEW_HEIGHT);
    context.fillStyle = "rgba(225,240,210,0.12)";
    for (let i = 0; i < 6; i += 1) {
      const x = ((i * 260 + state.time * 8) % 1100) - 80;
      context.beginPath();
      context.ellipse(x, 120 + (i % 3) * 130, 120, 50, 0, 0, Math.PI * 2);
      context.fill();
    }
  } else if (state.theme === "fortress") {
    context.strokeStyle = "rgba(10,15,20,0.4)";
    context.lineWidth = 4;
    for (let x = 0; x < RAFT_VIEW_WIDTH; x += 64) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, RAFT_VIEW_HEIGHT);
      context.stroke();
    }
    for (let y = 0; y < RAFT_VIEW_HEIGHT; y += 96) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(RAFT_VIEW_WIDTH, y);
      context.stroke();
    }
  }
}

function render(
  context: CanvasRenderingContext2D,
  state: MushroomRaftState,
) {
  drawBackground(context, state);
  drawWater(context, state);
  for (const platform of state.platforms) {
    drawPlatform(context, platform, state.camera.x);
  }
  for (const enemy of state.enemies) {
    if (enemy.alive) drawEnemy(context, enemy, state.camera.x);
  }
  for (const raft of state.rafts) {
    drawRaft(context, raft, state.camera.x);
  }
  drawFlooding(context, state);
  drawHazards(context, state.hazards, state.camera.x, state.time);
  if (state.boss) drawBoss(context, state.boss, state.camera.x);
  for (const projectile of state.projectiles) {
    const x = projectile.x - state.camera.x;
    context.fillStyle =
      projectile.kind === "water"
        ? "#7adcff"
        : projectile.kind === "fireball"
          ? "#ff7a3d"
          : "#e0b48a";
    context.beginPath();
    context.arc(x, projectile.y, 7, 0, Math.PI * 2);
    context.fill();
  }
  for (const item of state.items) {
    if (!item.taken) drawItem(context, item, state.camera.x, state.time);
  }
  drawFinishFlag(context, state);
  drawPlayer(context, state, state.player);
  if (state.player2) {
    drawPlayer(context, state, state.player2, true);
  }
  drawLighting(context, state);
  drawHud(context, state);
  drawOverlay(context, state);
}

const PROGRESS_KEY = "multimod-mushroom-progress";
const SINGLE_TIME_KEY = "multimod-mushroom-time-single";
const DUO_TIME_KEY = "multimod-mushroom-time-duo";

function readBestTime(duo: boolean) {
  try {
    const value = Number(
      localStorage.getItem(duo ? DUO_TIME_KEY : SINGLE_TIME_KEY),
    );
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

function readProgress() {
  try {
    const value = Number(localStorage.getItem(PROGRESS_KEY));
    return Number.isFinite(value)
      ? Math.min(Math.max(0, Math.floor(value)), MUSHROOM_RAFT_WORLDS.length - 1)
      : 0;
  } catch {
    return 0;
  }
}

export function MushroomRaftGame({
  onGameOver,
}: {
  onGameOver: (score: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvas2Ref = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<MushroomRaftState>(createMushroomRaftGame());
  const inputRef = useRef<MushroomRaftInput>({
    left: false,
    right: false,
    down: false,
    jump: false,
    dash: false,
    shoot: false,
  });
  const input2Ref = useRef<MushroomRaftInput>({
    left: false,
    right: false,
    down: false,
    jump: false,
    dash: false,
    shoot: false,
  });
  const onGameOverRef = useRef(onGameOver);
  const submittedRef = useRef(false);
  const pausedRef = useRef(false);
  const [paused, setPaused] = useState(false);
  const [screen, setScreen] = useState<"select" | "playing">("select");
  const [levelIndex, setLevelIndex] = useState(0);
  const [unlocked, setUnlocked] = useState(readProgress);
  const unlockedRef = useRef(readProgress());
  const [duo, setDuo] = useState(false);
  const duoRef = useRef(false);
  const [bestTime, setBestTime] = useState(() => readBestTime(false));
  const [status, setStatus] = useState<"playing" | "won" | "gameover">(
    "playing",
  );
  const statusRef = useRef<"playing" | "won" | "gameover">("playing");

  useEffect(() => {
    onGameOverRef.current = onGameOver;
  }, [onGameOver]);

  useEffect(() => {
    duoRef.current = duo;
    setBestTime(readBestTime(duo));
  }, [duo]);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (
        [
          "arrowleft",
          "arrowright",
          "arrowup",
          " ",
          "w",
          "a",
          "s",
          "d",
          "arrowdown",
          "x",
          "j",
          "z",
          "k",
          "p",
          "enter",
          "1",
          "2",
          "numpad1",
          "numpad2",
        ].includes(key)
      ) {
        event.preventDefault();
      }
      if (duo) {
        if (key === "a") inputRef.current.left = true;
        if (key === "d") inputRef.current.right = true;
        if (key === "s") inputRef.current.down = true;
        if (key === "w") inputRef.current.jump = true;
        if (key === "j") inputRef.current.shoot = true;
        if (key === "k") inputRef.current.dash = true;
        if (key === "arrowleft") input2Ref.current.left = true;
        if (key === "arrowright") input2Ref.current.right = true;
        if (key === "arrowdown") input2Ref.current.down = true;
        if (key === "arrowup") input2Ref.current.jump = true;
        if (key === "1" || key === "numpad1") input2Ref.current.shoot = true;
        if (key === "2" || key === "numpad2") input2Ref.current.dash = true;
      } else {
        if (key === "a") inputRef.current.left = true;
        if (key === "d") inputRef.current.right = true;
        if (key === "s") inputRef.current.down = true;
        if (key === "w") inputRef.current.jump = true;
        if (key === "j") inputRef.current.shoot = true;
        if (key === "k") inputRef.current.dash = true;
      }
      if (key === "p") {
        pausedRef.current = !pausedRef.current;
        setPaused(pausedRef.current);
      }
    };
    const up = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (duo) {
        if (key === "a") inputRef.current.left = false;
        if (key === "d") inputRef.current.right = false;
        if (key === "s") inputRef.current.down = false;
        if (key === "w") inputRef.current.jump = false;
        if (key === "j") inputRef.current.shoot = false;
        if (key === "k") inputRef.current.dash = false;
        if (key === "arrowleft") input2Ref.current.left = false;
        if (key === "arrowright") input2Ref.current.right = false;
        if (key === "arrowdown") input2Ref.current.down = false;
        if (key === "arrowup") input2Ref.current.jump = false;
        if (key === "1" || key === "numpad1") input2Ref.current.shoot = false;
        if (key === "2" || key === "numpad2") input2Ref.current.dash = false;
      } else {
        if (key === "a") inputRef.current.left = false;
        if (key === "d") inputRef.current.right = false;
        if (key === "s") inputRef.current.down = false;
        if (key === "w") inputRef.current.jump = false;
        if (key === "j") inputRef.current.shoot = false;
        if (key === "k") inputRef.current.dash = false;
      }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [duo]);

  useEffect(() => {
    let animationFrame = 0;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 1 / 30);
      lastTime = now;
      const state = stateRef.current;
      if (!pausedRef.current && state.status === "playing") {
        stepMushroomRaftGame(
          state,
          inputRef.current,
          dt,
          duoRef.current ? input2Ref.current : undefined,
        );
      }
      if (state.status !== statusRef.current) {
        statusRef.current = state.status;
        setStatus(state.status);
      }
      const canvas = canvasRef.current;
      const canvas2 = canvas2Ref.current;
      const context = canvas?.getContext("2d");
      const context2 = canvas2?.getContext("2d");
      if (duoRef.current && state.player2 && context && context2) {
        const originalCamera = state.camera.x;
        state.camera.x = clampCamera(
          state.player.x + state.player.w / 2 - RAFT_VIEW_WIDTH / 2,
          0,
          state.worldWidth - RAFT_VIEW_WIDTH,
        );
        render(context, state);
        state.camera.x = clampCamera(
          state.player2.x + state.player2.w / 2 - RAFT_VIEW_WIDTH / 2,
          0,
          state.worldWidth - RAFT_VIEW_WIDTH,
        );
        render(context2, state);
        state.camera.x = originalCamera;
      } else if (context) {
        render(context, state);
      }
      if (
        (state.status === "won" || state.status === "gameover") &&
        !submittedRef.current
      ) {
        submittedRef.current = true;
        onGameOverRef.current(state.score);
        if (state.status === "won") {
          if (state.levelIndex === 6) {
            const seconds = Math.round(state.time * 10) / 10;
            const key = duoRef.current ? DUO_TIME_KEY : SINGLE_TIME_KEY;
            const currentBest = Number(localStorage.getItem(key) ?? 0);
            if (currentBest === 0 || seconds < currentBest) {
              localStorage.setItem(key, String(seconds));
              setBestTime(seconds);
            }
          }
          const next = Math.min(
            Math.max(unlockedRef.current, state.levelIndex + 1),
            MUSHROOM_RAFT_WORLDS.length - 1,
          );
          if (next > unlockedRef.current) {
            unlockedRef.current = next;
            setUnlocked(next);
            localStorage.setItem(PROGRESS_KEY, String(next));
          }
        }
      }
      animationFrame = requestAnimationFrame(loop);
    };

    animationFrame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  const startLevel = (index: number) => {
    setLevelIndex(index);
    stateRef.current = createMushroomRaftGame(index, duoRef.current);
    inputRef.current = {
      left: false,
      right: false,
      down: false,
      jump: false,
      dash: false,
      shoot: false,
    };
    input2Ref.current = {
      left: false,
      right: false,
      down: false,
      jump: false,
      dash: false,
      shoot: false,
    };
    submittedRef.current = false;
    pausedRef.current = false;
    setPaused(false);
    setScreen("playing");
    statusRef.current = "playing";
    setStatus("playing");
  };

  const reset = () => {
    if (screen === "select") return;
    startLevel(levelIndex);
  };

  const backToSelect = () => {
    stateRef.current = createMushroomRaftGame();
    input2Ref.current = {
      left: false,
      right: false,
      down: false,
      jump: false,
      dash: false,
      shoot: false,
    };
    submittedRef.current = false;
    pausedRef.current = false;
    setPaused(false);
    setScreen("select");
    statusRef.current = "playing";
    setStatus("playing");
  };

  const hold = (key: keyof MushroomRaftInput, active: boolean) => {
    inputRef.current[key] = active;
  };

  return (
    <div className="flex flex-col items-center">
      <div className="flex w-full items-center justify-between gap-4">
        <div>
          <p className="text-xs text-mist-400">超级蘑菇漂流大冒险</p>
          <p className="mt-1 text-sm text-mist-500">
            WASD 移动，W 跳跃，J 水弹，K 冲刺，S/↓ 进管道
          </p>
        </div>
        <div className="flex gap-2">
          {screen === "playing" ? (
            <Button variant="ghost" size="sm" onClick={backToSelect}>
              选关
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              pausedRef.current = !pausedRef.current;
              setPaused(pausedRef.current);
            }}
            aria-label={paused ? "继续" : "暂停"}
          >
            {paused ? (
              <Play className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Pause className="h-4 w-4" aria-hidden="true" />
            )}
          </Button>
          <Button variant="ghost" size="sm" onClick={reset}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            重新开始
          </Button>
        </div>
      </div>

      {screen === "select" ? (
        <>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs text-mist-400">模式</span>
            <button
              type="button"
              onClick={() => {
                duoRef.current = false;
                setDuo(false);
              }}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                !duo
                  ? "bg-mint-300 text-ink-950"
                  : "bg-white/5 text-mist-400 hover:text-mist-100"
              }`}
            >
              单人
            </button>
            <button
              type="button"
              onClick={() => {
                duoRef.current = true;
                setDuo(true);
              }}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                duo
                  ? "bg-mint-300 text-ink-950"
                  : "bg-white/5 text-mist-400 hover:text-mist-100"
              }`}
            >
              双人
            </button>
          </div>
          <div className="mt-4 grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MUSHROOM_RAFT_WORLDS.map((world) => {
            const locked = world.index > unlocked;
            return (
              <button
                key={world.index}
                type="button"
                disabled={locked}
                onClick={() => startLevel(world.index)}
                className={`rounded-panel border p-5 text-left transition-colors ${
                  locked
                    ? "cursor-not-allowed border-white/5 bg-white/[0.02] opacity-50"
                    : "border-white/10 bg-white/[0.04] hover:border-mint-300/40 hover:bg-white/[0.08]"
                }`}
              >
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-mint-300">
                  世界 {world.index + 1}
                </span>
                <span className="mt-2 block text-lg font-bold text-mist-100">
                  {world.name}
                </span>
                <span className="mt-2 block text-sm text-mist-400">
                  {locked ? "通关上一关后解锁" : "点击开始漂流冒险"}
                </span>
              </button>
            );
          })}
          </div>
        </>
      ) : (
        <div className="relative mt-5 w-full">
        {screen === "playing" && duo ? (
          <div className="grid w-full gap-2 sm:grid-cols-2">
            <canvas
              ref={canvasRef}
              width={RAFT_VIEW_WIDTH}
              height={RAFT_VIEW_HEIGHT}
              className="aspect-[16/9] w-full rounded-card border border-white/10"
              aria-label="1P 游戏画面"
            />
            <canvas
              ref={canvas2Ref}
              width={RAFT_VIEW_WIDTH}
              height={RAFT_VIEW_HEIGHT}
              className="aspect-[16/9] w-full rounded-card border border-white/10"
              aria-label="2P 游戏画面"
            />
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            width={RAFT_VIEW_WIDTH}
            height={RAFT_VIEW_HEIGHT}
            className="aspect-[16/9] w-full rounded-card border border-white/10"
            aria-label="超级蘑菇漂流大冒险游戏画面"
          />
        )}

        <div className="pointer-events-none mt-3 grid w-full grid-cols-6 gap-1 px-2 sm:hidden">
          <button
            type="button"
            className="pointer-events-auto flex h-12 items-center justify-center rounded-xl bg-white/15 text-white backdrop-blur-sm active:bg-white/30"
            onPointerDown={() => hold("left", true)}
            onPointerUp={() => hold("left", false)}
            onPointerLeave={() => hold("left", false)}
            onPointerCancel={() => hold("left", false)}
            aria-label="向左"
          >
            <ChevronLeft className="h-6 w-6" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="pointer-events-auto flex h-12 items-center justify-center rounded-xl bg-white/15 text-white backdrop-blur-sm active:bg-white/30"
            onPointerDown={() => hold("right", true)}
            onPointerUp={() => hold("right", false)}
            onPointerLeave={() => hold("right", false)}
            onPointerCancel={() => hold("right", false)}
            aria-label="向右"
          >
            <ChevronRight className="h-6 w-6" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="pointer-events-auto flex h-12 items-center justify-center rounded-xl bg-white/15 text-white backdrop-blur-sm active:bg-white/30"
            onPointerDown={() => hold("down", true)}
            onPointerUp={() => hold("down", false)}
            onPointerLeave={() => hold("down", false)}
            onPointerCancel={() => hold("down", false)}
            aria-label="下"
          >
            <ChevronDown className="h-6 w-6" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="pointer-events-auto flex h-12 items-center justify-center rounded-xl bg-white/15 text-white backdrop-blur-sm active:bg-white/30"
            onPointerDown={() => hold("jump", true)}
            onPointerUp={() => hold("jump", false)}
            onPointerLeave={() => hold("jump", false)}
            onPointerCancel={() => hold("jump", false)}
            aria-label="跳跃"
          >
            <ArrowUp className="h-6 w-6" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="pointer-events-auto flex h-12 items-center justify-center rounded-xl bg-white/15 text-white backdrop-blur-sm active:bg-white/30"
            onPointerDown={() => hold("shoot", true)}
            onPointerUp={() => hold("shoot", false)}
            onPointerLeave={() => hold("shoot", false)}
            onPointerCancel={() => hold("shoot", false)}
            aria-label="水弹"
          >
            <Droplets className="h-6 w-6" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="pointer-events-auto flex h-12 items-center justify-center rounded-xl bg-white/15 text-white backdrop-blur-sm active:bg-white/30"
            onPointerDown={() => hold("dash", true)}
            onPointerUp={() => hold("dash", false)}
            onPointerLeave={() => hold("dash", false)}
            onPointerCancel={() => hold("dash", false)}
            aria-label="冲刺"
          >
            <Zap className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
        </div>
        )}
        {levelIndex === 6 && bestTime > 0 ? (
          <p className="mt-3 text-center text-xs text-mint-300">
            计时挑战最佳：{bestTime}s
          </p>
        ) : null}
        {status === "won" &&
        levelIndex < MUSHROOM_RAFT_WORLDS.length - 1 ? (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <Button onClick={() => startLevel(levelIndex + 1)}>
              下一关
            </Button>
            <Button variant="ghost" onClick={backToSelect}>
              返回选关
            </Button>
          </div>
        ) : status !== "playing" ? (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <Button variant="ghost" onClick={backToSelect}>
              返回选关
            </Button>
          </div>
        ) : null}
    </div>
  );
}
