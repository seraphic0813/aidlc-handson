import type { ReactNode } from 'react';
import { Button } from '../atoms/Button.js';
export function PageLayout({
  title,
  eyebrow,
  children,
  onEntry,
  action,
}: {
  title: string;
  eyebrow: string;
  children: ReactNode;
  onEntry: () => void;
  action?: ReactNode;
}) {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        本文へ移動
      </a>
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">D</span>
          <span>
            DeskFlow<small>IT SUPPORT DESK</small>
          </span>
        </div>
        <p className="sidebar-caption">社内IT問い合わせ窓口</p>
        <Button className="sidebar-link" onClick={onEntry}>
          入口の選択
        </Button>
        <div className="sidebar-note">
          <span className="local-dot" /> LOCAL WORKSPACE
          <p>
            架空データを使う演習です。
            <br />
            入口の切替は認証ではありません。
          </p>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span>DeskFlow / {eyebrow}</span>
          <span className="local-badge">ローカル演習</span>
        </header>
        <main id="main" tabIndex={-1}>
          <div className="page-heading">
            <div>
              <p className="eyebrow">{eyebrow}</p>
              <h1>{title}</h1>
            </div>
            {action}
          </div>
          {children}
        </main>
        <footer>DeskFlow — 問い合わせを、次の解決につなげる。</footer>
      </div>
    </div>
  );
}
