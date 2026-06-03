import os
import httpx
from dotenv import load_dotenv

load_dotenv()

PLACES_API_URL = "https://places.googleapis.com/v1/places:searchNearby"
FIELD_MASK = ",".join([
    "places.displayName",
    "places.formattedAddress",
    "places.websiteUri",
    "places.rating",
    "places.userRatingCount",
    "places.types",
    "places.nationalPhoneNumber",
    "places.reviews",
    "places.location",
])


# Maps user-friendly category labels to Google Places API types
CATEGORY_TYPES = {
    "restaurants":   ["restaurant", "cafe", "bakery", "bar", "meal_takeaway"],
    "retail":        ["clothing_store", "shoe_store", "jewelry_store", "home_goods_store", "furniture_store", "book_store", "gift_shop"],
    "contractors":   ["general_contractor", "plumber", "electrician", "roofing_contractor", "painter"],
    "real_estate":   ["real_estate_agency"],
    "law_firms":     ["lawyer"],
    "finance":       ["accounting", "insurance_agency", "finance"],
    "health":        ["doctor", "dentist", "physiotherapist", "optician", "pharmacy"],
    "beauty":        ["hair_care", "beauty_salon", "spa", "nail_salon", "barber_shop"],
    "auto":          ["car_repair", "car_dealer", "car_wash"],
    "home_services": ["locksmith", "moving_company", "storage"],
}


def search_businesses(lat: float, lng: float, radius_miles: float, max_results: int = 20, category: str = "") -> list[dict]:
    radius_meters = radius_miles * 1609.34
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": os.environ["GOOGLE_PLACES_API_KEY"],
        "X-Goog-FieldMask": FIELD_MASK,
    }
    body = {
        "locationRestriction": {
            "circle": {
                "center": {"latitude": lat, "longitude": lng},
                "radius": radius_meters,
            }
        },
        "maxResultCount": min(max_results, 20),
    }
    if category and category in CATEGORY_TYPES:
        body["includedTypes"] = CATEGORY_TYPES[category]

    with httpx.Client(timeout=15) as client:
        response = client.post(PLACES_API_URL, json=body, headers=headers)
        response.raise_for_status()

    places = response.json().get("places", [])
    return [_parse_place(p) for p in places]


def geocode_location(query: str) -> tuple[float, float]:
    url = "https://nominatim.openstreetmap.org/search"
    params = {"q": query, "format": "json", "limit": 1}
    headers = {"User-Agent": "SmallBusinessScanner/1.0"}
    with httpx.Client(timeout=10) as client:
        response = client.get(url, params=params, headers=headers)
        response.raise_for_status()
    results = response.json()
    if not results:
        raise ValueError(f"Could not geocode location: {query}")
    return float(results[0]["lat"]), float(results[0]["lon"])


def _parse_place(place: dict) -> dict:
    reviews = place.get("reviews", [])
    top_reviews = [r.get("text", {}).get("text", "") for r in reviews[:10] if r.get("text")]

    return {
        "name": place.get("displayName", {}).get("text", ""),
        "address": place.get("formattedAddress", ""),
        "phone": place.get("nationalPhoneNumber", ""),
        "website_url": place.get("websiteUri", ""),
        "category": _primary_category(place.get("types", [])),
        "rating": place.get("rating", 0),
        "review_count": place.get("userRatingCount", 0),
        "reviews": top_reviews,
        "lat": place.get("location", {}).get("latitude", 0),
        "lng": place.get("location", {}).get("longitude", 0),
    }


def _primary_category(types: list[str]) -> str:
    skip = {"point_of_interest", "establishment", "food", "store"}
    for t in types:
        if t not in skip:
            return t.replace("_", " ").title()
    return types[0].replace("_", " ").title() if types else "Business"
