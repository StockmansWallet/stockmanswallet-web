// Weather service for web app - fetches weather data from Open-Meteo API
// Mirrors iOS WeatherService.swift but uses Open-Meteo (free, no API key) instead of Apple WeatherKit
// Used by Brangus chat for property_weather tool lookups

import type { PropertyRow } from "../brangus/types";

// MARK: - Types

export interface PropertyWeatherData {
  propertyName: string;
  locationDescription: string;
  temperature: number;
  feelsLike: number;
  humidity: number; // 0-100 (percentage)
  windSpeed: number; // km/h
  windDirection: string; // compass direction e.g. "NW"
  uvIndex: number;
  conditionDescription: string;
  dailyForecast: DailyForecast[];
  alerts: WeatherAlert[];
}

export interface DailyForecast {
  date: Date;
  highTemp: number;
  lowTemp: number;
  precipitationChance: number; // 0-100 (percentage)
  precipitationAmount: number; // mm
  conditionDescription: string;
}

export interface WeatherAlert {
  severity: string;
  summary: string;
}

// MARK: - Open-Meteo API Response Types

interface OpenMeteoResponse {
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    weather_code: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    uv_index: number;
  };
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    precipitation_probability_max: number[];
    weather_code: number[];
  };
}

// MARK: - WMO Weather Code Descriptions
// Debug: Maps WMO weather interpretation codes to human-readable descriptions
// Source: https://open-meteo.com/en/docs (WMO Weather interpretation codes)

function weatherCodeToDescription(code: number): string {
  switch (code) {
    case 0: return "Clear sky";
    case 1: return "Mainly clear";
    case 2: return "Partly cloudy";
    case 3: return "Overcast";
    case 45: return "Fog";
    case 48: return "Depositing rime fog";
    case 51: return "Light drizzle";
    case 53: return "Moderate drizzle";
    case 55: return "Dense drizzle";
    case 56: return "Light freezing drizzle";
    case 57: return "Dense freezing drizzle";
    case 61: return "Light rain";
    case 63: return "Moderate rain";
    case 65: return "Heavy rain";
    case 66: return "Light freezing rain";
    case 67: return "Heavy freezing rain";
    case 71: return "Light snow";
    case 73: return "Moderate snow";
    case 75: return "Heavy snow";
    case 77: return "Snow grains";
    case 80: return "Light rain showers";
    case 81: return "Moderate rain showers";
    case 82: return "Violent rain showers";
    case 85: return "Light snow showers";
    case 86: return "Heavy snow showers";
    case 95: return "Thunderstorm";
    case 96: return "Thunderstorm with light hail";
    case 99: return "Thunderstorm with heavy hail";
    default: return "Unknown";
  }
}

// MARK: - Wind Direction

function degreesToCompass(degrees: number): string {
  const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

// MARK: - Fetch Weather for Single Property

export async function fetchPropertyWeather(
  latitude: number,
  longitude: number,
  propertyName: string,
  locationDescription: string
): Promise<PropertyWeatherData | null> {
  try {
    const params = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      current: "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,uv_index",
      daily: "temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,weather_code",
      timezone: "auto",
      forecast_days: "7",
    });

    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return null;

    const data: OpenMeteoResponse = await response.json();

    const dailyForecast: DailyForecast[] = data.daily.time.map((dateStr, i) => ({
      date: new Date(dateStr),
      highTemp: Math.round(data.daily.temperature_2m_max[i]),
      lowTemp: Math.round(data.daily.temperature_2m_min[i]),
      precipitationChance: data.daily.precipitation_probability_max[i],
      precipitationAmount: data.daily.precipitation_sum[i],
      conditionDescription: weatherCodeToDescription(data.daily.weather_code[i]),
    }));

    return {
      propertyName,
      locationDescription,
      temperature: Math.round(data.current.temperature_2m),
      feelsLike: Math.round(data.current.apparent_temperature),
      humidity: data.current.relative_humidity_2m,
      windSpeed: Math.round(data.current.wind_speed_10m),
      windDirection: degreesToCompass(data.current.wind_direction_10m),
      uvIndex: Math.round(data.current.uv_index),
      conditionDescription: weatherCodeToDescription(data.current.weather_code),
      dailyForecast,
      alerts: [], // Open-Meteo free tier doesn't include alerts
    };
  } catch (error) {
    console.error(`Weather fetch failed for ${propertyName}:`, error);
    return null;
  }
}

// MARK: - Fetch Weather for All Properties

export async function fetchAllPropertyWeather(
  properties: PropertyRow[]
): Promise<PropertyWeatherData[]> {
  const withCoords = properties.filter((p) => p.latitude != null && p.longitude != null);
  if (withCoords.length === 0) return [];

  const results = await Promise.all(
    withCoords.map((p) =>
      fetchPropertyWeather(
        p.latitude!,
        p.longitude!,
        p.property_name,
        [p.suburb, p.region, p.state].filter(Boolean).join(", ")
      )
    )
  );

  return results.filter((r): r is PropertyWeatherData => r !== null);
}

// MARK: - Geocode + Fetch Weather for Any Location
// Debug: Uses Open-Meteo geocoding API to resolve a place name to lat/lon
// Debug: Filters to Australian results first, then falls back to worldwide

export async function fetchWeatherForLocation(
  locationName: string
): Promise<PropertyWeatherData | null> {
  try {
    // Geocode the location name
    const geoParams = new URLSearchParams({
      name: locationName,
      count: "5",
      language: "en",
      format: "json",
    });

    const geoResponse = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?${geoParams}`,
      { signal: AbortSignal.timeout(5000) }
    );

    if (!geoResponse.ok) return null;

    const geoData = await geoResponse.json() as {
      results?: Array<{
        name: string;
        latitude: number;
        longitude: number;
        country: string;
        country_code: string;
        admin1?: string;
        admin2?: string;
      }>;
    };

    if (!geoData.results || geoData.results.length === 0) return null;

    // Prefer Australian results
    const auResult = geoData.results.find((r) => r.country_code === "AU");
    const result = auResult ?? geoData.results[0];

    const description = [result.admin2, result.admin1, result.country]
      .filter(Boolean)
      .join(", ");

    return fetchPropertyWeather(
      result.latitude,
      result.longitude,
      result.name,
      description
    );
  } catch (error) {
    console.error(`Geocode+weather failed for ${locationName}:`, error);
    return null;
  }
}
