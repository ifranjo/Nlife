import React, { useState, useMemo } from 'react';
import type { Tool } from '../../lib/tools';

interface ToolHubProps {
  tools: Tool[];
}

interface ToolCardProps {
  tool: Tool;
}

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

const ToolCard: React.FC<ToolCardProps> = ({ tool }) => {
  const isDisabled = tool.tier === 'coming' || tool.tier === 'pro';
  const tagClass = tool.tier === 'free' ? 'tag-free' : tool.tier === 'pro' ? 'tag-pro' : 'tag-coming';
  const categoryLabel = categoryLabels[tool.category] ?? tool.category;

  return (
    <a
      href={isDisabled ? undefined : tool.href}
      className={[
        'tool-card block',
        isDisabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
      ].join(' ')}
      data-category={tool.category}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 tool-icon">
          <img src={tool.thumbnail} alt={`${tool.name} icon`} className="w-full h-full" loading="lazy" />
        </div>
        <span className={`tag ${tagClass}`}>
          {tool.tier}
        </span>
      </div>

      {/* Title */}
      <h3 className="tool-title text-[var(--text)] text-sm uppercase tracking-[0.1em] mb-2 font-medium">
        {tool.name}
      </h3>

      {/* Description */}
      <p className="text-[var(--text-dim)] text-xs leading-relaxed mb-4">
        {tool.description}
      </p>

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
            <label className="text-[0.625rem] uppercase tracking-[0.2em] text-[var(--text-dim)]">
              Sort by:
            </label>
            <select
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

      {/* Tools Grid */}
      <div className="tool-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mb-12">
        {filteredAndSortedTools.length > 0 ? (
          filteredAndSortedTools.map(tool => (
            <ToolCard key={tool.id} tool={tool} />
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
      {!hasActiveFilters && (
        <div className="mt-16">
          <div className="flex items-center gap-4 mb-6">
            <span className="text-[0.625rem] text-[var(--accent)] uppercase tracking-[0.2em]">Popular Tools</span>
            <div className="flex-1 h-px bg-[var(--border)]"></div>
          </div>
          <div className="tool-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {tools.filter(t => t.popular).map(tool => (
              <ToolCard key={`popular-${tool.id}`} tool={tool} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
