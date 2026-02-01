import React, { useState, useMemo, useEffect } from 'react';
import type { Tool } from '../../lib/tools';

interface ToolHubProps {
  tools: Tool[];
}

interface ToolCardProps {
  tool: Tool;
}

// Map categories to CSS variable colors
const categoryColors: Record<string, string> = {
  pdf: 'var(--cat-document)',
  image: 'var(--cat-media)',
  video: 'var(--cat-media)',
  audio: 'var(--cat-media)',
  text: 'var(--cat-utility)',
  dev: 'var(--cyan)',
  ai: 'var(--cat-ai)',
  utility: 'var(--cat-utility)',
  media: 'var(--cat-media)',
  games: 'var(--cat-ai)',
};

const ToolCard: React.FC<ToolCardProps> = ({ tool }) => {
  const isDisabled = tool.tier === 'coming' || tool.tier === 'pro';
  const accentColor = categoryColors[tool.category] || 'var(--cyan)';

  return (
    <a
      href={isDisabled ? undefined : tool.href}
      className={`tool-card-enigmatic group block relative p-6 bg-[var(--surface)] border border-[var(--border)] transition-all duration-300 overflow-hidden ${
        isDisabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'hover:border-[var(--border-hover)] hover:bg-[var(--elevated)] hover:-translate-y-1'
      }`}
      style={{ '--card-accent': accentColor } as React.CSSProperties}
      data-category={tool.category}
    >
      {/* Top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-0.5 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"
        style={{ background: accentColor }}
      />

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 opacity-90 group-hover:opacity-100 transition-opacity">
          <img src={tool.thumbnail} alt="" className="w-full h-full" loading="lazy" />
        </div>
        <span className={`text-[0.5rem] uppercase tracking-[0.15em] px-2 py-1 border ${
          tool.tier === 'free'
            ? 'text-[var(--success)] border-[var(--success)] bg-[rgba(0,255,0,0.05)]'
            : tool.tier === 'pro'
            ? 'text-[var(--warning)] border-[var(--warning)] bg-[rgba(255,170,0,0.05)]'
            : 'text-[var(--text-muted)] border-[var(--border)]'
        }`}>
          {tool.tier}
        </span>
      </div>

      {/* Title */}
      <h3 className="font-display text-sm font-medium text-[var(--text)] group-hover:text-white transition-colors mb-2">
        {tool.name}
      </h3>

      {/* Description */}
      <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-4">
        {tool.description}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="text-[0.5rem] uppercase tracking-[0.2em]" style={{ color: accentColor }}>
          {tool.category}
        </span>
        {!isDisabled && (
          <span className="text-[var(--text-muted)] group-hover:text-[var(--cyan)] group-hover:translate-x-1 transition-all duration-300">
            →
          </span>
        )}
      </div>
    </a>
  );
};

export const ToolHub: React.FC<ToolHubProps> = ({ tools }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('popular');
  const [selectedTier, setSelectedTier] = useState<string>('all');

  // Listen for category filter events from parent
  useEffect(() => {
    const handleCategoryFilter = (e: CustomEvent) => {
      const category = e.detail?.category;
      if (category) {
        setSelectedCategory(category);
      }
    };

    window.addEventListener('categoryFilter', handleCategoryFilter as EventListener);
    return () => window.removeEventListener('categoryFilter', handleCategoryFilter as EventListener);
  }, []);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = ['all', ...new Set(tools.map(t => t.category))];
    return cats;
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
      <div className="mb-8 space-y-6">
        {/* Search Bar - Enigmatic style */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search tools..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search tools"
            className="w-full px-4 py-3 pl-12 bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--cyan)] focus:shadow-[0_0_20px_rgba(0,212,255,0.1)] transition-all font-mono tracking-wide"
          />
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">○</span>
        </div>

        {/* Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Sort */}
          <div className="flex items-center gap-3">
            <label htmlFor="sort-select" className="text-[0.625rem] uppercase tracking-[0.2em] text-[var(--text-muted)]">
              Sort:
            </label>
            <select
              id="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 bg-[var(--surface)] border border-[var(--border)] text-[0.625rem] uppercase tracking-[0.15em] text-[var(--text)] focus:outline-none focus:border-[var(--cyan)] font-mono"
            >
              <option value="popular">Popular</option>
              <option value="name">Name A-Z</option>
              <option value="recent">Recent</option>
            </select>
          </div>

          {/* Tier Filter */}
          <div className="flex items-center gap-2">
            {['all', 'free'].map(tier => (
              <button
                key={tier}
                onClick={() => setSelectedTier(tier)}
                className={`px-3 py-2 text-[0.625rem] uppercase tracking-[0.15em] border transition-all ${
                  selectedTier === tier
                    ? 'border-[var(--cyan)] text-[var(--cyan)]'
                    : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-hover)]'
                }`}
              >
                {tier}
              </button>
            ))}
          </div>

          {/* Results Count */}
          <span className="text-[0.625rem] text-[var(--text-muted)] uppercase tracking-[0.2em]">
            {filteredAndSortedTools.length} of {tools.length} tools
          </span>
        </div>
      </div>

      {/* Tools Grid */}
      <div className="tool-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredAndSortedTools.length > 0 ? (
          filteredAndSortedTools.map(tool => (
            <ToolCard key={tool.id} tool={tool} />
          ))
        ) : (
          <div className="col-span-full text-center py-16">
            <div className="text-4xl mb-4 opacity-30">○</div>
            <h3 className="font-display text-lg mb-2">No tools found</h3>
            <p className="text-[var(--text-muted)] text-sm">
              Try adjusting your search or filters
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-4 text-[var(--cyan)] text-xs uppercase tracking-[0.15em] hover:underline"
              >
                Clear search
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
