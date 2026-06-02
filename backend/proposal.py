import os
import json
import re
import anthropic
from dotenv import load_dotenv

load_dotenv()

client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])


def generate_proposal(business: dict) -> dict:
    reviews_text = "\n".join(
        f"- {r}" for r in business.get("reviews", [])[:10] if r
    ) or "No reviews available."

    prompt = f"""You are a professional web designer creating a website proposal for a small business.

Business Details:
- Name: {business['name']}
- Category: {business['category']}
- Address: {business['address']}
- Phone: {business['phone']}
- Rating: {business['rating']} stars ({business['review_count']} reviews)
- Current website: {business.get('website_url') or 'None'}

Customer Reviews (verbatim):
{reviews_text}

Create a compelling website proposal. Return JSON only:
{{
  "design_brief": "2-3 sentences on tone, style, and color palette direction",
  "sections": ["list", "of", "recommended", "page", "sections"],
  "headline": "punchy hero headline for their homepage",
  "tagline": "short supporting tagline under the headline",
  "selling_points": ["3-5 key selling points extracted from the reviews"],
  "seo_keywords": ["5-8 local SEO keywords for this business type and city"]
}}"""

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = message.content[0].text.strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if match:
            return json.loads(match.group())
        return {"error": "Could not parse proposal", "raw": raw}
