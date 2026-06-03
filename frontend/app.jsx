// app.jsx — main dashboard app. Uses window.{fetchBusinesses,runScanAPI,generateProposalAPI,...}
const { useState, useEffect, useRef, useMemo } = React;

/* ---------- THEME / TWEAK DEFAULTS ---------- */
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "daylight",
  "accent": "#6366f1",
  "density": "comfortable",
  "colCat": true,
  "colPhone": true,
  "colAge": true,
  "colRating": true,
  "colReviews": true,
  "colSocials": true,
  "colScore": true
}/*EDITMODE-END*/;

/* ---------- SIDEBAR ---------- */
const NAV = [
  { id: "overview", label: "Overview", icon: "grid" },
  { id: "leads",    label: "Leads",    icon: "list" },
  { id: "map",      label: "Map",      icon: "map" },
  { id: "areas",    label: "Areas",    icon: "layers" },
];

function Sidebar({ view, setView, counts }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark"><window.Icon name="radar" size={18} /></div>
        <div className="brand-name">Prospector<span className="brand-sub">lead radar</span></div>
      </div>
      <nav className="nav">
        {NAV.map((n) => (
          <button key={n.id} className={"nav-item" + (view === n.id ? " active" : "")} onClick={() => setView(n.id)}>
            <window.Icon name={n.icon} size={17} />
            <span>{n.label}</span>
            {n.id === "leads" && <span className="nav-count">{counts.total}</span>}
          </button>
        ))}
      </nav>
      <div className="nav-spacer"></div>
      <div className="sidebar-card">
        <div className="sc-row"><span>Opportunities</span><strong>{counts.none + counts.outdated}</strong></div>
        <div className="sc-bar">
          <div style={{ width: (counts.total ? counts.none    / counts.total * 100 : 0) + "%", background: "var(--rose)" }}></div>
          <div style={{ width: (counts.total ? counts.outdated / counts.total * 100 : 0) + "%", background: "var(--amber)" }}></div>
          <div style={{ width: (counts.total ? counts.modern  / counts.total * 100 : 0) + "%", background: "var(--emerald)" }}></div>
        </div>
        <div className="sc-legend">{counts.none} no-site · {counts.outdated} outdated</div>
      </div>
      <button className="nav-item subtle"><window.Icon name="settings" size={17} /><span>Settings</span></button>
    </aside>
  );
}

/* ---------- TOPBAR ---------- */
function Topbar({ search, setSearch, onScan, area }) {
  return (
    <header className="topbar">
      <div className="tb-left">
        <div className="tb-area">
          <span className="tb-area-label">Active area</span>
          <button className="tb-area-pick">{area} <window.Icon name="chevronD" size={14} /></button>
        </div>
      </div>
      <div className="tb-search">
        <window.Icon name="search" size={16} />
        <input placeholder="Search businesses, categories, streets…" value={search} onChange={(e) => setSearch(e.target.value)} />
        {search && <button className="tb-clear" onClick={() => setSearch("")}><window.Icon name="x" size={13} /></button>}
      </div>
      <div className="tb-right">
        <button className="icon-btn"><window.Icon name="bell" size={17} /><span className="bell-dot"></span></button>
        <button className="btn-primary" onClick={onScan}><window.Icon name="radar" size={16} /> New scan</button>
      </div>
    </header>
  );
}

/* ---------- STATS ---------- */
function StatsRow({ counts }) {
  return (
    <div className="stats">
      <window.StatCard label="Total leads"      value={counts.total}    sub={`${window.AREAS.length || 0} areas scanned`} icon="layers"
        spark={[12, 14, 13, 18, 17, 22, counts.total || 26]} />
      <window.StatCard label="No website"       value={counts.none}     accent="var(--rose)"    icon="globeOff"
        sub={counts.total ? `${Math.round(counts.none / counts.total * 100)}% of leads` : "0%"} spark={[4, 5, 5, 7, 8, 9, counts.none || 11]} />
      <window.StatCard label="Outdated site"    value={counts.outdated} accent="var(--amber)"   icon="globe"
        sub="5+ yrs old" spark={[6, 6, 7, 7, 8, 8, counts.outdated || 9]} />
      <window.StatCard label="High opportunity" value={counts.hot}      accent="var(--accent)"  icon="arrowUp"
        sub="score ≥ 65" spark={[3, 5, 6, 8, 9, 12, counts.hot || 14]} />
      <window.StatCard label="Has website"      value={counts.modern}   icon="pin"
        sub="modern sites" spark={[2, 3, 3, 4, 4, 5, counts.modern || 5]} />
    </div>
  );
}

/* ---------- FILTER BAR ---------- */
const FILTERS = [
  { id: "all",      label: "All" },
  { id: "none",     label: "No website" },
  { id: "outdated", label: "Outdated" },
  { id: "modern",   label: "Has site" },
];

function FilterBar({ filter, setFilter, count, sort, setSort, counts }) {
  return (
    <div className="filterbar">
      <div className="chips">
        {FILTERS.map((f) => {
          const n = f.id === "all" ? counts.total : counts[f.id];
          return (
            <button key={f.id} className={"chip" + (filter === f.id ? " active" : "")} onClick={() => setFilter(f.id)}>
              {f.id !== "all" && <span className="chip-dot" style={{ background: window.STATUS[f.id]?.dot }}></span>}
              {f.label}<span className="chip-n">{n}</span>
            </button>
          );
        })}
      </div>
      <div className="fb-right">
        <span className="result-count">{count} shown</span>
        <div className="sort">
          <window.Icon name="filter" size={14} />
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="score">Opportunity</option>
            <option value="reviews"># Reviews</option>
            <option value="rating">Rating</option>
            <option value="name">Name A–Z</option>
          </select>
        </div>
        <button className="icon-btn ghost" title="Export CSV"><window.Icon name="download" size={16} /></button>
      </div>
    </div>
  );
}

/* ---------- TABLE ---------- */
function LeadTable({ leads, t, selectedId, hoverId, onSelect, onHover, contacted }) {
  const cols = t;
  return (
    <div className="table-wrap">
      <table className="lead-table">
        <thead>
          <tr>
            <th className="c-name">Business</th>
            <th className="c-status">Web presence</th>
            {cols.colCat     && <th>Category</th>}
            {cols.colAge     && <th className="c-num">Site age</th>}
            {cols.colRating  && <th className="c-num">Rating</th>}
            {cols.colReviews && <th className="c-num">Reviews</th>}
            {cols.colPhone   && <th>Phone</th>}
            {cols.colSocials && <th className="c-soc">Social</th>}
            {cols.colScore   && <th className="c-score">Opportunity</th>}
            <th className="c-act"></th>
          </tr>
        </thead>
        <tbody>
          {leads.map((l) => (
            <tr key={l.id}
                className={(selectedId === l.id ? "sel " : "") + (hoverId === l.id ? "hov " : "")}
                onClick={() => onSelect(l.id)}
                onMouseEnter={() => onHover(l.id)} onMouseLeave={() => onHover(null)}>
              <td className="c-name">
                <div className="cell-name">
                  <window.Avatar name={l.name} />
                  <div className="cn-text">
                    <span className="cn-title">{l.name}{contacted.has(l.id) && <span className="cn-contacted"><window.Icon name="check" size={11} /></span>}</span>
                    <span className="cn-addr">{l.addr}</span>
                  </div>
                </div>
              </td>
              <td className="c-status"><window.StatusBadge status={l.status} full /></td>
              {cols.colCat     && <td><span className="cat-tag">{l.cat}</span></td>}
              {cols.colAge     && <td className="c-num mono">{l.age == null ? <span className="dash">—</span> : l.age + "y"}</td>}
              {cols.colRating  && <td className="c-num"><span className="rating"><window.Icon name="star" size={12} style={{ color: "var(--amber)" }} />{l.rating}</span></td>}
              {cols.colReviews && <td className="c-num mono">{l.reviews}</td>}
              {cols.colPhone   && <td className="mono phone">{l.phone}</td>}
              {cols.colSocials && <td className="c-soc"><div className="socs"><span className={"soc" + (l.ig ? " on" : "")}>IG</span><span className={"soc" + (l.fb ? " on" : "")}>FB</span></div></td>}
              {cols.colScore   && <td className="c-score"><window.ScoreMeter value={l.score} /></td>}
              <td className="c-act"><window.Icon name="chevron" size={15} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      {leads.length === 0 && <div className="empty">No businesses match these filters.</div>}
    </div>
  );
}

/* ---------- LEAD DETAIL SLIDEOVER ---------- */
function LeadDetail({ lead, onClose, contacted, toggleContacted }) {
  const [proposal, setProposal]   = useState(null);
  const [proposing, setProposing] = useState(false);

  // Reset proposal when lead changes
  useEffect(() => { setProposal(null); }, [lead?.id]);

  if (!lead) return null;
  const s   = window.STATUS[lead.status];
  const isC = contacted.has(lead.id);

  async function handleProposal() {
    setProposing(true);
    try {
      const p = await window.generateProposalAPI(lead.id);
      setProposal(p);
    } catch (err) {
      alert("Proposal failed: " + err.message);
    } finally {
      setProposing(false);
    }
  }

  return (
    <>
      <div className="slideover-scrim" onClick={onClose}></div>
      <aside className="slideover">
        <div className="so-head">
          <button className="icon-btn ghost" onClick={onClose}><window.Icon name="x" size={18} /></button>
        </div>
        <div className="so-body">
          <div className="so-top">
            <window.Avatar name={lead.name} />
            <div>
              <h2>{lead.name}</h2>
              <div className="so-cat">{lead.cat} · {lead.addr}</div>
            </div>
          </div>
          <div className="so-status-row">
            <window.StatusBadge status={lead.status} full />
            <div className="so-score">
              <span>Opportunity</span>
              <strong style={{ color: lead.score >= 65 ? "var(--rose)" : "var(--text)" }}>{lead.score}</strong>
            </div>
          </div>

          <div className="so-grid">
            <div className="so-stat"><span>Rating</span><strong><window.Icon name="star" size={13} style={{ color: "var(--amber)" }} /> {lead.rating}</strong></div>
            <div className="so-stat"><span>Reviews</span><strong>{lead.reviews}</strong></div>
            <div className="so-stat"><span>Website</span><strong>{lead.status === "none" ? "None found" : lead.age != null ? lead.age + " yrs old" : "Outdated"}</strong></div>
            <div className="so-stat"><span>Phone</span><strong className="mono sm">{lead.phone || "—"}</strong></div>
          </div>

          <div className="so-section">
            <div className="so-label">Web presence</div>
            <div className="so-web">
              {lead.status === "none" ? (
                <div className="web-none"><window.Icon name="globeOff" size={18} /><div><strong>No website detected</strong><span>Strong candidate — relies on phone &amp; Google only.</span></div></div>
              ) : (
                <div className="web-has"><window.Icon name="globe" size={18} /><div><strong>{lead.status === "outdated" ? "Outdated website" : "Modern website"}</strong><span>{lead.website_url || "Website on file."}</span></div></div>
              )}
            </div>
          </div>

          <div className="so-section">
            <div className="so-label">Social presence</div>
            <div className="so-socials">
              <span className={"soc-pill" + (lead.ig ? " on" : "")}>Instagram {lead.ig ? "· active" : "· unknown"}</span>
              <span className={"soc-pill" + (lead.fb ? " on" : "")}>Facebook {lead.fb ? "· active" : "· unknown"}</span>
            </div>
          </div>

          {/* ── Website Proposal ── */}
          {proposal && (
            <div className="so-section">
              <div className="so-label">Website Proposal</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 13 }}>
                <div>
                  <div style={{ fontWeight: 700, color: "var(--text)", fontSize: 15, marginBottom: 3 }}>{proposal.headline}</div>
                  <div style={{ color: "var(--text-2)", fontStyle: "italic" }}>{proposal.tagline}</div>
                </div>
                <div style={{ color: "var(--text-2)", fontSize: 12 }}>{proposal.design_brief}</div>
                {proposal.sections && proposal.sections.length > 0 && (
                  <div>
                    <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", fontWeight: 600, marginBottom: 6 }}>Page sections</div>
                    <div style={{ color: "var(--text-2)", fontSize: 12 }}>
                      {(Array.isArray(proposal.sections) ? proposal.sections : proposal.sections.split(",")).join("  ·  ")}
                    </div>
                  </div>
                )}
                {proposal.selling_points && proposal.selling_points.length > 0 && (
                  <div>
                    <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", fontWeight: 600, marginBottom: 6 }}>Key selling points</div>
                    {(Array.isArray(proposal.selling_points) ? proposal.selling_points : [proposal.selling_points]).map((p, i) => (
                      <div key={i} style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 4 }}>· {p}</div>
                    ))}
                  </div>
                )}
                {proposal.seo_keywords && (
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>
                    <strong style={{ color: "var(--text-2)" }}>SEO: </strong>
                    {Array.isArray(proposal.seo_keywords) ? proposal.seo_keywords.join(", ") : proposal.seo_keywords}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="so-foot">
          <button className={"btn-contact" + (isC ? " done" : "")} onClick={() => toggleContacted(lead.id)}>
            <window.Icon name={isC ? "check" : "phone"} size={16} /> {isC ? "Marked contacted" : "Mark contacted"}
          </button>
          {lead.status !== "modern" && (
            <button className="btn-primary wide" onClick={handleProposal} disabled={proposing}
              style={{ opacity: proposing ? 0.7 : 1 }}>
              <window.Icon name={proposing ? "spark" : "external"} size={15} />
              {proposing ? "Generating…" : proposal ? "Regenerate" : "Generate Proposal"}
            </button>
          )}
        </div>
      </aside>
    </>
  );
}

/* ---------- SCAN MODAL ---------- */
const SCAN_CATS = ["Restaurants", "Retail", "Home services", "Auto", "Health", "Beauty", "Professional"];

function ScanModal({ open, onClose, onRun, scanning, progress, found }) {
  const [areaName, setAreaName] = useState("");
  const [radius, setRadius]     = useState(2);
  const [active, setActive]     = useState(new Set(["Restaurants", "Home services", "Auto", "Beauty"]));
  if (!open) return null;
  const toggle = (c) => { const n = new Set(active); n.has(c) ? n.delete(c) : n.add(c); setActive(n); };
  return (
    <div className="modal-scrim" onClick={!scanning ? onClose : undefined}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {!scanning ? (
          <>
            <div className="modal-head">
              <div><h3><window.Icon name="radar" size={18} /> New area scan</h3><p>Find businesses with weak or missing web presence.</p></div>
              <button className="icon-btn ghost" onClick={onClose}><window.Icon name="x" size={18} /></button>
            </div>
            <div className="modal-body">
              <label className="field">
                <span>Area or neighborhood</span>
                <div className="field-input"><window.Icon name="pin" size={15} /><input value={areaName} onChange={(e) => setAreaName(e.target.value)} placeholder="e.g. Austin TX, 78701, River Arts District" /></div>
              </label>
              <label className="field">
                <span>Search radius <strong className="mono">{radius.toFixed(1)} mi</strong></span>
                <input type="range" min="0.5" max="10" step="0.5" value={radius} onChange={(e) => setRadius(+e.target.value)} className="range" />
              </label>
              <div className="field">
                <span>Categories (informational)</span>
                <div className="cat-chips">
                  {SCAN_CATS.map((c) => (
                    <button key={c} className={"cat-chip" + (active.has(c) ? " on" : "")} onClick={() => toggle(c)}>
                      {active.has(c) && <window.Icon name="check" size={12} />}{c}
                    </button>
                  ))}
                </div>
              </div>
              <div className="scan-est"><window.Icon name="spark" size={14} /> Scan takes <strong>30–90 seconds</strong> · Claude scores each website with AI</div>
            </div>
            <div className="modal-foot">
              <button className="btn-ghost" onClick={onClose}>Cancel</button>
              <button className="btn-primary" onClick={() => { if (areaName.trim()) onRun(areaName.trim(), radius, active); }}>
                <window.Icon name="radar" size={16} /> Run scan
              </button>
            </div>
          </>
        ) : (
          <div className="scan-run">
            <div className="scan-radar">
              <div className="radar-ring"></div><div className="radar-ring d2"></div><div className="radar-ring d3"></div>
              <div className="radar-core"><window.Icon name="radar" size={26} /></div>
              <div className="radar-line"></div>
            </div>
            <div className="scan-found">{found}</div>
            <div className="scan-found-label">businesses discovered</div>
            <div className="scan-prog"><div className="scan-prog-fill" style={{ width: progress + "%" }}></div></div>
            <div className="scan-status">{progress < 60 ? "Fetching businesses from Google…" : progress < 100 ? "Scoring websites with Claude AI…" : "Scan complete"}</div>
            {progress >= 100 && (
              <button className="btn-primary wide" onClick={onClose}>
                <window.Icon name="check" size={16} /> View {found} results
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

window.Dash = { Sidebar, Topbar, StatsRow, FilterBar, LeadTable, LeadDetail, ScanModal };
