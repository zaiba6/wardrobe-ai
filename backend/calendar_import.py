"""Read a user's calendar from an iCal (.ics) subscription link.

Google Calendar, iCloud and Outlook can all publish a private .ics link, so
this works for every provider without OAuth (Google's calendar scope requires
app verification, which is why it was dropped from sign-in).
"""
import ipaddress
import socket
from datetime import date, datetime, timedelta
from urllib.parse import urlparse
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

import recurring_ical_events
import requests as http_requests
from icalendar import Calendar

MAX_ICS_BYTES = 5 * 1024 * 1024


class CalendarError(Exception):
    pass


def normalize_url(url: str) -> str:
    url = (url or "").strip()
    if url.startswith("webcal://"):
        url = "https://" + url[len("webcal://"):]
    parsed = urlparse(url)
    if parsed.scheme not in ("https", "http") or not parsed.hostname:
        raise CalendarError("That doesn't look like a calendar link — it should start with https:// or webcal://")
    return url


def _assert_public_host(hostname: str) -> None:
    """Refuse links that point at private/internal addresses (we fetch server-side)."""
    try:
        infos = socket.getaddrinfo(hostname, None)
    except socket.gaierror:
        raise CalendarError("Couldn't reach that calendar link — double-check it.")
    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
            raise CalendarError("That calendar link isn't publicly reachable.")


def fetch_calendar(url: str) -> Calendar:
    url = normalize_url(url)
    _assert_public_host(urlparse(url).hostname)
    try:
        r = http_requests.get(url, timeout=12, stream=True, allow_redirects=False,
                              headers={"User-Agent": "wardrobe-ai calendar import"})
        # Follow at most a few redirects, re-checking each hop's host.
        for _ in range(3):
            if r.status_code not in (301, 302, 303, 307, 308):
                break
            nxt = normalize_url(r.headers.get("Location", ""))
            _assert_public_host(urlparse(nxt).hostname)
            r = http_requests.get(nxt, timeout=12, stream=True, allow_redirects=False,
                                  headers={"User-Agent": "wardrobe-ai calendar import"})
        r.raise_for_status()
        body = r.raw.read(MAX_ICS_BYTES + 1, decode_content=True)
    except CalendarError:
        raise
    except Exception:
        raise CalendarError("Couldn't download that calendar — make sure the link is the private/secret iCal address.")
    if len(body) > MAX_ICS_BYTES:
        raise CalendarError("That calendar is too large to import.")
    try:
        return Calendar.from_ical(body)
    except Exception:
        raise CalendarError("That link didn't return a calendar file (.ics).")


def _tz(tz_name: str | None):
    try:
        return ZoneInfo(tz_name) if tz_name else ZoneInfo("UTC")
    except ZoneInfoNotFoundError:
        return ZoneInfo("UTC")


def events_by_day(cal: Calendar, start: date, days: int = 7, tz_name: str | None = None) -> dict[str, list[dict]]:
    """Return {YYYY-MM-DD: [{title, time, all_day}]} for `days` days from `start`, in the user's timezone."""
    tz = _tz(tz_name)
    window_start = datetime.combine(start, datetime.min.time(), tz)
    window_end = window_start + timedelta(days=days)
    out: dict[str, list[dict]] = {(start + timedelta(days=i)).isoformat(): [] for i in range(days)}

    for ev in recurring_ical_events.of(cal).between(window_start, window_end):
        if str(ev.get("STATUS", "")).upper() == "CANCELLED":
            continue
        if str(ev.get("TRANSP", "")).upper() == "TRANSPARENT" and not ev.get("SUMMARY"):
            continue
        title = str(ev.get("SUMMARY", "")).strip() or "busy"
        dtstart = ev.get("DTSTART").dt
        if isinstance(dtstart, datetime):
            local = dtstart.astimezone(tz) if dtstart.tzinfo else dtstart.replace(tzinfo=tz)
            key = local.date().isoformat()
            entry = {"title": title, "time": local.strftime("%-I:%M%p").lower().replace(":00", ""), "all_day": False,
                     "_sort": local.time().isoformat()}
        else:
            key = dtstart.isoformat()
            entry = {"title": title, "time": None, "all_day": True, "_sort": "00"}
        if key in out and not any(e["title"] == title and e["time"] == entry["time"] for e in out[key]):
            out[key].append(entry)

    for key in out:
        out[key].sort(key=lambda e: e.pop("_sort"))
    return out
