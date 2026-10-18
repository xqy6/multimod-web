import { useCallback, useEffect, useRef, useState } from "react";

import {
  CREATURE_KINDS,
  SPECIES_META,
  type CreatureKind,
} from "@/lib/ocean/creatures";
import { createOceanScene, type OceanController, type OceanCounts } from "@/lib/ocean/scene";
import { renderCreatureThumbnails } from "@/lib/ocean/thumbs";
import "@/styles/ocean-shallows.css";

type Toggle = "rain" | "whirl" | "calm" | "sound";

function formatCount(value: number, singular: string, plural: string) {
  return `${value} ${value === 1 ? singular : plural}`;
}

const CONTROLS: { id: Toggle | "clear" | "hide"; label: string; shortcut: string }[] = [
  { id: "rain", label: "Rain", shortcut: "R" },
  { id: "whirl", label: "Whirlpool", shortcut: "W" },
  { id: "calm", label: "Calm", shortcut: "C" },
  { id: "clear", label: "Clear sea", shortcut: "M" },
  { id: "sound", label: "Sound", shortcut: "S" },
  { id: "hide", label: "Hide UI", shortcut: "H" },
];

export default function OceanShallowsPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<OceanController | null>(null);
  const dragRef = useRef<{
    kind: CreatureKind;
    id: number | null;
    moved: boolean;
    x: number;
    y: number;
  } | null>(null);

  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [counts, setCounts] = useState<OceanCounts>({ rays: 0, jellies: 0, total: 0 });
  const [thumbs, setThumbs] = useState<Partial<Record<CreatureKind, string>>>({});
  const [active, setActive] = useState<Record<Toggle, boolean>>({
    rain: false,
    whirl: false,
    calm: false,
    sound: false,
  });
  const [uiHidden, setUiHidden] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      setThumbs(renderCreatureThumbnails());
    } catch {
      setThumbs({});
    }

    let controller: OceanController | null = null;
    try {
      controller = createOceanScene(canvas, {
        onCounts: (next) => setCounts(next),
      });
      controllerRef.current = controller;
      setStatus("ready");
    } catch (error) {
      console.error("[ocean] failed to start", error);
      setStatus("error");
    }

    return () => {
      controllerRef.current = null;
      controller?.dispose();
    };
  }, [setUiHidden]);

  const toggle = useCallback((id: Toggle | "clear" | "hide") => {
    const controller = controllerRef.current;
    if (!controller) return;

    if (id === "hide") {
      setUiHidden((value) => !value);
      return;
    }
    if (id === "clear") {
      controller.clearSea();
      return;
    }
    if (id === "sound") {
      setActive((prev) => {
        const next = !prev.sound;
        const enabled = controller.setSound(next);
        return { ...prev, sound: enabled };
      });
      return;
    }

    setActive((prev) => {
      const next = !prev[id];
      if (id === "rain") controller.setRain(next);
      if (id === "whirl") controller.setWhirlpool(next);
      if (id === "calm") controller.setCalm(next);
      return { ...prev, [id]: next };
    });
  }, [setUiHidden]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      const key = event.key.toLowerCase();
      const map: Record<string, Toggle | "clear" | "hide"> = {
        r: "rain",
        w: "whirl",
        c: "calm",
        m: "clear",
        s: "sound",
        h: "hide",
      };
      const id = map[key];
      if (!id) return;
      event.preventDefault();
      toggle(id);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggle]);

  const handleCardPointerDown = (kind: CreatureKind, event: React.PointerEvent<HTMLButtonElement>) => {
    if (status !== "ready") return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { kind, id: null, moved: false, x: event.clientX, y: event.clientY };
  };

  const handleCardPointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    if (!drag.moved && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 9) {
      drag.moved = true;
      drag.id = controllerRef.current?.beginHold(drag.kind, event.clientX, event.clientY) ?? null;
    }
    if (drag.moved && drag.id !== null) {
      controllerRef.current?.moveHold(drag.id, event.clientX, event.clientY);
    }
  };

  const handleCardPointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;
    if (drag.moved && drag.id !== null) {
      controllerRef.current?.endHold(drag.id, event.clientX, event.clientY);
    } else {
      controllerRef.current?.throwCreature(drag.kind);
    }
  };

  return (
    <main
      id="main-content"
      className={`os-page${uiHidden ? " is-ui-hidden" : ""}${status === "ready" ? " is-ready" : ""}`}
    >
      <canvas
        ref={canvasRef}
        className="os-canvas"
        aria-label="Ocean Shallows: a top-down tropical sea where you can throw rays and jellyfish into the water"
      />

      <div className="os-ui">
        <header className="os-header">
          <p className="os-kicker">A living tidal pool</p>
          <h1 className="os-title">
            <span>Ocean</span>
            <em>Shallows</em>
          </h1>
          <p className="os-counter" aria-live="polite">
            {formatCount(counts.rays, "ray", "rays")} ·{" "}
            {formatCount(counts.jellies, "jelly", "jellies")}
          </p>
        </header>

        <div className="os-controls" role="group" aria-label="Scene controls">
          {CONTROLS.map((control) => {
            const isActive =
              control.id === "hide"
                ? uiHidden
                : control.id === "clear"
                  ? false
                  : active[control.id as Toggle];
            return (
              <button
                key={control.id}
                type="button"
                className={`os-control${isActive ? " is-active" : ""}`}
                onClick={() => toggle(control.id)}
                aria-pressed={isActive}
                title={`${control.label} (${control.shortcut})`}
              >
                {control.label}
                <span aria-hidden="true">{control.shortcut}</span>
              </button>
            );
          })}
        </div>

        <p className="os-hint">Tap a card to throw a creature · Drag it to place it yourself</p>
      </div>

      <section className="os-dock" aria-label="Creatures">
        <div className="os-dock__track">
          {CREATURE_KINDS.map((kind) => {
            const meta = SPECIES_META[kind];
            const thumb = thumbs[kind];
            return (
              <button
                key={kind}
                type="button"
                className="os-card"
                onPointerDown={(event) => handleCardPointerDown(kind, event)}
                onPointerMove={handleCardPointerMove}
                onPointerUp={handleCardPointerUp}
                onPointerCancel={handleCardPointerUp}
                aria-label={`Throw a ${meta.name} into the sea`}
              >
                <span className={`os-card__thumb os-card__thumb--${kind}`}>
                  {thumb ? <img src={thumb} alt="" draggable={false} /> : null}
                </span>
                <span className="os-card__name">{meta.name}</span>
                <span className="os-card__latin">{meta.latin}</span>
              </button>
            );
          })}
        </div>
      </section>

      {uiHidden ? (
        <button type="button" className="os-show" onClick={() => setUiHidden(false)}>
          Show UI
        </button>
      ) : null}

      {status === "loading" ? (
        <div className="os-loading">
          <span className="os-loading__ring" aria-hidden="true" />
          <p>Filling the shallows…</p>
        </div>
      ) : null}

      {status === "error" ? (
        <div className="os-error">
          <strong>This browser could not start the 3D ocean</strong>
          <p>WebGL is required. Try a recent Chrome, Edge, Firefox or Safari build.</p>
        </div>
      ) : null}
    </main>
  );
}
