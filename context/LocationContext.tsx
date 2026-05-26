import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const WEATHER_CACHE_KEY = 'weather_cache';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds

export interface LocationData {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  isPrimary: boolean;
}

export interface WeatherData {
  locationId: string;
  // Current weather
  temp: number;
  feelsLike: number;
  condition: string;
  humidity: number;
  dewpoint: number;
  windSpeed: number;
  windDirection: number;
  windGust: number;
  visibility: number;
  pressure: number;
  seaLevelPressure: number;
  cloudCover: number;
  uvIndex: number;
  isDay: boolean;
  sunrise: string;
  sunset: string;
  daylightDuration: number;

  // Hourly forecast
  hourlyForecast: {
    time: string;
    temp: number;
    feelsLike: number;
    humidity: number;
    dewpoint: number;
    condition: string;
    icon: string;
    windSpeed: number;
    windDirection: number;
    windGust: number;
    precipitation: number;
    precipitationProbability: number;
    cloudCover: number;
    visibility: number;
  }[];

  // Daily forecast
  dailyForecast: {
    date: string;
    tempMax: number;
    tempMin: number;
    apparentTempMax: number;
    apparentTempMin: number;
    condition: string;
    icon: string;
    precipitation: number;
    precipitationHours: number;
    precipitationProbabilityMax: number;
    windSpeed: number;
    windGust: number;
    windDirection: number;
    uvIndex: number;
    sunshineDuration: number;
  }[];

  lastUpdated: Date;
}

interface LocationContextType {
  locations: LocationData[];
  weatherData: Map<string, WeatherData>;
  primaryLocation: LocationData | null;
  addLocation: (location: LocationData) => void;
  removeLocation: (locationId: string) => void;
  setPrimaryLocation: (locationId: string) => void;
  updateWeather: (locationId: string, weather: WeatherData) => void;
  getLocationWeather: (locationId: string) => WeatherData | undefined;
  shouldRefreshWeather: (locationId: string) => boolean;
  loadCachedWeather: () => Promise<void>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

/**
 * Check if cached weather data is still fresh (less than 30 minutes old)
 */
function isWeatherDataFresh(weather: WeatherData): boolean {
  const now = new Date().getTime();
  const lastUpdate = new Date(weather.lastUpdated).getTime();
  return (now - lastUpdate) < CACHE_DURATION;
}

export function LocationProvider({ children }: { children: ReactNode }) {
  const [locations, setLocations] = useState<LocationData[]>([
    {
      id: 'kolkata',
      name: 'Kolkata',
      latitude: 22.5726,
      longitude: 88.3639,
      isPrimary: true,
    },
  ]);

  const [weatherData, setWeatherData] = useState<Map<string, WeatherData>>(new Map());

  const primaryLocation = locations.find(loc => loc.isPrimary) || locations[0];

  // Load cached weather data on mount
  useEffect(() => {
    loadCachedWeather();
  }, []);

  /**
   * Load weather data from AsyncStorage cache
   */
  const loadCachedWeather = useCallback(async () => {
    try {
      const cachedData = await AsyncStorage.getItem(WEATHER_CACHE_KEY);
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        const weatherMap = new Map<string, WeatherData>();
        
        Object.entries(parsed).forEach(([key, value]) => {
          const weather = value as WeatherData;
          // Convert lastUpdated string back to Date
          weather.lastUpdated = new Date(weather.lastUpdated);
          // Only load if data is still fresh
          if (isWeatherDataFresh(weather)) {
            weatherMap.set(key, weather);
          }
        });
        
        if (weatherMap.size > 0) {
          setWeatherData(weatherMap);
        }
      }
    } catch (error) {
      console.error('Error loading cached weather:', error);
    }
  }, []);

  /**
   * Save weather data to AsyncStorage cache
   */
  const saveCachedWeather = useCallback(async (data: Map<string, WeatherData>) => {
    try {
      const obj: Record<string, WeatherData> = {};
      data.forEach((value, key) => {
        obj[key] = value;
      });
      await AsyncStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(obj));
    } catch (error) {
      console.error('Error saving cached weather:', error);
    }
  }, []);

  /**
   * Check if weather data should be refreshed for a location
   */
  const shouldRefreshWeather = useCallback((locationId: string): boolean => {
    const weather = weatherData.get(locationId);
    if (!weather) return true; // No data, should fetch
    return !isWeatherDataFresh(weather); // Check if data is stale
  }, [weatherData]);

  const addLocation = useCallback((location: LocationData) => {
    setLocations(prev => [...prev, location]);
  }, []);

  const removeLocation = useCallback((locationId: string) => {
    setLocations(prev => {
      const filtered = prev.filter(loc => loc.id !== locationId);
      // Ensure at least one primary location
      if (filtered.length > 0 && !filtered.some(loc => loc.isPrimary)) {
        filtered[0].isPrimary = true;
      }
      return filtered;
    });
    // Also remove weather data for this location
    setWeatherData(prev => {
      const updated = new Map(prev);
      updated.delete(locationId);
      return updated;
    });
  }, []);

  const setPrimaryLocation = useCallback((locationId: string) => {
    setLocations(prev =>
      prev.map(loc => ({
        ...loc,
        isPrimary: loc.id === locationId,
      }))
    );
  }, []);

  const updateWeather = useCallback((locationId: string, weather: WeatherData) => {
    setWeatherData(prev => {
      const updated = new Map(prev).set(locationId, weather);
      // Save to cache asynchronously
      saveCachedWeather(updated);
      return updated;
    });
  }, [saveCachedWeather]);

  const getLocationWeather = useCallback((locationId: string) => {
    return weatherData.get(locationId);
  }, [weatherData]);

  return (
    <LocationContext.Provider
      value={{
        locations,
        weatherData,
        primaryLocation,
        addLocation,
        removeLocation,
        setPrimaryLocation,
        updateWeather,
        getLocationWeather,
        shouldRefreshWeather,
        loadCachedWeather,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within LocationProvider');
  }
  return context;
}
