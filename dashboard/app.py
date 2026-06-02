import os
import requests
import pandas as pd
import pydeck as pdk
import streamlit as st
from dotenv import load_dotenv

load_dotenv()

API_BASE = "http://localhost:8000"
MAPBOX_TOKEN = os.environ.get("MAPBOX_TOKEN", "")

LEAD_COLORS = {
    "Hot Lead":    [220, 53,  69,  200],
    "Warm Lead":   [255, 193, 7,   200],
    "Not a Lead":  [40,  167, 69,  200],
}

st.set_page_config(page_title="Small Business Scanner", layout="wide")
st.title("Small Business Scanner")

# ── Sidebar: run a scan ──────────────────────────────────────────────────────
with st.sidebar:
    st.header("Run a Scan")
    location = st.text_input("Location", placeholder="e.g. Austin, TX")
    radius   = st.slider("Radius (miles)", 1, 25, 5)
    max_res  = st.slider("Max results", 5, 20, 20)

    if st.button("Scan", type="primary", use_container_width=True):
        if not location:
            st.error("Enter a location first.")
        else:
            with st.spinner("Scanning..."):
                try:
                    resp = requests.post(f"{API_BASE}/scan", json={
                        "location": location,
                        "radius_miles": radius,
                        "max_results": max_res,
                    }, timeout=120)
                    resp.raise_for_status()
                    data = resp.json()
                    st.success(f"Found {data['total']} businesses.")
                    st.session_state["last_scan_id"] = data["scan_id"]
                except Exception as e:
                    st.error(f"Scan failed: {e}")

    st.divider()
    st.header("Filter")
    status_filter = st.selectbox(
        "Lead Status",
        ["All", "Hot Lead", "Warm Lead", "Not a Lead"],
    )

# ── Load businesses ───────────────────────────────────────────────────────────
params = {}
if status_filter != "All":
    params["lead_status"] = status_filter

try:
    resp = requests.get(f"{API_BASE}/businesses", params=params, timeout=15)
    resp.raise_for_status()
    businesses = resp.json()
except Exception:
    businesses = []

# ── Map ───────────────────────────────────────────────────────────────────────
if businesses:
    df = pd.DataFrame(businesses)
    df["color"] = df["Lead Status"].map(lambda s: LEAD_COLORS.get(s, [128, 128, 128, 200]))
    df["lat_col"] = pd.to_numeric(df.get("Lat", 0), errors="coerce").fillna(0)
    df["lng_col"] = pd.to_numeric(df.get("Lng", 0), errors="coerce").fillna(0)

    layer = pdk.Layer(
        "ScatterplotLayer",
        data=df,
        get_position="[lng_col, lat_col]",
        get_color="color",
        get_radius=80,
        pickable=True,
    )

    center_lat = df["lat_col"].mean()
    center_lng = df["lng_col"].mean()

    view = pdk.ViewState(
        latitude=center_lat,
        longitude=center_lng,
        zoom=12,
        pitch=0,
    )

    tooltip = {
        "html": "<b>{Name}</b><br/>{Lead Status}<br/>{Address}",
        "style": {"backgroundColor": "#1e1e1e", "color": "white", "fontSize": "13px"},
    }

    st.pydeck_chart(pdk.Deck(
        layers=[layer],
        initial_view_state=view,
        map_style="mapbox://styles/mapbox/streets-v12",
        api_keys={"mapbox": MAPBOX_TOKEN},
        tooltip=tooltip,
    ))

    # ── Legend ────────────────────────────────────────────────────────────────
    col1, col2, col3 = st.columns(3)
    col1.metric("Hot Leads",   len(df[df["Lead Status"] == "Hot Lead"]))
    col2.metric("Warm Leads",  len(df[df["Lead Status"] == "Warm Lead"]))
    col3.metric("Not a Lead",  len(df[df["Lead Status"] == "Not a Lead"]))

    st.divider()

    # ── Business table ────────────────────────────────────────────────────────
    st.subheader("Businesses")
    display_cols = ["Name", "Lead Status", "Category", "Rating", "Review Count", "Address", "Website URL"]
    available = [c for c in display_cols if c in df.columns]
    st.dataframe(df[available], use_container_width=True, hide_index=True)

    # ── Proposal generator ────────────────────────────────────────────────────
    st.divider()
    st.subheader("Generate Website Proposal")

    leads_df = df[df["Lead Status"].isin(["Hot Lead", "Warm Lead"])]
    if leads_df.empty:
        st.info("No hot or warm leads to generate proposals for.")
    else:
        options = {row["Name"]: row["id"] for _, row in leads_df.iterrows()}
        selected_name = st.selectbox("Select a business", list(options.keys()))
        selected_id   = options[selected_name]

        if st.button("Generate Proposal", type="primary"):
            with st.spinner("Claude is writing the proposal..."):
                try:
                    resp = requests.post(f"{API_BASE}/propose/{selected_id}", timeout=60)
                    resp.raise_for_status()
                    p = resp.json()

                    st.success("Proposal ready!")
                    st.markdown(f"### {p.get('headline', '')}")
                    st.markdown(f"*{p.get('tagline', '')}*")
                    st.divider()

                    col_a, col_b = st.columns(2)
                    with col_a:
                        st.markdown("**Design Brief**")
                        st.write(p.get("design_brief", ""))
                        st.markdown("**Suggested Sections**")
                        for s in p.get("sections", []):
                            st.markdown(f"- {s}")

                    with col_b:
                        st.markdown("**Key Selling Points**")
                        for sp in p.get("selling_points", []):
                            st.markdown(f"- {sp}")
                        st.markdown("**SEO Keywords**")
                        st.write(", ".join(p.get("seo_keywords", [])))

                except Exception as e:
                    st.error(f"Proposal failed: {e}")
else:
    st.info("No businesses loaded. Run a scan from the sidebar to get started.")
