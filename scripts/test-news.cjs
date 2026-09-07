const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
const path = require('node:path');
const filename = path.resolve(__dirname, '../services/newsFeed.ts');
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const loaded = new Module(filename, module);
loaded.filename = filename;
loaded.paths = module.paths;
loaded._compile(compiled, filename);
const { parseRSSFeed, safeArticleUrl } = loaded.exports;

const rss = parseRSSFeed(`<rss><channel><item><title>Science &amp; space</title><link>https://example.com/story</link><pubDate>Tue, 08 Sep 2026 10:00:00 GMT</pubDate><description><![CDATA[<p>A discovery &#8217; today.</p><script>bad()</script><p>More detail.</p>]]></description></item><item><title>Unsafe</title><link>javascript:alert(1)</link></item><item><title>Missing link</title></item></channel></rss>`, 'https://example.com/feed');
assert.equal(rss.length, 1);
assert.equal(rss[0].title, 'Science & space');
assert.equal(rss[0].content, "A discovery ’ today.\n\nMore detail.");
assert.equal(rss[0].publishedAt, Date.parse('2026-09-08T10:00:00Z'));
const atom = parseRSSFeed(`<feed><entry><title>New story</title><link rel="self" href="https://example.com/api/1"/><link rel="alternate" href="/article"/><summary>Preview</summary></entry></feed>`, 'https://example.com/feed');
assert.equal(atom[0].url, 'https://example.com/article');
assert.equal(atom[0].publishedAt, undefined);
assert.equal(safeArticleUrl('file:///private'), undefined);
assert.equal(safeArticleUrl('', 'https://example.com/feed'), undefined);
assert.deepEqual(parseRSSFeed('<html><body>Unavailable</body></html>'), []);
console.log('News parsing checks passed: RSS, Atom, preview cleanup, dates, and invalid links.');

if (process.argv.includes('--live')) {
    Promise.all(['https://feeds.bbci.co.uk/news/rss.xml', 'https://www.nasa.gov/feed/', 'https://www.theverge.com/rss/index.xml'].map(async url => {
        const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
        assert.ok(response.ok, `${url}: HTTP ${response.status}`);
        const articles = parseRSSFeed(await response.text(), url);
        assert.ok(articles.length > 0, `${url}: no articles`);
        const article = await fetch(articles[0].url, { signal: AbortSignal.timeout(15000) });
        assert.ok(article.ok, `Article returned HTTP ${article.status}: ${articles[0].url}`);
        console.log(`${url}: ${articles.length} articles; first article opens with HTTP ${article.status}`);
    })).catch(error => { console.error(error); process.exitCode = 1; });
}
