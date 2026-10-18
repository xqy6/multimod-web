import {
  Clock3,
  Compass,
  Lightbulb,
  LocateFixed,
  MapPin,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  JIAXING_ATTRACTIONS,
  JIAXING_ATTRACTION_BY_ID,
} from "@/data/jiaxingAttractions";
import {
  createSandTable,
  type SandTableController,
} from "@/lib/jiaxing/sandTable";
import "@/styles/jiaxing-map.css";

export default function JiaxingMapPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<SandTableController | null>(null);
  const markerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [selectedId, setSelectedId] = useState("nanhu");
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [autoRotate, setAutoRotate] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const controller = createSandTable(canvas, {
        onSelect: (id) => {
          setSelectedId(id);
          setPanelOpen(true);
        },
        onProject: (id, x, y, visible) => {
          const marker = markerRefs.current[id];
          if (!marker) return;
          marker.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -100%)`;
          marker.classList.toggle("is-visible", visible);
        },
        onReady: () => setReady(true),
      });
      sceneRef.current = controller;
      controller.select("nanhu", false);
      return () => {
        sceneRef.current = null;
        controller.dispose();
      };
    } catch {
      setFailed(true);
      return undefined;
    }
  }, []);

  const selected = JIAXING_ATTRACTION_BY_ID[selectedId];

  function chooseAttraction(id: string, moveCamera = true) {
    setSelectedId(id);
    setPanelOpen(true);
    sceneRef.current?.select(id, moveCamera);
  }

  function toggleAutoRotate() {
    const next = !autoRotate;
    setAutoRotate(next);
    sceneRef.current?.setAutoRotate(next);
  }

  return (
    <main className="jx-page" id="main-content">
      <canvas
        ref={canvasRef}
        className="jx-canvas"
        aria-label="嘉兴 3D 旅行沙盘，可拖动旋转、缩放并点击景点"
      />

      <div className="jx-atmosphere" aria-hidden="true" />

      <header className="jx-header">
        <div className="jx-brand">
          <span className="jx-brand__seal">禾</span>
          <span className="jx-brand__copy">
            <strong>嘉兴微缩旅行志</strong>
            <small>JIAXING SAND TABLE</small>
          </span>
        </div>
        <div className="jx-header__actions">
          <button
            type="button"
            className={autoRotate ? "jx-control is-active" : "jx-control"}
            onClick={toggleAutoRotate}
            title={autoRotate ? "暂停自动旋转" : "开始自动旋转"}
            aria-label={autoRotate ? "暂停自动旋转" : "开始自动旋转"}
          >
            {autoRotate ? <Pause size={17} /> : <Play size={17} />}
          </button>
          <button
            type="button"
            className="jx-control"
            onClick={() => sceneRef.current?.reset()}
            title="回到全景"
            aria-label="回到全景"
          >
            <RotateCcw size={17} />
          </button>
          <span className="jx-control-group">
            <button
              type="button"
              className="jx-control"
              onClick={() => sceneRef.current?.zoomBy(-0.13)}
              aria-label="放大"
            >
              <Plus size={17} />
            </button>
            <button
              type="button"
              className="jx-control"
              onClick={() => sceneRef.current?.zoomBy(0.13)}
              aria-label="缩小"
            >
              <Minus size={17} />
            </button>
          </span>
        </div>
      </header>

      <section className="jx-intro">
        <span className="jx-intro__eyebrow">
          <Compass size={14} />
          浙江 · 嘉兴
        </span>
        <h1>
          一城江南
          <span>九景入画</span>
        </h1>
        <p>
          从南湖烟雨到钱塘潮声，把嘉兴的水网、古镇、山湖与海岸收进一方微缩沙盘。
        </p>
        <div className="jx-intro__facts">
          <span>{JIAXING_ATTRACTIONS.length} 处精选目的地</span>
          <span>3D 可交互导览</span>
        </div>
      </section>

      <div className="jx-markers" aria-live="polite">
        {JIAXING_ATTRACTIONS.map((attraction) => (
          <button
            key={attraction.id}
            ref={(node) => {
              markerRefs.current[attraction.id] = node;
            }}
            type="button"
            className={
              attraction.id === selectedId
                ? "jx-marker is-selected"
                : "jx-marker"
            }
            style={{ "--marker-accent": attraction.accent } as React.CSSProperties}
            onClick={() => chooseAttraction(attraction.id)}
            aria-label={`查看${attraction.name}`}
          >
            <span className="jx-marker__index">{attraction.index}</span>
            <span className="jx-marker__name">{attraction.name}</span>
          </button>
        ))}
      </div>

      <nav className="jx-dock" aria-label="景点列表">
        <div className="jx-dock__track">
          {JIAXING_ATTRACTIONS.map((attraction) => (
            <button
              key={attraction.id}
              type="button"
              className={
                attraction.id === selectedId ? "jx-dock__item is-active" : "jx-dock__item"
              }
              onClick={() => chooseAttraction(attraction.id)}
            >
              <span>{attraction.index}</span>
              <strong>{attraction.name}</strong>
            </button>
          ))}
        </div>
      </nav>

      <aside
        className={panelOpen ? "jx-panel is-open" : "jx-panel"}
        aria-label={`${selected.name}景点信息`}
      >
        <div className="jx-panel__accent" style={{ background: selected.accent }} />

        <div className="jx-panel__head" key={selected.id}>
          <span className="jx-panel__index">{selected.index}</span>
          <div>
            <span className="jx-panel__district">{selected.district}</span>
            <h2>{selected.name}</h2>
            <p>{selected.short}</p>
          </div>
        </div>

        <p className="jx-panel__summary">{selected.summary}</p>

        <div className="jx-panel__meta">
          <span>
            <Clock3 size={15} />
            {selected.duration}
          </span>
          <span>
            <LocateFixed size={15} />
            {selected.bestTime}
          </span>
        </div>

        <div className="jx-panel__section">
          <h3>
            <MapPin size={15} />
            主要看点
          </h3>
          <ul className="jx-highlights">
            {selected.highlights.map((highlight) => (
              <li key={highlight}>{highlight}</li>
            ))}
          </ul>
        </div>

        <div className="jx-panel__section jx-panel__tips">
          <h3>
            <Lightbulb size={15} />
            游玩 Tips
          </h3>
          <ol>
            {selected.tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ol>
        </div>

        <div className="jx-panel__footer">
          <span>{selected.coordinates}</span>
          <button type="button" onClick={() => chooseAttraction(selected.id)}>
            聚焦此景
          </button>
        </div>
      </aside>

      {panelOpen && (
        <button
          type="button"
          className="jx-panel__close"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => setPanelOpen(false)}
          aria-label="收起景点信息"
        >
          <X size={18} />
        </button>
      )}
      {!panelOpen && (
        <button
          type="button"
          className="jx-panel-trigger"
          onClick={() => setPanelOpen(true)}
          aria-label="展开景点信息"
        >
          <MapPin size={17} />
          {selected.name}
        </button>
      )}

      {!ready && !failed && (
        <div className="jx-loading">
          <span />
          <p>正在布置嘉兴沙盘</p>
        </div>
      )}

      {failed && (
        <div className="jx-error">
          <strong>当前浏览器未能启动 3D 场景</strong>
          <p>请开启 WebGL 或升级 Safari、Chrome、Edge 后重试。</p>
        </div>
      )}
    </main>
  );
}
