// main.jsx — root App: state, real API scan, tweaks, render
const { useState: uS, useEffect: uE, useRef: uR, useMemo: uM } = React;

function App() {
  const [t, setTweak] = window.useTweaks(TWEAK_DEFAULTS);
  const [view, setView]           = uS("overview");
  const [leads, setLeads]         = uS([]);
  const [loading, setLoading]     = uS(true);
  const [selectedId, setSelectedId] = uS(null);
  const [hoverId, setHoverId]     = uS(null);
  const [filter, setFilter]       = uS("all");
  const [search, setSearch]       = uS("");
  const [sort, setSort]           = uS("score");
  const [contacted, setContacted] = uS(() => new Set());
  const [scanOpen, setScanOpen]   = uS(false);
  const [scanning, setScanning]   = uS(false);
  const [progress, setProgress]   = uS(0);
  const [found, setFound]         = uS(0);
  const [area, setArea]           = uS("");
  const [droppingIds, setDroppingIds] = uS(() => new Set());
  const timers    = uR([]);
  const fakeTimer = uR(null);

  // Load existing businesses from Airtable on mount
  uE(() => {
    window.fetchBusinesses()
      .then((data) => { setLeads(data); if (data.length) setArea("Last scan"); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const counts = uM(() => {
    const c = { total: leads.length, none: 0, outdated: 0, modern: 0, hot: 0 };
    leads.forEach((l) => { c[l.status]++; if (l.score >= 65) c.hot++; });
    return c;
  }, [leads]);

  const visible = uM(() => {
    let r = leads.slice();
    if (filter !== "all") r = r.filter((l) => l.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter((l) => (l.name + l.cat + l.addr).toLowerCase().includes(q));
    }
    const sorters = {
      score:   (a, b) => b.score - a.score,
      reviews: (a, b) => b.reviews - a.reviews,
      rating:  (a, b) => b.rating - a.rating,
      name:    (a, b) => a.name.localeCompare(b.name),
    };
    return r.sort(sorters[sort]);
  }, [leads, filter, search, sort]);

  const selected = uM(() => leads.find((l) => l.id === selectedId) || null, [leads, selectedId]);

  function toggleContacted(id) {
    setContacted((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  async function runScan(name, radius, cats) {
    // Clear any running timers
    timers.current.forEach(clearTimeout);
    timers.current = [];
    if (fakeTimer.current) { clearInterval(fakeTimer.current); fakeTimer.current = null; }

    setArea(name);
    setLeads([]);
    setScanning(true);
    setProgress(5);
    setFound(0);

    // Slowly animate progress to ~50% while the real API call runs
    let fakeP = 5;
    fakeTimer.current = setInterval(() => {
      fakeP = Math.min(50, fakeP + Math.random() * 3);
      setProgress(Math.round(fakeP));
    }, 800);

    try {
      const results = await window.runScanAPI(name, radius, cats);

      // Stop fake progress
      clearInterval(fakeTimer.current);
      fakeTimer.current = null;

      if (results.length === 0) {
        setProgress(100);
        setTimeout(() => setScanning(false), 400);
        return;
      }

      // Drip results in one by one with drop animation
      const step = Math.max(180, 2200 / results.length);
      results.forEach((lead, i) => {
        const tm = setTimeout(() => {
          setLeads((prev) => prev.some((x) => x.id === lead.id) ? prev : [...prev, lead]);
          setDroppingIds((prev) => { const n = new Set(prev); n.add(lead.id); return n; });
          setFound(i + 1);
          setProgress(Math.round(((i + 1) / results.length) * 100));
          const clr = setTimeout(() => {
            setDroppingIds((prev) => { const n = new Set(prev); n.delete(lead.id); return n; });
          }, 700);
          timers.current.push(clr);
        }, i * step);
        timers.current.push(tm);
      });

      const done = setTimeout(() => setScanning(false), results.length * step + 400);
      timers.current.push(done);
    } catch (err) {
      clearInterval(fakeTimer.current);
      fakeTimer.current = null;
      setScanning(false);
      alert("Scan failed: " + err.message);
    }
  }

  uE(() => () => {
    timers.current.forEach(clearTimeout);
    if (fakeTimer.current) clearInterval(fakeTimer.current);
  }, []);

  uE(() => {
    const onKey = (e) => {
      if (e.key === "Escape") { setSelectedId(null); if (!scanning) setScanOpen(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [scanning]);

  const accentStyle = { "--accent": t.accent, "--accent-2": t.accent, "--accent-bg": hexA(t.accent, 0.15) };

  return (
    <div className={`app theme-${t.theme} density-${t.density}`} style={accentStyle}>
      <div className="main">
        <window.Dash.Topbar search={search} setSearch={setSearch} onScan={() => setScanOpen(true)} area={area || "No scans yet"} />
        <div className="content">
          <div className="content-head">
            <div>
              <h1>{view === "overview" ? "Scan overview" : view === "leads" ? "All leads" : view === "map" ? "Coverage map" : "Areas"}</h1>
              <p className="content-sub">
                {loading
                  ? "Loading…"
                  : area
                    ? <>Last scanned <strong>{area}</strong> · {counts.total} businesses found</>
                    : "Run a scan to find leads in your area"}
              </p>
            </div>
          </div>

          <window.Dash.StatsRow counts={counts} />

          <div className="workspace">
            <div className="map-col">
              <window.MapPanel leads={leads} selectedId={selectedId} hoverId={hoverId}
                onSelect={setSelectedId} onHover={setHoverId} droppingIds={droppingIds}
                scanning={scanning} scanArea={area} theme={t.theme} />
              <div className="area-list">
                <div className="al-head">Lead breakdown</div>
                {counts.total === 0 ? (
                  <div style={{ padding: "14px 10px", fontSize: 12, color: "var(--muted)" }}>
                    Run a scan to see results here.
                  </div>
                ) : (
                  [
                    { label: "No website",  n: counts.none,     color: "var(--rose)" },
                    { label: "Outdated",    n: counts.outdated, color: "var(--amber)" },
                    { label: "Has website", n: counts.modern,   color: "var(--emerald)" },
                  ].map((row) => (
                    <button key={row.label} className="al-item">
                      <div className="al-name">
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: row.color, display: "inline-block" }} />
                        {row.label}
                        <span className="al-when">{row.n} businesses</span>
                      </div>
                      <div className="al-meta">
                        <span className="al-leads">{counts.total ? Math.round(row.n / counts.total * 100) : 0}%</span>
                        <div className="al-cov"><div style={{ width: (counts.total ? row.n / counts.total * 100 : 0) + "%", background: row.color }}></div></div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="table-col">
              <window.Dash.FilterBar filter={filter} setFilter={setFilter} count={visible.length}
                sort={sort} setSort={setSort} counts={counts} />
              <window.Dash.LeadTable leads={visible} t={t} selectedId={selectedId} hoverId={hoverId}
                onSelect={setSelectedId} onHover={setHoverId} contacted={contacted} />
            </div>
          </div>
        </div>
      </div>

      <window.Dash.LeadDetail lead={selected} onClose={() => setSelectedId(null)}
        contacted={contacted} toggleContacted={toggleContacted} />
      <window.Dash.ScanModal open={scanOpen} onClose={() => setScanOpen(false)}
        onRun={runScan} scanning={scanning} progress={progress} found={found} />

      <window.TweaksPanel>
        <window.TweakSection label="Theme" />
        <window.TweakRadio label="Direction" value={t.theme} options={["midnight", "daylight", "carbon"]} onChange={(v) => setTweak("theme", v)} />
        <window.TweakColor label="Accent" value={t.accent} options={["#6366f1", "#0ea5e9", "#10b981", "#f43f5e", "#f59e0b"]} onChange={(v) => setTweak("accent", v)} />
        <window.TweakSection label="Layout" />
        <window.TweakRadio label="Density" value={t.density} options={["comfortable", "compact"]} onChange={(v) => setTweak("density", v)} />
        <window.TweakSection label="Columns" />
        <window.TweakToggle label="Category"         value={t.colCat}     onChange={(v) => setTweak("colCat", v)} />
        <window.TweakToggle label="Site age"         value={t.colAge}     onChange={(v) => setTweak("colAge", v)} />
        <window.TweakToggle label="Rating"           value={t.colRating}  onChange={(v) => setTweak("colRating", v)} />
        <window.TweakToggle label="Reviews"          value={t.colReviews} onChange={(v) => setTweak("colReviews", v)} />
        <window.TweakToggle label="Phone"            value={t.colPhone}   onChange={(v) => setTweak("colPhone", v)} />
        <window.TweakToggle label="Social"           value={t.colSocials} onChange={(v) => setTweak("colSocials", v)} />
        <window.TweakToggle label="Opportunity score" value={t.colScore}  onChange={(v) => setTweak("colScore", v)} />
      </window.TweaksPanel>
    </div>
  );
}

function hexA(hex, a) {
  const m = hex.replace("#", "");
  const r = parseInt(m.substring(0, 2), 16), g = parseInt(m.substring(2, 4), 16), b = parseInt(m.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
