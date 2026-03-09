import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import PageLayout from "../components/layout/PageLayout";

type NewsArticle = {
  title: string;
  description?: string;
  content?: string;
  url: string;
  urlToImage?: string;
  publishedAt: string;
  source: {
    name: string;
  };
};

const OFFICIAL_SOURCES = [
  "The Economic Times",
  "Business Standard",
  "Livemint",
  "Financial Express",
  "Press Information Bureau",
  "The Hindu",
];

export default function News({ onLogout: _onLogout }: { onLogout?: () => void }) {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  const isOfficialSource = useMemo(
    () => (sourceName?: string) =>
      OFFICIAL_SOURCES.some((v) => sourceName?.includes(v)),
    []
  );

  useEffect(() => {
    let mounted = true;

    const fetchNews = async () => {
      try {
        setLoading(true);
        const res = await axios.get("http://localhost:5000/news/market");
        if (mounted) {
          setNews(Array.isArray(res.data) ? res.data : []);
        }
      } catch (_error) {
        if (mounted) {
          setNews([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchNews();
    const interval = setInterval(fetchNews, 30 * 60 * 1000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return (
      <PageLayout
        title="Live Market News"
        description="Real-time updates on CCTS, BEE policy, and Indian carbon pricing"
        compact
      >
        <div className="p-6 max-w-5xl mx-auto flex flex-col items-center justify-center h-96">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
            <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20"></div>
          </div>
          <p className="text-slate-500 mt-6 font-medium animate-pulse">
            Scanning Indian Carbon Market Intelligence...
          </p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Live Market News"
      description="Real-time updates on CCTS, BEE policy, and Indian carbon pricing"
      compact
    >
      <div className="p-6 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              Live Market News
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              Real-time updates on CCTS, BEE Policy, and Indian Carbon Pricing.
            </p>
          </div>
          <div className="text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
            Auto-refreshing: Every 30 mins
          </div>
        </div>

        <div className="mb-8 bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-xl flex items-start gap-4">
          <div className="bg-emerald-500/20 p-2 rounded-lg text-emerald-500 mt-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
            </svg>
          </div>
          <div>
            <h4 className="text-emerald-600 text-sm font-bold uppercase tracking-wider">
              Policy Highlight
            </h4>
            <p className="text-slate-600 text-sm mt-1">
              Bureau of Energy Efficiency (BEE) is finalizing the stability fund mechanism for the upcoming Indian Carbon Market (ICM) launch.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5">
          {news.length > 0 ? (
            news.map((article, index) => (
              <a
                key={index}
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative bg-white border border-slate-200 p-5 rounded-2xl hover:bg-slate-50 hover:border-emerald-500/30 transition-all duration-300"
              >
                <div className="flex justify-between items-center mb-4 gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black px-2 py-1 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 uppercase tracking-tighter">
                      {article.source?.name || "Unknown Source"}
                    </span>
                    {isOfficialSource(article.source?.name) && (
                      <span className="flex items-center gap-1 text-[9px] text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        VERIFIED
                      </span>
                    )}
                  </div>
                  <span className="text-slate-500 text-[11px] font-medium whitespace-nowrap">
                    {new Date(article.publishedAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    • {new Date(article.publishedAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex flex-col md:flex-row gap-6">
                  {article.urlToImage && (
                    <div className="w-full md:w-48 h-28 shrink-0 overflow-hidden rounded-xl border border-slate-200">
                      <img
                        src={article.urlToImage}
                        alt="Market Intel"
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-800 group-hover:text-emerald-600 transition-colors leading-snug">
                      {article.title}
                    </h3>
                    <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                      {article.description || article.content?.split("[")[0]}
                    </p>
                    <div className="mt-4 flex items-center text-xs font-bold text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      READ FULL INTELLIGENCE REPORT
                      <svg
                        className="ml-2 w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M17 8l4 4m0 0l-4 4m4-4H3"
                        ></path>
                      </svg>
                    </div>
                  </div>
                </div>
              </a>
            ))
          ) : (
            <div className="text-center py-24 bg-slate-50 border border-dashed border-slate-300 rounded-3xl">
              <div className="text-slate-400 mb-4">
                <svg
                  className="mx-auto h-12 w-12"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1"
                    d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10l4 4v12a2 2 0 01-2 2z"
                  ></path>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1"
                    d="M14 4v4h4"
                  ></path>
                </svg>
              </div>
              <p className="text-slate-600 font-medium">
                No live news matching Indian Carbon Market parameters.
              </p>
              <p className="text-slate-500 text-xs mt-1">
                Check back soon for regulatory updates.
              </p>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
