// frontend/src/pages/AskQuestion.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQuery } from '@tanstack/react-query';
import { PlusCircle, Tag, AlertTriangle, Lightbulb, X, Search } from 'lucide-react';
import { questionService, categoryService } from '../services/api';
import toast from 'react-hot-toast';
import { useDebounce } from '../hooks/useDebounce';

export default function AskQuestion() {
  const navigate = useNavigate();
  const [title, setTitle]       = useState('');
  const [body, setBody]         = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [tagSearch, setTagSearch] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [showSimilar, setShowSimilar] = useState(false);

  const debouncedTitle = useDebounce(title, 600);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryService.getAll(),
    select: d => d.data?.data?.categories,
  });

  const { data: allTags } = useQuery({
    queryKey: ['tags', tagSearch],
    queryFn: () => categoryService.getTags({ search: tagSearch, limit: 20 }),
    select: d => d.data?.data?.tags,
  });

  const { data: similar } = useQuery({
    queryKey: ['similar', debouncedTitle],
    queryFn: () => questionService.similar(debouncedTitle),
    select: d => d.data?.data?.questions,
    enabled: debouncedTitle.length > 15,
  });

  useEffect(() => {
    setShowSimilar((similar?.length || 0) > 0 && title.length > 15);
  }, [similar, title]);

  const mutation = useMutation({
    mutationFn: (data) => questionService.create(data),
    onSuccess: (d) => {
      toast.success('Question posted successfully!');
      navigate(`/questions/${d.data.data.question.id}`);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to post question'),
  });

  const handleSubmit = () => {
    if (!title.trim()) return toast.error('Please enter a question title');
    if (!body.trim()) return toast.error('Please provide question details');

    mutation.mutate({
      title: title.trim(),
      body,
      body_text: body.replace(/<[^>]*>/g, ''),
      category_id: categoryId || null,
      tags: selectedTags.map(t => t.id),
      is_anonymous: isAnonymous,
    });
  };

  const addTag = (tag) => {
    if (!selectedTags.find(t => t.id === tag.id) && selectedTags.length < 5) {
      setSelectedTags([...selectedTags, tag]);
      setTagSearch('');
    }
  };

  const removeTag = (id) => setSelectedTags(selectedTags.filter(t => t.id !== id));

  const tips = [
    'Summarize your problem in the title',
    'Describe what you tried and what happened',
    'Include relevant course codes or lab names',
    'Add appropriate tags to reach the right audience',
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-primary-color mb-2">
          Ask a <span className="gradient-text">Question</span>
        </h1>
        <p className="text-secondary-color text-sm">
          Getting a great answer starts with a well-written question.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* ---- Main Form ---- */}
        <div className="lg:col-span-2 space-y-5">
          {/* Similar questions warning */}
          <AnimatePresence>
            {showSimilar && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="glass-card rounded-2xl p-4 border border-amber-500/25"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-amber-400 mb-2">Similar questions found</p>
                    <div className="space-y-2">
                      {similar?.map(q => (
                        <a key={q.id} href={`/questions/${q.id}`} target="_blank" rel="noreferrer"
                          className="flex items-start gap-2 text-xs text-secondary-color hover:text-primary-400 transition-colors group">
                          <Search className="w-3 h-3 mt-0.5 flex-shrink-0 text-primary-400" />
                          <span className="group-hover:underline line-clamp-1">{q.title}</span>
                          <span className="ml-auto text-green-400 flex-shrink-0">{q.answer_count} ans</span>
                        </a>
                      ))}
                    </div>
                    <p className="text-xs text-secondary-color mt-2">Already answered? Check these before posting.</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Title */}
          <div className="glass-card rounded-2xl p-5">
            <label className="block text-sm font-semibold text-primary-color mb-2">
              Question Title <span className="text-red-400">*</span>
            </label>
            <p className="text-xs text-secondary-color mb-3">Be specific and imagine you're asking another person</p>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={300}
              placeholder="e.g. What is the process for applying for a research internship at IIT Ropar?"
              className="w-full bg-white/5 border border-white/10 focus:border-primary-500/50 rounded-xl px-4 py-3 text-sm text-primary-color placeholder-secondary-color outline-none transition-all"
            />
            <p className="text-xs text-secondary-color text-right mt-1">{title.length}/300</p>
          </div>

          {/* Body */}
          <div className="glass-card rounded-2xl p-5">
            <label className="block text-sm font-semibold text-primary-color mb-2">
              Question Details <span className="text-red-400">*</span>
            </label>
            <p className="text-xs text-secondary-color mb-3">Include all the information someone would need to answer your question</p>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={10}
              placeholder="Describe your question in detail. You can use HTML for formatting:&#10;&#10;<p>Your question...</p>&#10;<ul><li>What have you tried?</li></ul>&#10;<code>relevant code or context</code>"
              className="w-full bg-white/5 border border-white/10 focus:border-primary-500/50 rounded-xl px-4 py-3 text-sm text-primary-color placeholder-secondary-color outline-none transition-all resize-none font-mono"
            />
          </div>

          {/* Category */}
          <div className="glass-card rounded-2xl p-5">
            <label className="block text-sm font-semibold text-primary-color mb-3">Category</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {categories?.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryId(cat.id === categoryId ? '' : cat.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all text-left ${
                    categoryId === cat.id
                      ? 'bg-primary-500/20 text-primary-300 border border-primary-500/40'
                      : 'bg-white/5 text-secondary-color hover:bg-white/10 border border-white/5'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span className="truncate text-xs">{cat.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="glass-card rounded-2xl p-5">
            <label className="block text-sm font-semibold text-primary-color mb-1">Tags</label>
            <p className="text-xs text-secondary-color mb-3">Add up to 5 tags to describe your question</p>

            {/* Selected tags */}
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {selectedTags.map(tag => (
                  <span key={tag.id} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-primary-500/15 text-primary-400 border border-primary-500/30">
                    #{tag.name}
                    <button onClick={() => removeTag(tag.id)} className="hover:text-red-400 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <input
              value={tagSearch}
              onChange={e => setTagSearch(e.target.value)}
              placeholder="Search tags (e.g. phd, research, cse)"
              disabled={selectedTags.length >= 5}
              className="w-full bg-white/5 border border-white/10 focus:border-primary-500/50 rounded-xl px-4 py-2.5 text-sm text-primary-color placeholder-secondary-color outline-none transition-all disabled:opacity-50"
            />

            <AnimatePresence>
              {tagSearch && allTags?.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-2 flex flex-wrap gap-2"
                >
                  {allTags.filter(t => !selectedTags.find(s => s.id === t.id)).map(tag => (
                    <button
                      key={tag.id}
                      onClick={() => addTag(tag)}
                      className="text-xs px-2.5 py-1 rounded-lg bg-white/5 text-secondary-color hover:bg-primary-500/15 hover:text-primary-400 border border-white/5 hover:border-primary-500/30 transition-all flex items-center gap-1"
                    >
                      <Tag className="w-2.5 h-2.5" /> {tag.name}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Options */}
          <div className="glass-card rounded-2xl p-5">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={e => setIsAnonymous(e.target.checked)}
                className="w-4 h-4 rounded accent-primary-500"
              />
              <div>
                <p className="text-sm font-medium text-primary-color">Post anonymously</p>
                <p className="text-xs text-secondary-color">Your name won't appear on this question</p>
              </div>
            </label>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={mutation.isPending || !title.trim() || !body.trim()}
            className="w-full bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 px-8 rounded-2xl transition-all shadow-glow-sm hover:shadow-glow-md flex items-center justify-center gap-2"
          >
            <PlusCircle className="w-5 h-5" />
            {mutation.isPending ? 'Posting...' : 'Post Question'}
          </button>
        </div>

        {/* ---- Tips Sidebar ---- */}
        <div className="space-y-4">
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="w-5 h-5 text-amber-400" />
              <h3 className="font-semibold text-primary-color text-sm">Writing Tips</h3>
            </div>
            <ul className="space-y-3">
              {tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-secondary-color">
                  <span className="w-4 h-4 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>

          <div className="glass-card rounded-2xl p-5">
            <h3 className="font-semibold text-primary-color text-sm mb-3">Community Guidelines</h3>
            <ul className="space-y-2 text-xs text-secondary-color">
              <li>✅ Be respectful and professional</li>
              <li>✅ Search before asking</li>
              <li>✅ One question per post</li>
              <li>❌ No spam or self-promotion</li>
              <li>❌ No personal attacks</li>
              <li>❌ No duplicate questions</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
