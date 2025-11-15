"""Fetch recent news items for financial symbols."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
import json
from typing import List, Mapping, MutableMapping
from urllib import parse as urllib_parse
from urllib import request as urllib_request
from urllib.error import HTTPError, URLError

USER_AGENT = "tightzone-news/1.0 (+https://github.com/kitkwok/TightZone)"
SEARCH_ENDPOINT = "https://query1.finance.yahoo.com/v1/finance/search"


def _normalise_symbol(symbol: str) -> str:
    if not symbol:
        return ""
    return symbol.split(":", 1)[-1]


def fetch_recent_news(symbol: str, limit: int = 3, days: int = 3) -> List[MutableMapping[str, object]]:
    """Return at most ``limit`` news articles for ``symbol`` within the past ``days`` days."""
    ticker = _normalise_symbol(symbol)
    if not ticker:
        return []

    params = {
        "q": ticker,
        "lang": "en-US",
        "region": "US",
        "quotesCount": 0,
        "newsCount": limit,
    }
    query = urllib_parse.urlencode(params)
    url = f"{SEARCH_ENDPOINT}?{query}"

    request = urllib_request.Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "application/json",
        },
    )

    try:
        with urllib_request.urlopen(request, timeout=5) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError):
        return []

    news_items = payload.get("news")
    if not isinstance(news_items, list):
        return []

    cutoff = datetime.now(tz=timezone.utc) - timedelta(days=days)
    results: List[MutableMapping[str, object]] = []

    for item in news_items:
        if not isinstance(item, Mapping):
            continue

        title = item.get("title")
        link = item.get("link")
        publisher = item.get("publisher") or item.get("provider", {}).get("displayName")
        summary = item.get("summary", "")
        published = item.get("providerPublishTime")

        if not isinstance(title, str) or not isinstance(link, str):
            continue

        if not isinstance(publisher, str):
            publisher = "Unknown"

        published_at = None
        if isinstance(published, (int, float)):
            published_at = datetime.fromtimestamp(float(published), tz=timezone.utc)

        if published_at is None or published_at < cutoff:
            continue

        results.append(
            {
                "title": title,
                "url": link,
                "publisher": publisher,
                "summary": summary or "",
                "publishedAt": published_at.isoformat(),
            }
        )

        if len(results) >= limit:
            break

    return results


__all__ = ["fetch_recent_news"]
