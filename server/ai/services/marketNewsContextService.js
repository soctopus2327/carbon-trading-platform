const NEWS_QUERY =
  '(Carbon Market OR "BEE India" OR "Carbon Credit Trading Scheme" OR "CCTS" OR "ESCerts") AND India';

const cache = {
  fetchedAt: 0,
  digest: [],
};

function stripCdata(value = "") {
  return value.replace("<![CDATA[", "").replace("]]>", "").trim();
}

function decodeHtml(value = "") {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extractTag(block = "", tag = "") {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = block.match(regex);
  return match ? decodeHtml(stripCdata(match[1])) : "";
}

function cleanDescription(value = "") {
  return decodeHtml(stripCdata(value)).replace(/<[^>]*>/g, "").trim();
}

function truncate(value = "", max = 140) {
  const text = String(value || "").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}...`;
}

function withTimeout(timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return { controller, timer };
}

async function fetchDigest({ timeoutMs, limit }) {
  const query = encodeURIComponent(NEWS_QUERY);
  const { controller, timer } = withTimeout(timeoutMs);

  try {
    const response = await fetch(
      `https://news.google.com/rss/search?q=${query}&hl=en-IN&gl=IN&ceid=IN:en`,
      { signal: controller.signal }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch market news");
    }

    const xml = await response.text();
    const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/g) || [];

    const articles = itemMatches.map((item) => {
      const title = extractTag(item, "title");
      const description = cleanDescription(extractTag(item, "description"));
      const sourceTag = extractTag(item, "source");
      const parsedDate = new Date(extractTag(item, "pubDate"));
      const publishedAt = Number.isNaN(parsedDate.getTime())
        ? ""
        : parsedDate.toISOString().slice(0, 10);

      return {
        title,
        description,
        source: sourceTag || "Google News",
        publishedAt,
      };
    });

    const indianNews = articles.filter((article) => {
      const title = (article.title || "").toLowerCase();
      const description = (article.description || "").toLowerCase();
      const source = (article.source || "").toLowerCase();
      return title.includes("india") || description.includes("india") || source.includes("india");
    });

    return indianNews.slice(0, limit).map((item) => {
      const sourcePart = item.source ? ` (${item.source}${item.publishedAt ? `, ${item.publishedAt}` : ""})` : "";
      return `${truncate(item.title)}${sourcePart}`;
    });
  } finally {
    clearTimeout(timer);
  }
}

async function getMarketNewsDigest({ ttlMs = 15 * 60 * 1000, timeoutMs = 800, limit = 3 } = {}) {
  const now = Date.now();
  const ageMs = now - cache.fetchedAt;

  if (cache.digest.length > 0 && ageMs < ttlMs) {
    return {
      digest: cache.digest,
      meta: {
        cache_hit: true,
        stale: false,
        age_ms: ageMs,
      },
    };
  }

  try {
    const digest = await fetchDigest({ timeoutMs, limit });
    cache.digest = digest;
    cache.fetchedAt = Date.now();
    return {
      digest,
      meta: {
        cache_hit: false,
        stale: false,
        age_ms: 0,
      },
    };
  } catch (error) {
    if (cache.digest.length > 0) {
      return {
        digest: cache.digest,
        meta: {
          cache_hit: true,
          stale: true,
          age_ms: Date.now() - cache.fetchedAt,
          error: error?.message || "news fetch failed",
        },
      };
    }

    return {
      digest: [],
      meta: {
        cache_hit: false,
        stale: false,
        age_ms: null,
        error: error?.message || "news fetch failed",
      },
    };
  }
}

module.exports = {
  getMarketNewsDigest,
};
