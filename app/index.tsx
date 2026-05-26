import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, ScrollView, Text, TouchableOpacity, Animated, ActivityIndicator, Platform, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { Colors } from '../constants/Colors';
import { WelcomeIllustration } from '../components/illustrations';
import { useLocation } from '../context/LocationContext';
import { useTheme } from '../context/ThemeContext';
import { useTasks } from '../context/TasksContext';
import { fetchWeather, getWeatherIcon } from '../services/weatherService';

/**
 * Get UV Index color based on intensity
 */
function getUVIndexColor(uvIndex: number): string {
    if (uvIndex <= 2) return '#4CAF50'; // Green - Low
    if (uvIndex <= 5) return '#FFC107'; // Yellow - Moderate
    if (uvIndex <= 7) return '#FF9800'; // Orange - High
    if (uvIndex <= 10) return '#F44336'; // Red - Very High
    return '#8B008B'; // Purple - Extreme
}

/**
 * Get wind direction name from degrees
 */
function getWindDirectionName(degrees: number): string {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round((degrees % 360) / 22.5);
    return directions[index % 16];
}

export default function HomeScreen() {
    const weatherScale = useRef(new Animated.Value(0.8)).current;
    const weatherOpacity = useRef(new Animated.Value(0)).current;
    const { primaryLocation, weatherData, updateWeather, shouldRefreshWeather } = useLocation();
    const { theme, colors } = useTheme();
    const { tasks } = useTasks();
    const [isLoading, setIsLoading] = useState(false);
    const [showWeatherModal, setShowWeatherModal] = useState(false);
    
    const styles = React.useMemo(() => createStyles(colors), [colors]);

    useEffect(() => {
        Animated.parallel([
            Animated.timing(weatherScale, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.timing(weatherOpacity, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    // Request location permission on mount and fetch weather if needed
    useEffect(() => {
        const requestLocationPermission = async () => {
            try {
                // Check if we need to refresh weather first
                if (!shouldRefreshWeather(primaryLocation?.id || 'kolkata')) {
                    return; // Use cached data
                }

                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status === 'granted') {
                    // Permission granted, try to get current location
                    const location = await Location.getCurrentPositionAsync({
                        accuracy: Location.Accuracy.Balanced,
                    });
                    
                    // Get the weather for current location
                    const weather = await fetchWeather(
                        location.coords.latitude,
                        location.coords.longitude,
                        'current-location'
                    );
                    updateWeather(primaryLocation?.id || 'kolkata', weather);
                } else {
                    console.log('Location permission denied');
                }
            } catch (error) {
                console.error('Error requesting location permission:', error);
            }
        };

        requestLocationPermission();
    }, []);

    // Fetch weather when primary location changes (only if cache is stale or missing)
    useEffect(() => {
        if (primaryLocation && shouldRefreshWeather(primaryLocation.id)) {
            const fetchLocationWeather = async () => {
                setIsLoading(true);
                try {
                    const weather = await fetchWeather(
                        primaryLocation.latitude,
                        primaryLocation.longitude,
                        primaryLocation.id
                    );
                    updateWeather(primaryLocation.id, weather);
                } catch (error) {
                    console.error('Error fetching weather:', error);
                } finally {
                    setIsLoading(false);
                }
            };

            fetchLocationWeather();
        }
    }, [primaryLocation?.id, shouldRefreshWeather]);

    const weather = primaryLocation ? weatherData.get(primaryLocation.id) : null;

    const newsArticles = [
        {
            id: 1,
            title: 'New AI Breakthroughs',
            source: 'Tech Daily',
            time: '2h ago',
            color1: '#FF6B6B',
            color2: '#FF8E53',
        },
        {
            id: 2,
            title: 'Climate Action Plan',
            source: 'Green News',
            time: '4h ago',
            color1: '#4FACFE',
            color2: '#00F2FE',
        },
        {
            id: 3,
            title: 'Innovation Awards',
            source: 'Business Weekly',
            time: '6h ago',
            color1: '#43E97B',
            color2: '#38F9D7',
        },
        {
            id: 4,
            title: 'Space Discovery',
            source: 'Science Digest',
            time: '8h ago',
            color1: '#FA709A',
            color2: '#FEE140',
        },
    ];

    const moods = ['Great', 'Perfect', 'Good', 'Cool'];

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header with gradient */}
            <LinearGradient
                colors={['#6366F1', '#8B5CF6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <View style={styles.headerContent}>
                    <View>
                        <Text style={styles.greeting}>Good Morning 👋</Text>
                        <Text style={styles.name}>Welcome back!</Text>
                    </View>
                    <TouchableOpacity style={styles.avatarContainer}>
                        <LinearGradient
                            colors={['#EC4899', '#F59E0B']}
                            style={styles.avatar}
                        >
                            <Text style={styles.avatarText}>JD</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            <ScrollView 
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Animated Weather Widget at Top */}
                <Animated.View 
                    style={[
                        styles.section,
                        {
                            opacity: weatherOpacity,
                            transform: [{ scale: weatherScale }],
                        },
                    ]}
                >
                    {isLoading ? (
                        <View style={[styles.weatherCard, styles.loadingContainer]}>
                            <ActivityIndicator size="large" color="#FFF" />
                            <Text style={styles.loadingText}>Fetching weather...</Text>
                        </View>
                    ) : weather && primaryLocation ? (
                        <TouchableOpacity 
                            onPress={() => setShowWeatherModal(true)} 
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={['#4FACFE', '#00F2FE']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.weatherCard}
                            >
                                <View style={styles.weatherHeader}>
                                    <View>
                                        <Text style={styles.weatherLocation}>{primaryLocation.name}</Text>
                                        <Text style={styles.weatherCondition}>
                                            {weather.condition} {getWeatherIcon(weather.condition)}
                                        </Text>
                                    </View>
                                    <View style={styles.weatherTempContainer}>
                                        <Text style={styles.weatherTemp}>{Math.round(weather.temp)}°</Text>
                                        <Text style={styles.weatherFeelsLike}>Feels like {Math.round(weather.feelsLike)}°</Text>
                                    </View>
                                </View>

                                {/* Weather Details */}
                                <View style={styles.weatherDetails}>
                                    <View style={styles.weatherDetailItem}>
                                        <Ionicons name="water" size={18} color="#FFF" />
                                        <Text style={styles.weatherDetailLabel}>Humidity</Text>
                                        <Text style={styles.weatherDetailValue}>{weather.humidity}%</Text>
                                    </View>
                                    <View style={styles.weatherDetailItem}>
                                        <Ionicons name="arrow-forward" size={18} color="#FFF" />
                                        <Text style={styles.weatherDetailLabel}>Wind</Text>
                                        <Text style={styles.weatherDetailValue}>{weather.windSpeed} km/h</Text>
                                    </View>
                                    <View style={styles.weatherDetailItem}>
                                        <Ionicons name="eye" size={18} color="#FFF" />
                                        <Text style={styles.weatherDetailLabel}>Visibility</Text>
                                        <Text style={styles.weatherDetailValue}>{weather.visibility} km</Text>
                                    </View>
                                </View>

                                {/* Hourly Forecast - Next 6 Hours */}
                                <View style={styles.weatherForecast}>
                                    {weather.hourlyForecast.slice(0, 6).map((hour, i) => (
                                        <View key={i} style={styles.weatherItem}>
                                            <Text style={styles.weatherTime}>{hour.time}</Text>
                                            <Text style={styles.weatherEmoji}>{hour.icon}</Text>
                                            <Text style={styles.weatherItemTemp}>{Math.round(hour.temp)}°</Text>
                                        </View>
                                    ))}
                                </View>

                                {/* Tap to expand hint */}
                                <Text style={styles.tapHint}>Tap for 12-hour & 7-day forecast</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    ) : (
                        <LinearGradient
                            colors={['#4FACFE', '#00F2FE']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={[styles.weatherCard, styles.emptyWeatherCard]}
                        >
                            <Ionicons name="location" size={48} color="#FFF" opacity={0.6} />
                            <Text style={styles.emptyText}>No location selected</Text>
                            <Text style={styles.emptySubtext}>Add a location to see weather</Text>
                        </LinearGradient>
                    )}
                </Animated.View>

                {/* Quick Stats */}
                <View style={styles.statsContainer}>
                    <TouchableOpacity
                        onPress={() => router.push('/tasks')}
                        activeOpacity={0.8}
                        style={{ flex: 1 }}
                    >
                        <LinearGradient
                            colors={['#667EEA', '#764BA2']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.statCard}
                        >
                            <Ionicons name="checkbox-outline" size={28} color="#FFF" />
                            <Text style={styles.statValue}>{tasks.filter(t => !t.completed).length}</Text>
                            <Text style={styles.statLabel}>Tasks</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                    
                    <LinearGradient
                        colors={['#F093FB', '#F5576C']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.statCard}
                    >
                        <Ionicons name="calendar-outline" size={28} color="#FFF" />
                        <Text style={styles.statValue}>5</Text>
                        <Text style={styles.statLabel}>Events</Text>
                    </LinearGradient>
                    
                    <LinearGradient
                        colors={['#43E97B', '#38F9D7']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.statCard}
                    >
                        <Ionicons name="flame-outline" size={28} color="#FFF" />
                        <Text style={styles.statValue}>8</Text>
                        <Text style={styles.statLabel}>Streaks</Text>
                    </LinearGradient>
                </View>

                {/* News Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Top News</Text>
                        <TouchableOpacity>
                            <Text style={styles.seeAll}>See All</Text>
                        </TouchableOpacity>
                    </View>
                    
                    {newsArticles.map((article) => (
                        <TouchableOpacity key={article.id} style={styles.newsCard}>
                            <LinearGradient
                                colors={[article.color1, article.color2]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.newsIconContainer}
                            >
                                <Ionicons name="newspaper" size={24} color="#FFF" />
                            </LinearGradient>
                            <View style={styles.newsContent}>
                                <Text style={styles.newsTitle}>{article.title}</Text>
                                <Text style={styles.newsSource}>{article.source} • {article.time}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Productivity Tip */}
                <View style={styles.section}>
                    <View style={styles.tipCard}>
                        <View style={styles.tipIllustration}>
                            <WelcomeIllustration width={100} height={100} />
                        </View>
                        <Text style={styles.tipTitle}>Stay Focused, Stay Productive</Text>
                        <Text style={styles.tipText}>
                            Break your goals into smaller tasks and celebrate each win! 🎉
                        </Text>
                    </View>
                </View>
            </ScrollView>

            {/* FAB */}
            <TouchableOpacity style={styles.fab}>
                <LinearGradient
                    colors={['#6366F1', '#8B5CF6']}
                    style={styles.fabGradient}
                >
                    <Ionicons name="add" size={28} color="#FFF" />
                </LinearGradient>
            </TouchableOpacity>

            {/* Weather Details Modal */}
            <Modal
                visible={showWeatherModal}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setShowWeatherModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <SafeAreaView style={styles.modalContainer}>
                        {/* Close Button */}
                        <TouchableOpacity 
                            style={styles.closeButton}
                            onPress={() => setShowWeatherModal(false)}
                        >
                            <Ionicons name="close-circle" size={32} color="#FFF" />
                        </TouchableOpacity>

                        <ScrollView 
                            style={styles.modalContent}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.modalScroll}
                        >
                            {weather && primaryLocation && (
                                <LinearGradient
                                    colors={['#4FACFE', '#00F2FE']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.modalGradient}
                                >
                                    {/* Main Weather Info */}
                                    <View style={styles.mainWeatherSection}>
                                        <Text style={styles.modalLocation}>{primaryLocation.name}</Text>
                                        <View style={styles.mainTempContainer}>
                                            <Text style={styles.mainTemp}>{Math.round(weather.temp)}°</Text>
                                            <Text style={styles.mainWeatherIcon}>{getWeatherIcon(weather.condition)}</Text>
                                        </View>
                                        <Text style={styles.mainCondition}>{weather.condition}</Text>
                                        <Text style={styles.feelsLike}>Feels like {Math.round(weather.feelsLike)}°</Text>
                                    </View>

                                    {/* Current Conditions Grid */}
                                    <View style={styles.conditionsGrid}>
                                        <View style={styles.conditionCard}>
                                            <View style={styles.conditionIconBox}>
                                                <Ionicons name="water" size={24} color="#00D4FF" />
                                            </View>
                                            <Text style={styles.conditionLabel}>Humidity</Text>
                                            <Text style={styles.conditionValue}>{weather.humidity}%</Text>
                                        </View>

                                        <View style={styles.conditionCard}>
                                            <View style={styles.conditionIconBox}>
                                                <Ionicons name="arrow-forward" size={24} color="#00D4FF" />
                                            </View>
                                            <Text style={styles.conditionLabel}>Wind Speed</Text>
                                            <Text style={styles.conditionValue}>{weather.windSpeed} km/h</Text>
                                        </View>

                                        <View style={styles.conditionCard}>
                                            <View style={styles.conditionIconBox}>
                                                <Ionicons name="eye" size={24} color="#00D4FF" />
                                            </View>
                                            <Text style={styles.conditionLabel}>Visibility</Text>
                                            <Text style={styles.conditionValue}>{weather.visibility} km</Text>
                                        </View>

                                        <View style={styles.conditionCard}>
                                            <View style={styles.conditionIconBox}>
                                                <Ionicons name="cloud" size={24} color="#6BB6FF" />
                                            </View>
                                            <Text style={styles.conditionLabel}>Cloud Cover</Text>
                                            <Text style={styles.conditionValue}>{weather.cloudCover}%</Text>
                                        </View>

                                        <View style={styles.conditionCard}>
                                            <View style={styles.conditionIconBox}>
                                                <Ionicons name="sunny" size={24} color="#FDB813" />
                                            </View>
                                            <Text style={styles.conditionLabel}>UV Index</Text>
                                            <View style={[styles.uvIndexBar, { backgroundColor: getUVIndexColor(weather.uvIndex) }]} />
                                            <Text style={styles.conditionValue}>{weather.uvIndex}</Text>
                                        </View>

                                        <View style={styles.conditionCard}>
                                            <View style={styles.conditionIconBox}>
                                                <Ionicons name="thermometer" size={24} color="#FF9E9E" />
                                            </View>
                                            <Text style={styles.conditionLabel}>Dewpoint</Text>
                                            <Text style={styles.conditionValue}>{weather.dewpoint}°</Text>
                                        </View>

                                        <View style={styles.conditionCard}>
                                            <View style={styles.conditionIconBox}>
                                                <Ionicons name="flash" size={24} color="#4DD0E1" />
                                            </View>
                                            <Text style={styles.conditionLabel}>Wind Gust</Text>
                                            <Text style={styles.conditionValue}>{weather.windGust} km/h</Text>
                                        </View>

                                        <View style={styles.conditionCard}>
                                            <View style={styles.conditionIconBox}>
                                                <Ionicons name="speedometer" size={24} color="#A5D6A7" />
                                            </View>
                                            <Text style={styles.conditionLabel}>Pressure</Text>
                                            <Text style={styles.conditionValue}>{weather.pressure} mb</Text>
                                        </View>

                                        <View style={styles.conditionCard}>
                                            <View style={styles.conditionIconBox}>
                                                <Ionicons name="compass" size={24} color="#FFB74D" />
                                            </View>
                                            <Text style={styles.conditionLabel}>Wind Dir</Text>
                                            <Text style={styles.conditionValue}>{getWindDirectionName(weather.windDirection)}</Text>
                                        </View>
                                    </View>

                                    {/* Wind Direction Compass */}
                                    <View style={styles.compassSection}>
                                        <Text style={styles.compassTitle}>Wind Direction</Text>
                                        <View style={styles.compassContainer}>
                                            <View style={styles.compass}>
                                                <View style={styles.compassLabel}>
                                                    <Text style={styles.compassN}>N</Text>
                                                </View>
                                                <View style={styles.compassLabel}>
                                                    <Text style={styles.compassE}>E</Text>
                                                </View>
                                                <View style={styles.compassLabel}>
                                                    <Text style={styles.compassS}>S</Text>
                                                </View>
                                                <View style={styles.compassLabel}>
                                                    <Text style={styles.compassW}>W</Text>
                                                </View>
                                                <View 
                                                    style={[
                                                        styles.windArrow,
                                                        { transform: [{ rotate: `${weather.windDirection}deg` }] }
                                                    ]}
                                                >
                                                    <Ionicons name="arrow-up" size={32} color="#FF6B9D" />
                                                </View>
                                            </View>
                                            <Text style={styles.windDegrees}>{Math.round(weather.windDirection)}°</Text>
                                        </View>
                                    </View>

                                    {/* Sunrise & Sunset */}
                                    <View style={styles.sunSection}>
                                        <View style={styles.sunItem}>
                                            <Ionicons name="time" size={28} color="#FDB813" />
                                            <View style={styles.sunInfo}>
                                                <Text style={styles.sunLabel}>Sunrise</Text>
                                                <Text style={styles.sunTime}>{weather.sunrise}</Text>
                                            </View>
                                        </View>
                                        <View style={styles.sunDivider} />
                                        <View style={styles.sunItem}>
                                            <Ionicons name="moon" size={28} color="#B7CAE8" />
                                            <View style={styles.sunInfo}>
                                                <Text style={styles.sunLabel}>Sunset</Text>
                                                <Text style={styles.sunTime}>{weather.sunset}</Text>
                                            </View>
                                        </View>
                                    </View>

                                    {/* Hourly Forecast */}
                                    <View style={styles.forecastSection}>
                                        <Text style={styles.forecastTitle}>Hourly Forecast (Next 12 Hours)</Text>
                                        <ScrollView 
                                            horizontal 
                                            showsHorizontalScrollIndicator={false}
                                            style={styles.hourlyScroll}
                                        >
                                            {weather.hourlyForecast.map((hour, i) => (
                                                <View key={i} style={styles.hourlyDetailCard}>
                                                    <Text style={styles.hourlyTime}>{hour.time}</Text>
                                                    <Text style={styles.hourlyIcon}>{hour.icon}</Text>
                                                    <Text style={styles.hourlyTemp}>{Math.round(hour.temp)}°</Text>
                                                    <View style={styles.hourlyMetrics}>
                                                        <View style={styles.humidityBar}>
                                                            <View style={[styles.humidityFill, { width: `${hour.humidity}%` }]} />
                                                        </View>
                                                        <Text style={styles.hourlySmall}>{hour.humidity}%</Text>
                                                        <Text style={styles.hourlySmall}>💧 {hour.precipitation}mm</Text>
                                                        <Text style={styles.hourlySmall}>{hour.windSpeed}km/h 💨</Text>
                                                    </View>
                                                </View>
                                            ))}
                                        </ScrollView>
                                    </View>

                                    {/* 7-Day Forecast */}
                                    <View style={styles.forecastSection}>
                                        <Text style={styles.forecastTitle}>7-Day Forecast</Text>
                                        {weather.dailyForecast.map((day, i) => (
                                            <View key={i} style={styles.dailyDetailCard}>
                                                <View style={styles.dayLeft}>
                                                    <Text style={styles.dayDate}>{day.date}</Text>
                                                    <Text style={styles.dayIcon}>{day.icon}</Text>
                                                </View>
                                                <View style={styles.dayMiddle}>
                                                    <Text style={styles.dayCondition}>{day.condition}</Text>
                                                    <View style={styles.tempRange}>
                                                        <View style={styles.tempItem}>
                                                            <Text style={styles.tempLabel}>↑</Text>
                                                            <Text style={styles.dayTempMax}>{Math.round(day.tempMax)}°</Text>
                                                        </View>
                                                        <View style={styles.tempItem}>
                                                            <Text style={styles.tempLabel}>↓</Text>
                                                            <Text style={styles.dayTempMin}>{Math.round(day.tempMin)}°</Text>
                                                        </View>
                                                    </View>
                                                </View>
                                                <View style={styles.dayMetrics}>
                                                    <View style={styles.metricRow}>
                                                        <Text style={styles.metricLabel}>💧</Text>
                                                        <Text style={styles.metricValue}>{day.precipitationProbabilityMax}%</Text>
                                                    </View>
                                                    <View style={styles.metricRow}>
                                                        <Text style={styles.metricLabel}>💨</Text>
                                                        <Text style={styles.metricValue}>{day.windSpeed}km</Text>
                                                    </View>
                                                    <View style={styles.metricRow}>
                                                        <Text style={styles.metricLabel}>☀️</Text>
                                                        <Text style={styles.metricValue}>{day.sunshineDuration}h</Text>
                                                    </View>
                                                </View>
                                            </View>
                                        ))}
                                    </View>

                                    <Text style={styles.closingHint}>Pull down to close</Text>
                                </LinearGradient>
                            )}
                        </ScrollView>
                    </SafeAreaView>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const createStyles = (colors: typeof Colors.light) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 20,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    greeting: {
        fontSize: 16,
        color: '#FFF',
        opacity: 0.9,
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFF',
        marginTop: 4,
    },
    avatarContainer: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: '#FFF',
    },
    avatarText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFF',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 120,
    },
    section: {
        paddingHorizontal: 20,
        marginTop: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.text,
    },
    seeAll: {
        fontSize: 14,
        color: colors.primary,
        fontWeight: '600',
    },
    weatherCard: {
        borderRadius: 20,
        padding: 20,
        marginTop: 0,
    },
    weatherHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    weatherLocation: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFF',
    },
    weatherCondition: {
        fontSize: 14,
        color: '#FFF',
        opacity: 0.9,
        marginTop: 4,
    },
    weatherTempContainer: {
        alignItems: 'flex-end',
        gap: 4,
    },
    weatherTemp: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#FFF',
    },
    weatherFeelsLike: {
        fontSize: 13,
        color: '#FFF',
        opacity: 0.85,
        fontStyle: 'italic',
    },
    weatherDetails: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 20,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    weatherDetailItem: {
        alignItems: 'center',
        gap: 4,
    },
    weatherDetailLabel: {
        fontSize: 11,
        color: '#FFF',
        opacity: 0.8,
    },
    weatherDetailValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFF',
    },
    weatherForecast: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 4,
    },
    weatherItem: {
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    weatherTime: {
        fontSize: 12,
        color: '#FFF',
        opacity: 0.9,
    },
    weatherEmoji: {
        fontSize: 24,
    },
    weatherItemTemp: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFF',
    },
    weatherMood: {
        fontSize: 10,
        color: '#FFF',
        opacity: 0.8,
        fontWeight: '500',
    },
    loadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 200,
    },
    loadingText: {
        fontSize: 14,
        color: '#FFF',
        marginTop: 12,
        opacity: 0.9,
    },
    emptyWeatherCard: {
        minHeight: 200,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFF',
        marginTop: 12,
    },
    emptySubtext: {
        fontSize: 13,
        color: '#FFF',
        opacity: 0.8,
    },
    statsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingTop: 20,
        gap: 12,
    },
    statCard: {
        flex: 1,
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        gap: 8,
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFF',
    },
    statLabel: {
        fontSize: 12,
        color: '#FFF',
        opacity: 0.9,
    },
    newsCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: colors.cardShadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    newsIconContainer: {
        width: 50,
        height: 50,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    newsContent: {
        flex: 1,
    },
    newsTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.text,
    },
    newsSource: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 4,
    },
    tipCard: {
        backgroundColor: colors.surface,
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        marginTop: 12,
        shadowColor: colors.cardShadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    tipIllustration: {
        marginBottom: 16,
    },
    tipTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
        textAlign: 'center',
        marginBottom: 8,
    },
    tipText: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 130,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    fabGradient: {
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    closeButton: {
        alignSelf: 'center',
        paddingBottom: 12,
        paddingTop: 8,
    },
    modalContent: {
        flex: 1,
    },
    modalScroll: {
        paddingBottom: 24,
    },
    modalGradient: {
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingTop: 20,
        paddingHorizontal: 20,
        paddingBottom: 32,
    },
    mainWeatherSection: {
        alignItems: 'center',
        marginBottom: 32,
        paddingVertical: 20,
    },
    modalLocation: {
        fontSize: 28,
        fontWeight: '800',
        color: '#FFF',
        marginBottom: 12,
        letterSpacing: 0.5,
    },
    mainTempContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        marginBottom: 12,
    },
    mainTemp: {
        fontSize: 80,
        fontWeight: '900',
        color: '#FFF',
        lineHeight: 85,
    },
    mainWeatherIcon: {
        fontSize: 60,
        marginTop: 8,
    },
    mainCondition: {
        fontSize: 20,
        fontWeight: '600',
        color: '#FFF',
        marginBottom: 8,
    },
    feelsLike: {
        fontSize: 14,
        color: '#FFF',
        opacity: 0.8,
        fontStyle: 'italic',
    },
    conditionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 24,
    },
    conditionCard: {
        width: '31%',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 16,
        padding: 14,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    conditionIconBox: {
        marginBottom: 8,
    },
    conditionLabel: {
        fontSize: 11,
        color: '#FFF',
        opacity: 0.8,
        marginBottom: 4,
        textAlign: 'center',
    },
    conditionValue: {
        fontSize: 16,
        fontWeight: '800',
        color: '#FFF',
        textAlign: 'center',
    },
    sunSection: {
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    sunItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    sunDivider: {
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        marginVertical: 12,
    },
    sunInfo: {
        flex: 1,
    },
    sunLabel: {
        fontSize: 12,
        color: '#FFF',
        opacity: 0.7,
        marginBottom: 4,
    },
    sunTime: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFF',
    },
    forecastSection: {
        marginBottom: 24,
    },
    forecastTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFF',
        marginBottom: 12,
        letterSpacing: 0.3,
    },
    hourlyScroll: {
        marginHorizontal: -20,
    },
    hourlyCard: {
        marginHorizontal: 8,
        width: 72,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: 14,
        padding: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    hourlyTime: {
        fontSize: 11,
        color: '#FFF',
        opacity: 0.8,
        fontWeight: '600',
        marginBottom: 6,
    },
    hourlyIcon: {
        fontSize: 28,
        marginBottom: 4,
    },
    hourlyTemp: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFF',
        marginBottom: 4,
    },
    hourlyCond: {
        fontSize: 9,
        color: '#FFF',
        opacity: 0.7,
        textAlign: 'center',
    },
    hourlyDetailCard: {
        marginHorizontal: 8,
        width: 90,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: 14,
        padding: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    hourlyMetrics: {
        width: '100%',
        gap: 4,
        alignItems: 'center',
    },
    humidityBar: {
        width: '80%',
        height: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 3,
        overflow: 'hidden',
        marginTop: 4,
    },
    humidityFill: {
        height: '100%',
        backgroundColor: '#4DD0E1',
        borderRadius: 3,
    },
    hourlySmall: {
        fontSize: 8,
        color: '#FFF',
        opacity: 0.7,
    },
    dailyCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    dailyDetailCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    dayLeft: {
        alignItems: 'center',
        width: 70,
    },
    dayDate: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FFF',
        marginBottom: 6,
    },
    dayIcon: {
        fontSize: 32,
    },
    dayMiddle: {
        flex: 1,
        marginHorizontal: 12,
    },
    dayCondition: {
        fontSize: 13,
        fontWeight: '600',
        color: '#FFF',
        marginBottom: 6,
    },
    dayRight: {
        alignItems: 'flex-end',
        minWidth: 60,
    },
    dayMetrics: {
        alignItems: 'flex-end',
        gap: 4,
    },
    metricRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metricLabel: {
        fontSize: 14,
    },
    metricValue: {
        fontSize: 11,
        fontWeight: '600',
        color: '#FFF',
    },
    tempRange: {
        flexDirection: 'row',
        gap: 12,
    },
    tempItem: {
        alignItems: 'center',
        gap: 2,
    },
    tempLabel: {
        fontSize: 11,
        color: '#FFF',
        opacity: 0.8,
    },
    dayTempMax: {
        fontSize: 16,
        fontWeight: '800',
        color: '#FFF',
    },
    dayTempMin: {
        fontSize: 14,
        color: '#FFF',
        opacity: 0.7,
        fontWeight: '600',
    },
    dayPrecip: {
        fontSize: 11,
        color: '#FFF',
        opacity: 0.8,
    },
    compassSection: {
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        alignItems: 'center',
    },
    compassTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFF',
        marginBottom: 16,
        letterSpacing: 0.3,
    },
    compassContainer: {
        alignItems: 'center',
        gap: 12,
    },
    compass: {
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    compassLabel: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
    },
    compassN: {
        position: 'absolute',
        top: 8,
        fontSize: 14,
        fontWeight: '700',
        color: '#FFF',
    },
    compassE: {
        position: 'absolute',
        right: 8,
        fontSize: 14,
        fontWeight: '700',
        color: '#FFF',
    },
    compassS: {
        position: 'absolute',
        bottom: 8,
        fontSize: 14,
        fontWeight: '700',
        color: '#FFF',
    },
    compassW: {
        position: 'absolute',
        left: 8,
        fontSize: 14,
        fontWeight: '700',
        color: '#FFF',
    },
    windArrow: {
        alignItems: 'center',
    },
    windDegrees: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFF',
    },
    uvIndexBar: {
        width: 20,
        height: 4,
        borderRadius: 2,
        marginTop: 4,
    },
    closingHint: {
        fontSize: 12,
        color: '#FFF',
        opacity: 0.5,
        textAlign: 'center',
        marginTop: 12,
        fontStyle: 'italic',
    },
    tapHint: {
        fontSize: 11,
        color: '#FFF',
        opacity: 0.6,
        textAlign: 'center',
        marginTop: 8,
        fontStyle: 'italic',
    },
});
