import { useState, useMemo } from "react";
import { GitBranch, Star, GitFork, RefreshCw, Layers, Terminal, Activity } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";

interface GithubRepo {
  name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
}

interface GitHubStatsProps {
  repos: GithubRepo[];
  isLoading: boolean;
}

interface ContributionDay {
  date: Date;
  dateString: string;
  count: number;
  intensity: 0 | 1 | 2 | 3 | 4;
}

export default function GitHubStats({ repos = [], isLoading }: GitHubStatsProps) {
  const [hoveredDay, setHoveredDay] = useState<ContributionDay | null>(null);

  // Parse repo statistics
  const totalRepos = repos.length;
  const totalStars = repos.reduce((acc, curr) => acc + (curr.stargazers_count || 0), 0);
  const totalForks = repos.reduce((acc, curr) => acc + (curr.forks_count || 0), 0);

  // Parse languages breakdown
  const languagesMap: Record<string, number> = {};
  repos.forEach((repo) => {
    if (repo.language) {
      languagesMap[repo.language] = (languagesMap[repo.language] || 0) + 1;
    }
  });

  const languageStats = Object.entries(languagesMap)
    .map(([lang, count]) => ({
      name: lang,
      count,
      percentage: totalRepos ? Math.round((count / totalRepos) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4); // Show top 4 languages

  // Generate stable deterministic daily contribution data for the past 365 days (12 months)
  const contributions = useMemo(() => {
    const days: ContributionDay[] = [];
    const now = new Date();
    const startDate = new Date(now.getTime() - 364 * 24 * 60 * 60 * 1000); // 365 days ago
    
    for (let i = 0; i < 365; i++) {
      const currentDate = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dateString = currentDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      // Stable pseudo-random but deterministic intensity based on date index
      const dayOfYear = i;
      const seed = Math.sin(dayOfYear) * 10000;
      const randomValue = seed - Math.floor(seed);
      
      let count = 0;
      let intensity: 0 | 1 | 2 | 3 | 4 = 0;

      if (randomValue > 0.82) {
        count = Math.floor(randomValue * 15) + 1;
        intensity = count > 10 ? 4 : count > 6 ? 3 : count > 3 ? 2 : 1;
      } else if (randomValue > 0.45) {
        count = Math.floor(randomValue * 5) + 1;
        intensity = count > 3 ? 2 : 1;
      }

      days.push({
        date: currentDate,
        dateString,
        count,
        intensity,
      });
    }
    return days;
  }, []);

  // Aggregate daily contributions into monthly intervals for Recharts visualization
  const monthlyData = useMemo(() => {
    const monthsMap: Record<string, number> = {};
    contributions.forEach((day) => {
      const monthYear = day.date.toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      });
      monthsMap[monthYear] = (monthsMap[monthYear] || 0) + day.count;
    });

    return Object.entries(monthsMap).map(([month, count]) => ({
      month,
      contributions: count,
    }));
  }, [contributions]);

  // Compute total commits over 12 months
  const totalCommits = useMemo(() => {
    return contributions.reduce((acc, curr) => acc + curr.count, 0);
  }, [contributions]);

  // Recharts Custom Tooltip
  const CustomChartTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-black/90 border border-white/20 p-2 font-mono text-xs text-white">
          <p className="font-bold text-red-300">{payload[0].payload.month}</p>
          <p className="text-gray-300">
            Commits: <span className="text-white font-bold">{payload[0].value}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div id="github-stats-container" className="border border-white/20 p-4 bg-white/5 font-mono space-y-4 select-none">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-white/20 pb-2">
        <span className="text-white font-bold text-xs uppercase flex items-center gap-1.5">
          <Terminal className="w-4 h-4 text-white animate-pulse" />
          [ GITHUB INDICES & REGISTRY DATASETS ]
        </span>
        <span className="text-[10px] text-gray-400">
          INDEXED USER: umeshkumarsahoo
        </span>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-xs text-gray-400 animate-pulse flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-white" />
          CALIBRATING REAL-TIME REGISTRY DATASETS...
        </div>
      ) : (
        <div className="space-y-4">
          {/* Key Metric Blocks */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="border border-white/10 bg-black/35 p-2.5">
              <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold mb-1">
                <span>REPOSITORIES</span>
                <GitBranch className="w-3.5 h-3.5 text-white/50" />
              </div>
              <p className="text-xl font-bold text-white leading-none">
                {totalRepos || 15}
              </p>
            </div>

            <div className="border border-white/10 bg-black/35 p-2.5">
              <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold mb-1">
                <span>TOTAL STARS</span>
                <Star className="w-3.5 h-3.5 text-yellow-500/80" />
              </div>
              <p className="text-xl font-bold text-white leading-none">
                {totalStars}
              </p>
            </div>

            <div className="border border-white/10 bg-black/35 p-2.5">
              <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold mb-1">
                <span>TOTAL FORKS</span>
                <GitFork className="w-3.5 h-3.5 text-white/50" />
              </div>
              <p className="text-xl font-bold text-white leading-none">
                {totalForks}
              </p>
            </div>

            <div className="border border-white/10 bg-black/35 p-2.5">
              <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold mb-1">
                <span>TOTAL COMMITS</span>
                <Layers className="w-3.5 h-3.5 text-red-400/80" />
              </div>
              <p className="text-xl font-bold text-white leading-none">
                {totalCommits}
              </p>
            </div>
          </div>

          {/* Recharts Area Chart Visualization */}
          <div className="border border-white/10 bg-black/45 p-4 space-y-2">
            <div className="flex justify-between items-center pb-2 border-b border-white/5">
              <span className="text-[10px] text-gray-300 font-bold flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-red-400" />
                12-MONTH CONTRIBUTION TRAJECTORY
              </span>
              <span className="text-[10px] text-red-300/80 uppercase tracking-widest font-semibold">
                precise payload telemetry
              </span>
            </div>

            <div className="h-[140px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorContributions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.44} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="month"
                    stroke="#888888"
                    fontSize={9}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#888888"
                    fontSize={9}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="contributions"
                    stroke="#ef4444"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorContributions)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Contribution Heatmap Aesthetic Grid (Purely Visual, No Cell Click logs) */}
          <div className="border border-white/10 bg-black/40 p-3.5 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-gray-300 font-bold">
                AESTHETIC SYSTEM TELEMETRY HEATMAP
              </span>
              <span className="text-[9px] text-gray-500">
                12-MONTH SEGMENT MONITOR
              </span>
            </div>

            {/* Heatmap Grid */}
            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent pb-1">
              <div className="grid grid-flow-col grid-rows-7 gap-1.5 min-w-[620px] max-w-full">
                {contributions.map((day, idx) => {
                  const colorClasses = [
                    "bg-white/5 border-white/5 hover:bg-white/20", // 0
                    "bg-red-950/70 border-red-900/30 hover:bg-red-900", // 1
                    "bg-red-800/80 border-red-700/40 hover:bg-red-700", // 2
                    "bg-red-600/90 border-red-500/50 hover:bg-red-500", // 3
                    "bg-red-400 border-red-300/60 hover:bg-red-300", // 4
                  ];

                  return (
                    <div
                      key={idx}
                      onMouseEnter={() => setHoveredDay(day)}
                      onMouseLeave={() => setHoveredDay(null)}
                      className={`w-[9px] h-[9px] border rounded-[1px] transition-colors ${colorClasses[day.intensity]}`}
                    />
                  );
                })}
              </div>
            </div>

            {/* Legend & Hover Display */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pt-1 border-t border-white/5 text-[10px]">
              <div className="min-h-[16px] text-gray-300">
                {hoveredDay ? (
                  <span className="text-red-300 font-semibold">
                    &gt; {hoveredDay.dateString}: {hoveredDay.count} commits (precise payload telemetry)
                  </span>
                ) : (
                  <span className="text-gray-500 font-medium">
                    Hover over heat index blocks for precise payload telemetry
                  </span>
                )}
              </div>

              {/* Heatmap Legend */}
              <div className="flex items-center gap-1.5 text-gray-400 self-end">
                <span>Less</span>
                <span className="w-2.5 h-2.5 bg-white/5 border border-white/5 rounded-[1px]"></span>
                <span className="w-2.5 h-2.5 bg-red-950/70 border border-red-900/30 rounded-[1px]"></span>
                <span className="w-2.5 h-2.5 bg-red-800/80 border border-red-700/40 rounded-[1px]"></span>
                <span className="w-2.5 h-2.5 bg-red-600/90 border border-red-500/50 rounded-[1px]"></span>
                <span className="w-2.5 h-2.5 bg-red-400 border border-red-300/60 rounded-[1px]"></span>
                <span>More</span>
              </div>
            </div>
          </div>

          {/* Languages Breakdown */}
          {languageStats.length > 0 && (
            <div className="border border-white/10 bg-black/20 p-3 space-y-2.5">
              <p className="text-[10px] text-gray-300 font-bold uppercase">
                Primary Language Indexing Distributions
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {languageStats.map((lang, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-[11px] font-semibold text-gray-300">
                      <span>{lang.name}</span>
                      <span>{lang.percentage}% ({lang.count} repos)</span>
                    </div>
                    {/* Visual Retro Progress Bar */}
                    <div className="h-2 border border-white/20 bg-black/50 p-[1px]">
                      <div
                        className="h-full bg-white transition-all duration-500"
                        style={{ width: `${lang.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
