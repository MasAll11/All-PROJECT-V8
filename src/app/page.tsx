const areas = [
  { number: "01", name: "ULTRA AI", detail: "Multi-provider assistant, routing and chat history", state: "INTEGRATION FOUNDATION" },
  { number: "02", name: "Workspace", detail: "Files, notes, search and everyday tools", state: "PLANNED" },
  { number: "03", name: "Learn & grow", detail: "Learning, health and personal progress", state: "PLANNED" },
  { number: "04", name: "People & community", detail: "Member profiles, roles and notifications", state: "PLANNED" },
];

export default function Home() {
  return (
    <main className="shell">
      <header className="topbar">
        <a className="brand" href="#home" aria-label="ALL PROJECT home"><span className="brand-mark">A<span>×</span></span><span>ALL×PROJECT <small>V8</small></span></a>
        <a className="status-link" href="/api/health"><i aria-hidden="true" /> Platform status</a>
      </header>
      <section className="hero" id="home">
        <div className="hero-copy">
          <div className="eyebrow"><span /> YOUR DIGITAL SPACE, CONNECTED</div>
          <h1>Everything you need.<br /><em>One thoughtful space.</em></h1>
          <p className="intro">A growing home for intelligence, learning and the tools you use every day. Built with privacy, clarity and real integrations at its core.</p>
          <a className="primary-link" href="#spaces">Explore the platform <span aria-hidden="true">↘</span></a>
          <div className="trust-note"><span aria-hidden="true">✳</span> Integrations are shown honestly—no pretend connections.</div>
        </div>
        <div className="hero-art" aria-label="Abstract orbital illustration" role="img">
          <div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="orbit orbit-three" />
          <div className="core"><span>ALL</span><b>×</b><span>ONE</span></div>
          <span className="satellite sat-a">✳</span><span className="satellite sat-b">✦</span><span className="satellite sat-c">◌</span>
          <div className="art-caption">A universe of useful things<br /><span>connected around you</span></div>
        </div>
      </section>
      <section className="spaces" id="spaces">
        <div className="section-heading"><div><div className="eyebrow">A PLATFORM IN THE MAKING</div><h2>One home. Many possibilities.</h2></div><p>Clear foundations first. Each capability connects to real services as it comes online.</p></div>
        <div className="area-grid">{areas.map((area) => <article className="area-card" key={area.number}>
          <div className="card-top"><span>{area.number}</span><span className={area.state === "PLANNED" ? "pill muted" : "pill"}>{area.state}</span></div>
          <h3>{area.name}</h3><p>{area.detail}</p><div className="card-foot"><span>Capability</span><span aria-hidden="true">↗</span></div>
        </article>)}</div>
      </section>
      <footer><span>ALL×PROJECT V8</span><span>Made to grow—with you.</span><a href="/api/health">System status ↗</a></footer>
    </main>
  );
}
