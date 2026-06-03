// ui.jsx — shared UI primitives. Exposes to window.
// Icons are simple stroke SVGs (no complex hand-drawn art).

const Icon = ({ name, size = 16, style }) => {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none",
    stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", style };
  const paths = {
    grid:     <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
    list:     <><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="3.5" cy="6" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="18" r="1"/></>,
    map:      <><polygon points="9 4 3 7 3 20 9 17 15 20 21 17 21 4 15 7 9 4"/><line x1="9" y1="4" x2="9" y2="17"/><line x1="15" y1="7" x2="15" y2="20"/></>,
    layers:   <><polygon points="12 3 21 8 12 13 3 8 12 3"/><polyline points="3 13 12 18 21 13"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.3l2-1.5-2-3.4-2.3 1a7 7 0 0 0-2.3-1.3l-.3-2.5h-4l-.3 2.5a7 7 0 0 0-2.3 1.3l-2.3-1-2 3.4 2 1.5A7 7 0 0 0 5 12a7 7 0 0 0 .1 1.3l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 2.3 1.3l.3 2.5h4l.3-2.5a7 7 0 0 0 2.3-1.3l2.3 1 2-3.4-2-1.5A7 7 0 0 0 19 12Z"/></>,
    search:   <><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.5" y2="16.5"/></>,
    plus:     <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    pin:      <><path d="M12 21s-6-5.3-6-10a6 6 0 0 1 12 0c0 4.7-6 10-6 10Z"/><circle cx="12" cy="11" r="2"/></>,
    globe:    <><circle cx="12" cy="12" r="9"/><line x1="3" y1="12" x2="21" y2="12"/><path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18Z"/></>,
    globeOff: <><circle cx="12" cy="12" r="9"/><line x1="4" y1="4" x2="20" y2="20"/></>,
    phone:    <><path d="M5 4h3l2 5-2.5 1.5a11 11 0 0 0 5 5L19 13l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2Z" transform="translate(-1 0)"/></>,
    star:     <><polygon points="12 3 14.6 8.6 21 9.3 16.5 13.6 17.7 20 12 16.8 6.3 20 7.5 13.6 3 9.3 9.4 8.6 12 3"/></>,
    x:        <><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></>,
    chevron:  <><polyline points="9 6 15 12 9 18"/></>,
    chevronD: <><polyline points="6 9 12 15 18 9"/></>,
    bell:     <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></>,
    filter:   <><polygon points="22 3 2 3 10 12.5 10 19 14 21 14 12.5 22 3"/></>,
    radar:    <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4"/><line x1="12" y1="12" x2="19" y2="6"/></>,
    external: <><path d="M14 4h6v6"/><line x1="20" y1="4" x2="10" y2="14"/><path d="M19 14v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></>,
    check:    <><polyline points="4 12 10 18 20 5"/></>,
    arrowUp:  <><line x1="12" y1="19" x2="12" y2="5"/><polyline points="6 11 12 5 18 11"/></>,
    spark:    <><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2 2M16.4 16.4l2 2M18.4 5.6l-2 2M7.6 16.4l-2 2"/></>,
    download: <><path d="M12 3v12"/><polyline points="7 11 12 16 17 11"/><path d="M4 20h16"/></>,
  };
  return <svg {...p}>{paths[name] || null}</svg>;
};

const STATUS = {
  none:     { label: "No website",  short: "No site",  color: "var(--rose)",   bg: "var(--rose-bg)",   dot: "var(--rose)" },
  outdated: { label: "Outdated",    short: "Outdated", color: "var(--amber)",  bg: "var(--amber-bg)",  dot: "var(--amber)" },
  modern:   { label: "Modern site", short: "Has site", color: "var(--emerald)",bg: "var(--emerald-bg)",dot: "var(--emerald)" },
};

const StatusBadge = ({ status, full }) => {
  const s = STATUS[status];
  return (
    <span className="badge" style={{ color: s.color, background: s.bg }}>
      <span className="badge-dot" style={{ background: s.dot }}></span>
      {full ? s.label : s.short}
    </span>
  );
};

// small opportunity meter
const ScoreMeter = ({ value }) => {
  const hue = value >= 65 ? "var(--rose)" : value >= 40 ? "var(--amber)" : "var(--muted)";
  return (
    <div className="score">
      <div className="score-bar"><div className="score-fill" style={{ width: value + "%", background: hue }}></div></div>
      <span className="score-num" style={{ color: value >= 65 ? "var(--rose)" : "var(--text)" }}>{value}</span>
    </div>
  );
};

const StatCard = ({ label, value, sub, accent, spark, icon }) => (
  <div className="stat-card">
    <div className="stat-top">
      <span className="stat-label">{label}</span>
      {icon && <span className="stat-ico" style={{ color: accent }}><Icon name={icon} size={15} /></span>}
    </div>
    <div className="stat-value" style={accent ? { color: accent } : null}>{value}</div>
    <div className="stat-sub">{sub}</div>
    {spark && <Sparkline points={spark} accent={accent} />}
  </div>
);

const Sparkline = ({ points, accent }) => {
  const w = 120, h = 26, max = Math.max(...points), min = Math.min(...points);
  const span = max - min || 1;
  const d = points.map((p, i) => {
    const x = (i / (points.length - 1)) * w;
    const y = h - ((p - min) / span) * (h - 4) - 2;
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");
  return (
    <svg className="spark" width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <path d={d} fill="none" stroke={accent || "var(--accent)"} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
    </svg>
  );
};

const Avatar = ({ name }) => {
  const initials = name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  let hash = 0; for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return <span className="avatar" style={{ background: `oklch(0.62 0.11 ${hue} / 0.18)`, color: `oklch(0.78 0.12 ${hue})` }}>{initials}</span>;
};

Object.assign(window, { Icon, STATUS, StatusBadge, ScoreMeter, StatCard, Sparkline, Avatar });
