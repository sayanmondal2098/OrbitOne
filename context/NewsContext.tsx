import React, { createContext, useState, useContext, ReactNode, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, AppState, AppStateStatus } from 'react-native';
import { parseRSSFeed, safeArticleUrl } from '../services/newsFeed';

const NEWS_SOURCES_KEY = 'orbitone_subscribed_sources_v1';
const CUSTOM_SOURCES_KEY = 'orbitone_custom_sources_v1';
const READ_ARTICLES_KEY = 'orbitone_read_articles_v1';
const NEWS_ARTICLES_CACHE_KEY = 'orbitone_cached_articles_v2';

export interface NewsSource {
    id: string;
    name: string;
    category: 'Tech' | 'Business' | 'Science' | 'Design' | 'World';
    subscribed: boolean;
    isCustom: boolean;
    url?: string;
    color: string;
}

export interface NewsArticle {
    id: string;
    title: string;
    sourceId: string;
    sourceName: string;
    time: string;
    category: 'Tech' | 'Business' | 'Science' | 'Design' | 'World';
    content: string;
    read: boolean;
    color1: string;
    color2: string;
    url?: string;
    publishedAt?: number; // Real epoch timestamp
}

interface NewsContextType {
    sources: NewsSource[];
    articles: NewsArticle[];
    readArticleIds: string[];
    toggleSourceSubscription: (sourceId: string) => void;
    addCustomSource: (name: string, url: string, category: 'Tech' | 'Business' | 'Science' | 'Design' | 'World') => Promise<void>;
    deleteCustomSource: (sourceId: string) => void;
    markArticleAsRead: (articleId: string) => void;
    toggleArticleReadStatus: (articleId: string) => void;
    markAllArticlesAsRead: () => void;
    loading: boolean;
    isSyncing: boolean;
    lastSynced: number | null;
    syncNews: () => Promise<void>;
    syncError: string | null;
}

const NewsContext = createContext<NewsContextType | undefined>(undefined);

// Default publisher subscriptions
const CURATED_SOURCES: NewsSource[] = [
    { id: 'nasa', name: 'NASA', category: 'Science', subscribed: true, isCustom: false, color: '#2563EB' },
    { id: 'techcrunch', name: 'TechCrunch', category: 'Tech', subscribed: true, isCustom: false, color: '#00A86B' },
    { id: 'wired', name: 'Wired', category: 'Tech', subscribed: true, isCustom: false, color: '#FF4500' },
    { id: 'theverge', name: 'The Verge', category: 'Tech', subscribed: true, isCustom: false, color: '#E0115F' },
    { id: 'mittech', name: 'MIT Technology Review', category: 'Science', subscribed: true, isCustom: false, color: '#800020' },
    { id: 'bbc', name: 'BBC News', category: 'World', subscribed: true, isCustom: false, color: '#B22222' },
    { id: 'reuters', name: 'Reuters', category: 'World', subscribed: true, isCustom: false, color: '#FFBF00' },
    { id: 'bloomberg', name: 'Bloomberg', category: 'Business', subscribed: true, isCustom: false, color: '#007FFF' }
];

// Live RSS Feed URLs for Curated Channels (Google News proxy for Reuters & Bloomberg to bypass scraping blocks)
const FEED_URLS: Record<string, string> = {
    nasa: 'https://www.nasa.gov/feed/',
    techcrunch: 'https://techcrunch.com/feed/',
    wired: 'https://www.wired.com/feed/rss',
    theverge: 'https://www.theverge.com/rss/index.xml',
    mittech: 'https://www.technologyreview.com/feed/',
    bbc: 'https://feeds.bbci.co.uk/news/rss.xml',
    reuters: 'https://news.google.com/rss/search?q=Reuters&hl=en-US&gl=US&ceid=US:en',
    bloomberg: 'https://news.google.com/rss/search?q=Bloomberg&hl=en-US&gl=US&ceid=US:en'
};

function getRelativeTime(timestamp?: number): string {
    if (!timestamp) return 'Date unavailable';
    const diff = Date.now() - timestamp;
    if (diff < 60000) return 'Just now';
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

function getSecondaryColor(hexColor: string): string {
    switch (hexColor.toUpperCase()) {
        case '#00A86B': return '#4FACFE';
        case '#FF4500': return '#F9D423';
        case '#E0115F': return '#DF98FA';
        case '#800020': return '#FF6B9D';
        case '#B22222': return '#FF5E62';
        case '#FFBF00': return '#F1C40F';
        case '#007FFF': return '#0052D4';
        default: return '#8B5CF6';
    }
}

// Native apps fetch publishers directly; web uses a CORS proxy.
const fetchFeedArticles = async (source: NewsSource): Promise<NewsArticle[]> => {
    const url = FEED_URLS[source.id] || source.url;
    if (!url) return [];
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
        const proxiedUrl = Platform.OS === 'web'
            ? `https://corsproxy.io/?${encodeURIComponent(url)}`
            : url;
        const response = await fetch(proxiedUrl, {
            signal: controller.signal,
            headers: Platform.OS === 'web' ? {} : {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1'
            }
        });
        if (!response.ok) throw new Error(`Feed returned ${response.status}`);
        const xmlText = await response.text();
        const parsed = parseRSSFeed(xmlText, url);
        const sourceColor = source.color || '#6366F1';
        return parsed.map((item, idx) => {
            const stableKey = item.url 
                ? item.url.replace(/[^a-zA-Z0-9]/g, '').slice(-60) 
                : item.title.replace(/[^a-zA-Z0-9]/g, '').substring(0, 60);
            return {
                id: `${source.id}-${stableKey}`,
                title: item.title,
                sourceId: source.id,
                sourceName: source.name,
                time: getRelativeTime(item.publishedAt),
                category: source.category,
                content: item.content,
                read: false,
                color1: sourceColor,
                color2: getSecondaryColor(sourceColor),
                url: item.url,
                publishedAt: item.publishedAt
            };
        });
    } catch (e) {
        console.log(`Failed to fetch live feed for ${source.name}:`, e);
        return [];
    } finally {
        clearTimeout(timeout);
    }
};

export function NewsProvider({ children }: { children: ReactNode }) {
    const [sources, setSources] = useState<NewsSource[]>([]);
    const [customSources, setCustomSources] = useState<NewsSource[]>([]);
    const [readArticleIds, setReadArticleIds] = useState<string[]>([]);
    const [cachedArticles, setCachedArticles] = useState<NewsArticle[]>([]);
    const [articles, setArticles] = useState<NewsArticle[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const syncingRef = useRef(false);
    const [syncError, setSyncError] = useState<string | null>(null);
    const [lastSynced, setLastSynced] = useState<number | null>(null);

    // Refs to store the latest state, preventing background fetch timers from capturing stale state variables
    const sourcesRef = useRef(sources);
    const customSourcesRef = useRef(customSources);
    const cachedArticlesRef = useRef(cachedArticles);

    useEffect(() => {
        sourcesRef.current = sources;
    }, [sources]);

    useEffect(() => {
        customSourcesRef.current = customSources;
    }, [customSources]);

    useEffect(() => {
        cachedArticlesRef.current = cachedArticles;
    }, [cachedArticles]);

    // Keep a bounded offline reading cache, including older stories if a feed is down.
    const pruneArticles = (items: NewsArticle[]) => items
        .filter(article => article.title && article.url && safeArticleUrl(article.url))
        .sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0))
        .slice(0, 200)
        .map(article => ({ ...article, content: article.content.slice(0, 16000) }));

    // Merges fresh real-time fetched feed articles into local memory
    const triggerBackgroundUpdate = async (
        currentSources?: NewsSource[],
        currentCustom?: NewsSource[],
        currentCache?: NewsArticle[]
    ) => {
        if (syncingRef.current) return;
        syncingRef.current = true;
        setIsSyncing(true);
        setSyncError(null);
        try {
            const activeSources = currentSources || sourcesRef.current;
            const activeCustom = currentCustom || customSourcesRef.current;
            const activeCache = currentCache || cachedArticlesRef.current;

            const allActive = [...activeSources, ...activeCustom].filter(s => s.subscribed);
            if (allActive.length === 0) {
                return;
            }

            const fetchPromises = allActive.map(source => fetchFeedArticles(source));
            const results = await Promise.all(fetchPromises);
            const liveArticles = results.flat();
            if (liveArticles.length && results.some(result => result.length === 0)) {
                setSyncError('Some sources could not refresh. Showing available and saved articles.');
            }

            if (liveArticles.length === 0) {
                setSyncError('Could not refresh news. Check your connection and try again. Saved articles are still available.');
                return;
            }

            const cacheMap = new Map<string, NewsArticle>();
            activeCache.forEach(art => {
                const key = art.url || art.title;
                cacheMap.set(key, art);
            });

            liveArticles.forEach(art => {
                const key = art.url || art.title;
                if (!cacheMap.has(key)) {
                    cacheMap.set(key, art);
                } else {
                    const existing = cacheMap.get(key)!;
                    cacheMap.set(key, {
                        ...art,
                        read: existing.read
                    });
                }
            });

            const mergedList = Array.from(cacheMap.values());
            const pruned = pruneArticles(mergedList);

            cachedArticlesRef.current = pruned;
            setCachedArticles(pruned);
            await AsyncStorage.setItem(NEWS_ARTICLES_CACHE_KEY, JSON.stringify(pruned));
            setLastSynced(Date.now());
        } catch (e) {
            setSyncError('News could not refresh. Please try again.');
            console.error('Failed background news updates:', e);
        } finally {
            syncingRef.current = false;
            setIsSyncing(false);
        }
    };

    // Initial storage loader
    useEffect(() => {
        const loadNewsData = async () => {
            try {
                // 1. Load active curated sources settings
                const storedSources = await AsyncStorage.getItem(NEWS_SOURCES_KEY);
                let loadedSources: NewsSource[] = [];
                if (storedSources) {
                    const saved: NewsSource[] = JSON.parse(storedSources);
                    loadedSources = CURATED_SOURCES.map(source => ({ ...source, subscribed: saved.find(item => item.id === source.id)?.subscribed ?? source.subscribed }));
                } else {
                    loadedSources = CURATED_SOURCES;
                    await AsyncStorage.setItem(NEWS_SOURCES_KEY, JSON.stringify(CURATED_SOURCES));
                }

                // 2. Load custom sources list
                const storedCustom = await AsyncStorage.getItem(CUSTOM_SOURCES_KEY);
                let loadedCustom: NewsSource[] = [];
                if (storedCustom) {
                    loadedCustom = JSON.parse(storedCustom);
                }

                // 3. Load read history IDs
                const storedRead = await AsyncStorage.getItem(READ_ARTICLES_KEY);
                let loadedRead: string[] = [];
                if (storedRead) {
                    loadedRead = JSON.parse(storedRead);
                }

                // 4. Load real articles saved by this version of the feed.
                const storedArticles = await AsyncStorage.getItem(NEWS_ARTICLES_CACHE_KEY);
                let loadedArticles: NewsArticle[] = [];
                if (storedArticles) loadedArticles = JSON.parse(storedArticles);

                // Run pruning cycle
                const pruned = pruneArticles(loadedArticles);
                
                // Save pruned list if changed
                if (pruned.length !== loadedArticles.length || !storedArticles) {
                    await AsyncStorage.setItem(NEWS_ARTICLES_CACHE_KEY, JSON.stringify(pruned));
                }

                setSources(loadedSources);
                setCustomSources(loadedCustom);
                setReadArticleIds(loadedRead);
                setCachedArticles(pruned);

                // Fire instant silent real-time background fetch on load
                triggerBackgroundUpdate(loadedSources, loadedCustom, pruned);
            } catch (e) {
                setSources(CURATED_SOURCES);
                triggerBackgroundUpdate(CURATED_SOURCES, [], []);
                console.error('Failed to load news context storage:', e);
            } finally {
                setLoading(false);
            }
        };

        loadNewsData();
    }, []);

    // Active foreground listener: fetches live feeds when user unlocks or re-opens app
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
            if (nextAppState === 'active') {
                triggerBackgroundUpdate();
            }
        });

        return () => {
            subscription.remove();
        };
    }, []);

    // Active background sync polling interval: fetches updates every 10 minutes when active
    useEffect(() => {
        const interval = setInterval(() => {
            triggerBackgroundUpdate();
        }, 10 * 60 * 1000);

        return () => clearInterval(interval);
    }, []);

    // Combine standard and custom articles based on subscriptions and read state
    useEffect(() => {
        let combinedSources = [...sources, ...customSources];
        let activeSourceIds = combinedSources.filter(s => s.subscribed).map(s => s.id);

        // Filter standard & custom articles in cache that belong to active sources
        const filteredArticles = cachedArticles.filter(art => activeSourceIds.includes(art.sourceId));

        // Map read state matching the loaded ID records
        const mappedArticles = filteredArticles.map(art => ({
            ...art,
            time: getRelativeTime(art.publishedAt),
            read: readArticleIds.includes(art.id)
        }));

        // Sort chronologically by publishedAt descending (newest first)
        const sortedArticles = [...mappedArticles].sort((a, b) => {
            const timeA = a.publishedAt || 0;
            const timeB = b.publishedAt || 0;
            return timeB - timeA;
        });

        setArticles(sortedArticles);
    }, [sources, customSources, cachedArticles, readArticleIds]);

    const toggleSourceSubscription = async (sourceId: string) => {
        try {
            // Check standard list first
            const isStandard = sources.some(s => s.id === sourceId);
            let updatedSources: NewsSource[];
            let updatedCustom = [...customSources];

            if (isStandard) {
                updatedSources = sources.map(s => s.id === sourceId ? { ...s, subscribed: !s.subscribed } : s);
                setSources(updatedSources);
                await AsyncStorage.setItem(NEWS_SOURCES_KEY, JSON.stringify(updatedSources));
            } else {
                updatedSources = [...sources];
                updatedCustom = customSources.map(s => s.id === sourceId ? { ...s, subscribed: !s.subscribed } : s);
                setCustomSources(updatedCustom);
                await AsyncStorage.setItem(CUSTOM_SOURCES_KEY, JSON.stringify(updatedCustom));
            }

            // Fetch live articles instantly if user subscribed to a new feed
            const newlySubscribed = [...updatedSources, ...updatedCustom].find(s => s.id === sourceId);
            if (newlySubscribed && newlySubscribed.subscribed) {
                triggerBackgroundUpdate(updatedSources, updatedCustom, cachedArticles);
            }
        } catch (e) {
            console.error('Error toggling source subscription:', e);
        }
    };

    const addCustomSource = async (name: string, url: string, category: 'Tech' | 'Business' | 'Science' | 'Design' | 'World') => {
        try {
            const cleanName = name.trim();
            const cleanUrl = url.trim();
            const sourceId = `custom-src-${Date.now()}`;
            
            const newSource: NewsSource = {
                id: sourceId,
                name: cleanName,
                category,
                subscribed: true,
                isCustom: true,
                url: cleanUrl || undefined,
                color: '#8A2387'
            };

            if (!cleanName || !safeArticleUrl(cleanUrl)) {
                throw new Error('Enter a source name and a valid HTTPS RSS or Atom feed URL.');
            }
            const newArticles = await fetchFeedArticles(newSource);
            if (!newArticles.length) throw new Error('No articles found. Use an RSS or Atom feed URL and check your connection.');
            const updatedSources = [...customSourcesRef.current, newSource];
            customSourcesRef.current = updatedSources;
            setCustomSources(updatedSources);
            await AsyncStorage.setItem(CUSTOM_SOURCES_KEY, JSON.stringify(updatedSources));
            const updatedCache = pruneArticles([...cachedArticlesRef.current, ...newArticles]);
            cachedArticlesRef.current = updatedCache;
            setCachedArticles(updatedCache);
            await AsyncStorage.setItem(NEWS_ARTICLES_CACHE_KEY, JSON.stringify(updatedCache));
        } catch (e) {
            console.error('Error adding custom news source:', e);
            throw e;
        }
    };

    const deleteCustomSource = async (sourceId: string) => {
        try {
            const updatedSources = customSources.filter(s => s.id !== sourceId);
            setCustomSources(updatedSources);
            await AsyncStorage.setItem(CUSTOM_SOURCES_KEY, JSON.stringify(updatedSources));

            // Clean custom articles from cache when deleted
            const updatedCache = cachedArticles.filter(art => art.sourceId !== sourceId);
            setCachedArticles(updatedCache);
            await AsyncStorage.setItem(NEWS_ARTICLES_CACHE_KEY, JSON.stringify(updatedCache));
        } catch (e) {
            console.error('Error deleting custom news source:', e);
        }
    };

    const markArticleAsRead = async (articleId: string) => {
        try {
            if (readArticleIds.includes(articleId)) return;
            const updated = [...readArticleIds, articleId];
            setReadArticleIds(updated);
            await AsyncStorage.setItem(READ_ARTICLES_KEY, JSON.stringify(updated));
        } catch (e) {
            console.error('Error marking article as read:', e);
        }
    };

    const toggleArticleReadStatus = async (articleId: string) => {
        try {
            let updated: string[];
            if (readArticleIds.includes(articleId)) {
                updated = readArticleIds.filter(id => id !== articleId);
            } else {
                updated = [...readArticleIds, articleId];
            }
            setReadArticleIds(updated);
            await AsyncStorage.setItem(READ_ARTICLES_KEY, JSON.stringify(updated));
        } catch (e) {
            console.error('Error toggling article read status:', e);
        }
    };

    const markAllArticlesAsRead = async () => {
        try {
            const allIds = articles.map(a => a.id);
            const merged = Array.from(new Set([...readArticleIds, ...allIds]));
            setReadArticleIds(merged);
            await AsyncStorage.setItem(READ_ARTICLES_KEY, JSON.stringify(merged));
        } catch (e) {
            console.error('Error marking all articles as read:', e);
        }
    };

    const syncNews = async () => {
        await triggerBackgroundUpdate();
    };

    const allSources = [...sources, ...customSources];

    return (
        <NewsContext.Provider value={{
            sources: allSources,
            articles,
            readArticleIds,
            toggleSourceSubscription,
            addCustomSource,
            deleteCustomSource,
            markArticleAsRead,
            toggleArticleReadStatus,
            markAllArticlesAsRead,
            loading,
            isSyncing,
            lastSynced,
            syncError,
            syncNews
        }}>
            {children}
        </NewsContext.Provider>
    );
}

export function useNews() {
    const context = useContext(NewsContext);
    if (context === undefined) {
        throw new Error('useNews must be used within a NewsProvider');
    }
    return context;
}
