import os

import requests
from dotenv import load_dotenv
from fastapi import HTTPException

load_dotenv()


def _parse_owm_response(data: dict) -> dict:
    """Extract the standard weather dict from an OWM JSON response."""
    try:
        temp_c = float(data["main"]["temp"])
        temp_f = round(temp_c * 9 / 5 + 32, 1)
        return {
            "temp_celsius": round(temp_c, 1),
            "temp_fahrenheit": temp_f,
            "condition": data["weather"][0]["main"],
            "description": data["weather"][0]["description"],
            "city": data["name"],
            "humidity": int(data["main"]["humidity"]),
        }
    except (KeyError, IndexError, TypeError, ValueError):
        raise HTTPException(status_code=400, detail="Could not parse weather response.")


def get_weather_by_coords(lat: float, lon: float) -> dict:
    """Fetch current weather by latitude/longitude."""
    api_key = os.getenv("OPENWEATHER_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OPENWEATHER_API_KEY is not configured on the server.")
    url = (
        f"https://api.openweathermap.org/data/2.5/weather"
        f"?lat={lat}&lon={lon}&appid={api_key}&units=metric"
    )
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
    except requests.RequestException:
        raise HTTPException(status_code=400, detail="Could not fetch weather for your location.")
    return _parse_owm_response(response.json())


def get_weather(city: str) -> dict:
    """
    Fetch current weather for a city using OpenWeatherMap.

    Returns:
        {
            "temp_celsius": float,
            "temp_fahrenheit": float,
            "condition": str,      # e.g. "Clear", "Rain", "Clouds"
            "description": str,    # e.g. "clear sky"
            "city": str,
            "humidity": int,
        }

    Raises:
        HTTPException(400, ...) if the city is not found or the API call fails.
    """
    api_key = os.getenv("OPENWEATHER_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="OPENWEATHER_API_KEY is not configured on the server.",
        )

    url = (
        f"https://api.openweathermap.org/data/2.5/weather"
        f"?q={city}&appid={api_key}&units=metric"
    )

    try:
        response = requests.get(url, timeout=10)
    except requests.RequestException:
        raise HTTPException(
            status_code=400,
            detail="Could not fetch weather for that city",
        )

    if response.status_code == 404:
        raise HTTPException(
            status_code=400,
            detail=f"City '{city}' not found. Please check the spelling and try again.",
        )

    if response.status_code != 200:
        raise HTTPException(
            status_code=400,
            detail="Could not fetch weather for that city",
        )

    data = response.json()

    return _parse_owm_response(data)
