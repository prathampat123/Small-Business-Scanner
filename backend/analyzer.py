import os
import re
import json
import httpx
import anthropic
from bs4 import BeautifulSoup
from dotenv import load_dotenv

load_dotenv()

client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])


def analyze_website(url: str) -> dict:
    if not url:
        return {"lead_status": "Hot Lead", "reason": "No website listed.", "signals": ["no_website"]}

    html, http_signals = _fetch_page(url)
    if html is None:
        return {"lead_status": "Hot Lead", "reason": "Website URL exists but page did not load.", "signals": ["broken_website"]}

    page_signals = _extract_signals(html)
    all_signals = {**http_signals, **page_signals}
    return _claude_score(url, html, all_signals)


def _fetch_page(url: str) -> tuple[str | None, dict]:
    try:
        with httpx.Client(timeout=10, follow_redirects=True) as client:
            response = client.get(url, headers={"User-Agent": "Mozilla/5.0"})
            signals = {
                "uses_https": url.startswith("https"),
                "last_modified": response.headers.get("last-modified", ""),
            }
            if response.status_code >= 400:
                return None, signals
            return response.text, signals
    except Exception:
        return None, {}


def _extract_signals(html: str) -> dict:
    soup = BeautifulSoup(html, "html.parser")
    text = soup.get_text(" ", strip=True)

    copyright_year = None
    match = re.search(r"©\s*(\d{4})|[Cc]opyright\s+(\d{4})", text)
    if match:
        copyright_year = int(match.group(1) or match.group(2))

    has_viewport = bool(soup.find("meta", attrs={"name": "viewport"}))
    generator = soup.find("meta", attrs={"name": "generator"})
    generator_content = generator["content"] if generator and generator.get("content") else ""

    return {
        "copyright_year": copyright_year,
        "has_mobile_viewport": has_viewport,
        "generator": generator_content,
    }


def _claude_score(url: str, html: str, signals: dict) -> dict:
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "head"]):
        tag.decompose()
    clean_text = soup.get_text(" ", strip=True)[:3000]

    prompt = f"""You are evaluating a small business website to determine if it is a good lead for a web design agency.

Website URL: {url}
Signals extracted:
- Uses HTTPS: {signals.get('uses_https')}
- Has mobile viewport tag: {signals.get('has_mobile_viewport')}
- Copyright year found: {signals.get('copyright_year')}
- CMS/generator meta: {signals.get('generator')}
- Last-Modified header: {signals.get('last_modified')}

Page content (truncated):
{clean_text}

Classify this website as one of:
- "Hot Lead": no working website, broken, or completely missing
- "Warm Lead": website exists but is outdated (old copyright, not mobile-friendly, old CMS, poor design signals)
- "Not a Lead": modern, functional, mobile-friendly website

Return JSON only:
{{"lead_status": "Hot Lead|Warm Lead|Not a Lead", "reason": "one sentence explanation", "signals": ["list", "of", "detected", "issues"]}}"""

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=256,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = message.content[0].text.strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if match:
            return json.loads(match.group())
        return {"lead_status": "Warm Lead", "reason": raw, "signals": []}
