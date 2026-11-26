"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

type User = { id: string; displayName: string; email: string; username: string; role: string };
type ProviderInfo = { id: string; configured: boolean; model: string };
type ChatItem = { role: "user" | "assistant"; content: string; provider?: string };
const categories = [
  { icon: "✳", title: "AI & Pintar", detail: "ULTRA assistant, writing and ideas", status: "ULTRA AVAILABLE", href: "#ultra", active: true },
  { icon: "⌁", title: "Tools Berguna", detail: "Small tools for everyday work", status: "IN DEVELOPMENT" },
  { icon: "◫", title: "Sekolah & Belajar", detail: "A calmer place to learn", status: "PLANNED" },
  { icon: "◷", title: "Uang & Belanja", detail: "Personal finance and shopping", status: "PLANNED" },
  { icon: "♫", title: "Hiburan & Audio", detail: "Playlists and licensed audio", status: "PLANNED" },
  { icon: "⌂", title: "Sehat & Jadwal", detail: "Wellbeing and daily planning", status: "PLANNED" },
];

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [provider, setProvider] = useState("auto");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState("");
  const [conversationId, setConversationId] = useState<string>();
  const [chat, setChat] = useState<ChatItem[]>([]);
  const [copied, setCopied] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me", { cache: "no-store" }).then(async (response) => response.ok ? response.json() : { user: null }),
      fetch("/api/ultra", { cache: "no-store" }).then(async (response) => response.ok ? response.json() : { providers: [] }),
    ]).then(([auth, ai]) => { setUser(auth.user); setProviders(ai.providers ?? []); }).catch(() => undefined).finally(() => setLoading(false));
  }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [chat, sending]);

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setAuthBusy(true); setAuthError("");
    const form = new FormData(event.currentTarget);
    const body: Record<string, string> = { email: String(form.get("email") ?? ""), password: String(form.get("password") ?? "") };
    if (authMode === "register") {
      body.displayName = String(form.get("displayName") ?? "");
      body.username = String(form.get("username") ?? "");
    }
    try {
      const response = await fetch("/api/auth", { method: "POST", headers: { "content-type": "application/json", "x-auth-action": authMode }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Tidak dapat memproses akun.");
      setUser(data.user); setAuthError("");
    } catch (error) { setAuthError(error instanceof Error ? error.message : "Koneksi bermasalah. Coba lagi."); }
    finally { setAuthBusy(false); }
  }

  async function signOut() {
    try { await fetch("/api/auth/me", { method: "DELETE" }); setUser(null); setChat([]); setConversationId(undefined); }
    catch { setAuthError("Tidak dapat keluar. Periksa koneksi lalu coba lagi."); }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const prompt = message.trim(); if (!prompt || sending) return;
    setMessage(""); setChatError(""); setChat((items) => [...items, { role: "user", content: prompt }]); setSending(true);
    try {
      const response = await fetch("/api/ultra", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message: prompt, provider, conversationId }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "ULTRA gagal merespons.");
      setConversationId(data.conversationId);
      setChat((items) => [...items, { role: "assistant", content: data.response, provider: data.provider }]);
    } catch (error) { setChatError(error instanceof Error ? error.message : "Network error. Coba lagi."); }
    finally { setSending(false); }
  }

  async function copyResponse(content: string) {
    try { await navigator.clipboard.writeText(content); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }
    catch { setChatError("Clipboard tidak tersedia di browser ini."); }
  }

  const configuredProviders = providers.filter((item) => item.configured);
  if (loading) return <main className="loading-screen"><div className="rocket" aria-hidden="true">🚀</div><p>Menyiapkan ruangmu…</p></main>;

  return <main className="app-shell">
    <header className="topbar">
      <a className="brand" href="#home" aria-label="ALL PROJECT home"><span className="brand-mark">A<span>×</span></span><span>ALL×PROJECT <small>V8</small></span></a>
      <nav className="top-nav" aria-label="Main navigation"><a href="#spaces">Explore</a><a href="#ultra">ULTRA AI</a></nav>
      <div className="account-area">{user ? <><span className="user-chip"><i>{user.displayName.slice(0,1).toUpperCase()}</i><span>{user.displayName}<small>{user.role}</small></span></span><button className="quiet-button" onClick={signOut}>Sign out</button></> : <a className="quiet-button" href="#account">Sign in</a>}</div>
    </header>

    {!user ? <section className="welcome" id="home">
      <div className="welcome-copy"><div className="eyebrow"><span /> A MORE THOUGHTFUL DIGITAL SPACE</div><h1>Make room for<br /><em>what matters.</em></h1><p>One connected home for useful tools, new ideas and the things you do every day. Start with ULTRA, your multi-provider AI companion.</p><div className="welcome-points"><span>✦ Private by design</span><span>↗ Works across devices</span></div></div>
      <div className="auth-card" id="account"><div className="auth-card-top"><div><div className="eyebrow">YOUR SPACE STARTS HERE</div><h2>{authMode === "login" ? "Welcome back" : "Create your account"}</h2></div><div className="auth-symbol">A<span>×</span></div></div>
        <p className="auth-subtitle">{authMode === "login" ? "Sign in to pick up where you left off." : "A few details, then your space is ready."}</p>
        <form onSubmit={submitAuth} className="auth-form">
          {authMode === "register" && <><label>Display name<input name="displayName" autoComplete="name" minLength={2} maxLength={80} required placeholder="Your name" /></label><label>Username<input name="username" autoComplete="username" minLength={3} maxLength={24} pattern="[A-Za-z0-9_]+" required placeholder="your_handle" /></label></>}
          <label>Email address<input name="email" type="email" autoComplete="email" maxLength={254} required placeholder="you@example.com" /></label>
          <label>Password<input name="password" type="password" autoComplete={authMode === "login" ? "current-password" : "new-password"} minLength={authMode === "login" ? 1 : 12} maxLength={128} required placeholder={authMode === "login" ? "Your password" : "At least 12 characters"} /></label>
          {authError && <p className="form-error" role="alert">{authError}</p>}
          <button className="primary-button" disabled={authBusy}>{authBusy ? <><span className="spinner" /> Working…</> : authMode === "login" ? <>Sign in <span>→</span></> : <>Create account <span>→</span></>}</button>
        </form>
        <p className="auth-switch">{authMode === "login" ? "New to ALL×PROJECT?" : "Already have an account?"} <button onClick={() => { setAuthMode(authMode === "login" ? "register" : "login"); setAuthError(""); }}>{authMode === "login" ? "Create account" : "Sign in"}</button></p>
        <div className="auth-foot"><span>⌑</span> Your password is protected with modern password hashing.</div>
      </div>
    </section> : <section className="dashboard" id="home">
      <div className="dashboard-heading"><div><div className="eyebrow"><span /> YOUR PERSONAL WORKSPACE</div><h1>Good to have you,<br /><em>{user.displayName}.</em></h1><p>Your space is ready. What would you like to work on?</p></div><div className="date-card"><span>ACCOUNT</span><strong>{user.role}</strong><small>{user.email}</small></div></div>
      <div className="dashboard-stats"><div><span>AI PROVIDERS</span><strong>{configuredProviders.length}<small> / {providers.length || 6}</small></strong><i>{configuredProviders.length ? "Connected by server" : "Awaiting configuration"}</i></div><div><span>YOUR WORKSPACE</span><strong>01</strong><i>One place to get started</i></div><div><span>ACCOUNT SECURITY</span><strong>●</strong><i>Session protected</i></div></div>
    </section>}

    <section className="spaces" id="spaces"><div className="section-heading"><div><div className="eyebrow">A CONNECTED PLATFORM</div><h2>One home. Many possibilities.</h2></div><p>Capabilities come online as real services are integrated. No pretend connections—just a clear view of what is ready.</p></div>
      <div className="area-grid">{categories.map((item) => <article className={`area-card ${item.active ? "area-active" : ""}`} key={item.title}>
        <div className="card-top"><span className="area-icon">{item.icon}</span><span className={`pill ${item.active ? "" : "muted"}`}>{item.status}</span></div><h3>{item.title}</h3><p>{item.detail}</p><div className="card-foot"><span>{item.active ? <a href={item.href}>Open ULTRA <b aria-hidden="true">↗</b></a> : "Capability registry"}</span><span aria-hidden="true">{item.active ? "↗" : "· · ·"}</span></div>
      </article>)}</div>
    </section>

    <section className="ultra-section" id="ultra"><div className="ultra-heading"><div><div className="eyebrow"><span /> THE INTELLIGENCE LAYER</div><h2>Meet <em>ULTRA.</em></h2><p>One thoughtful interface. Multiple AI providers, configured securely on the server.</p></div><div className="provider-summary"><span className={configuredProviders.length ? "online-dot" : "offline-dot"} />{configuredProviders.length ? `${configuredProviders.length} provider${configuredProviders.length === 1 ? "" : "s"} ready` : "Providers not configured"}</div></div>
      <div className="ultra-card">
        <aside className="ultra-side"><div className="ultra-brand"><span>✳</span><div><strong>ULTRA</strong><small>AI WORKSPACE</small></div></div><div className="side-label">AVAILABLE PROVIDERS</div>{providers.length ? providers.map((item) => <div className="provider-row" key={item.id}><i className={item.configured ? "online-dot" : "offline-dot"} /><span>{item.id}</span><small>{item.configured ? "Ready" : "Not set"}</small></div>) : <div className="provider-row"><i className="offline-dot"/><span>Loading status</span></div>}<div className="privacy-note"><span>⌑</span><p>Provider secrets stay server-side. Your chat is private to your account.</p></div></aside>
        <div className="chat-panel"><div className="chat-header"><div><strong>New conversation</strong><small>{conversationId ? "Conversation saved to your account" : "Your ideas, with a little more intelligence"}</small></div><label className="provider-select-label">MODEL<select aria-label="Choose AI provider" value={provider} onChange={(event) => setProvider(event.target.value)}><option value="auto">Auto select</option>{providers.map((item) => <option key={item.id} value={item.id} disabled={!item.configured}>{item.id}{item.configured ? "" : " (not connected)"}</option>)}</select></label></div>
          <div className="messages" aria-live="polite">{chat.length === 0 && <div className="chat-empty"><div className="empty-orbit">✳</div><h3>What’s on your mind?</h3><p>Ask a question, explore an idea or get help with something you’re working on.</p><div className="suggestions"><button onClick={() => setMessage("Help me turn a big goal into a practical plan.")}>Help me make a plan <span>↗</span></button><button onClick={() => setMessage("Explain a complex idea in simple terms.")}>Explain something simply <span>↗</span></button></div></div>}
            {chat.map((item, index) => <article className={`message ${item.role}`} key={`${index}-${item.role}`}><div className="message-label">{item.role === "user" ? "YOU" : `ULTRA${item.provider ? ` · ${item.provider.toUpperCase()}` : ""}`}</div><div className="message-content">{item.content}</div>{item.role === "assistant" && <button className="copy-button" onClick={() => copyResponse(item.content)}>{copied ? "Copied" : "Copy response"}</button>}</article>)}
            {sending && <div className="thinking"><span className="spinner"/> ULTRA is thinking…</div>}<div ref={endRef}/>
          </div>
          {chatError && <div className="chat-error" role="alert">{chatError}<button onClick={() => setChatError("")}>Dismiss</button></div>}
          {!user ? <div className="chat-signin">Sign in or create an account to start a private ULTRA conversation. <a href="#account">Get started →</a></div> : <form className="composer" onSubmit={sendMessage}><textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={12_000} rows={2} aria-label="Message ULTRA" placeholder="Message ULTRA…" disabled={sending || configuredProviders.length === 0} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} /><button className="send-button" aria-label="Send message" disabled={sending || !message.trim() || configuredProviders.length === 0}>{sending ? <span className="spinner dark"/> : "↑"}</button><div className="composer-hint">Enter to send · Shift + Enter for a new line <span>{message.length}/12,000</span></div></form>}
        </div>
      </div>
      <p className="ai-disclaimer">AI responses can be inaccurate. Review important information before relying on it.</p>
    </section>
    <footer><span>ALL×PROJECT V8</span><span>Built with clarity. Designed to grow.</span><a href="/api/health">System status ↗</a></footer>
  </main>;
}
