import { useEffect, useState } from "react";

export interface HackerNewsStory {
  id: number;
  title: string;
  by?: string;
  score?: number;
  url?: string;
}

interface TechNewsFeedProps {
  onBriefNews?: (stories: HackerNewsStory[]) => void;
}

const TOP_STORIES_URL = "https://hacker-news.firebaseio.com/v0/topstories.json";
const ITEM_URL = "https://hacker-news.firebaseio.com/v0/item";
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const STORY_COUNT = 7;

export default function TechNewsFeed({ onBriefNews }: TechNewsFeedProps) {
  const [stories, setStories] = useState<HackerNewsStory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    const loadStories = async (showLoading = false) => {
      if (showLoading) {
        setIsLoading(true);
      }
      setError("");

      try {
        const topStoriesResponse = await fetch(TOP_STORIES_URL, {
          signal: controller.signal
        });

        if (!topStoriesResponse.ok) {
          throw new Error("topstories endpoint rejected the stream");
        }

        const storyIds = (await topStoriesResponse.json()) as number[];
        const topStoryIds = storyIds.slice(0, STORY_COUNT);

        const storyResults = await Promise.all(
          topStoryIds.map(async (id) => {
            const storyResponse = await fetch(`${ITEM_URL}/${id}.json`, {
              signal: controller.signal
            });

            if (!storyResponse.ok) {
              throw new Error(`item ${id} endpoint rejected the stream`);
            }

            return (await storyResponse.json()) as HackerNewsStory | null;
          })
        );

        const normalizedStories = storyResults
          .filter((story): story is HackerNewsStory => Boolean(story?.id && story?.title))
          .map((story) => ({
            ...story,
            url: story.url || `https://news.ycombinator.com/item?id=${story.id}`
          }));

        setStories(normalizedStories);
        setLastUpdated(new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit"
        }));
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError("SYS_WARN: Hacker News stream temporarily unavailable.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadStories(true);
    const refreshTimer = window.setInterval(() => loadStories(false), REFRESH_INTERVAL_MS);

    return () => {
      controller.abort();
      window.clearInterval(refreshTimer);
    };
  }, []);

  return (
    <aside
      id="tech-news-feed"
      className="flex lg:col-span-12 xl:col-span-5 h-[380px] sm:h-[420px] xl:h-full min-h-0 flex-col border-t xl:border-t-0 xl:border-l border-white bg-black overflow-hidden font-mono text-xs"
    >
      <div className="shrink-0 border-b border-[#333] bg-black px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping bg-red-500 opacity-60"></span>
              <span className="relative inline-flex h-2.5 w-2.5 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.9)]"></span>
            </span>
            <p className="truncate text-[11px] font-bold tracking-[0.18em] text-white">
              NEWS
            </p>
          </div>
          <span className="shrink-0 border border-red-500/30 bg-red-950/20 px-2 py-1 text-[9px] tracking-widest text-red-300">
            TOP_{STORY_COUNT}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2 text-[9px] tracking-widest text-gray-500">
          <span>HN_FIREBASE_V0</span>
          <span className="tabular-nums">{lastUpdated ? `SYNC ${lastUpdated}` : "SYNC --:--"}</span>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto border border-[#333] border-l-0 border-r-0 bg-black p-4 scrollbar-thin scrollbar-thumb-red-500/20 scrollbar-track-black">
        {isLoading && (
          <div className="space-y-2 text-[11px] leading-relaxed text-gray-300">
            <p className="text-red-300">&gt; curl https://hacker-news.firebaseio.com/v0/topstories.json</p>
            <p>&gt; slicing_top_story_ids --limit={STORY_COUNT}</p>
            <p>&gt; Promise.all item payload requests [PENDING]</p>
            <p className="animate-pulse text-white">&gt; FETCHING_HEADLINES_STREAMING [LOADING]...</p>
          </div>
        )}

        {!isLoading && error && (
          <div className="border border-red-500/40 bg-red-950/20 p-3 text-[11px] leading-relaxed text-red-300">
            <p>&gt; {error}</p>
            <p className="mt-2 text-gray-400">&gt; fallback_thread_url prepared for next sync cycle.</p>
          </div>
        )}

        {!isLoading && !error && (
          <div className="space-y-3">
            {stories.map((story, index) => (
              <article
                key={story.id}
                className="border border-[#333] bg-white/[0.03] p-3 transition-colors hover:border-red-500/60 hover:bg-red-950/10"
              >
                <div className="mb-2 flex items-center justify-between gap-2 text-[9px] tracking-widest text-gray-500">
                  <span className="text-red-300">STREAM_PACKET_{String(index + 1).padStart(2, "0")}</span>
                  <span className="tabular-nums">{story.score || 0} PTS</span>
                </div>
                <a
                  href={story.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-[12px] font-bold leading-relaxed text-white transition-colors hover:text-red-300"
                >
                  &gt; {story.title}
                </a>
                <div className="mt-2 flex items-center justify-between gap-2 text-[9px] tracking-widest text-gray-500">
                  <span className="truncate">BY: {story.by || "unknown"}</span>
                  <span>ID:{story.id}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-[#333] bg-black px-4 py-3 text-[10px] tracking-widest text-gray-500">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center justify-between gap-3 sm:flex-1">
            <span>REFRESH_INTERVAL: 300s</span>
            <span className="text-red-300">OPEN_LINKS_NEW_TAB</span>
          </div>
          <button
            type="button"
            onClick={() => onBriefNews?.(stories)}
            disabled={isLoading || Boolean(error) || stories.length === 0}
            className="border border-red-500/40 bg-red-950/20 px-3 py-2 text-[10px] font-bold tracking-widest text-red-300 transition-all hover:bg-red-500 hover:text-black disabled:cursor-not-allowed disabled:border-white/15 disabled:bg-white/5 disabled:text-gray-600"
          >
            &gt; GET UMU BRIEF
          </button>
        </div>
      </div>
    </aside>
  );
}
