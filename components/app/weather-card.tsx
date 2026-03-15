import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Cloud, CloudRain, Sun, Snowflake, CloudLightning, CloudFog, Droplets, Wind, Thermometer } from "lucide-react";
import type { PropertyWeatherData, DailyForecast } from "@/lib/services/weather-service";

function getWeatherIcon(description: string) {
  const d = description.toLowerCase();
  if (d.includes("thunder")) return CloudLightning;
  if (d.includes("rain") || d.includes("drizzle") || d.includes("shower")) return CloudRain;
  if (d.includes("snow") || d.includes("freezing")) return Snowflake;
  if (d.includes("fog")) return CloudFog;
  if (d.includes("cloud") || d.includes("overcast")) return Cloud;
  return Sun;
}

function getDayLabel(date: Date, index: number): string {
  if (index === 0) return "Today";
  return date.toLocaleDateString("en-AU", { weekday: "short" });
}

function ForecastDay({ forecast, index }: { forecast: DailyForecast; index: number }) {
  const Icon = getWeatherIcon(forecast.conditionDescription);
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[10px] font-medium text-text-muted">{getDayLabel(forecast.date, index)}</span>
      <Icon className="h-4 w-4 text-text-secondary" />
      <div className="flex items-center gap-1 text-[10px] tabular-nums">
        <span className="font-medium text-text-primary">{forecast.highTemp}°</span>
        <span className="text-text-muted">{forecast.lowTemp}°</span>
      </div>
      {forecast.precipitationChance > 0 && (
        <span className="flex items-center gap-0.5 text-[10px] text-sky-400">
          <Droplets className="h-2.5 w-2.5" />
          {forecast.precipitationChance}%
        </span>
      )}
    </div>
  );
}

export function WeatherCard({ weather }: { weather: PropertyWeatherData }) {
  const Icon = getWeatherIcon(weather.conditionDescription);
  const forecast = weather.dailyForecast.slice(0, 3);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Weather</CardTitle>
          <span className="text-xs text-text-muted">{weather.propertyName}</span>
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        {/* Current conditions */}
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand/10">
            <Icon className="h-6 w-6 text-brand" />
          </div>
          <div>
            <p className="text-3xl font-bold tabular-nums text-text-primary">{weather.temperature}°C</p>
            <p className="text-xs text-text-secondary">{weather.conditionDescription}</p>
          </div>
        </div>

        {/* Detail row */}
        <div className="mt-3 flex items-center gap-4 text-xs text-text-muted">
          <span className="flex items-center gap-1">
            <Thermometer className="h-3 w-3" />
            Feels {weather.feelsLike}°
          </span>
          <span className="flex items-center gap-1">
            <Wind className="h-3 w-3" />
            {weather.windDirection} {weather.windSpeed} km/h
          </span>
          <span className="flex items-center gap-1">
            <Droplets className="h-3 w-3" />
            {weather.humidity}%
          </span>
        </div>

        {/* 3-day forecast */}
        {forecast.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-white/[0.03] px-3 py-2.5">
            {forecast.map((f, i) => (
              <ForecastDay key={i} forecast={f} index={i} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
