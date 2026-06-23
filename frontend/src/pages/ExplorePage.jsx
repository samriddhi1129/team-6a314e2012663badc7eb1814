// frontend/src/pages/ExplorePage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  Search, Filter, TrendingUp, Clock, Star, MessageSquare, Eye,
  CheckCircle, ChevronDown, Tag, X, Bookmark, Flame, Zap
} from 'lucide-react';
import { questionService, categoryService } from '../services/api';
import { formatDistanceToNow } from 'date-fns';

const SORT_OPTIONS = [
  { value: 'activity',   label: 'Recent Activity', icon: Clock },
  { value: 'newest',     label: 'Newest First',    icon: Zap },
  { value: 'votes',      label: 'Most Voted',      icon: Star },
  { value: 'views',      label: 'Most Viewed',     icon: Eye },
  { value: 'answers',    label: 'Most Answered',   icon: MessageSquare },
  { value: 'unanswered', label: 'Unanswered',      icon: Flame },
];

function QuestionCard({ q }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="glass-card rounded-2xl p-5 hover-lift group border border-white/5 hover:border-primary-500/20 transition-all"
    >
      <Link to={`/questions/${q.id}`}>
        <div className="flex gap-4">
          {/* Vote / Answer counts */}
          <div className="hidden sm:flex flex-col items-center gap-3 flex-shrink-0 text-center min-w-[52px]">
            <div className={`rounded-lg px-2 py-1.5 text-center ${q.vote_score > 0 ? 'bg-primary-500/10 text-primary-400' : 'bg-white/5 text-secondary-color'}`}>
              <p className="text-sm font-bold">{q.vote_score}</p>
              <p className="text-[10px]">votes</p>
            </div>
            <div className={`rounded-lg px-2 py-1.5 text-center ${q.accepted_answer_id ? 'bg-green-500/10 text-green-400' : q.answer_count > 0 ? 'bg-blue-500/10 text-blue-400' : 'bg-white/5 text-secondary-color'}`}>
              <p className="text-sm font-bold">{q.answer_count}</p>
              <p className="text-[10px]">{q.answer_count === 1 ? 'answer' : 'answers'}</p>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 flex-wrap mb-2">
              {q.is_featured && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                  <Star className="w-2.5 h-2.5" /> Featured
                </span>
              )}
              {q.accepted_answer_id && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 flex items-center gap-1">
                  <CheckCircle className="w-2.5 h-2.5" /> Solved
                </span>
              )}
              {q.is_wiki && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  Wiki
                </span>
              )}
            </div>

            <h2 className="font-semibold text-primary-color group-hover:text-primary-400 transition-colors text-sm sm:text-base leading-snug mb-3 line-clamp-2">
              {q.title}
            </h2>

            <div className="flex items-center flex-wrap gap-2">
              {q.category && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: `${q.category.color}18`, color: q.category.color }}>
                  {q.category.name}
                </span>
              )}
              {q.tags?.slice(0, 3).map(tag => (
                <span key={tag.id} className="text-xs px-2 py-0.5 rounded-full bg-primary-500/10 text-primary-400 border border-primary-500/20">
                  {tag.name}
                </span>
              ))}
              {q.tags?.length > 3 && (
                <span className="text-xs text-secondary-color">+{q.tags.length - 3}</span>
              )}
            </div>

            <div className="flex items-center gap-3 mt-3 text-xs text-secondary-color">
              {q.author ? (
                <span className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded-full bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center text-[9px] text-white font-bold">
                    {q.author.full_name?.[0]}
                  </div>
                  {q.author.username}
                </span>
              ) : (
                <span className="italic">anonymous</span>
              )}
              <span>·</span>
              <span>{formatDistanceToNow(new Date(q.created_at), { addSuffix: true })}</span>
              <span>·</span>
              <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{q.view_count}</span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default function ExplorePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchInputRef = useRef(null);

  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [sort, setSort] = useState(searchParams.get('sort') || 'activity');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // Auto-focus if ?focus=1
  useEffect(() => {
    if (searchParams.get('focus') === '1' && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  const { data: catData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryService.getAll(),
    select: d => d.data?.data?.categories,
  });

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['questions', { search, sort, category, page }],
    queryFn: () => questionService.getAll({ search, sort, category, page, limit: 15 }),
    select: d => d.data?.data,
    keepPreviousData: true,
  });

  const questions = data?.questions || [];
  const pagination = data?.pagination;

  // Sync URL params
  useEffect(() => {
    const p = {};
    if (search) p.q = search;
    if (sort !== 'activity') p.sort = sort;
    if (category) p.category = category;
    if (page > 1) p.page = page;
    setSearchParams(p);
  }, [search, sort, category, page]);

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-primary-color mb-1">
          Explore <span className="gradient-text">Knowledge Base</span>
        </h1>
        <p className="text-secondary-color text-sm">
          {pagination ? `${pagination.total.toLocaleString()} questions across all topics` : 'Search and discover answers'}
        </p>
      </div>

      {/* Search bar */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-color" />
        <input
          ref={searchInputRef}
          type="text"
          value={search}
          onChange={handleSearch}
          placeholder="Search questions, topics, or keywords..."
          className="w-full bg-white/5 border border-white/10 focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/20 rounded-2xl pl-12 pr-4 py-4 text-primary-color placeholder-secondary-color text-sm outline-none transition-all"
        />
        {search && (
          <button onClick={() => { setSearch(''); setPage(1); }} className="absolute right-4 top-1/2 -translate-y-1/2">
            <X className="w-4 h-4 text-secondary-color hover:text-primary-color" />
          </button>
        )}
      </div>

      <div className="flex gap-6">
        {/* ---- Sidebar Filters ---- */}
        <aside className="hidden lg:block w-56 flex-shrink-0">
          {/* Sort */}
          <div className="glass-card rounded-2xl p-4 mb-4">
            <p className="text-xs font-semibold text-secondary-color uppercase tracking-wider mb-3">Sort By</p>
            <div className="space-y-1">
              {SORT_OPTIONS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => { setSort(value); setPage(1); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                    sort === value ? 'bg-primary-500/20 text-primary-300 font-medium' : 'text-secondary-color hover:text-primary-color hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Categories */}
          <div className="glass-card rounded-2xl p-4">
            <p className="text-xs font-semibold text-secondary-color uppercase tracking-wider mb-3">Categories</p>
            <div className="space-y-1">
              <button
                onClick={() => { setCategory(''); setPage(1); }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${!category ? 'bg-primary-500/20 text-primary-300 font-medium' : 'text-secondary-color hover:text-primary-color hover:bg-white/5'}`}
              >
                All Categories
              </button>
              {catData?.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => { setCategory(cat.slug); setPage(1); }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all ${
                    category === cat.slug ? 'bg-primary-500/20 text-primary-300 font-medium' : 'text-secondary-color hover:text-primary-color hover:bg-white/5'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>{cat.icon}</span>{cat.name}
                  </span>
                  <span className="text-xs opacity-60">{cat.question_count}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* ---- Main Content ---- */}
        <div className="flex-1 min-w-0">
          {/* Mobile sort/filter */}
          <div className="flex items-center gap-2 mb-4 lg:hidden">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-3 py-2 glass-card rounded-xl text-sm text-secondary-color"
            >
              <Filter className="w-4 h-4" />
              Filters
              <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {SORT_OPTIONS.slice(0, 4).map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => { setSort(value); setPage(1); }}
                  className={`whitespace-nowrap px-3 py-2 rounded-xl text-xs transition-all ${
                    sort === value ? 'bg-primary-500/20 text-primary-300' : 'glass-card text-secondary-color'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Loading state */}
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="glass-card rounded-2xl p-5 animate-pulse">
                  <div className="flex gap-4">
                    <div className="hidden sm:flex flex-col gap-3 w-14">
                      <div className="skeleton h-10 w-full rounded-lg" />
                      <div className="skeleton h-10 w-full rounded-lg" />
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="skeleton h-4 w-3/4 rounded" />
                      <div className="skeleton h-3 w-1/2 rounded" />
                      <div className="flex gap-2">
                        <div className="skeleton h-5 w-16 rounded-full" />
                        <div className="skeleton h-5 w-16 rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : questions.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="font-display text-xl font-bold text-primary-color mb-2">No questions found</h3>
              <p className="text-secondary-color mb-6">
                {search ? `No results for "${search}"` : 'Be the first to ask a question!'}
              </p>
              <Link to="/ask">
                <button className="bg-gradient-to-r from-primary-600 to-purple-600 text-white font-semibold py-3 px-8 rounded-xl">
                  Ask the First Question
                </button>
              </Link>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              <div className="space-y-3">
                {questions.map(q => <QuestionCard key={q.id} q={q} />)}
              </div>
            </AnimatePresence>
          )}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 glass-card rounded-xl text-sm text-secondary-color disabled:opacity-40 hover:text-primary-color transition-all"
              >
                ← Prev
              </button>
              {[...Array(Math.min(5, pagination.totalPages))].map((_, i) => {
                const p = i + Math.max(1, page - 2);
                if (p > pagination.totalPages) return null;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-9 h-9 rounded-xl text-sm transition-all ${
                      p === page ? 'bg-primary-500/20 text-primary-300 font-bold' : 'glass-card text-secondary-color hover:text-primary-color'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="px-4 py-2 glass-card rounded-xl text-sm text-secondary-color disabled:opacity-40 hover:text-primary-color transition-all"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
