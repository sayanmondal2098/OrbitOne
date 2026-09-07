import { XMLParser } from 'fast-xml-parser';

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', processEntities: true });
const list = (value: any): any[] => value == null ? [] : Array.isArray(value) ? value : [value];
const valueText = (value: any): string => typeof value === 'string' ? value : String(value?.['#text'] ?? '');

export function plainText(value: any): string {
    return valueText(value)
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
        .replace(/<\/(p|div|li)>|<br\s*\/?\s*>/gi, '\n\n')
        .replace(/<[^>]*>/g, '')
        .replace(/&#(x[\da-f]+|\d+);/gi, (_, code) => {
            const point = code[0].toLowerCase() === 'x' ? parseInt(code.slice(1), 16) : Number(code);
            return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : '';
        })
        .replace(/&(amp|quot|apos|nbsp|rsquo|lsquo|rdquo|ldquo|ndash|mdash);/g, (_, entity) =>
            (({ amp: '&', quot: '"', apos: "'", nbsp: ' ', rsquo: "'", lsquo: "'", rdquo: '"', ldquo: '"', ndash: '\u2013', mdash: '\u2014' } as Record<string, string>)[entity] || ''))
        .replace(/[ \t]+/g, ' ').replace(/\n\s*\n/g, '\n\n').trim();
}

export function safeArticleUrl(value: string, base?: string): string | undefined {
    if (!value.trim()) return undefined;
    try {
        const url = new URL(value, base);
        return ['https:', 'http:'].includes(url.protocol) ? url.href : undefined;
    } catch { return undefined; }
}

export function parseRSSFeed(xml: string, feedUrl?: string) {
    const document = parser.parse(xml);
    const entries = list(document.rss?.channel?.item ?? document.feed?.entry);
    return entries.flatMap(item => {
        const links = list(item.link);
        const link = links.find(link => link?.['@_rel'] === 'alternate')
            ?? links.find(link => !link?.['@_rel']);
        const url = safeArticleUrl(link?.['@_href'] || valueText(link), feedUrl);
        const title = plainText(item.title);
        if (!title || !url) return [];
        const date = Date.parse(valueText(item.pubDate ?? item.published ?? item.updated));
        return [{
            title, url,
            publishedAt: Number.isFinite(date) ? date : undefined,
            content: plainText(item['content:encoded'] ?? item.content ?? item.description ?? item.summary).slice(0, 16000)
                || 'This publisher does not provide a preview. Tap Read full article to continue on their website.',
        }];
    }).slice(0, 30);
}
