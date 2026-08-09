import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import "@/styles/echo-id.css";
import { assetUrl } from "@/lib/assets";
import { shouldUseLocalBackend } from "@/lib/api";
import { signInWithPassword, signUp } from "@/services/auth";
import { DEMO_USER, useAuthStore } from "@/stores/auth";

const VIDEO_URL = assetUrl("assets/login-hero.mp4");
const POSTER_URL = assetUrl("assets/login-hero-poster.png");

type Mode = "signin" | "signup";

const navLinks = [
  { label: "故事", href: "#story" },
  { label: "平台", href: "#platforms" },
  { label: "身份", href: "#identity" },
  { label: "联系", href: "#contact" },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);
  const user = useAuthStore((state) => state.user);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    videoRef.current?.setAttribute("webkit-playsinline", "");
    videoRef.current?.setAttribute("x5-playsinline", "");
  }, []);

  useEffect(() => {
    const previousTitle = document.title;
    const previousLang = document.documentElement.lang;
    document.title = "登录 - MODULO";
    document.documentElement.lang = "zh-CN";
    return () => {
      document.title = previousTitle;
      document.documentElement.lang = previousLang;
    };
  }, []);

  useEffect(() => {
    if (user) navigate("/home");
  }, [navigate, user]);

  useEffect(() => {
    document.body.classList.toggle("echo-menu-open", menuOpen);
    return () => document.body.classList.remove("echo-menu-open");
  }, [menuOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    const onResize = () => {
      if (window.innerWidth >= 901) setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) toggleRef.current?.focus();
  }, [menuOpen]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const result =
      mode === "signin"
        ? await signInWithPassword(email, password)
        : await signUp(email, password, displayName || email.split("@")[0]);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.user) setUser(result.user);
    navigate("/home");
  };

  const enterDemo = () => {
    setUser(DEMO_USER);
    navigate("/home");
  };

  return (
    <main className="echo-hero">
      <div className="echo-hero__media" aria-hidden="true">
        <video
          ref={videoRef}
          src={VIDEO_URL}
          poster={POSTER_URL}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          onLoadedData={() => setVideoReady(true)}
          onError={() => setVideoFailed(true)}
          style={videoFailed || !videoReady ? { display: "none" } : undefined}
        />
        <div className="echo-hero__scrim" />
      </div>

      <nav className="echo-nav" aria-label="Primary">
        <a className="echo-nav__left" href="#home">
          ECHOID
        </a>
        <div className="echo-nav__cluster">
          <div className="echo-nav__links">
            {navLinks.map((link) => (
              <a key={link.label} className="echo-nav__link" href={link.href}>
                {link.label}
              </a>
            ))}
          </div>
          <a className="echo-nav__cta" href="#join">
            加入
          </a>
          <button
            ref={toggleRef}
            type="button"
            className={`echo-nav__toggle ${menuOpen ? "is-open" : ""}`}
            aria-expanded={menuOpen}
            aria-controls="mobileMenu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </nav>

      <div className="echo-hero__body">
        <div className="echo-panel">
          <span className="echo-chip">[ 语音入口 ]</span>
          <h1 className="echo-title">ECHOID</h1>
          <p className="echo-tagline">你的 E 网络语音身份 ID。</p>

          <form className="echo-form" noValidate onSubmit={submit}>
            <div className="echo-mode-row">
              {(
                [
                  ["signin", "登录"],
                  ["signup", "注册"],
                ] as [Mode, string][]
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={`echo-mode ${mode === value ? "is-active" : ""}`}
                  onClick={() => {
                    setMode(value);
                    setError(null);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {mode === "signup" ? (
              <>
                <label className="echo-label" htmlFor="echo-display-name">
                  昵称
                </label>
                <input
                  id="echo-display-name"
                  className="echo-input"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="昵称"
                  autoComplete="nickname"
                />
              </>
            ) : null}

            <label className="echo-label" htmlFor="echo-email">
              邮箱
            </label>
            <input
              id="echo-email"
              className="echo-input"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="邮箱"
              autoComplete="username"
              required
            />

            <label className="echo-label" htmlFor="echo-password">
              密码
            </label>
            <input
              id="echo-password"
              className="echo-input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="密码"
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
              required
            />

            {error ? <p className="echo-error">{error}</p> : null}
            {shouldUseLocalBackend() ? (
              <button
                type="button"
                className="echo-btn echo-btn--ghost"
                onClick={enterDemo}
              >
                离线浏览
              </button>
            ) : null}

            <button
              type="button"
              className="echo-btn echo-btn--ghost"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            >
              {mode === "signin" ? "切换注册" : "切换登录"}
            </button>
            <button
              type="submit"
              className="echo-btn echo-btn--solid"
              disabled={loading}
            >
              {mode === "signin" ? "访问" : "创建账号"}
            </button>
          </form>

          <button
            type="button"
            className="echo-referral"
            onClick={() => undefined}
          >
            我有邀请码
          </button>
        </div>
      </div>

      <footer className="echo-legal">
        <p>
          打开 e.xyz 账号即表示你接受我们的{" "}
          <a href="#privacy-notice">隐私通知</a>和{" "}
          <a href="#service-contract">服务条款</a>。
        </p>
      </footer>

      <div
        id="mobileMenu"
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
        aria-hidden={!menuOpen}
        inert={!menuOpen}
        className={`echo-mobile-menu ${menuOpen ? "is-open" : ""}`}
        onClick={() => setMenuOpen(false)}
      >
        {navLinks.map((link) => (
          <a key={link.label} href={link.href}>
            {link.label}
          </a>
        ))}
        <a href="#join">加入</a>
      </div>
    </main>
  );
}
