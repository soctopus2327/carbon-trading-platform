const express = require("express");

const router = express.Router();

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

router.get("/market", async (_req, res) => {
  try {
    const query = encodeURIComponent(
      '(Carbon Market OR "BEE India" OR "Carbon Credit Trading Scheme" OR "CCTS" OR "ESCerts") AND India'
    );

    // Free public feed (no API key required)
    const response = await fetch(
      `https://news.google.com/rss/search?q=${query}&hl=en-IN&gl=IN&ceid=IN:en`
    );

    if (!response.ok) {
      return res.status(500).json({ message: "Failed to fetch market news" });
    }

    const xml = await response.text();
    const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/g) || [];

    const articles = itemMatches.map((item) => {
      const title = extractTag(item, "title");
      const description = cleanDescription(extractTag(item, "description"));
      const url = extractTag(item, "link");
      const parsedDate = new Date(extractTag(item, "pubDate"));
      const publishedAt = Number.isNaN(parsedDate.getTime())
        ? new Date().toISOString()
        : parsedDate.toISOString();
      const sourceTag = extractTag(item, "source");
      const sourceFromTitle = title.includes(" - ")
        ? title.split(" - ").pop()
        : "Google News";

      return {
        title,
        description,
        content: "",
        url,
        urlToImage: null,
        publishedAt,
        source: { name: sourceTag || sourceFromTitle || "Google News" },
      };
    });

    const indianNews = articles.filter((article) => {
      const title = (article?.title || "").toLowerCase();
      const description = (article?.description || "").toLowerCase();
      const source = (article?.source?.name || "").toLowerCase();

      return (
        title.includes("india") ||
        description.includes("india") ||
        source.includes("india")
      );
    });

    return res.json(indianNews);
  } catch (_error) {
    return res.status(500).json({ message: "Failed to fetch market news" });
  }
});

module.exports = router;
