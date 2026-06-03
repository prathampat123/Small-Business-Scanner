// data.jsx — API integration. Replaces mock data with real FastAPI backend calls.

const API_BASE = "";  // same origin — served by FastAPI on port 8000

// Lead status mapping: backend → dashboard
const STATUS_MAP = {
  "Hot Lead":   "none",
  "Warm Lead":  "outdated",
  "Not a Lead": "modern",
};

// Opportunity score: no website = highest, outdated = medium, modern = low
function scoreLead(l) {
  let s = 0;
  if (l.status === "none")          s = 70;
  else if (l.status === "outdated") s = 45 + Math.min(15, (l.age || 0));
  else                              s = 8;
  s += Math.min(14, (l.reviews || 0) / 45);
  s += ((l.rating || 4.3) - 4.3) * 12;
  if (l.ig || l.fb) s += 4;
  return Math.max(2, Math.min(99, Math.round(s)));
}

// Convert an API business record into the shape the dashboard expects
function mapApiLead(b) {
  const name    = b.Name     || b.name     || "";
  const cat     = b.Category || b.category || "Business";
  const addr    = b.Address  || b.address  || "";
  const phone   = b.Phone    || b.phone    || "";
  const rating  = parseFloat(b.Rating      || b.rating  || 4.0);
  const reviews = parseInt(b["Review Count"] || b.review_count || 0, 10);
  const rawStatus = b["Lead Status"] || b.lead_status || "Hot Lead";
  const status  = STATUS_MAP[rawStatus] || "none";
  const lat     = parseFloat(b.Lat || b.lat || 0);
  const lng     = parseFloat(b.Lng || b.lng || 0);

  return {
    id:      b.id || String(Math.random()),
    name, cat, addr, phone,
    status,
    age:     null,
    rating,  reviews,
    ig: false, fb: false,
    lat, lng,
    score:   scoreLead({ status, reviews, rating, ig: false, fb: false, age: null }),
    website_url:     b["Website URL"] || b.website_url || "",
    lead_status_raw: rawStatus,
  };
}

// ── API helpers ──────────────────────────────────────────────────────────────

async function fetchBusinesses(params = {}) {
  const q = new URLSearchParams(params).toString();
  const r = await fetch(`${API_BASE}/businesses${q ? "?" + q : ""}`);
  if (!r.ok) throw new Error("Failed to load businesses");
  const data = await r.json();
  return data.map(mapApiLead);
}

async function runScanAPI(location, radiusMiles, maxResults = 20) {
  const r = await fetch(`${API_BASE}/scan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ location, radius_miles: radiusMiles, max_results: maxResults }),
  });
  if (!r.ok) throw new Error("Scan failed — check your API keys and try again");
  const data = await r.json();
  return (data.businesses || []).map(mapApiLead);
}

async function generateProposalAPI(businessId) {
  const r = await fetch(`${API_BASE}/propose/${businessId}`, { method: "POST" });
  if (!r.ok) throw new Error("Proposal generation failed");
  return r.json();
}

async function fetchScans() {
  const r = await fetch(`${API_BASE}/scans`);
  if (!r.ok) return [];
  return r.json();
}

// Placeholder AREAS — populated from scan history at runtime
const AREAS = [];

Object.assign(window, {
  scoreLead, mapApiLead,
  fetchBusinesses, runScanAPI, generateProposalAPI, fetchScans,
  AREAS,
});
