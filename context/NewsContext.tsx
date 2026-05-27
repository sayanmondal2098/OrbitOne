import React, { createContext, useState, useContext, ReactNode, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, AppState, AppStateStatus } from 'react-native';

const NEWS_SOURCES_KEY = 'orbitone_subscribed_sources_v1';
const CUSTOM_SOURCES_KEY = 'orbitone_custom_sources_v1';
const READ_ARTICLES_KEY = 'orbitone_read_articles_v1';
const NEWS_ARTICLES_CACHE_KEY = 'orbitone_cached_articles_v1';

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
    addCustomSource: (name: string, url: string, category: 'Tech' | 'Business' | 'Science' | 'Design' | 'World') => void;
    deleteCustomSource: (sourceId: string) => void;
    markArticleAsRead: (articleId: string) => void;
    toggleArticleReadStatus: (articleId: string) => void;
    markAllArticlesAsRead: () => void;
    loading: boolean;
    isSyncing: boolean;
    lastSynced: number | null;
    syncNews: () => Promise<void>;
}

const NewsContext = createContext<NewsContextType | undefined>(undefined);

// Seeds curated news sources
const CURATED_SOURCES: NewsSource[] = [
    { id: 'techcrunch', name: 'TechCrunch', category: 'Tech', subscribed: true, isCustom: false, color: '#00A86B' },
    { id: 'wired', name: 'Wired', category: 'Tech', subscribed: true, isCustom: false, color: '#FF4500' },
    { id: 'theverge', name: 'The Verge', category: 'Tech', subscribed: true, isCustom: false, color: '#E0115F' },
    { id: 'mittech', name: 'MIT Technology Review', category: 'Science', subscribed: true, isCustom: false, color: '#800020' },
    { id: 'bbc', name: 'BBC News', category: 'World', subscribed: true, isCustom: false, color: '#B22222' },
    { id: 'reuters', name: 'Reuters', category: 'World', subscribed: true, isCustom: false, color: '#FFBF00' },
    { id: 'bloomberg', name: 'Bloomberg', category: 'Business', subscribed: true, isCustom: false, color: '#007FFF' }
];

// Seeded articles for each curated source with authentic, real-world content and live links
const SEEDED_ARTICLES: NewsArticle[] = [
    {
        id: 'tc-1',
        title: 'OpenAI unveils GPT-4o, its newest flagship AI model that is much faster and smarter',
        sourceId: 'techcrunch',
        sourceName: 'TechCrunch',
        time: '2h ago',
        category: 'Tech',
        content: 'OpenAI has officially launched its new flagship AI model, GPT-4o. The model is vastly faster than previous versions and improves capabilities across text, vision, and audio, making voice conversation feel completely seamless. In a live demonstration, OpenAI showed the model responding to voice prompts in real-time, translating between languages instantly, and even singing a song when asked. GPT-4o is rolling out to both free and paid users over the coming weeks, democratizing high-tier conversational AI for millions.',
        read: false,
        color1: '#00A86B',
        color2: '#4facfe',
        url: 'https://techcrunch.com/2024/05/13/openai-unveils-gpt-4o-its-newest-ai-model/'
    },
    {
        id: 'tc-2',
        title: 'AI coding startup Cognition Labs raises $175M at a $2B valuation',
        sourceId: 'techcrunch',
        sourceName: 'TechCrunch',
        time: '3h ago',
        category: 'Tech',
        content: 'Cognition Labs, the startup behind the AI coding assistant \'Devin\', has raised a massive $175 million in a funding round led by Founders Fund at a staggering $2 billion valuation. The funding round comes just weeks after the company introduced Devin, which it claims is the first fully autonomous AI software engineer capable of writing entire codebases, fixing bugs, and deploying products. Investors are pouring billions into AI agent startups, betting that the next wave of productivity gains will come from autonomous agents capable of performing complex multi-step reasoning.',
        read: false,
        color1: '#11998E',
        color2: '#38EF7D',
        url: 'https://techcrunch.com/2024/04/24/cognition-labs-funding-valuation-peter-thiel-founders-fund/'
    },
    {
        id: 'wired-1',
        title: 'The AI-powered future of web search is already here—and it is messy',
        sourceId: 'wired',
        sourceName: 'Wired',
        time: '4h ago',
        category: 'Tech',
        content: 'Google has officially launched AI Overviews in standard search results, aiming to answer complex queries directly rather than pointing users to lists of links. However, the rollout has been met with immediate controversy as the system generated highly questionable and inaccurate responses. Despite these speedbumps, industry analysts agree that generative search represents the single largest shift in how humans access information since the index was created. Companies are now racing to secure licensing deals with content publishers to feed future LLMs.',
        read: false,
        color1: '#FF4500',
        color2: '#F9D423',
        url: 'https://www.wired.com/story/google-ai-overviews-search-future/'
    },
    {
        id: 'wired-2',
        title: 'The security flaws lurking inside your favorite smart home products',
        sourceId: 'wired',
        sourceName: 'Wired',
        time: '6h ago',
        category: 'Tech',
        content: 'Cybersecurity researchers have uncovered alarming critical vulnerabilities inside dozens of widely used smart home internet-of-things (IoT) devices, ranging from smart locks to connected security cameras. Many of these products utilize default hardcoded passwords, lack end-to-end encryption protocols, or fail to receive timely firmware updates. Security experts urge consumers to isolate IoT devices on dedicated guest Wi-Fi networks and advocate for stricter regulatory baselines governing consumer hardware safety.',
        read: false,
        color1: '#FF4E50',
        color2: '#F9D423',
        url: 'https://www.wired.com/story/smart-home-iot-security-vulnerabilities/'
    },
    {
        id: 'verge-1',
        title: 'Apple unveils M4 chip with major focus on artificial intelligence tasks',
        sourceId: 'theverge',
        sourceName: 'The Verge',
        time: '5h ago',
        category: 'Tech',
        content: 'Apple surprised the tech industry by skipping the M3 chip for the new iPad Pro and jumping straight to the M4. Built on second-generation 3-nanometer technology, the M4 features Apple\'s fastest Neural Engine ever, capable of performing an astonishing 38 trillion operations per second. Apple states this Neural Engine is faster than the NPU in any AI PC on the market today. This release signals a massive pivot for Apple as it gears up to integrate deeply-embedded AI functionalities across iOS, iPadOS, and macOS in the upcoming major OS upgrades.',
        read: false,
        color1: '#E0115F',
        color2: '#DF98FA',
        url: 'https://www.theverge.com/2024/5/7/24151042/apple-m4-chip-ipad-pro-ai-neural-engine-specs'
    },
    {
        id: 'verge-2',
        title: 'Microsoft introduces Copilot+ PCs with local AI capabilities',
        sourceId: 'theverge',
        sourceName: 'The Verge',
        time: '7h ago',
        category: 'Tech',
        content: 'Microsoft has announced a new class of Windows devices called \'Copilot+ PCs\' powered by specialized high-performance NPUs. These computers feature deep local AI features, including \'Recall\', which takes periodic screenshots to let you search through your past activity on your computer. Microsoft states that these NPUs can process 40+ trillion operations per second locally, enabling intelligent features with zero cloud latency. Hardware partners include Qualcomm, Intel, and AMD.',
        read: false,
        color1: '#0072FF',
        color2: '#00C6FF',
        url: 'https://www.theverge.com/2024/5/20/24160274/microsoft-copilot-plus-pcs-ai-surface-pro-laptop-specifications'
    },
    {
        id: 'mit-1',
        title: 'Why we are closer than ever to harnessing nuclear fusion energy',
        sourceId: 'mittech',
        sourceName: 'MIT Technology Review',
        time: '7h ago',
        category: 'Science',
        content: 'Scientists at the Joint European Torus (JET) facility in the UK have set a new world record for fusion energy production, generating 69 megajoules of energy over 5 seconds using just 0.2 milligrams of fuel. This milestone represents a monumental step for magnetic confinement fusion research. Using high-powered superconducting tokamaks, this experiment demonstrates that confining plasma at extreme temperatures is highly reproducible, laying the engineering groundwork for future commercial demonstration reactors.',
        read: false,
        color1: '#800020',
        color2: '#FF6B9D',
        url: 'https://www.technologyreview.com/2024/02/08/1087877/nuclear-fusion-jet-record-mit/'
    },
    {
        id: 'bbc-1',
        title: 'Historic ocean preservation treaty signed by member nations at UN',
        sourceId: 'bbc',
        sourceName: 'BBC News',
        time: '8h ago',
        category: 'World',
        content: 'United Nations members have agreed on a historic treaty to protect the high seas, establishing massive marine conservation sanctuaries across international waters where deep-sea mining, cargo traffic, and heavy commercial fishing will be heavily regulated. The landmark \'High Seas Treaty\' covers nearly two-thirds of the ocean that lies outside national jurisdictions, providing a crucial framework to protect marine biodiversity and achieve the global target of conserving 30% of land and sea by 2030.',
        read: false,
        color1: '#B22222',
        color2: '#FF5E62',
        url: 'https://www.bbc.com/news/science-environment-64815782'
    },
    {
        id: 'reuters-1',
        title: 'International shipping embraces wind power technology to slash fuel use',
        sourceId: 'reuters',
        sourceName: 'Reuters',
        time: '10h ago',
        category: 'World',
        content: 'Global shipping giants are turning back to the wind, equipping massive cargo vessels with state-of-the-art solid sails and vertical rotor systems to reduce reliance on heavy fossil fuels. Powered by computerized sensors that adjust angle dynamically, these hybrid propulsion sails cut daily emissions by up to 30%. With strict carbon taxes looming under international agreements, wind-assisted propulsion is rapidly transitioning from experimental concepts into a dominant standard for global logistics fleets.',
        read: false,
        color1: '#FFBF00',
        color2: '#F1C40F',
        url: 'https://www.reuters.com/business/cop/cargo-ships-turn-wind-power-cut-carbon-emissions-2023-11-29/'
    },
    {
        id: 'bloomberg-1',
        title: 'Central banks pivot toward digital currencies amid payment evolution',
        sourceId: 'bloomberg',
        sourceName: 'Bloomberg',
        time: '12h ago',
        category: 'Business',
        content: 'Financial authorities around the globe are accelerating plans for Central Bank Digital Currencies (CBDCs). With digital contactless payments surpassing physical cash in major economies, the shift toward sovereign digital assets is seen as essential to preserving monetary policy control. Unlike traditional decentralized cryptocurrencies, CBDCs are directly backed by central reserve banks, providing peer-to-peer digital transactions with maximum security and absolute stability. Trial runs are already underway in several metropolitan test beds.',
        read: false,
        color1: '#007FFF',
        color2: '#0052D4',
        url: 'https://www.bloomberg.com/news/articles/2023-09-12/central-banks-digital-currency-cbdc-tracker'
    }
];

// Helper to generate dynamic mock articles when a custom source is added
const generateCustomArticles = (
    sourceId: string, 
    sourceName: string, 
    category: 'Tech' | 'Business' | 'Science' | 'Design' | 'World',
    sourceUrl?: string
): NewsArticle[] => {
    const templates = {
        Tech: [
            {
                title: 'Exploring the Next Frontier of Human-Computer Interaction',
                content: 'As computing continues to blend seamlessly into our physical environments, research centers are investigating novel forms of interface technologies. From ultra-low power neural bands that detect muscle micro-movements to spatial auditory displays that float sounds precisely in 3D environments, our relationships with computing interfaces are undergoing a dramatic rewrite.\n\nExperts believe standard physical keyboards and screens will feel completely archaic within ten years, replaced instead by dynamic contextual overlays that respond directly to gaze, gesture, and whispered vocal commands.'
            },
            {
                title: 'Developers turn to post-quantum languages for safety and speed',
                content: 'As security concerns spike globally, software developers are rapidly shifting toward post-quantum programming frameworks. These next-generation languages enforce compile-time verification rules that eliminate entire classes of cyber vulnerabilities such as buffer overflows and memory corruption bugs.\n\nBy weaving cryptographically secure math directly into the compilers, software written in these frameworks runs with extreme speed while offering flawless protection against quantum-scale cyber attacks.'
            }
        ],
        Business: [
            {
                title: 'Sustainable venture capitals see record-breaking inflows',
                content: 'Investors are putting capital where their conscience is. Major green venture funds have reported their largest quarterly inflows in history, driven by aggressive institutional demands for certified eco-positive portfolios.\n\nAnalyst reports suggest that startups demonstrating verifiable carbon offset credentials are now commanded at up to a 35% premium over traditional competitors. The financial markets are clearly signaling that sustainability is no longer a luxury—it is the core baseline for business survival.'
            }
        ],
        Science: [
            {
                title: 'New enzyme discovery offers hope for absolute plastic breakdown',
                content: 'Biochemists have isolated an engineered enzyme capable of chewing through high-density plastics in a matter of hours, rather than centuries. Discovered in organic landfill samples and synthesized in laboratories, this eco-catalyst safely breaks down plastic molecules back into their original, completely non-toxic organic compounds.\n\nIndustrial pilot plants are already spinning up to evaluate this technology at a global scale. If successful, it could enable a fully circular lifecycle for consumer packaging, permanently solving one of the greatest ecological disasters of the modern industrial era.'
            }
        ],
        Design: [
            {
                title: 'Skeuomorphic touches return to modern digital design languages',
                content: 'After a decade of aggressive flat design simplicity, interfaces are taking on a more human, tactile feel once again. Dynamic micro-textures, organic glassmorphic lighting layers, and realistic physical response springs are returning to dashboard designs.\n\nDesign leaders explain that this shift provides immediate neurological comfort, reducing visual fatigue and creating highly intuitive interactive touchpoints that feel responsive, premium, and alive.'
            }
        ],
        World: [
            {
                title: 'Major transit hubs convert entirely to renewable solar microgrids',
                content: 'Decarbonizing global transport is reaching critical milestones as international airport terminals and high-speed rail lines pivot fully to local solar microgrids.\n\nBy leveraging high-density flow batteries and advanced solar roofing, these massive transit complexes are not only generating 100% of their operational electricity, but are also pumping excess solar power back into surrounding local municipal grids during peak hours.'
            }
        ]
    };

    const selections = templates[category] || templates.Tech;
    const now = Date.now();
    return selections.map((sel, idx) => ({
        id: `custom-${sourceId}-${idx}-${now}`,
        title: sel.title,
        sourceId,
        sourceName,
        time: `${idx * 3 + 1}h ago`,
        category,
        content: sel.content,
        read: false,
        color1: '#8A2387',
        color2: '#F27121',
        url: sourceUrl || undefined,
        publishedAt: now - idx * 3 * 60 * 60 * 1000 // Stagger creation times
    }));
};

// Live RSS Feed URLs for Curated Channels (Google News proxy for Reuters & Bloomberg to bypass scraping blocks)
const FEED_URLS: Record<string, string> = {
    techcrunch: 'https://techcrunch.com/feed/',
    wired: 'https://www.wired.com/feed/rss',
    theverge: 'https://www.theverge.com/rss/index.xml',
    mittech: 'https://www.technologyreview.com/feed/',
    bbc: 'https://feeds.bbci.co.uk/news/rss.xml',
    reuters: 'https://news.google.com/rss/search?q=Reuters&hl=en-US&gl=US&ceid=US:en',
    bloomberg: 'https://news.google.com/rss/search?q=Bloomberg&hl=en-US&gl=US&ceid=US:en'
};

function getRelativeTime(timestamp: number): string {
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

function parseRSSFeed(xmlText: string): Array<{
    title: string;
    url: string;
    publishedAt: number;
    content: string;
}> {
    const articles: Array<any> = [];
    const items = xmlText.split(/<item>|<entry>/i);
    for (let i = 1; i < items.length; i++) {
        const itemHtml = items[i];
        
        const extractTagContent = (tag: string): string => {
            const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
            const match = itemHtml.match(regex);
            if (match && match[1]) {
                let content = match[1].trim();
                if (content.startsWith('<![CDATA[')) {
                    content = content.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '').trim();
                }
                content = content.replace(/<[^>]*>/g, '').trim();
                content = content
                    .replace(/&amp;/g, '&')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&quot;/g, '"')
                    .replace(/&apos;/g, "'")
                    .replace(/&#39;/g, "'")
                    .replace(/&ldquo;/g, '"')
                    .replace(/&rdquo;/g, '"')
                    .replace(/&lsquo;/g, "'")
                    .replace(/&rsquo;/g, "'")
                    .replace(/&ndash;/g, '-')
                    .replace(/&mdash;/g, '—')
                    .replace(/&#8217;/g, "'")
                    .replace(/&#8220;/g, '"')
                    .replace(/&#8221;/g, '"');
                return content;
            }
            return '';
        };

        let url = extractTagContent('link');
        if (!url) {
            const linkMatch = itemHtml.match(/<link[^>]*href=["']([^"']+)["']/i);
            if (linkMatch && linkMatch[1]) {
                url = linkMatch[1];
            }
        }
        
        const title = extractTagContent('title');
        const content = extractTagContent('content\\:encoded') || extractTagContent('content') || extractTagContent('description') || extractTagContent('summary');
        const dateStr = extractTagContent('pubDate') || extractTagContent('pubdate') || extractTagContent('updated') || extractTagContent('published');
        let publishedAt = Date.now();
        if (dateStr) {
            const parsed = Date.parse(dateStr);
            if (!isNaN(parsed)) {
                publishedAt = parsed;
            }
        }
        
        if (title && url) {
            articles.push({
                title,
                url,
                publishedAt,
                content: content || 'No article preview available. Tap "View Source Feed" to read the complete article on the publisher\'s website.'
            });
        }
    }
    return articles;
}

// Live articles generator from RSS link
// Live articles generator from RSS link (utilizes a high-reputation CORS proxy on Web to prevent CORS blocks)
const fetchFeedArticles = async (source: NewsSource): Promise<NewsArticle[]> => {
    const url = FEED_URLS[source.id] || source.url;
    if (!url) return [];
    try {
        const proxiedUrl = Platform.OS === 'web'
            ? `https://corsproxy.io/?${encodeURIComponent(url)}`
            : url;
        const response = await fetch(proxiedUrl, {
            headers: Platform.OS === 'web' ? {} : {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1'
            }
        });
        const xmlText = await response.text();
        const parsed = parseRSSFeed(xmlText);
        const sourceColor = source.color || '#6366F1';
        return parsed.map((item, idx) => ({
            id: `${source.id}-${idx}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
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
        }));
    } catch (e) {
        console.log(`Failed to fetch live feed for ${source.name}:`, e);
        return [];
    }
};

const fetchRealRSSFeed = async (
    sourceId: string, 
    sourceName: string, 
    category: 'Tech' | 'Business' | 'Science' | 'Design' | 'World',
    feedUrl: string
): Promise<NewsArticle[]> => {
    try {
        const proxiedUrl = Platform.OS === 'web'
            ? `https://corsproxy.io/?${encodeURIComponent(feedUrl)}`
            : feedUrl;
        const response = await fetch(proxiedUrl);
        const xmlText = await response.text();
        const parsed = parseRSSFeed(xmlText);
        return parsed.map((item, idx) => ({
            id: `${sourceId}-${idx}-${Date.now()}`,
            title: item.title,
            sourceId,
            sourceName,
            time: getRelativeTime(item.publishedAt),
            category,
            content: item.content,
            read: false,
            color1: '#8A2387',
            color2: '#F27121',
            url: item.url,
            publishedAt: item.publishedAt
        }));
    } catch (e) {
        throw e;
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

    // Prune articles: removes articles older than 7 days, and caps total storage under 500 MB
    const pruneArticles = (articleList: NewsArticle[]): NewsArticle[] => {
        const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
        const now = Date.now();

        // 1. Delete articles older than 7 days
        let filtered = articleList.filter(art => {
            const publishedAt = art.publishedAt || now;
            return now - publishedAt <= SEVEN_DAYS_MS;
        });

        // 2. Enforce 500 MB Size Limit (524,288,000 bytes)
        // Discard the oldest articles first if exceeded
        const MAX_SIZE_BYTES = 500 * 1024 * 1024;
        let serialized = JSON.stringify(filtered);
        
        if (serialized.length > MAX_SIZE_BYTES) {
            console.log(`Pruning news cache: Size ${serialized.length} exceeds 500 MB.`);
            // Sort descending (newest first)
            filtered.sort((a, b) => (b.publishedAt || now) - (a.publishedAt || now));
            
            // Pop oldest until it fits under the limit
            while (JSON.stringify(filtered).length > MAX_SIZE_BYTES && filtered.length > 1) {
                filtered.pop();
            }
        }

        return filtered;
    };

    // Merges fresh real-time fetched feed articles into local memory
    const triggerBackgroundUpdate = async (
        currentSources?: NewsSource[],
        currentCustom?: NewsSource[],
        currentCache?: NewsArticle[]
    ) => {
        setIsSyncing(true);
        try {
            const activeSources = currentSources || sourcesRef.current;
            const activeCustom = currentCustom || customSourcesRef.current;
            const activeCache = currentCache || cachedArticlesRef.current;

            const allActive = [...activeSources, ...activeCustom].filter(s => s.subscribed);
            if (allActive.length === 0) {
                setLastSynced(Date.now());
                return;
            }

            const fetchPromises = allActive.map(source => fetchFeedArticles(source));
            const results = await Promise.all(fetchPromises);
            const liveArticles = results.flat();

            if (liveArticles.length === 0) {
                setLastSynced(Date.now());
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

            setCachedArticles(pruned);
            await AsyncStorage.setItem(NEWS_ARTICLES_CACHE_KEY, JSON.stringify(pruned));
            setLastSynced(Date.now());
        } catch (e) {
            console.error('Failed background news updates:', e);
        } finally {
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
                    loadedSources = JSON.parse(storedSources);
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

                // 4. Load cached articles (or initialize with seeds if empty)
                const storedArticles = await AsyncStorage.getItem(NEWS_ARTICLES_CACHE_KEY);
                let loadedArticles: NewsArticle[] = [];
                const now = Date.now();
                if (storedArticles) {
                    loadedArticles = JSON.parse(storedArticles);
                } else {
                    loadedArticles = SEEDED_ARTICLES.map((art, idx) => {
                        const hoursOffset = (idx + 1) * 2;
                        return {
                            ...art,
                            publishedAt: now - hoursOffset * 60 * 60 * 1000
                        };
                    });
                }

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

            const updatedSources = [...customSources, newSource];
            setCustomSources(updatedSources);
            await AsyncStorage.setItem(CUSTOM_SOURCES_KEY, JSON.stringify(updatedSources));

            // Generate/fetch custom articles: try real-time XML/RSS fetch if cleanUrl contains feed links
            let newArticles: NewsArticle[] = [];
            if (cleanUrl && (cleanUrl.toLowerCase().includes('feed') || cleanUrl.toLowerCase().includes('.xml') || cleanUrl.toLowerCase().includes('.rss'))) {
                try {
                    const fetched = await fetchRealRSSFeed(sourceId, cleanName, category, cleanUrl);
                    newArticles = fetched;
                    console.log(`Fetched ${fetched.length} live articles for custom source "${cleanName}"!`);
                } catch (e) {
                    console.log('Failed fetching live RSS, falling back to mock templates:', e);
                    newArticles = generateCustomArticles(sourceId, cleanName, category, cleanUrl);
                }
            } else {
                newArticles = generateCustomArticles(sourceId, cleanName, category, cleanUrl || undefined);
            }

            const updatedCache = pruneArticles([...cachedArticles, ...newArticles]);
            setCachedArticles(updatedCache);
            await AsyncStorage.setItem(NEWS_ARTICLES_CACHE_KEY, JSON.stringify(updatedCache));
        } catch (e) {
            console.error('Error adding custom news source:', e);
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
