// map.jsx — real interactive map via Leaflet + CARTO tiles (no API key needed).
// Pins are status-colored divIcons; selection/hover sync both ways with the table.
const { useEffect: mE, useRef: mR } = React;

function tileUrlFor(theme) {
  const dark = theme !== "daylight";
  return dark
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
}
const TILE_OPTS = { maxZoom: 19, subdomains: "abcd", attribution: '© OpenStreetMap · © CARTO' };

const MapPanel = ({ leads, selectedId, hoverId, onSelect, onHover, droppingIds, scanning, scanArea, theme }) => {
  const elRef = mR(null);
  const mapRef = mR(null);
  const tileRef = mR(null);
  const markersRef = mR({});
  const didFit = mR(false);

  // init once
  mE(() => {
    const L = window.L;
    if (mapRef.current || !L || !elRef.current) return;
    const map = L.map(elRef.current, {
      zoomControl: false, scrollWheelZoom: true, doubleClickZoom: true, dragging: true,
      wheelPxPerZoomLevel: 90, wheelDebounceTime: 30, zoomSnap: 0.5,
    }).setView([35.578, -82.589], 14);
    map.attributionControl.setPrefix(false);
    mapRef.current = map;
    tileRef.current = L.tileLayer(tileUrlFor(theme), TILE_OPTS).addTo(map);
    setTimeout(() => map.invalidateSize(), 220);
  }, []);

  // swap tiles on theme change
  mE(() => {
    const map = mapRef.current, L = window.L;
    if (!map || !L) return;
    if (tileRef.current) map.removeLayer(tileRef.current);
    tileRef.current = L.tileLayer(tileUrlFor(theme), TILE_OPTS).addTo(map);
  }, [theme]);

  // sync markers with leads
  mE(() => {
    const map = mapRef.current, L = window.L;
    if (!map || !L) return;
    const seen = new Set();
    leads.forEach((l) => {
      seen.add(l.id);
      if (markersRef.current[l.id]) return;
      const drop = droppingIds && droppingIds.has(l.id);
      const icon = L.divIcon({
        className: "lpin lpin-" + l.status + (drop ? " drop" : ""),
        html: '<span class="lpin-inner"></span>',
        iconSize: [16, 16], iconAnchor: [8, 8],
      });
      const m = L.marker([l.lat, l.lng], { icon, riseOnHover: true }).addTo(map);
      const sLabel = window.STATUS[l.status].label;
      m.bindTooltip(
        `<b>${l.name}</b><span class="lt-meta">${sLabel} · score ${l.score}</span>`,
        { className: "lmap-tip", direction: "top", offset: [0, -10] }
      );
      m.on("click", () => onSelect(l.id));
      m.on("mouseover", () => onHover(l.id));
      m.on("mouseout", () => onHover(null));
      markersRef.current[l.id] = m;
    });
    Object.keys(markersRef.current).forEach((id) => {
      if (!seen.has(id)) { map.removeLayer(markersRef.current[id]); delete markersRef.current[id]; }
    });
    if (!didFit.current && leads.length) {
      map.fitBounds(L.latLngBounds(leads.map((l) => [l.lat, l.lng])), { padding: [42, 42] });
      didFit.current = true;
    }
  }, [leads, droppingIds]);

  // selection + hover styling
  mE(() => {
    Object.entries(markersRef.current).forEach(([id, m]) => {
      const el = m.getElement();
      if (!el) return;
      el.classList.toggle("sel", id === selectedId);
      el.classList.toggle("hov", id === hoverId);
      m.setZIndexOffset(id === selectedId ? 1000 : id === hoverId ? 500 : 0);
    });
  }, [selectedId, hoverId, leads]);

  // gently pan to a selected lead
  mE(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;
    const l = leads.find((x) => x.id === selectedId);
    if (l) map.panTo([l.lat, l.lng], { animate: true, duration: 0.4 });
  }, [selectedId]);

  const zoom = (d) => { const m = mapRef.current; if (m) d > 0 ? m.zoomIn() : m.zoomOut(); };

  return (
    <div className="map">
      <div ref={elRef} className="map-leaflet"></div>

      <div className="map-head">
        <div className="map-area"><window.Icon name="pin" size={14} /> {scanArea || "West Asheville"}</div>
        <div className="map-zoom">
          <button onClick={() => zoom(1)} aria-label="Zoom in">+</button>
          <button onClick={() => zoom(-1)} aria-label="Zoom out">−</button>
        </div>
      </div>

      {scanning && (
        <div className="map-scan-overlay">
          <div className="scan-ripple"></div><div className="scan-ripple d2"></div>
        </div>
      )}

      <div className="map-legend">
        {Object.entries(window.STATUS).map(([k, v]) => (
          <div key={k} className="leg-item"><span className="leg-dot" style={{ background: v.dot }}></span>{v.label}</div>
        ))}
      </div>

      {scanning && <div className="map-scanning"><span className="scan-dot"></span> Scanning area…</div>}
    </div>
  );
};

window.MapPanel = MapPanel;
