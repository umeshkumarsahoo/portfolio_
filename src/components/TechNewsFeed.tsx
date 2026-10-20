import { useEffect, useState } from "react";
import { ExternalLink, Sparkles, RefreshCw, Radio } from "lucide-react";

export interface HackerNewsStory {
  id: number;
  title: string;
  by?: string;
  score?: number;
  url?: string;
}

interface TechNewsFeedProps {
  onBriefNews?: (topic?: string) => void;
  className?: string;
}

const TOP_STORIES_URL = "https://hacker-news.firebaseio.com/v0/topstories.json";
const ITEM_URL = "https://hacker-news.firebaseio.com/v0/item";
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const STORY_COUNT = 6;

export default function TechNewsFeed({ onBriefNews, className = "" }: TechNewsFeedProps) {
  const [stories, setStories] = useState<HackerNewsStory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");

  const loadStories = async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    setError("");

    try {
      // 1. Try local backend proxy/cache first (instant, rate-limit protected & adblocker-safe)
      try {
        const localRes = await fetch("/api/news");
        if (localRes.ok) {
          const data = await localRes.json();
          if (Array.isArray(data.stories) && data.stories.length > 0) {
            setStories(data.stories.slice(0, STORY_COUNT));
            setLastUpdated(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
            setIsLoading(false);
            return;
          }
        }
      } catch (localErr) {
        // Fall through to direct Firebase stream
      }

      // 2. Direct Hacker News fallback
      const topStoriesResponse = await fetch(TOP_STORIES_URL);
      if (!topStoriesResponse.ok) throw new Error("Unable to reach Hacker News");

      const storyIds = (await topStoriesResponse.json()) as number[];
      const topStoryIds = storyIds.slice(0, STORY_COUNT);

      const storyResults = await Promise.all(
        topStoryIds.map(async (id) => {
          const res = await fetch(`${ITEM_URL}/${id}.json`);
          if (!res.ok) return null;
          return (await res.json()) as HackerNewsStory | null;
        })
      );

      const normalizedStories = storyResults
        .filter((story): story is HackerNewsStory => Boolean(story?.id && story?.title))
        .map((story) => ({
          ...story,
          url: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
        }));

      if (normalizedStories.length > 0) {
        setStories(normalizedStories);
        setLastUpdated(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      }
    } catch (err: any) {
      setError("Hacker News live stream temporarily unreachable.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStories(true);
    const timer = setInterval(() => loadStories(false), REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      id="tech-news-feed"
      className={`rounded-2xl border border-[var(--color-border)] bg-[var(--bg-primary)] p-6 md:p-8 flex flex-col justify-between space-y-6 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent-orange)] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--accent-orange)]"></span>
          </span>
          <h3 className="text-xs font-mono tracking-widest uppercase font-semibold text-[var(--text-primary)]">
            Live Tech Pulse · Hacker News
          </h3>
        </div>

        <div className="flex items-center gap-3 text-[11px] font-mono text-[var(--text-faint)]">
          <span>{lastUpdated ? `Synced ${lastUpdated}` : "Syncing..."}</span>
          <button
            onClick={() => loadStories(true)}
            className="p-1 hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            title="Refresh news"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Stories List */}
      <div className="space-y-3.5 min-h-[220px]">
        {isLoading && stories.length === 0 ? (
          <div className="py-12 text-center text-sm text-[var(--text-faint)] font-mono flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[var(--accent-blue)]" />
            Streaming latest headlines from Hacker News...
          </div>
        ) : error && stories.length === 0 ? (
          <div className="p-4 rounded-xl border border-[var(--color-border)] text-xs text-[var(--text-muted)] font-mono">
            {error} (Cached fallback active in UMU AI)
          </div>
        ) : (
          stories.map((story, idx) => (
            <article
              key={story.id}
              className="group p-3 rounded-xl border border-transparent hover:border-[var(--color-border)] hover:bg-[var(--bg-secondary)] transition-all flex items-start justify-between gap-3"
            >
              <div className="space-y-1 flex-1 min-w-0">
                <a
                  href={story.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--accent-blue)] transition-colors line-clamp-1 block"
                >
                  <span className="font-mono text-xs text-[var(--accent-blue)] mr-2 font-semibold">
                    0{idx + 1}.
                  </span>
                  {story.title}
                </a>
                <div className="flex items-center gap-3 text-[11px] font-mono text-[var(--text-faint)]">
                  <span>{story.score || 0} pts</span>
                  <span>·</span>
                  <span className="truncate">by {story.by || "hn"}</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => onBriefNews?.(story.title)}
                  className="text-[11px] font-mono px-2 py-1 rounded-md bg-[var(--bg-secondary)] hover:bg-[var(--accent-blue)] hover:text-white text-[var(--text-muted)] transition-colors flex items-center gap-1 cursor-pointer"
                  title="Ask UMU AI to brief this story"
                >
                  <Sparkles className="w-3 h-3 text-[var(--accent-orange)]" />
                  <span className="hidden sm:inline">Brief</span>
                </button>
                <a
                  href={story.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--text-faint)] hover:text-[var(--accent-blue)] transition-colors p-1"
                  title="Open story in new tab"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </article>
          ))
        )}
      </div>

      {/* Footer & AI Brief Trigger */}
      <div className="pt-4 border-t border-[var(--color-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <span className="text-[11px] font-mono text-[var(--text-faint)] flex items-center gap-1.5">
          <Radio className="w-3 h-3 text-[var(--accent-orange)]" />
          Auto-updates every 5 mins from official Firebase stream
        </span>

        <button
          type="button"
          onClick={() => onBriefNews?.("top-news")}
          disabled={isLoading || stories.length === 0}
          className="text-xs font-semibold px-4 py-2 rounded-lg bg-[var(--text-primary)] text-[var(--bg-primary)] hover:bg-[var(--accent-blue)] transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <Sparkles className="w-3.5 h-3.5 text-[var(--accent-orange)]" />
          Ask UMU AI to Brief Me →
        </button>
      </div>
    </div>
  );
}
