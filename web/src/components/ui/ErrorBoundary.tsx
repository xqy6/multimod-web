import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("页面错误", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-ink-950 px-6 text-center text-mist-100">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mint-300">
            页面出错了
          </p>
          <h1 className="mt-4 text-3xl font-bold sm:text-4xl">遇到了一点问题</h1>
          <p className="mt-4 max-w-lg text-sm leading-7 text-mist-400">
            {this.state.error.message}
          </p>
          <a
            href="/"
            className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-mint-300 px-6 text-sm font-semibold text-ink-950"
          >
            返回首页
          </a>
        </main>
      );
    }
    return this.props.children;
  }
}
