import React, { useEffect, useRef, useState, useCallback } from 'react';
import { StyleSheet, View, ScrollView, Text, TouchableOpacity, Animated, ActivityIndicator, Platform, Modal, TextInput, Alert, Linking, RefreshControl } from 'react-native';
import { SafeAreaView, useSafeAreaInsets, SafeAreaProvider } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../constants/Colors';
import { WelcomeIllustration } from '../components/illustrations';
import { useLocation } from '../context/LocationContext';
import { useTheme } from '../context/ThemeContext';
import { useTasks } from '../context/TasksContext';
import { useNews } from '../context/NewsContext';
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

/**
 * Get dynamic weather gradient colors based on the condition string
 */
function getWeatherGradientColors(condition: string): [string, string] {
    const cond = (condition || '').toLowerCase();
    if (cond.includes('sun') || cond.includes('clear')) {
        return ['#FF8C00', '#FF3C83']; // Sunrise/Sunset glow (Vibrant orange to pink)
    }
    if (cond.includes('rain') || cond.includes('shower') || cond.includes('drizzle')) {
        return ['#2A3650', '#4A6B82']; // Rainy slate blue to steel teal
    }
    if (cond.includes('cloud') || cond.includes('overcast') || cond.includes('mist') || cond.includes('fog')) {
        return ['#3E4E6C', '#6C7E9D']; // Soft cloudy charcoal slate
    }
    if (cond.includes('snow') || cond.includes('ice') || cond.includes('freeze')) {
        return ['#70A1FF', '#A0E7E5']; // Ice freeze light blue to aqua
    }
    if (cond.includes('thunder') || cond.includes('storm')) {
        return ['#0F172A', '#3D1C5C']; // Dark stormy night
    }
    return ['#4FACFE', '#00F2FE']; // Default refreshing sky gradient
}

interface HeaderTheme {
    greeting: string;
    subtitle: string;
    colors: [string, string];
    icon: string;
}

function getHeaderTheme(hour: number): HeaderTheme {
    if (hour >= 5 && hour < 12) {
        return {
            greeting: 'Good Morning 🌅',
            subtitle: "Rise & shine! Let's get things done.",
            colors: ['#FF5E62', '#FF9966'], // Vibrant morning sunrise
            icon: 'sunny-outline',
        };
    } else if (hour >= 12 && hour < 17) {
        return {
            greeting: 'Good Afternoon ☀️',
            subtitle: 'Hope you are having a wonderful day!',
            colors: ['#4FACFE', '#00F2FE'], // Crisp sky blue
            icon: 'sunny',
        };
    } else if (hour >= 17 && hour < 21) {
        return {
            greeting: 'Good Evening 🌆',
            subtitle: 'Time to unwind and celebrate your wins.',
            colors: ['#B24592', '#F15F79'], // Sunset warm purple-pink
            icon: 'sunset-outline',
        };
    } else {
        return {
            greeting: 'Good Night 🌙',
            subtitle: 'Rest well & recharge for tomorrow.',
            colors: ['#0F2027', '#203A43'], // Midnight space slate
            icon: 'moon-outline',
        };
    }
}

function getInitials(name: string): string {
    if (!name) return 'JD';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0) return 'JD';
    if (parts.length === 1) {
        return parts[0].substring(0, 2).toUpperCase();
    }
    return (parts[0][0] + (parts[1][0] || '')).toUpperCase();
}

export default function HomeScreen() {
    const insets = useSafeAreaInsets();
    const [profileName, setProfileName] = useState('John Doe');

    const loadProfileName = useCallback(async () => {
        try {
            const savedName = await AsyncStorage.getItem('orbitone_profile_name');
            if (savedName) {
                setProfileName(savedName);
            } else {
                setProfileName('John Doe');
            }
        } catch (e) {
            console.log('Failed to load profile name on home:', e);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadProfileName();
        }, [loadProfileName])
    );
    const weatherScale = useRef(new Animated.Value(0.8)).current;
    const weatherOpacity = useRef(new Animated.Value(0)).current;
    const { primaryLocation, weatherData, updateWeather, shouldRefreshWeather } = useLocation();
    const { theme, colors } = useTheme();
    const { tasks } = useTasks();
    const [isLoading, setIsLoading] = useState(false);
    const [showWeatherModal, setShowWeatherModal] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const pulseValue = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseValue, {
                    toValue: 1.4,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseValue, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        );
        pulse.start();
        return () => pulse.stop();
    }, []);

    const [headerTheme, setHeaderTheme] = useState(() => getHeaderTheme(new Date().getHours()));

    useEffect(() => {
        const interval = setInterval(() => {
            setHeaderTheme(getHeaderTheme(new Date().getHours()));
        }, 15000); // Check every 15 seconds to keep it absolutely active and responsive
        return () => clearInterval(interval);
    }, []);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            const promises: Promise<any>[] = [syncNews()];
            if (primaryLocation) {
                promises.push((async () => {
                    try {
                        const weather = await fetchWeather(
                            primaryLocation.latitude,
                            primaryLocation.longitude,
                            primaryLocation.id
                        );
                        updateWeather(primaryLocation.id, weather);
                    } catch (e) {
                        console.error('Error refreshing weather on pull:', e);
                    }
                })());
            }
            await Promise.all(promises);
        } catch (error) {
            console.error('Refresh failed:', error);
        } finally {
            setIsRefreshing(false);
        }
    };

    const formatLastSynced = (timestamp: number | null): string => {
        if (!timestamp) return '';
        const diff = Date.now() - timestamp;
        if (diff < 60000) return 'just now';
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        return `${hours}h ago`;
    };
    
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

    // Connect global interactive news context
    const { 
        articles, 
        sources, 
        toggleSourceSubscription, 
        addCustomSource, 
        deleteCustomSource, 
        markArticleAsRead, 
        toggleArticleReadStatus, 
        markAllArticlesAsRead,
        isSyncing,
        lastSynced,
        syncNews
    } = useNews();

    const [activeArticle, setActiveArticle] = useState<any | null>(null);
    const currentActiveArticle = React.useMemo(() => {
        if (!activeArticle) return null;
        return articles.find(a => a.id === activeArticle.id) || activeArticle;
    }, [articles, activeArticle]);
    const [readerVisible, setReaderVisible] = useState(false);
    const [cameFromDrawer, setCameFromDrawer] = useState(false);
    const [sourcesModalVisible, setSourcesModalVisible] = useState(false);
    const [activeTab, setActiveTab] = useState<'feed' | 'sources'>('feed');
    const [newsSearchQuery, setNewsSearchQuery] = useState('');
    const [newsReadFilter, setNewsReadFilter] = useState<'all' | 'unread' | 'read'>('all');
    const [newsCategoryFilter, setNewsCategoryFilter] = useState<string>('All');
    const [headerExpanded, setHeaderExpanded] = useState(false);

    // Add Custom Source states
    const [newSourceName, setNewSourceName] = useState('');
    const [newSourceUrl, setNewSourceUrl] = useState('');
    const [newSourceCategory, setNewSourceCategory] = useState<'Tech' | 'Business' | 'Science' | 'Design' | 'World'>('Tech');

    const handleCloseReader = () => {
        setReaderVisible(false);
        if (cameFromDrawer) {
            setTimeout(() => {
                setSourcesModalVisible(true);
                setCameFromDrawer(false);
            }, 400);
        }
    };

    const moods = ['Great', 'Perfect', 'Good', 'Cool'];

    const DAILY_TIPS = [
        { icon: 'rocket-outline', title: 'Start Small, Win Big', body: 'Break your biggest goals into tiny daily actions. Momentum builds from the very first step. 🚀' },
        { icon: 'bulb-outline', title: 'Protect Your Focus', body: 'Deep work happens in uninterrupted blocks. Guard your calendar like it is your most valuable asset. 💡' },
        { icon: 'fitness-outline', title: 'Energy Over Time', body: 'Manage your energy, not just your time. Peak performance follows great sleep, movement, and nutrition. ⚡' },
        { icon: 'trophy-outline', title: 'Celebrate Every Win', body: 'Acknowledge your small victories. Positive reinforcement rewires your brain for consistency. 🏆' },
        { icon: 'moon-outline', title: 'Rest is Productive', body: 'Recovery is part of the plan. A well-rested mind solves problems faster and creates better ideas. 🌙' },
        { icon: 'trending-up-outline', title: 'Compound Your Habits', body: 'Getting 1% better every day means you will be 37× better by year\'s end. Trust the process. 📈' },
        { icon: 'heart-outline', title: 'Be Kind to Yourself', body: 'Progress over perfection. Every expert was once a beginner who refused to quit. ❤️' },
        { icon: 'compass-outline', title: 'Clarity Before Action', body: 'Spend five minutes planning your day each morning. Clarity eliminates wasted effort and decision fatigue. 🧭' },
    ];

    const [tipIndex, setTipIndex] = useState(0);

    useEffect(() => {
        const tipInterval = setInterval(() => {
            setTipIndex(prev => (prev + 1) % DAILY_TIPS.length);
        }, 7000);
        return () => clearInterval(tipInterval);
    }, []);

    const currentTip = DAILY_TIPS[tipIndex];

    return (
        <View style={styles.container}>
            {/* Header with gradient */}
            <LinearGradient
                colors={headerTheme.colors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.header, { paddingTop: insets.top + 16 }]}
            >
                <View style={styles.headerContent}>
                    <TouchableOpacity 
                        style={{ flex: 1, paddingRight: 10 }}
                        onPress={() => setHeaderExpanded(!headerExpanded)}
                        activeOpacity={0.8}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Ionicons name={headerTheme.icon as any} size={18} color="#FFF" style={{ opacity: 0.9 }} />
                            <Text style={styles.greeting}>{headerTheme.greeting}</Text>
                        </View>
                        <Text 
                            style={styles.name} 
                            numberOfLines={headerExpanded ? undefined : 1}
                        >
                            {headerTheme.subtitle}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={styles.avatarContainer}
                        onPress={() => router.push('/profile')}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={['#EC4899', '#F59E0B']}
                            style={styles.avatar}
                        >
                            <Text style={styles.avatarText}>{getInitials(profileName)}</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            <ScrollView 
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={handleRefresh}
                        colors={['#6366F1']}
                        tintColor="#6366F1"
                    />
                }
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
                                colors={getWeatherGradientColors(weather.condition)}
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
                                <View style={styles.tapHintContainer}>
                                    <Ionicons name="chevron-down" size={13} color="#FFF" style={{ opacity: 0.8 }} />
                                    <Text style={styles.tapHint}>Tap for 12-hour & 7-day forecast</Text>
                                    <Ionicons name="chevron-down" size={13} color="#FFF" style={{ opacity: 0.8 }} />
                                </View>
                            </LinearGradient>
                        </TouchableOpacity>
                    ) : (
                        <LinearGradient
                            colors={['#6366F1', '#8B5CF6']}
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
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <Text style={styles.sectionTitle}>Top News</Text>
                            {isSyncing ? (
                                <ActivityIndicator size="small" color="#10B981" />
                            ) : (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <Animated.View style={[
                                        styles.liveDot,
                                        { transform: [{ scale: pulseValue }] }
                                    ]} />
                                    <Text style={styles.liveText}>Live</Text>
                                </View>
                            )}
                            {lastSynced && (
                                <Text style={styles.lastSyncedText}>
                                    Updated {formatLastSynced(lastSynced)}
                                </Text>
                            )}
                        </View>
                        <TouchableOpacity onPress={() => {
                            setActiveTab('feed');
                            setSourcesModalVisible(true);
                        }}>
                            <Text style={styles.seeAll}>See All / Manage Feeds</Text>
                        </TouchableOpacity>
                    </View>
                    
                    {articles.length > 0 ? (
                        articles.slice(0, 4).map((article) => (
                            <TouchableOpacity 
                                key={article.id} 
                                style={styles.newsCard}
                                onPress={() => {
                                    setCameFromDrawer(false);
                                    markArticleAsRead(article.id);
                                    setActiveArticle(article);
                                    setReaderVisible(true);
                                }}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={[article.color1, article.color2]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.newsIconContainer}
                                >
                                    <Ionicons name="newspaper-outline" size={20} color="#FFF" />
                                </LinearGradient>
                                <View style={styles.newsContent}>
                                    <Text style={styles.newsTitle} numberOfLines={2}>
                                        {article.title}
                                    </Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Text style={styles.newsSource}>{article.sourceName} • {article.time}</Text>
                                        <View style={[styles.miniCategoryBadge, { backgroundColor: article.color1 + '15' }]}>
                                            <Text style={[styles.miniCategoryText, { color: article.color1 }]}>
                                                {article.category}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                                
                                {/* Glowing Cyan Unread Badge */}
                                {!article.read && (
                                    <View style={styles.unreadDot} />
                                )}
                                
                                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} style={{ marginLeft: 6 }} />
                            </TouchableOpacity>
                        ))
                    ) : (
                        <View style={styles.emptyNewsContainer}>
                            <Ionicons name="newspaper-outline" size={40} color={colors.textTertiary} />
                            <Text style={styles.emptyNewsText}>No news active</Text>
                            <Text style={styles.emptyNewsSub}>
                                Subscribe to some news sources in the News Manager to start reading daily updates!
                            </Text>
                            <TouchableOpacity 
                                style={styles.emptyNewsBtn}
                                onPress={() => {
                                    setActiveTab('sources');
                                    setSourcesModalVisible(true);
                                }}
                            >
                                <Text style={styles.emptyNewsBtnText}>Manage Subscriptions</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* Daily Tip Card */}
                <View style={styles.section}>
                    <LinearGradient
                        colors={['#1E1B4B', '#312E81', '#4C1D95']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.tipCard}
                    >
                        {/* Decorative orb */}
                        <View style={styles.tipOrbDecor} />

                        <View style={styles.tipCardInner}>
                            {/* Logo + Icon row */}
                            <View style={styles.tipLogoRow}>
                                <View style={styles.tipLogoWrap}>
                                    <WelcomeIllustration width={72} height={72} />
                                </View>
                                <View style={styles.tipIconBadge}>
                                    <Ionicons name={currentTip.icon as any} size={22} color="#A78BFA" />
                                </View>
                            </View>

                            {/* Text block */}
                            <View style={styles.tipTextBlock}>
                                <View style={styles.tipLabelRow}>
                                    <View style={styles.tipPill}>
                                        <Text style={styles.tipPillText}>Daily Tip</Text>
                                    </View>
                                    {/* Dot indicators */}
                                    <View style={styles.tipDots}>
                                        {DAILY_TIPS.map((_, i) => (
                                            <View
                                                key={i}
                                                style={[styles.tipDot, i === tipIndex && styles.tipDotActive]}
                                            />
                                        ))}
                                    </View>
                                </View>
                                <Text style={styles.tipTitle}>{currentTip.title}</Text>
                                <Text style={styles.tipText}>{currentTip.body}</Text>
                            </View>
                        </View>
                    </LinearGradient>
                </View>
            </ScrollView>

            {/* Weather Details Modal */}
            <Modal
                visible={showWeatherModal}
                animationType="fade"
                transparent={true}
                statusBarTranslucent={true}
                onRequestClose={() => setShowWeatherModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <SafeAreaProvider>
                        <SafeAreaView style={styles.modalContainer}>
                        <ScrollView 
                            style={styles.modalContent}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.modalScroll}
                        >
                            {weather && primaryLocation && (
                                <LinearGradient
                                    colors={getWeatherGradientColors(weather.condition)}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.modalGradient}
                                >
                                    {/* Sleek absolute close button inside expanded view */}
                                    <TouchableOpacity 
                                        style={styles.modalCloseFloatBtn}
                                        onPress={() => setShowWeatherModal(false)}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name="close" size={20} color="#FFF" style={{ opacity: 0.9 }} />
                                    </TouchableOpacity>
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
                    </SafeAreaProvider>
                </View>
            </Modal>

            {/* Immersive Reader View Modal */}
            <Modal
                visible={readerVisible}
                animationType="slide"
                transparent={false}
                statusBarTranslucent={true}
                onRequestClose={handleCloseReader}
            >
                {currentActiveArticle && (
                    <SafeAreaProvider>
                        <SafeAreaView style={[styles.readerContainer, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
                        {/* Immersive Category Gradient Header */}
                        <LinearGradient
                            colors={[currentActiveArticle.color1 + '1a', currentActiveArticle.color2 + '05']}
                            style={styles.readerGlowHeader}
                        >
                            <View style={styles.readerTopActions}>
                                <TouchableOpacity 
                                    style={styles.readerCloseBtn}
                                    onPress={handleCloseReader}
                                >
                                    <Ionicons name="arrow-back-outline" size={24} color={colors.text} />
                                </TouchableOpacity>
                                
                                <View style={{ flexDirection: 'row', gap: 12 }}>
                                    {/* Mark Read/Unread Manual Action */}
                                    <TouchableOpacity 
                                        style={styles.readerActionBtn}
                                        onPress={() => toggleArticleReadStatus(currentActiveArticle.id)}
                                    >
                                        <Ionicons 
                                            name={currentActiveArticle.read ? "eye-off-outline" : "eye-outline"} 
                                            size={22} 
                                            color={colors.textSecondary} 
                                        />
                                        <Text style={styles.readerActionText}>
                                            {currentActiveArticle.read ? 'Keep Unread' : 'Mark Read'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                            
                            <View style={styles.readerHeaderMeta}>
                                <View style={[styles.categoryBadge, { backgroundColor: currentActiveArticle.color1 }]}>
                                    <Text style={styles.categoryBadgeText}>{currentActiveArticle.category}</Text>
                                </View>
                                <Text style={styles.readerTitle}>{currentActiveArticle.title}</Text>
                                <View style={styles.readerSubRow}>
                                    <Ionicons name="newspaper-outline" size={14} color={colors.textSecondary} />
                                    <Text style={styles.readerMetaText}>
                                        {currentActiveArticle.sourceName} • {currentActiveArticle.time}
                                    </Text>
                                </View>
                            </View>
                        </LinearGradient>

                        {/* Article Content Scroll */}
                        <ScrollView 
                            style={styles.readerContentScroll}
                            contentContainerStyle={styles.readerContentContainer}
                            showsVerticalScrollIndicator={false}
                        >
                            <Text style={styles.readerBodyText}>
                                {currentActiveArticle.content}
                            </Text>

                            <View style={styles.readerFooterSeparator} />

                            <View style={styles.readerPlatformDisclaimer}>
                                <Ionicons name="shield-checkmark-outline" size={16} color={colors.textTertiary} />
                                <Text style={styles.readerDisclaimerText}>
                                    Clean Reader Mode enabled. Ad-free, tracking-free, optimized reading environment.
                                </Text>
                            </View>

                            {/* Share & Open Links */}
                            <TouchableOpacity 
                                style={[styles.emptyNewsBtn, { alignSelf: 'center', marginTop: 12 }]}
                                onPress={() => {
                                    Alert.alert('Open Original Source', 'Redirecting to native news browser...', [
                                        { text: 'Cancel', style: 'cancel' },
                                        { text: 'Open Feed', onPress: () => {
                                            if (currentActiveArticle.url) {
                                                Linking.openURL(currentActiveArticle.url);
                                            } else {
                                                Alert.alert('Demo Source', 'Custom feed mock link opened successfully.');
                                            }
                                        }}
                                    ]);
                                }}
                            >
                                <Text style={styles.emptyNewsBtnText}>View Source Feed</Text>
                            </TouchableOpacity>
                        </ScrollView>
                        </SafeAreaView>
                    </SafeAreaProvider>
                )}
            </Modal>

            {/* News Sources & Feeds Browser Modal */}
            <Modal
                visible={sourcesModalVisible}
                animationType="slide"
                transparent={true}
                statusBarTranslucent={true}
                onRequestClose={() => setSourcesModalVisible(false)}
            >
                <TouchableOpacity 
                    style={styles.modalOverlay} 
                    activeOpacity={1} 
                    onPress={() => setSourcesModalVisible(false)}
                >
                    <SafeAreaProvider style={{ flex: 1, width: '100%', justifyContent: 'flex-end' }}>
                        <SafeAreaView style={[styles.newsDrawerContainer, { marginTop: insets.top + 16 }]} edges={['bottom']}>
                        {/* Segment Tab Controller */}
                        <View style={styles.drawerHeaderContainer}>
                            <View style={styles.drawerHeaderTopRow}>
                                <Text style={styles.drawerHeaderTitle}>News Manager</Text>
                                <TouchableOpacity 
                                    style={styles.drawerCloseIcon}
                                    onPress={() => setSourcesModalVisible(false)}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="close-circle" size={28} color={colors.textSecondary} />
                                </TouchableOpacity>
                            </View>
                            
                            <View style={styles.tabButtonsRow}>
                                <TouchableOpacity 
                                    style={[styles.tabButton, activeTab === 'feed' && styles.tabButtonActive]}
                                    onPress={() => setActiveTab('feed')}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="newspaper-outline" size={16} color={activeTab === 'feed' ? '#FFF' : colors.textSecondary} />
                                    <Text style={[styles.tabButtonText, activeTab === 'feed' && styles.tabButtonTextActive]}>
                                        Browse Feeds
                                    </Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity 
                                    style={[styles.tabButton, activeTab === 'sources' && styles.tabButtonActive]}
                                    onPress={() => setActiveTab('sources')}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="options-outline" size={16} color={activeTab === 'sources' ? '#FFF' : colors.textSecondary} />
                                    <Text style={[styles.tabButtonText, activeTab === 'sources' && styles.tabButtonTextActive]}>
                                        Manage Feeds
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {activeTab === 'feed' ? (
                            /* TAB 1: BROWSE FEEDS BROWSER */
                            <View style={{ flex: 1 }}>
                                {/* Search Articles Bar */}
                                <View style={styles.newsSearchContainer}>
                                    <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
                                    <TextInput
                                        style={styles.newsSearchInput}
                                        placeholder="Search articles..."
                                        placeholderTextColor={colors.textTertiary}
                                        value={newsSearchQuery}
                                        onChangeText={setNewsSearchQuery}
                                    />
                                    {newsSearchQuery !== '' && (
                                        <TouchableOpacity onPress={() => setNewsSearchQuery('')}>
                                            <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
                                        </TouchableOpacity>
                                    )}
                                </View>

                                {/* Filter Sub-Bar */}
                                <View style={styles.newsFilterRow}>
                                    {/* Read Status Filters */}
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 20 }}>
                                        <TouchableOpacity 
                                            style={[styles.newsFilterPill, newsReadFilter === 'all' && styles.newsFilterPillActive]}
                                            onPress={() => setNewsReadFilter('all')}
                                        >
                                            <Text style={[styles.newsFilterPillText, newsReadFilter === 'all' && styles.newsFilterPillTextActive]}>
                                                All ({articles.length})
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity 
                                            style={[styles.newsFilterPill, newsReadFilter === 'unread' && styles.newsFilterPillActive]}
                                            onPress={() => setNewsReadFilter('unread')}
                                        >
                                            <View style={[styles.unreadDotMini, { marginRight: 4 }]} />
                                            <Text style={[styles.newsFilterPillText, newsReadFilter === 'unread' && styles.newsFilterPillTextActive]}>
                                                Unread ({articles.filter(a => !a.read).length})
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity 
                                            style={[styles.newsFilterPill, newsReadFilter === 'read' && styles.newsFilterPillActive]}
                                            onPress={() => setNewsReadFilter('read')}
                                        >
                                            <Text style={[styles.newsFilterPillText, newsReadFilter === 'read' && styles.newsFilterPillTextActive]}>
                                                Read
                                            </Text>
                                        </TouchableOpacity>
                                        
                                        <View style={{ width: 1, backgroundColor: colors.border, marginVertical: 4 }} />

                                        {/* Category Filters */}
                                        {['All', 'Tech', 'Science', 'Business', 'World'].map(cat => (
                                            <TouchableOpacity
                                                key={cat}
                                                style={[
                                                    styles.newsFilterPill,
                                                    newsCategoryFilter === cat && styles.newsFilterPillActive
                                                ]}
                                                onPress={() => setNewsCategoryFilter(cat)}
                                            >
                                                <Text style={[
                                                    styles.newsFilterPillText,
                                                    newsCategoryFilter === cat && styles.newsFilterPillTextActive
                                                ]}>
                                                    {cat}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>

                                {/* Article Scroll Feed list */}
                                <ScrollView 
                                    style={{ flex: 1, paddingHorizontal: 16 }}
                                    contentContainerStyle={{ paddingBottom: 40 }}
                                    showsVerticalScrollIndicator={false}
                                    refreshControl={
                                        <RefreshControl
                                            refreshing={isRefreshing}
                                            onRefresh={handleRefresh}
                                            colors={['#6366F1']}
                                            tintColor="#6366F1"
                                        />
                                    }
                                >
                                    {articles
                                        .filter(art => {
                                            const matchesSearch = art.title.toLowerCase().includes(newsSearchQuery.toLowerCase()) || 
                                                                art.sourceName.toLowerCase().includes(newsSearchQuery.toLowerCase());
                                            const matchesRead = newsReadFilter === 'all' || 
                                                                (newsReadFilter === 'unread' && !art.read) || 
                                                                (newsReadFilter === 'read' && art.read);
                                            const matchesCategory = newsCategoryFilter === 'All' || art.category === newsCategoryFilter;
                                            return matchesSearch && matchesRead && matchesCategory;
                                        })
                                        .map(art => (
                                            <TouchableOpacity
                                                key={art.id}
                                                style={styles.newsDrawerCard}
                                                onPress={() => {
                                                    setCameFromDrawer(true);
                                                    setSourcesModalVisible(false);
                                                    setTimeout(() => {
                                                        markArticleAsRead(art.id);
                                                        setActiveArticle(art);
                                                        setReaderVisible(true);
                                                    }, 300);
                                                }}
                                                activeOpacity={0.8}
                                            >
                                                <View style={{ flex: 1 }}>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                                        <Text style={styles.newsDrawerSource}>{art.sourceName} • {art.time}</Text>
                                                        <View style={[styles.miniCategoryBadge, { backgroundColor: art.color1 + '15' }]}>
                                                            <Text style={[styles.miniCategoryText, { color: art.color1 }]}>
                                                                {art.category}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                    
                                                    <Text style={[styles.newsDrawerTitle, art.read && { opacity: 0.65 }]} numberOfLines={2}>
                                                        {art.title}
                                                    </Text>
                                                </View>
                                                
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                                    {/* Quick mark-as-read/unread toggler */}
                                                    <TouchableOpacity 
                                                        style={styles.drawerQuickActionBtn}
                                                        onPress={(e) => {
                                                            e.stopPropagation();
                                                            toggleArticleReadStatus(art.id);
                                                        }}
                                                    >
                                                        <Ionicons 
                                                            name={art.read ? "checkmark-circle" : "ellipse-outline"} 
                                                            size={20} 
                                                            color={art.read ? colors.success : colors.textSecondary} 
                                                        />
                                                    </TouchableOpacity>
                                                    
                                                    {!art.read && (
                                                        <View style={styles.unreadDot} />
                                                    )}
                                                    <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                                                </View>
                                            </TouchableOpacity>
                                        ))
                                    }

                                    {articles.length > 0 && articles.filter(art => {
                                        const matchesSearch = art.title.toLowerCase().includes(newsSearchQuery.toLowerCase()) || 
                                                            art.sourceName.toLowerCase().includes(newsSearchQuery.toLowerCase());
                                        const matchesRead = newsReadFilter === 'all' || 
                                                            (newsReadFilter === 'unread' && !art.read) || 
                                                            (newsReadFilter === 'read' && art.read);
                                        const matchesCategory = newsCategoryFilter === 'All' || art.category === newsCategoryFilter;
                                        return matchesSearch && matchesRead && matchesCategory;
                                    }).length === 0 && (
                                        <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                                            <Ionicons name="search-outline" size={48} color={colors.textTertiary} />
                                            <Text style={[styles.emptyNewsText, { marginTop: 12 }]}>No matching articles</Text>
                                            <Text style={styles.emptyNewsSub}>Adjust filters or clear your search to browse.</Text>
                                        </View>
                                    )}
                                </ScrollView>
                            </View>
                        ) : (
                            /* TAB 2: MANAGE NEWS FEED SOURCES */
                            <ScrollView 
                                style={{ flex: 1, paddingHorizontal: 16 }}
                                contentContainerStyle={{ paddingBottom: 40 }}
                                showsVerticalScrollIndicator={false}
                            >
                                <Text style={styles.drawerSectionTitle}>Curated Channels</Text>
                                <Text style={styles.drawerSectionSub}>
                                    Toggle standard premium feeds to populate your dashboard timeline:
                                </Text>

                                <View style={styles.sourcesList}>
                                    {sources.filter(s => !s.isCustom).map(src => (
                                        <View key={src.id} style={styles.sourceItemRow}>
                                            <View style={[styles.sourceItemBullet, { backgroundColor: src.color }]} />
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.sourceItemName}>{src.name}</Text>
                                                <Text style={styles.sourceItemMeta}>{src.category} news</Text>
                                            </View>
                                            
                                            <TouchableOpacity
                                                style={[
                                                    styles.sourceToggleBtn,
                                                    src.subscribed && styles.sourceToggleBtnActive
                                                ]}
                                                onPress={() => toggleSourceSubscription(src.id)}
                                            >
                                                <Text style={[
                                                    styles.sourceToggleText,
                                                    src.subscribed && styles.sourceToggleTextActive
                                                ]}>
                                                    {src.subscribed ? 'Subscribed' : 'Subscribe'}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </View>

                                {/* Custom news channels section */}
                                <View style={styles.separator} />
                                <Text style={styles.drawerSectionTitle}>Custom Sources</Text>
                                <Text style={styles.drawerSectionSub}>
                                    Add your own RSS feeds or custom news categories:
                                </Text>

                                {sources.filter(s => s.isCustom).length > 0 ? (
                                    <View style={[styles.sourcesList, { marginBottom: 20 }]}>
                                        {sources.filter(s => s.isCustom).map(src => (
                                            <View key={src.id} style={styles.sourceItemRow}>
                                                <View style={[styles.sourceItemBullet, { backgroundColor: src.color }]} />
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.sourceItemName}>{src.name}</Text>
                                                    <Text style={styles.sourceItemMeta}>{src.category} • Custom Feed</Text>
                                                </View>
                                                
                                                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                                                    <TouchableOpacity
                                                        style={[
                                                            styles.sourceToggleBtn,
                                                            src.subscribed && styles.sourceToggleBtnActive
                                                        ]}
                                                        onPress={() => toggleSourceSubscription(src.id)}
                                                    >
                                                        <Text style={[
                                                            styles.sourceToggleText,
                                                            src.subscribed && styles.sourceToggleTextActive
                                                        ]}>
                                                            {src.subscribed ? 'Active' : 'Muted'}
                                                        </Text>
                                                    </TouchableOpacity>

                                                    <TouchableOpacity 
                                                        style={styles.deleteSourceBtn}
                                                        onPress={() => {
                                                            Alert.alert('Delete Source', `Are you sure you want to permanently delete custom source "${src.name}"?`, [
                                                                { text: 'Cancel', style: 'cancel' },
                                                                { text: 'Delete', style: 'destructive', onPress: () => deleteCustomSource(src.id) }
                                                            ]);
                                                        }}
                                                    >
                                                        <Ionicons name="trash-outline" size={18} color={colors.error} />
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                ) : (
                                    <View style={styles.emptyCustomBox}>
                                        <Text style={styles.emptyCustomText}>No custom sources added yet.</Text>
                                    </View>
                                )}

                                {/* Add Custom Source Form block */}
                                <View style={styles.customSourceForm}>
                                    <Text style={styles.formSectionTitle}>Add Custom Channel</Text>
                                    
                                    <Text style={styles.formLabel}>Source Name</Text>
                                    <TextInput
                                        style={styles.formInput}
                                        placeholder="e.g. Hacker News, Product Hunt"
                                        placeholderTextColor={colors.textTertiary}
                                        value={newSourceName}
                                        onChangeText={setNewSourceName}
                                    />

                                    <Text style={styles.formLabel}>Web URL / RSS Link (Optional)</Text>
                                    <TextInput
                                        style={styles.formInput}
                                        placeholder="e.g. https://news.ycombinator.com"
                                        placeholderTextColor={colors.textTertiary}
                                        value={newSourceUrl}
                                        onChangeText={setNewSourceUrl}
                                        autoCapitalize="none"
                                    />

                                    <Text style={styles.formLabel}>Content Category</Text>
                                    <View style={styles.formCategoryRow}>
                                        {(['Tech', 'Business', 'Science', 'Design', 'World'] as const).map(cat => (
                                            <TouchableOpacity
                                                key={cat}
                                                style={[
                                                    styles.categoryChip,
                                                    newSourceCategory === cat && styles.categoryChipActive
                                                ]}
                                                onPress={() => setNewSourceCategory(cat)}
                                            >
                                                <Text style={[
                                                    styles.categoryChipText,
                                                    newSourceCategory === cat && styles.categoryChipTextActive
                                                ]}>
                                                    {cat}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>

                                    <TouchableOpacity 
                                        style={styles.addSourceSubmitBtn}
                                        onPress={() => {
                                            if (!newSourceName.trim()) {
                                                Alert.alert('Required Field', 'Please enter a source name to continue.');
                                                return;
                                            }
                                            addCustomSource(newSourceName.trim(), newSourceUrl.trim(), newSourceCategory);
                                            setNewSourceName('');
                                            setNewSourceUrl('');
                                            Alert.alert('Success', `Custom source "${newSourceName}" added and articles seeded successfully!`);
                                        }}
                                    >
                                        <Text style={styles.addSourceSubmitText}>Register News Source</Text>
                                    </TouchableOpacity>
                                </View>
                            </ScrollView>
                        )}
                        </SafeAreaView>
                    </SafeAreaProvider>
                </TouchableOpacity>
            </Modal>
        </View>
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
    liveDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#10B981',
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 4,
    },
    liveText: {
        fontSize: 12,
        color: '#10B981',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    lastSyncedText: {
        fontSize: 11,
        color: colors.textSecondary,
    },
    weatherCard: {
        borderRadius: 24,
        padding: 22,
        marginTop: 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 15,
        elevation: 6,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    weatherHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 22,
    },
    weatherLocation: {
        fontSize: 20,
        fontWeight: '800',
        color: '#FFF',
        letterSpacing: 0.3,
    },
    weatherCondition: {
        fontSize: 14,
        color: '#FFF',
        opacity: 0.95,
        marginTop: 4,
        fontWeight: '600',
    },
    weatherTempContainer: {
        alignItems: 'flex-end',
        gap: 2,
    },
    weatherTemp: {
        fontSize: 52,
        fontWeight: '900',
        color: '#FFF',
        lineHeight: 56,
    },
    weatherFeelsLike: {
        fontSize: 12,
        color: '#FFF',
        opacity: 0.85,
        fontStyle: 'italic',
        fontWeight: '500',
    },
    weatherDetails: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 22,
        paddingVertical: 14,
        paddingHorizontal: 8,
        borderRadius: 18,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
    },
    weatherDetailItem: {
        alignItems: 'center',
        gap: 2,
        flex: 1,
    },
    weatherDetailLabel: {
        fontSize: 10,
        color: 'rgba(255, 255, 255, 0.75)',
        fontWeight: '700',
        textTransform: 'uppercase',
        marginTop: 4,
        letterSpacing: 0.3,
    },
    weatherDetailValue: {
        fontSize: 13,
        fontWeight: '800',
        color: '#FFF',
        marginTop: 2,
    },
    weatherForecast: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 6,
    },
    weatherItem: {
        alignItems: 'center',
        gap: 6,
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
        borderRadius: 12,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    weatherTime: {
        fontSize: 10,
        color: 'rgba(255, 255, 255, 0.85)',
        fontWeight: '600',
    },
    weatherEmoji: {
        fontSize: 20,
        marginVertical: 2,
    },
    weatherItemTemp: {
        fontSize: 13,
        fontWeight: '700',
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
        lineHeight: 20,
    },
    newsSource: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    miniCategoryBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    miniCategoryText: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    unreadDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#00F2FE',
        marginHorizontal: 8,
        shadowColor: '#00F2FE',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 4,
    },
    unreadDotMini: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#00F2FE',
    },
    emptyNewsContainer: {
        alignItems: 'center',
        paddingVertical: 32,
        paddingHorizontal: 20,
        backgroundColor: colors.surfaceSecondary,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    emptyNewsText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.text,
        marginTop: 10,
    },
    emptyNewsSub: {
        fontSize: 13,
        color: colors.textSecondary,
        textAlign: 'center',
        marginTop: 6,
        lineHeight: 18,
    },
    emptyNewsBtn: {
        marginTop: 16,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: colors.primary + '15',
        borderWidth: 1,
        borderColor: colors.primary + '35',
    },
    emptyNewsBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.primary,
    },
    // Reader View styles
    readerContainer: {
        flex: 1,
    },
    readerGlowHeader: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 24,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    readerTopActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    readerCloseBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
    },
    readerActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
    },
    readerActionText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.text,
    },
    readerHeaderMeta: {
        gap: 12,
    },
    categoryBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    categoryBadgeText: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#FFF',
        textTransform: 'uppercase',
    },
    readerTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: colors.text,
        lineHeight: 32,
    },
    readerSubRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    readerMetaText: {
        fontSize: 13,
        color: colors.textSecondary,
    },
    readerContentScroll: {
        flex: 1,
    },
    readerContentContainer: {
        padding: 20,
        paddingBottom: 60,
    },
    readerBodyText: {
        fontSize: 16,
        lineHeight: 26,
        color: colors.text,
        fontWeight: '400',
    },
    readerFooterSeparator: {
        height: 1,
        backgroundColor: colors.border,
        marginVertical: 24,
    },
    readerPlatformDisclaimer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: colors.surfaceSecondary,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    readerDisclaimerText: {
        fontSize: 12,
        color: colors.textSecondary,
        flex: 1,
        lineHeight: 16,
    },
    // Manager & Browser styles
    newsDrawerContainer: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        flex: 1,
        width: '100%',
        paddingTop: 12,
    },
    drawerHeaderContainer: {
        paddingHorizontal: 20,
        marginBottom: 16,
        gap: 12,
    },
    drawerHeaderTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    drawerHeaderTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.text,
    },
    tabButtonsRow: {
        flexDirection: 'row',
        backgroundColor: colors.surfaceSecondary,
        borderRadius: 20,
        padding: 3,
        alignSelf: 'stretch',
    },
    tabButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 8,
        borderRadius: 18,
    },
    tabButtonActive: {
        backgroundColor: colors.primary,
    },
    tabButtonText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    tabButtonTextActive: {
        color: '#FFF',
    },
    drawerCloseIcon: {
        padding: 2,
    },
    newsSearchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceSecondary,
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
        gap: 8,
        borderWidth: 1,
        borderColor: colors.border,
    },
    newsSearchInput: {
        flex: 1,
        fontSize: 14,
        color: colors.text,
    },
    newsFilterRow: {
        marginBottom: 12,
        paddingLeft: 16,
    },
    newsFilterPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 16,
        backgroundColor: colors.surfaceSecondary,
        borderWidth: 1,
        borderColor: colors.border,
    },
    newsFilterPillActive: {
        backgroundColor: colors.primary + '15',
        borderColor: colors.primary,
    },
    newsFilterPillText: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    newsFilterPillTextActive: {
        color: colors.primary,
        fontWeight: 'bold',
    },
    newsDrawerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceSecondary + '50',
        padding: 14,
        borderRadius: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 12,
    },
    newsDrawerSource: {
        fontSize: 11,
        color: colors.textSecondary,
    },
    newsDrawerTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
        lineHeight: 18,
        marginTop: 2,
    },
    drawerQuickActionBtn: {
        padding: 6,
    },
    drawerSectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.text,
        marginTop: 16,
        marginBottom: 4,
    },
    drawerSectionSub: {
        fontSize: 13,
        color: colors.textSecondary,
        marginBottom: 16,
        lineHeight: 18,
    },
    sourcesList: {
        gap: 10,
    },
    sourceItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceSecondary,
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 10,
    },
    sourceItemBullet: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    sourceItemName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.text,
    },
    sourceItemMeta: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 2,
    },
    sourceToggleBtn: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 12,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
    },
    sourceToggleBtnActive: {
        backgroundColor: colors.success + '15',
        borderColor: colors.success,
    },
    sourceToggleText: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '600',
    },
    sourceToggleTextActive: {
        color: colors.success,
        fontWeight: 'bold',
    },
    deleteSourceBtn: {
        padding: 8,
        borderRadius: 10,
        backgroundColor: colors.error + '10',
    },
    emptyCustomBox: {
        alignItems: 'center',
        paddingVertical: 20,
        backgroundColor: colors.surfaceSecondary + '50',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        borderStyle: 'dashed',
        marginBottom: 16,
    },
    emptyCustomText: {
        fontSize: 13,
        color: colors.textTertiary,
    },
    customSourceForm: {
        marginTop: 24,
        padding: 16,
        borderRadius: 16,
        backgroundColor: colors.surfaceSecondary,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 10,
    },
    formSectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.text,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    formLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    formInput: {
        backgroundColor: colors.surface,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: 12,
        paddingVertical: 8,
        fontSize: 14,
        color: colors.text,
    },
    formCategoryRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    categoryChip: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 12,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
    },
    categoryChipActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    categoryChipText: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    categoryChipTextActive: {
        color: '#FFF',
        fontWeight: 'bold',
    },
    addSourceSubmitBtn: {
        marginTop: 12,
        backgroundColor: colors.primary,
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addSourceSubmitText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#FFF',
    },
    tipCard: {
        borderRadius: 24,
        padding: 22,
        marginTop: 12,
        overflow: 'hidden',
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 20,
        elevation: 10,
    },
    tipOrbDecor: {
        position: 'absolute',
        width: 180,
        height: 180,
        borderRadius: 90,
        backgroundColor: '#6366F1',
        opacity: 0.08,
        top: -60,
        right: -40,
    },
    tipCardInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    tipLogoRow: {
        position: 'relative',
        width: 72,
        height: 72,
        flexShrink: 0,
    },
    tipLogoWrap: {
        width: 72,
        height: 72,
    },
    tipIconBadge: {
        position: 'absolute',
        bottom: -4,
        right: -4,
        backgroundColor: 'rgba(99,102,241,0.25)',
        borderRadius: 12,
        padding: 4,
        borderWidth: 1,
        borderColor: 'rgba(167,139,250,0.3)',
    },
    tipTextBlock: {
        flex: 1,
        gap: 6,
    },
    tipLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    tipPill: {
        backgroundColor: 'rgba(167,139,250,0.2)',
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderWidth: 1,
        borderColor: 'rgba(167,139,250,0.3)',
    },
    tipPillText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#C4B5FD',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
    },
    tipDots: {
        flexDirection: 'row',
        gap: 4,
        alignItems: 'center',
    },
    tipDot: {
        width: 5,
        height: 5,
        borderRadius: 3,
        backgroundColor: 'rgba(196,181,253,0.25)',
    },
    tipDotActive: {
        width: 14,
        backgroundColor: '#A78BFA',
    },
    tipIllustration: {
        marginBottom: 16,
    },
    tipTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#F5F3FF',
        marginBottom: 5,
        lineHeight: 20,
    },
    tipText: {
        fontSize: 13,
        color: '#C4B5FD',
        lineHeight: 19,
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
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
        borderRadius: 18,
        padding: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    conditionIconBox: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 6,
    },
    conditionLabel: {
        fontSize: 10,
        color: '#FFF',
        opacity: 0.8,
        marginBottom: 4,
        textAlign: 'center',
        fontWeight: '600',
    },
    conditionValue: {
        fontSize: 14,
        fontWeight: '800',
        color: '#FFF',
        textAlign: 'center',
    },
    sunSection: {
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
        borderRadius: 20,
        padding: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
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
        marginHorizontal: 6,
        width: 96,
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
        borderRadius: 18,
        padding: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
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
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
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
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
        borderRadius: 20,
        padding: 20,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
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
    separator: {
        height: 1,
        backgroundColor: colors.border,
        marginVertical: 20,
    },
    tapHintContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: 16,
    },
    tapHint: {
        fontSize: 11,
        color: '#FFF',
        opacity: 0.85,
        fontWeight: '600',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    modalCloseFloatBtn: {
        position: 'absolute',
        top: 20,
        right: 20,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 15,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.25)',
    },
});
