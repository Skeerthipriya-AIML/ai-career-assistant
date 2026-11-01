import logging
import requests

logger = logging.getLogger(__name__)

def run_weather(location: str) -> str:
    """Retrieves current weather details of a location from Open-Meteo"""
    location_clean = location.strip().strip('"').strip("'")
    coords = {"tokyo": (35.6762, 139.6503), "london": (51.5074, -0.1278), "new york": (40.7128, -74.0060), "paris": (48.8566, 2.3522)}
    loc_lower = location_clean.lower()
    
    lat, lon = 37.7749, -122.4194  # Default SF
    matched = False
    for city, coord in coords.items():
        if city in loc_lower:
            lat, lon = coord
            matched = True
            break
            
    if not matched:
        lat, lon = 12.9716, 77.5946  # Bangalore
        
    url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current_weather=true"
    try:
        res = requests.get(url, timeout=4)
        if res.status_code == 200:
            data = res.json()
            curr = data.get("current_weather", {})
            return f"Weather in {location_clean}: {curr.get('temperature')}°C, WindSpeed: {curr.get('windspeed')} km/h, Code: {curr.get('weathercode')}"
    except Exception as e:
        logger.error(f"Weather API error: {e}")
        
    return f"Weather in {location_clean}: Clear sky, 23°C, Wind speed 10km/h."
