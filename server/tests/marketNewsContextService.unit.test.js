describe("ai/services/marketNewsContextService", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test("fetches and parses India-focused digest", async () => {
    const xml = `
      <rss><channel>
        <item>
          <title><![CDATA[India carbon market expands]]></title>
          <description><![CDATA[Strong policy update in India]]></description>
          <source><![CDATA[The Hindu]]></source>
          <pubDate>Tue, 25 Mar 2026 10:00:00 GMT</pubDate>
        </item>
        <item>
          <title><![CDATA[Global update]]></title>
          <description><![CDATA[No regional mention]]></description>
          <source><![CDATA[Example]]></source>
          <pubDate>Tue, 25 Mar 2026 10:00:00 GMT</pubDate>
        </item>
      </channel></rss>
    `;

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => xml,
    });

    const { getMarketNewsDigest } = require("../ai/services/marketNewsContextService");
    const result = await getMarketNewsDigest({ ttlMs: 1000, timeoutMs: 100, limit: 3 });

    expect(result.meta.cache_hit).toBe(false);
    expect(result.digest.length).toBe(1);
    expect(result.digest[0]).toMatch(/India carbon market expands/);
    expect(result.digest[0]).toMatch(/The Hindu/);
  });

  test("uses cache when called within ttl", async () => {
    const xml = `
      <rss><channel>
        <item>
          <title><![CDATA[India ETS update]]></title>
          <description><![CDATA[India description]]></description>
          <source><![CDATA[Mint]]></source>
          <pubDate>Tue, 25 Mar 2026 10:00:00 GMT</pubDate>
        </item>
      </channel></rss>
    `;

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => xml,
    });

    const { getMarketNewsDigest } = require("../ai/services/marketNewsContextService");

    const first = await getMarketNewsDigest({ ttlMs: 60_000, timeoutMs: 100, limit: 3 });
    const second = await getMarketNewsDigest({ ttlMs: 60_000, timeoutMs: 100, limit: 3 });

    expect(first.digest.length).toBe(1);
    expect(second.meta.cache_hit).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test("returns stale cache on fetch failure", async () => {
    const xml = `
      <rss><channel>
        <item>
          <title><![CDATA[India policy headline]]></title>
          <description><![CDATA[India desc]]></description>
          <source><![CDATA[ET]]></source>
          <pubDate>Tue, 25 Mar 2026 10:00:00 GMT</pubDate>
        </item>
      </channel></rss>
    `;

    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, text: async () => xml })
      .mockRejectedValueOnce(new Error("network down"));

    const { getMarketNewsDigest } = require("../ai/services/marketNewsContextService");

    await getMarketNewsDigest({ ttlMs: 1, timeoutMs: 100, limit: 3 });
    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = await getMarketNewsDigest({ ttlMs: 1, timeoutMs: 100, limit: 3 });

    expect(second.meta.cache_hit).toBe(true);
    expect(second.meta.stale).toBe(true);
    expect(second.digest.length).toBe(1);
  });
});
