import { useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";

import { assetUrl } from "@/lib/assets";
import "@/styles/mostar.css";

const SKY = assetUrl("assets/mostar/sky.webp");
const BACK_FOUR = assetUrl("assets/mostar/back-four.webp");
const BAZAAR = assetUrl("assets/mostar/bazaar.webp");
const SPLIT_LEFT = assetUrl("assets/mostar/split-left.webp");
const SPLIT_RIGHT = assetUrl("assets/mostar/split-right.webp");
const BRIDGE = assetUrl("assets/mostar/bridge.webp");
const ICON_1 = assetUrl("assets/mostar/icon1.webp");
const ICON_2 = assetUrl("assets/mostar/icon2.webp");
const ICON_3 = assetUrl("assets/mostar/icon3.webp");

const NAV_LINKS = [
  { label: "工作台", to: "/workspace" },
  { label: "游戏", to: "/games" },
  { label: "浏览器", to: "/browser" },
  { label: "聊天", to: "/chat" },
  { label: "网盘", to: "/netdisk" },
];

const SIGHTS = [
  {
    label: "打开小游戏中心",
    to: "/games",
    kicker: "休闲游戏",
    title: "小游戏中心",
    body: "2048、贪吃蛇、俄罗斯方块，键盘与触控都支持，分数进入排行榜。",
    pin: ICON_1,
  },
  {
    label: "打开内置浏览器",
    to: "/browser",
    kicker: "网页工具",
    title: "内置浏览器",
    body: "多标签页浏览，保存历史与书签，受限站点给出友好提示。",
    pin: ICON_2,
  },
  {
    label: "打开实时聊天室",
    to: "/chat",
    kicker: "实时通信",
    title: "实时聊天室",
    body: "多房间实时消息、在线状态与消息持久化，无需自建服务器。",
    pin: ICON_3,
  },
  {
    label: "打开网盘",
    to: "/netdisk",
    kicker: "文件管理",
    title: "网盘",
    body: "百度网盘式文件管理，支持回收站、分享与分片上传。",
    pin: ICON_1,
  },
  {
    label: "打开生成工作台",
    to: "/workspace",
    kicker: "AI 建站",
    title: "生成工作台",
    body: "用 vibe 描述生成可部署网站，支持素材上传与 ZIP 导出。",
    pin: ICON_2,
  },
];

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function smoothstep(e0: number, e1: number, value: number) {
  const x = clamp((value - e0) / (e1 - e0));
  return x * x * (3 - 2 * x);
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function MostarCinema() {
  const navigate = useNavigate();
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    const controls = controlsRef.current;
    const prev = prevRef.current;
    const next = nextRef.current;
    if (!section || !track || !controls || !prev || !next) return;

    const root = document.documentElement;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const originalCards = Array.from(
      section.querySelectorAll<HTMLElement>(".sight-card"),
    );
    const originalSightCount = originalCards.length;
    let targetMouseX = 0;
    let mouseX = 0;
    let targetMouseY = 0;
    let mouseY = 0;
    let targetScroll = 0;
    let smoothScroll = 0;
    let initialized = false;
    let rafPending = false;
    let activeSight = originalSightCount;
    let sightCards: HTMLElement[] = [];

    const getScrollDistance = () =>
      clamp(
        -section.getBoundingClientRect().top,
        0,
        section.offsetHeight - window.innerHeight,
      );

    const segmentInOut = (
      s: number,
      a: number,
      b: number,
      c: number,
      d: number,
    ) => {
      const enter = smoothstep(a, b, s);
      const exit = smoothstep(c, d, s);
      return { enter, exit, active: enter * (1 - exit) };
    };

    const updateSightSlider = () => {
      const cardWidth = sightCards[0]?.offsetWidth ?? 0;
      const gap = Number.parseFloat(getComputedStyle(track).columnGap || "0");
      root.style.setProperty(
        "--sights-shift",
        `${-(cardWidth + gap) * activeSight}px`,
      );
      sightCards.forEach((card, index) => {
        card.classList.toggle("is-active", index === activeSight);
      });
    };

    const jumpSightSlider = (index: number) => {
      track.classList.add("is-jumping");
      activeSight = index;
      updateSightSlider();
      requestAnimationFrame(() => {
        requestAnimationFrame(() => track.classList.remove("is-jumping"));
      });
    };

    const normalizeSightSlider = () => {
      if (activeSight >= originalSightCount * 2) {
        jumpSightSlider(activeSight - originalSightCount);
      } else if (activeSight < originalSightCount) {
        jumpSightSlider(activeSight + originalSightCount);
      }
    };

    const selectSightCard = (card: HTMLElement) => {
      const index = Number(card.dataset.sightIndex);
      const target = card.dataset.to;
      if (Number.isFinite(index)) {
        activeSight = index;
        updateSightSlider();
      }
      if (target) navigate(target);
    };

    const moveSightSlider = (direction: number) => {
      activeSight += direction;
      updateSightSlider();
    };

    const setupSightSlider = () => {
      track.replaceChildren();
      for (let setIndex = 0; setIndex < 3; setIndex += 1) {
        originalCards.forEach((card, cardIndex) => {
          const clone = card.cloneNode(true) as HTMLElement;
          clone.dataset.sightIndex = String(
            setIndex * originalSightCount + cardIndex,
          );
          clone.addEventListener("click", () => selectSightCard(clone));
          clone.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              selectSightCard(clone);
            }
          });
          track.appendChild(clone);
        });
      }
      sightCards = Array.from(
        track.querySelectorAll<HTMLElement>(".sight-card"),
      );
      activeSight = originalSightCount;
      track.addEventListener("transitionend", normalizeSightSlider);
      updateSightSlider();
    };

    const update = () => {
      targetScroll = getScrollDistance();
      if (!initialized || reduceMotion.matches) {
        smoothScroll = targetScroll;
        initialized = true;
      } else {
        smoothScroll = lerp(smoothScroll, targetScroll, 0.14);
      }
      if (Math.abs(smoothScroll - targetScroll) < 0.08) {
        smoothScroll = targetScroll;
      }

      mouseX = lerp(mouseX, targetMouseX, 0.12);
      mouseY = lerp(mouseY, targetMouseY, 0.12);

      const frame2 = segmentInOut(smoothScroll, 560, 900, 1300, 1620);
      const frame3 = segmentInOut(smoothScroll, 1760, 2140, 2540, 2700);
      const progress = clamp(smoothScroll / 2700);
      const introExit = smoothstep(90, 650, smoothScroll);
      const sightsEnterRaw = smoothstep(2760, 3560, smoothScroll);
      const sightsEnter = Math.pow(sightsEnterRaw, 1.55);
      const sightsControlsEnter = smoothstep(3360, 3660, smoothScroll);
      const blurActive = clamp(frame2.active + frame3.active);
      const frame2Opacity = frame2.active * (1 - frame3.enter);
      const splitDrift = Math.pow(frame2.enter, 1.5);
      const panel2Opacity = frame2.active * (1 - frame2.exit);
      const panel3Opacity = frame3.active * (1 - frame3.exit);
      const backScale =
        0.76 + progress * 0.2 + frame2.enter * 0.18 + frame3.enter * 0.16;
      const sharedHeroY = progress * -74;
      const sharedHeroScale = progress * 0.23;
      const sightsScreenTop =
        Math.min(220, Math.max(112, window.innerHeight * 0.19)) - 50;
      const sightsParentTop =
        window.innerHeight - (window.innerHeight - sightsScreenTop) / backScale;

      root.style.setProperty(
        "--mx",
        (reduceMotion.matches ? 0 : mouseX).toFixed(4),
      );
      root.style.setProperty(
        "--my",
        (reduceMotion.matches ? 0 : mouseY).toFixed(4),
      );
      root.style.setProperty("--back-opacity", String(1 - frame2.active * 0.06));
      root.style.setProperty("--back-x", `${mouseX * -12}px`);
      root.style.setProperty("--back-y", `${mouseY * -4}px`);
      root.style.setProperty("--back-scale", String(backScale));
      root.style.setProperty("--four-y", `${10 + progress * 10}vh`);
      root.style.setProperty("--four-scale", String(0.78 + progress * 0.16));
      root.style.setProperty("--bazaar-y", `${8 - progress * 8}vh`);
      root.style.setProperty("--blur-px", `${blurActive * 14}px`);
      root.style.setProperty(
        "--back-brightness",
        String(1 - blurActive * 0.255),
      );
      root.style.setProperty("--bazaar-blur-px", `${frame2.active * 14}px`);
      root.style.setProperty(
        "--bazaar-brightness",
        String(1 - frame2.active * 0.255 - frame3.active * 0.06),
      );
      root.style.setProperty(
        "--bazaar-saturation",
        String(1 + frame3.active * 0.18),
      );
      root.style.setProperty("--shade-opacity", "1");
      root.style.setProperty("--shade-z", frame2.active > 0.02 ? "2" : "0");
      root.style.setProperty(
        "--shade-top-alpha",
        String(blurActive * 0.465),
      );
      root.style.setProperty(
        "--shade-mid-alpha",
        String(blurActive * 0.42),
      );
      root.style.setProperty(
        "--shade-bottom-alpha",
        String(blurActive * 0.51),
      );
      root.style.setProperty("--title-y", `${introExit * -210}px`);
      root.style.setProperty("--title-scale", String(1 - introExit * 0.08));
      root.style.setProperty("--title-opacity", String(1 - introExit));
      root.style.setProperty("--bridge-x", `calc(-50% + ${mouseX * 18}px)`);
      root.style.setProperty(
        "--bridge-y",
        `${mouseY * 8 + sharedHeroY - frame2.exit * 760}px`,
      );
      root.style.setProperty(
        "--bridge-bottom",
        `${5 - frame2.enter * 13}vh`,
      );
      root.style.setProperty(
        "--bridge-width",
        `${67.2 + frame2.enter * 37.8}vw`,
      );
      root.style.setProperty(
        "--bridge-scale",
        String(1.02 + sharedHeroScale + frame2.exit * 0.46),
      );
      root.style.setProperty(
        "--split-left-x",
        `calc(-50% + ${-splitDrift * 46}vw + ${mouseX * 22}px)`,
      );
      root.style.setProperty(
        "--split-left-y",
        `${mouseY * 10 + sharedHeroY - splitDrift * 180}px`,
      );
      root.style.setProperty(
        "--split-left-scale",
        String(1 + sharedHeroScale + frame2.enter * 0.74),
      );
      root.style.setProperty(
        "--split-right-x",
        `calc(-50% + ${splitDrift * 46}vw + ${mouseX * 22}px)`,
      );
      root.style.setProperty(
        "--split-right-y",
        `${mouseY * 10 + sharedHeroY - splitDrift * 180}px`,
      );
      root.style.setProperty(
        "--split-right-scale",
        String(1 + sharedHeroScale + frame2.enter * 0.74),
      );
      root.style.setProperty("--frame2-opacity", String(frame2Opacity));
      root.style.setProperty("--frame2-x", `calc(-50% + ${mouseX * 10}px)`);
      root.style.setProperty(
        "--frame2-y",
        `calc(-50% + ${mouseY * 8 - frame2.exit * 150}px)`,
      );
      root.style.setProperty(
        "--frame2-scale",
        String(1.06 + frame2.enter * 0.08 + frame2.exit * 0.08),
      );
      root.style.setProperty("--intro-copy-y", `${introExit * 90}px`);
      root.style.setProperty("--intro-copy-opacity", String(1 - introExit));
      root.style.setProperty("--panel2-opacity", String(panel2Opacity));
      root.style.setProperty(
        "--panel2-y",
        `calc(-50% + ${-frame2.exit * 86 + (1 - frame2.enter) * 58}px)`,
      );
      root.style.setProperty("--panel3-opacity", String(panel3Opacity));
      root.style.setProperty(
        "--panel3-y",
        `calc(-50% + ${-frame3.exit * 86 + (1 - frame3.enter) * 58}px)`,
      );
      root.style.setProperty("--sights-opacity", String(sightsEnter));
      root.style.setProperty(
        "--sights-controls-opacity",
        String(sightsControlsEnter),
      );
      controls.classList.toggle("is-ready", sightsControlsEnter > 0.98);
      root.style.setProperty(
        "--sights-visibility",
        sightsEnter > 0.01 ? "visible" : "hidden",
      );
      root.style.setProperty("--sights-y", "0px");
      root.style.setProperty(
        "--sights-enter-x",
        `${(1 - sightsEnter) * 420}vw`,
      );
      root.style.setProperty("--sights-scale", String(1 / backScale));
      root.style.setProperty("--sights-top", `${sightsParentTop}px`);
      root.style.setProperty("--sights-screen-top", `${sightsScreenTop}px`);
    };

    const requestTick = () => {
      if (rafPending) return;
      rafPending = true;
      requestAnimationFrame(() => {
        rafPending = false;
        update();
        if (
          Math.abs(smoothScroll - targetScroll) > 0.08 ||
          Math.abs(mouseX - targetMouseX) > 0.001 ||
          Math.abs(mouseY - targetMouseY) > 0.001
        ) {
          requestTick();
        }
      });
    };

    const onScroll = () => requestTick();
    const onResize = () => {
      updateSightSlider();
      requestTick();
    };
    const onPointerMove = (event: PointerEvent) => {
      targetMouseX = event.clientX / window.innerWidth - 0.5;
      targetMouseY = event.clientY / window.innerHeight - 0.5;
      requestTick();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    const onPrev = () => moveSightSlider(-1);
    const onNext = () => moveSightSlider(1);
    prev.addEventListener("click", onPrev);
    next.addEventListener("click", onNext);
    setupSightSlider();
    requestTick();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointerMove);
      prev.removeEventListener("click", onPrev);
      next.removeEventListener("click", onNext);
      track.removeEventListener("transitionend", normalizeSightSlider);
    };
  }, [navigate]);

  return (
    <div className="site-shell">
      <section
        ref={sectionRef}
        id="cinema"
        className="cinema-scroll"
        aria-label="多功能平台电影感滚动页"
      >
        <div className="stage">
          <div className="world">
            <img className="scene-img sky-img" src={SKY} alt="" />

            <header className="site-header" aria-label="主导航">
              <Link className="site-logo" to="/home">
                MODULO
              </Link>
              <nav className="site-nav" aria-label="功能导航">
                {NAV_LINKS.map((link) => (
                  <Link key={link.to} to={link.to}>
                    {link.label}
                  </Link>
                ))}
              </nav>
              <Link className="language-switcher" to="/settings" aria-label="设置">
                <span>设置</span>
                <span aria-hidden="true">›</span>
              </Link>
            </header>

            <div className="back-stack">
              <img
                className="scene-img back-img back-four"
                src={BACK_FOUR}
                alt=""
              />
              <section
                className="sights-slider"
                aria-label="多功能模块滑动选择"
              >
                <div className="sights-track" ref={trackRef}>
                  {SIGHTS.map((sight) => (
                    <article
                      key={sight.title}
                      className="sight-card"
                      tabIndex={0}
                      role="button"
                      aria-label={sight.label}
                      data-to={sight.to}
                    >
                      <span className="sight-kicker">{sight.kicker}</span>
                      <img className="sight-pin" src={sight.pin} alt="" />
                      <h3>{sight.title}</h3>
                      <p>{sight.body}</p>
                    </article>
                  ))}
                </div>
              </section>
              <img
                className="scene-img back-img back-bazaar"
                src={BAZAAR}
                alt=""
              />
            </div>

            <div
              className="sights-controls"
              ref={controlsRef}
              aria-label="滑动控制"
            >
              <button
                ref={prevRef}
                type="button"
                className="sight-nav sight-prev"
                aria-label="上一个"
              >
                ←
              </button>
              <button
                ref={nextRef}
                type="button"
                className="sight-nav sight-next"
                aria-label="下一个"
              >
                →
              </button>
            </div>

            <h1 className="hero-title">
              <span>多功能</span>
              <span>Web 平台</span>
            </h1>
            <img
              className="scene-img splitframe-img splitframe-left"
              src={SPLIT_LEFT}
              alt=""
            />
            <img
              className="scene-img splitframe-img splitframe-right"
              src={SPLIT_RIGHT}
              alt=""
            />
            <img className="scene-img bridge-img" src={BRIDGE} alt="" />
            <div className="shade" />
          </div>

          <section className="intro-copy" aria-label="平台简介">
            <p>
              从 vibe 氛围到 UI 效果图、交互原型，再到完整可部署的前端代码。
              小游戏中心、内置浏览器、实时聊天室、网盘，按需组合，一次生成。
            </p>
            <div className="hero-tags" aria-label="平台亮点">
              <span>无需自建服务器</span>
              <span>实时聊天</span>
              <span>可部署前端包</span>
            </div>
          </section>

          <section
            className="story-panel story-panel-bridge"
            aria-label="多功能平台介绍"
          >
            <h2>一个平台，四个核心模块</h2>
            <p>
              小游戏中心、内置浏览器、实时聊天室与网盘按需组合，生成后可直接部署上线。
            </p>
            <dl className="facts">
              <div>
                <dt>4</dt>
                <dd>核心功能模块</dd>
              </div>
              <div>
                <dt>1</dt>
                <dd>ZIP 一键部署包</dd>
              </div>
            </dl>
          </section>

          <section
            className="story-panel story-panel-bazaar"
            aria-label="建站流程"
          >
            <h2>从想法到上线</h2>
            <p>
              vibe 描述 → UI 效果图 → 交互原型 → 完整可运行前端代码，一条流程直接交付。
            </p>
            <Link to="/workspace" className="note-button">
              <span aria-hidden="true">↳</span>
              <span>进入生成工作台</span>
            </Link>
          </section>

          <div className="scroll-hint" aria-hidden="true">
            <span>滚动鼠标即可</span>
            <span className="scroll-hint-line" />
          </div>
        </div>
      </section>
    </div>
  );
}
