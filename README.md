# Small Business Website Scanner

Scan any geographic area to find small businesses, score their website quality, and generate AI-powered website proposals using Claude.

## Features
- Search businesses within a radius of any location
- Automatically detect missing or outdated websites
- Pull reviews, ratings, categories, and addresses
- Generate website proposals using Claude AI
- Interactive dashboard with map and lead management

## Stack
- **Backend:** Python + FastAPI
- **Dashboard:** Streamlit
- **AI:** Claude API (claude-sonnet-4-6)
- **Data:** Google Places API + SQLite

## Setup

### Prerequisites
- Python 3.10+
- Google Places API key
- Anthropic API key

### Installation
```bash
pip install -r requirements.txt
```

### Environment Variables
Copy `.env.example` to `.env` and fill in your keys:
```
GOOGLE_PLACES_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here
```

### Run
```bash
# Start the dashboard
streamlit run dashboard/app.py
```
