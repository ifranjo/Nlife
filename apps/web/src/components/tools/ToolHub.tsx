import React, { useEffect, useMemo, useState } from 'react';
import type { Tool } from '../../lib/tools';

interface ToolHubProps {
  tools: Tool[];
}

interface ToolCardProps {
  tool: Tool;
  stats?: ToolStat;
  basis?: 'uses' | 'views';
  onClick?: () => void;
}

type ToolStat = {
  id: string;
  views: number;
  uses: number;
  uniques: number;
  rank: number;
};

type ToolTotals = {
  views: number;
  uses: number;
  uniques: number;
};

type ToolStatsResponse = {
  enabled: boolean;
  basis?: 'uses' | 'views';
  top: Array<{
    id: string;
    views: number;
    uses: number;
    uniques: number;
  }>;
  totals?: ToolTotals;
};

const formatCompact = (value: number) => {
  if (value >= 1_000_000) {
    const formatted = (value / 1_000_000).toFixed(1);
    return `${formatted.replace(/\.0$/, '')}m`;
  }
  if (value >= 1_000) {
    const formatted = (value / 1_000).toFixed(1);
    return `${formatted.replace(/\.0$/, '')}k`;
  }
  return `${value}`;
};

const categoryLabels: Record<Tool['category'], string> = {
  document: 'PDF & Docs',
  media: 'Images & Media',
  ai: 'AI Tools',
  utility: 'Text & Dev',
  games: 'Games'
};

const categoryDisplay: Record<string, string> = {
  all: 'All Tools',
  ...categoryLabels
};

const categoryOrder = ['all', 'document', 'media', 'ai', 'utility', 'games'] as const;

const ToolCard: React.FC<ToolCardProps> = ({ tool, stats, basis = 'uses', onClick }) => {
  const isDisabled = tool.tier === 'coming' || tool.tier === 'pro';
  const tagClass = tool.tier === 'free' ? 'tag-free' : tool.tier === 'pro' ? 'tag-pro' : 'tag-coming';
  const categoryLabel = categoryLabels[tool.category] ?? tool.category;
  const hasStats = Boolean(stats && (stats.views || stats.uses || stats.uniques));
  const primaryBadge = basis === 'views' ? 'Most Viewed' : 'Most Used';
  const badge = hasStats ? (stats?.rank === 1 ? primaryBadge : 'Top 3') : null;

  return (
    <a
      href={isDisabled ? undefined : tool.href}
      onClick={isDisabled ? undefined : onClick}
      className={[
        'tool-card block',
        isDisabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
      ].join(' ')}
      data-category={tool.category}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 tool-icon">
          <img src={tool.thumbnail} alt={`${tool.name} icon`} className="w-full h-full" loading="lazy" decoding="async" />
        </div>
        <div className="flex items-center gap-2">
          <span className={`tag ${tagClass}`}>
            {tool.tier}
          </span>
          {badge && (
            <span className="tag tag-highlight">
              {badge}
            </span>
          )}
        </div>
      </div>

      {/* Title */}
      <h3 className="tool-title text-[var(--text)] text-sm uppercase tracking-[0.1em] mb-2 font-medium">
        {tool.name}
      </h3>

      {/* Description */}
      <p className="text-[var(--text-dim)] text-xs leading-relaxed mb-4">
        {tool.description}
      </p>

      {hasStats && stats && (
        <div className="grid grid-cols-3 gap-2 text-[0.55rem] uppercase tracking-[0.15em] text-[var(--text-muted)] mb-4">
          <div>
            <div className="text-[var(--text)] text-xs font-semibold">{formatCompact(stats.uses)}</div>
            <div>Uses</div>
          </div>
          <div>
            <div className="text-[var(--text)] text-xs font-semibold">{formatCompact(stats.uniques)}</div>
            <div>Visitors</div>
          </div>
          <div>
            <div className="text-[var(--text)] text-xs font-semibold">{formatCompact(stats.views)}</div>
            <div>Views</div>
          </div>
        </div>
      )}

      {/* Category and Popular Badge */}
      <div className="flex items-center justify-between">
        <span className="text-[0.625rem] text-[var(--text-muted)] uppercase tracking-[0.15em]">
          {categoryLabel}
        </span>
        <div className="flex items-center gap-2">
          {tool.popular && (
            <span className="text-[0.625rem] bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-2 py-0.5 rounded uppercase tracking-[0.15em]">
              Popular
            </span>
          )}
          {!isDisabled && (
            <svg className="tool-arrow w-4 h-4 text-[var(--text-muted)] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          )}
        </div>
      </div>
    </a>
  );
};

export const ToolHub: React.FC<ToolHubProps> = ({ tools }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('popular');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTier, setSelectedTier] = useState<string>('all');
  const [toolStats, setToolStats] = useState<Record<string, ToolStat>>({});
  const [statsBasis, setStatsBasis] = useState<'uses' | 'views'>('uses');
  const [topRankedIds, setTopRankedIds] = useState<string[]>([]);
  const [totals, setTotals] = useState<ToolTotals | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const initialQuery = params.get('q');
    if (initialQuery) {
      setSearchQuery(initialQuery);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const nextQuery = searchQuery.trim();
    if (nextQuery) {
      params.set('q', nextQuery);
    } else {
      params.delete('q');
    }
    const nextSearch = params.toString();
    const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash}`;
    window.history.replaceState({}, '', nextUrl);
  }, [searchQuery]);

  // Get unique categories
  const categories = useMemo(() => {
    const available = new Set(tools.map(tool => tool.category));
    return categoryOrder.filter((category) =>
      category === 'all' || available.has(category as Tool['category'])
    );
  }, [tools]);

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
    selectedCategory !== 'all' ||
    selectedTier !== 'all' ||
    sortBy !== 'popular'
  );

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedTier('all');
    setSortBy('popular');
  };

  useEffect(() => {
    let active = true;

    const loadStats = async () => {
      try {
        const response = await fetch('/api/tool-stats');
        if (!response.ok) return;
        const data = (await response.json()) as ToolStatsResponse;
        if (!data?.enabled) {
          if (active) {
            setToolStats({});
            setTopRankedIds([]);
            setTotals(null);
          }
          return;
        }

        const topItems = Array.isArray(data.top) ? data.top : [];
        const nextStats: Record<string, ToolStat> = {};
        const nextRankedIds: string[] = [];
        topItems.forEach((item, index) => {
          nextStats[item.id] = {
            ...item,
            rank: index + 1
          };
          nextRankedIds.push(item.id);
        });

        if (active) {
          setToolStats(nextStats);
          setStatsBasis(data.basis === 'views' ? 'views' : 'uses');
          setTopRankedIds(nextRankedIds);
          setTotals(data.totals ?? null);
        }
      } catch {
        if (active) {
          setToolStats({});
          setTopRankedIds([]);
          setTotals(null);
        }
      }
    };

    loadStats();
    return () => {
      active = false;
    };
  }, []);

  const topRankedTools = useMemo(() => {
    if (!topRankedIds.length) return [];
    return topRankedIds
      .map((id) => tools.find((tool) => tool.id === id))
      .filter((tool): tool is Tool => Boolean(tool));
  }, [topRankedIds, tools]);

  const hasTotals = Boolean(totals && (totals.views || totals.uses || totals.uniques));

  const sendToolEvent = (toolId: string, event: 'hub_click') => {
    if (typeof window === 'undefined') return;

    const payload = JSON.stringify({
      toolId,
      event,
      path: window.location.pathname,
      referrer: document.referrer
    });

    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon('/api/tool-usage', blob);
      return;
    }

    fetch('/api/tool-usage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true
    }).catch(() => undefined);
  };

  // Get unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    tools.forEach(tool => {
      tool.tags?.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).slice(0, 10); // Limit to 10 most common
  }, [tools]);

  // Filter and sort tools
  const filteredAndSortedTools = useMemo(() => {
    let filtered = [...tools];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(tool =>
        tool.name.toLowerCase().includes(query) ||
        tool.description.toLowerCase().includes(query) ||
        tool.tags?.some(tag => tag.toLowerCase().includes(query)) ||
        tool.category.toLowerCase().includes(query)
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(tool => tool.category === selectedCategory);
    }

    // Filter by tier
    if (selectedTier !== 'all') {
      filtered = filtered.filter(tool => tool.tier === selectedTier);
    }

    // Sort tools
    switch (sortBy) {
      case 'popular':
        filtered.sort((a, b) => {
          if (a.popular && !b.popular) return -1;
          if (!a.popular && b.popular) return 1;
          return a.name.localeCompare(b.name);
        });
        break;
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'recent':
        filtered.sort((a, b) => {
          const dateA = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
          const dateB = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
          return dateB - dateA;
        });
        break;
    }

    return filtered;
  }, [tools, searchQuery, selectedCategory, selectedTier, sortBy]);

  // Count tools in each category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: tools.length };
    tools.forEach(tool => {
      counts[tool.category] = (counts[tool.category] || 0) + 1;
    });
    return counts;
  }, [tools]);

  return (
    <div className="tool-hub w-full">
      {/* Search and Controls */}
      <div className="mb-8 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <input
            type="search"
            placeholder="Search tools..."
            aria-label="Search tools"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 pl-12 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-sm placeholder-[var(--text-dim)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 transition-all"
          />
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-dim)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              aria-pressed={selectedCategory === category}
              className={[
                'px-4 py-2 rounded-full text-[0.625rem] uppercase tracking-[0.2em] transition-all',
                selectedCategory === category
                  ? 'bg-[var(--accent)] border border-[var(--accent)] text-white font-medium'
                  : 'bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-dim)] hover:border-[var(--border-hover)]'
              ].join(' ')}
            >
              {categoryDisplay[category] ?? category}
              <span className="ml-1 text-[0.625rem] text-[var(--text-muted)]">
                ({categoryCounts[category] || 0})
              </span>
            </button>
          ))}
        </div>

        {/* Advanced Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-3 py-2 text-[0.625rem] uppercase tracking-[0.2em] text-[var(--text-dim)] hover:text-[var(--text)] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 3c7.2 0 9 1.8 9 9s-1.8 9-9 9-9-1.8-9-9 1.8-9 9-9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v8m4-4H8" />
              </svg>
              {showFilters ? 'Hide' : 'Show'} Filters
            </button>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-3 py-2 text-[0.625rem] uppercase tracking-[0.2em] text-[var(--accent)] border border-[var(--accent)] rounded hover:bg-[var(--accent)] hover:text-white transition-colors"
              >
                Clear All
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="toolhub-sort" className="text-[0.625rem] uppercase tracking-[0.2em] text-[var(--text-dim)]">
              Sort by:
            </label>
            <select
              id="toolhub-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded text-[0.625rem] uppercase tracking-[0.2em] text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
            >
              <option value="popular">Popular</option>
              <option value="name">Name A-Z</option>
              <option value="recent">Recently Added</option>
            </select>
          </div>
        </div>

        {/* Collapsible Filters */}
        {showFilters && (
          <div className="p-4 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg space-y-4">
            <div>
              <label className="block text-[0.625rem] uppercase tracking-[0.2em] text-[var(--text-dim)] mb-2">
                Tool Tier:
              </label>
              <div className="flex gap-2">
                {['all', 'free', 'pro', 'coming'].map(tier => (
                  <button
                    key={tier}
                    onClick={() => setSelectedTier(tier)}
                    aria-pressed={selectedTier === tier}
                    className={[
                      'px-3 py-1 rounded text-[0.625rem] uppercase tracking-[0.2em]',
                      selectedTier === tier
                        ? 'bg-[var(--accent)] text-white'
                        : 'bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-dim)] hover:border-[var(--border-hover)]'
                    ].join(' ')}
                  >
                    {tier}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[0.625rem] uppercase tracking-[0.2em] text-[var(--text-dim)] mb-2">
                Popular Tags:
              </label>
              <div className="flex flex-wrap gap-2">
                {allTags.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setSearchQuery(tag)}
                    className="px-2 py-1 bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-dim)] text-[0.625rem] rounded lowercase hover:border-[var(--border-hover)]"
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {hasTotals && totals && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg">
            <div>
              <div className="text-sm font-semibold text-[var(--text)]">{formatCompact(totals.uses)}</div>
              <div className="text-[0.55rem] uppercase tracking-[0.2em] text-[var(--text-muted)]">All-time uses</div>
            </div>
            <div>
              <div className="text-sm font-semibold text-[var(--text)]">{formatCompact(totals.views)}</div>
              <div className="text-[0.55rem] uppercase tracking-[0.2em] text-[var(--text-muted)]">All-time views</div>
            </div>
            <div>
              <div className="text-sm font-semibold text-[var(--text)]">{formatCompact(totals.uniques)}</div>
              <div className="text-[0.55rem] uppercase tracking-[0.2em] text-[var(--text-muted)]">Visitors (30d)</div>
            </div>
          </div>
        )}

        {/* Results Count */}
        <div className="flex items-center justify-between text-[0.625rem] text-[var(--text-dim)] uppercase tracking-[0.2em]">
          <span>
            Showing {filteredAndSortedTools.length} of {tools.length} tools
          </span>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-[var(--accent)] hover:text-[var(--accent-light)] transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {!hasActiveFilters && topRankedTools.length > 0 && (
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[0.625rem] text-[var(--accent)] uppercase tracking-[0.2em]">
              Popular right now
            </span>
            <div className="flex-1 h-px bg-[var(--border)]"></div>
            <span className="text-[0.5rem] text-[var(--text-muted)] uppercase tracking-[0.2em]">
              {statsBasis === 'views' ? 'Based on views' : 'Based on uses'}
            </span>
          </div>
          <div className="tool-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {topRankedTools.map((tool) => (
              <ToolCard
                key={`top-${tool.id}`}
                tool={tool}
                stats={toolStats[tool.id]}
                basis={statsBasis}
                onClick={() => sendToolEvent(tool.id, 'hub_click')}
              />
            ))}
          </div>
        </div>
      )}

      {/* Tools Grid */}
      <div className="tool-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mb-12">
        {filteredAndSortedTools.length > 0 ? (
          filteredAndSortedTools.map(tool => (
            <ToolCard
              key={tool.id}
              tool={tool}
              stats={toolStats[tool.id]}
              basis={statsBasis}
              onClick={() => sendToolEvent(tool.id, 'hub_click')}
            />
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <svg className="w-10 h-10 mx-auto mb-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 15l5 5M9 13a4 4 0 100-8 4 4 0 000 8z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 20l4-4" />
            </svg>
            <h3 className="text-lg mb-2">No tools found</h3>
            <p className="text-[var(--text-dim)] text-sm">
              Try adjusting your search or filters
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-[0.625rem] uppercase tracking-[0.2em] border border-[var(--border)] text-[var(--text-dim)] hover:text-[var(--text)] hover:border-[var(--border-hover)] transition-colors"
            >
              Reset filters
            </button>
          </div>
        )}
      </div>

      {/* Popular Tools Section (when no filters applied) */}
      {!hasActiveFilters && topRankedTools.length === 0 && (
        <div className="mt-16">
          <div className="flex items-center gap-4 mb-6">
            <span className="text-[0.625rem] text-[var(--accent)] uppercase tracking-[0.2em]">Popular Tools</span>
            <div className="flex-1 h-px bg-[var(--border)]"></div>
          </div>
          <div className="tool-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {tools.filter(t => t.popular).map(tool => (
              <ToolCard
                key={`popular-${tool.id}`}
                tool={tool}
                stats={toolStats[tool.id]}
                basis={statsBasis}
                onClick={() => sendToolEvent(tool.id, 'hub_click')}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
