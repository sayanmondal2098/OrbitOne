import { WeatherData } from '../context/LocationContext';

// Open-Meteo API - Free API, no authentication required
const OPEN_METEO_API_BASE = 'https://api.open-meteo.com/v1/forecast';

export interface WeatherForecast {
  temp: number;
  feelsLike: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  visibility: number;
  pressure: number;
  uvIndex: number;
  sunrise: string;
  sunset: string;
}

/**
 * Convert WMO weather codes to readable conditions
 */
function getWeatherCondition(code: number): string {
  const weatherCodes: Record<number, string> = {
    0: 'Clear Sky',
    1: 'Mainly Clear',
    2: 'Partly Cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Depositing Rime Fog',
    51: 'Light Drizzle',
    53: 'Moderate Drizzle',
    55: 'Dense Drizzle',
    61: 'Slight Rain',
    63: 'Moderate Rain',
    65: 'Heavy Rain',
    71: 'Slight Snow',
    73: 'Moderate Snow',
    75: 'Heavy Snow',
    77: 'Snow Grains',
    80: 'Slight Rain Showers',
    81: 'Moderate Rain Showers',
    82: 'Violent Rain Showers',
    85: 'Slight Snow Showers',
    86: 'Heavy Snow Showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with Hail',
    99: 'Thunderstorm with Heavy Hail',
  };

  return weatherCodes[code] || 'Unknown';
}

/**
 * Get wind direction name from degrees
 */
function getWindDirection(degrees: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(((degrees) % 360) / 22.5);
  return directions[index % 16];
}

/**
 * Fetch comprehensive weather data from Open-Meteo API (Free, no API key required)
 * https://open-meteo.com/en/docs
 */
export async function fetchWeather(
  latitude: number,
  longitude: number,
  locationId: string
): Promise<WeatherData> {
  try {
    // Build comprehensive Open-Meteo API URL with all parameters
    const queryParams = [
      `latitude=${latitude}`,
      `longitude=${longitude}`,
      `current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,pressure_msl,cloud_cover,visibility,is_day,precipitation,precipitation_probability,dewpoint_2m`,
      `hourly=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,precipitation,precipitation_probability,cloud_cover,visibility,wind_speed_10m,wind_direction_10m,wind_gusts_10m,dewpoint_2m`,
      `daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,daylight_duration,sunshine_duration,precipitation_sum,precipitation_hours,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant,uv_index_max`,
      `timezone=auto`,
      `forecast_days=7`,
    ].join('&');

    const url = `${OPEN_METEO_API_BASE}?${queryParams}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`API error: ${response.status} ${response.statusText}`);

    const data = await response.json();
    if (!data.current) throw new Error('Invalid API response: missing current weather data');

    const current = data.current;
    const hourly = data.hourly;
    const daily = data.daily;

    // Parse current weather with all detailed parameters
    const currentTemp = Math.round(current.temperature_2m);
    const condition = getWeatherCondition(current.weather_code);
    const humidity = current.relative_humidity_2m;
    const windSpeed = Math.round(current.wind_speed_10m);
    const windDirection = Math.round(current.wind_direction_10m);
    const windGust = Math.round(current.wind_gusts_10m);
    const feelsLike = Math.round(current.apparent_temperature);
    const pressure = Math.round(current.pressure_msl);
    const seaLevelPressure = Math.round(current.pressure_msl);
    const cloudCover = current.cloud_cover;
    const dewpoint = Math.round(current.dewpoint_2m);
    const isDay = current.is_day === 1;
    const visibility = Math.round(current.visibility || 10000) / 1000; // Convert to km

    // Parse sunrise and sunset
    const sunriseTime = new Date(daily.sunrise[0]);
    const sunsetTime = new Date(daily.sunset[0]);
    const sunrise = !isNaN(sunriseTime.getTime()) ? sunriseTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '06:00';
    const sunset = !isNaN(sunsetTime.getTime()) ? sunsetTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '18:00';
    const daylightDuration = daily.daylight_duration ? Math.round(daily.daylight_duration[0] / 3600) : 12; // Convert to hours, default 12

    // UV Index
    const uvIndex = Math.round(daily.uv_index_max?.[0] || 5);

    // Parse hourly forecast (12 hours) with all parameters
    const hourlyForecast = [];
    if (hourly?.time && hourly?.temperature_2m) {
      for (let i = 1; i <= 12 && i < hourly.time.length; i++) {
        const time = new Date(hourly.time[i]);
        const timeStr = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

        hourlyForecast.push({
          time: timeStr,
          temp: Math.round(hourly.temperature_2m?.[i] || 20),
          feelsLike: Math.round(hourly.apparent_temperature?.[i] || 20),
          humidity: hourly.relative_humidity_2m?.[i] || 50,
          dewpoint: Math.round(hourly.dewpoint_2m?.[i] || 10),
          condition: getWeatherCondition(hourly.weather_code?.[i] || 0),
          icon: getWeatherIcon(getWeatherCondition(hourly.weather_code?.[i] || 0)),
          windSpeed: Math.round(hourly.wind_speed_10m?.[i] || 0),
          windDirection: Math.round(hourly.wind_direction_10m?.[i] || 0),
          windGust: Math.round(hourly.wind_gusts_10m?.[i] || 0),
          precipitation: Math.round((hourly.precipitation?.[i] || 0) * 10) / 10,
          precipitationProbability: hourly.precipitation_probability?.[i] || 0,
          cloudCover: hourly.cloud_cover?.[i] || 0,
          visibility: Math.round((hourly.visibility?.[i] || 10000) / 1000),
        });
      }
    }

    // Parse daily forecast (7 days) with comprehensive data
    const dailyForecast = [];
    const dailyLength = daily?.temperature_2m_max?.length || 0;
    for (let i = 0; i < Math.min(7, dailyLength); i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

      dailyForecast.push({
        date: dateStr,
        tempMax: Math.round(daily.temperature_2m_max?.[i] || 20),
        tempMin: Math.round(daily.temperature_2m_min?.[i] || 10),
        apparentTempMax: Math.round(daily.apparent_temperature_max?.[i] || 20),
        apparentTempMin: Math.round(daily.apparent_temperature_min?.[i] || 10),
        condition: getWeatherCondition(daily.weather_code?.[i] || 0),
        icon: getWeatherIcon(getWeatherCondition(daily.weather_code?.[i] || 0)),
        precipitation: Math.round((daily.precipitation_sum?.[i] || 0) * 10) / 10,
        precipitationHours: Math.round(daily.precipitation_hours?.[i] || 0),
        precipitationProbabilityMax: daily.precipitation_probability_max?.[i] || 0,
        windSpeed: Math.round(daily.wind_speed_10m_max?.[i] || 0),
        windGust: Math.round(daily.wind_gusts_10m_max?.[i] || 0),
        windDirection: Math.round(daily.wind_direction_10m_dominant?.[i] || 0),
        uvIndex: Math.round(daily.uv_index_max?.[i] || 5),
        sunshineDuration: Math.round((daily.sunshine_duration?.[i] || 0) / 3600), // Convert to hours
      });
    }

    return {
      locationId,
      // Current weather
      temp: currentTemp,
      feelsLike,
      condition,
      humidity,
      dewpoint,
      windSpeed,
      windDirection,
      windGust,
      visibility,
      pressure,
      seaLevelPressure,
      cloudCover,
      uvIndex,
      isDay,
      sunrise,
      sunset,
      daylightDuration,
      // Forecasts
      hourlyForecast,
      dailyForecast,
      lastUpdated: new Date(),
    };
  } catch (error) {
    console.error('Error fetching weather from Open-Meteo API:', error);
    throw error;
  }
}

/**
 * Get weather for current device location
 */
export async function getCurrentLocationWeather(): Promise<WeatherData> {
  try {
    const LocationModule = require('expo-location');

    // Request location permission
    const { status } = await LocationModule.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Location permission denied');
    }

    // Get current location
    const location = await LocationModule.getCurrentPositionAsync({});
    const { latitude, longitude } = location.coords;

    // Fetch weather for this location
    return await fetchWeather(latitude, longitude, 'current-location');
  } catch (error) {
    console.error('Error getting current location weather:', error);
    // Return default weather if location fails (Kolkata)
    return await fetchWeather(22.5726, 88.3639, 'current-location');
  }
}

/**
 * Reverse geocode coordinates to get location name
 */
export async function reverseGeocode(latitude: number, longitude: number): Promise<string> {
  try {
    const LocationModule = require('expo-location');
    const results = await LocationModule.reverseGeocodeAsync({
      latitude,
      longitude,
    });

    if (results.length > 0) {
      const address = results[0];
      return address.city || address.region || 'Unknown Location';
    }
    return 'Unknown Location';
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    return 'Unknown Location';
  }
}

/**
 * Convert unix timestamp to readable time format
 */
export function formatTime(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Get weather icon based on condition
 */
export function getWeatherIcon(condition: string): string {
  const lowerCondition = condition.toLowerCase();

  if (lowerCondition.includes('clear') || lowerCondition.includes('sunny') || lowerCondition.includes('mainly clear'))
    return '☀️';
  if (lowerCondition.includes('partly')) return '⛅';
  if (lowerCondition.includes('cloudy') || lowerCondition.includes('overcast')) return '☁️';
  if (lowerCondition.includes('drizzle')) return '🌦️';
  if (lowerCondition.includes('rain') || lowerCondition.includes('showers')) return '🌧️';
  if (lowerCondition.includes('snow')) return '❄️';
  if (lowerCondition.includes('fog')) return '🌫️';
  if (lowerCondition.includes('thunder') || lowerCondition.includes('hail')) return '⛈️';
  if (lowerCondition.includes('wind')) return '💨';

  return '🌤️';
}
