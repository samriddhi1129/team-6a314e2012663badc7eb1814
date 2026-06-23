// frontend/src/pages/LandingPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  Search, Users, BookOpen, Zap, Award, TrendingUp, ChevronRight,
  Star, MessageCircle, CheckCircle, Globe, Brain, Shield
} from 'lucide-react';
import { questionService, analyticsService, categoryService } from '../services/api';
import useAuthStore from '../store/authStore';

const fadeUp = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } };
const stagger = { show: { transition: { staggerChildren: 0.08 } } };

export default function LandingPage() {
  const { isAuthenticated } = useAuthStore();

  const { data: stats } = useQuery({
    queryKey: ['overview'],
    queryFn: () => analyticsService.getOverview(),
    select: d => d.data?.data?.stats,
  });

  const { data: trending } = useQuery({
    queryKey: ['trending'],
    queryFn: () => questionService.trending(),
    select: d => d.data?.data?.questions?.slice(0, 5),
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryService.getAll(),
    select: d => d.data?.data?.categories?.slice(0, 8),
  });

  const features = [
    { icon: Brain, title: 'AI-Powered Search', desc: 'Semantic search finds the most relevant answers instantly, even for complex research queries.', color: 'from-purple-500 to-indigo-500' },
    { icon: Users, title: 'Community Validated', desc: 'Answers are crowd-verified by peers, faculty and researchers ensuring high accuracy.', color: 'from-blue-500 to-cyan-500' },
    { icon: Award, title: 'Gamified Learning', desc: 'Earn reputation, badges and climb the leaderboard as you contribute to the knowledge base.', color: 'from-amber-500 to-orange-500' },
    { icon: Globe, title: 'Knowledge Graph', desc: 'Explore interconnected topics visually — discover how research areas relate to each other.', color: 'from-green-500 to-teal-500' },
    { icon: Shield, title: 'Wiki Collaboration', desc: 'Verified answers can be collaboratively improved like Wikipedia for lasting accuracy.', color: 'from-pink-500 to-rose-500' },
    { icon: TrendingUp, title: 'Research Analytics', desc: 'Visual dashboards reveal trending topics, hot research areas, and community engagement.', color: 'from-violet-500 to-purple-500' },
  ];

  const statsDisplay = [
    { label: 'Active Members', value: stats?.total_users || '500+', icon: Users },
    { label: 'Questions Asked', value: stats?.total_questions || '2.4K+', icon: MessageCircle },
    { label: 'Answers Given', value: stats?.total_answers || '8.1K+', icon: CheckCircle },
    { label: 'Answer Rate', value: stats ? `${stats.engagement_rate}%` : '94%', icon: Star },
  ];

  return (
    <div className="overflow-x-hidden">
      {/* ---- HERO ---- */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 gradient-bg hero-pattern" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--bg-primary)]" />
        {/* Glow orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1.5s' }} />

        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          <motion.div variants={stagger} initial="hidden" animate="show">
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 text-sm text-white/80 mb-6">
              <Zap className="w-4 h-4 text-yellow-400" />
              IIT Ropar's Official Knowledge Platform
            </motion.div>

            <motion.h1 variants={fadeUp} className="font-display text-4xl sm:text-5xl md:text-7xl font-extrabold text-white mb-6 leading-tight">
              Where Curiosity Meets{' '}
              <span className="gradient-text-gold">Community</span>
            </motion.h1>

            <motion.p variants={fadeUp} className="text-lg sm:text-xl text-white/70 max-w-2xl mx-auto mb-10 leading-relaxed">
              Vicharanshala Lab is IIT Ropar's crowd-sourced FAQ platform — ask questions,
              share expertise, and build a living knowledge base together.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/explore">
                <button className="group flex items-center gap-2 bg-white text-ropar-navy font-bold py-4 px-8 rounded-2xl hover:bg-white/90 transition-all shadow-2xl text-base">
                  <Search className="w-5 h-5" />
                  Explore FAQs
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
              {!isAuthenticated && (
                <Link to="/register">
                  <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/30 text-white font-semibold py-4 px-8 rounded-2xl transition-all text-base">
                    Join the Community
                  </button>
                </Link>
              )}
              {isAuthenticated && (
                <Link to="/ask">
                  <button className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold py-4 px-8 rounded-2xl transition-all shadow-lg text-base">
                    Ask a Question
                  </button>
                </Link>
              )}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ---- STATS ---- */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {statsDisplay.map(({ label, value, icon: Icon }) => (
              <div key={label} className="glass-card rounded-2xl p-6 text-center hover-lift">
                <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center mx-auto mb-3">
                  <Icon className="w-6 h-6 text-primary-400" />
                </div>
                <p className="font-display text-3xl font-bold gradient-text mb-1">{value}</p>
                <p className="text-sm text-secondary-color">{label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ---- FEATURES ---- */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="font-display text-3xl md:text-4xl font-bold text-primary-color mb-4">
              Built for <span className="gradient-text">Academic Excellence</span>
            </h2>
            <p className="text-secondary-color max-w-xl mx-auto">
              Every feature designed specifically for the IIT Ropar research and academic community.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, desc, color }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className="glass-card rounded-2xl p-6 hover-lift group"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-display font-bold text-primary-color mb-2">{title}</h3>
                <p className="text-sm text-secondary-color leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- CATEGORIES ---- */}
      {categories?.length > 0 && (
        <section className="py-16 px-6">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-10"
            >
              <h2 className="font-display text-3xl font-bold text-primary-color mb-3">
                Browse <span className="gradient-text">Categories</span>
              </h2>
              <p className="text-secondary-color">Find answers organized by topic</p>
            </motion.div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {categories.map((cat, i) => (
                <motion.div
                  key={cat.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Link to={`/explore?category=${cat.slug}`}>
                    <div className="glass-card rounded-2xl p-5 hover-lift cursor-pointer group border border-white/5 hover:border-primary-500/30 transition-all">
                      <div className="text-2xl mb-3">{cat.icon}</div>
                      <h3 className="font-semibold text-sm text-primary-color group-hover:text-primary-400 transition-colors">{cat.name}</h3>
                      <p className="text-xs text-secondary-color mt-1">{cat.question_count} questions</p>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---- TRENDING ---- */}
      {trending?.length > 0 && (
        <section className="py-16 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="font-display text-2xl font-bold text-primary-color flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-orange-400" />
                Trending This Week
              </h2>
              <Link to="/explore?sort=votes" className="text-primary-400 hover:text-primary-300 text-sm flex items-center gap-1">
                View all <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="space-y-3">
              {trending.map((q, i) => (
                <motion.div
                  key={q.id}
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06 }}
                >
                  <Link to={`/questions/${q.id}`}>
                    <div className="glass-card rounded-xl p-4 hover-lift group flex items-start gap-4">
                      <span className="text-2xl font-display font-black text-primary-500/30 w-8 text-center flex-shrink-0">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-primary-color group-hover:text-primary-400 transition-colors text-sm leading-snug line-clamp-2">
                          {q.title}
                        </h3>
                        <div className="flex items-center gap-3 mt-2">
                          {q.category && (
                            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${q.category.color}15`, color: q.category.color }}>
                              {q.category.name}
                            </span>
                          )}
                          <span className="text-xs text-secondary-color">{q.vote_score} votes</span>
                          <span className="text-xs text-secondary-color">{q.answer_count} answers</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---- CTA ---- */}
      {!isAuthenticated && (
        <section className="py-20 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="glass-card rounded-3xl p-10 glow-border"
            >
              <div className="text-5xl mb-4">🎓</div>
              <h2 className="font-display text-3xl font-bold text-primary-color mb-4">
                Join the <span className="gradient-text">IIT Ropar</span> Knowledge Community
              </h2>
              <p className="text-secondary-color mb-8">
                Students, researchers, and faculty — contribute your expertise,
                earn recognition, and help build the definitive knowledge base for IIT Ropar.
              </p>
              <div className="flex gap-4 justify-center">
                <Link to="/register">
                  <button className="bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-500 hover:to-purple-500 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-glow-sm">
                    Create Free Account
                  </button>
                </Link>
                <Link to="/explore">
                  <button className="border border-white/20 text-primary-color hover:bg-white/5 font-semibold py-3 px-8 rounded-xl transition-all">
                    Browse FAQs
                  </button>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-color py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-secondary-color">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary-400" />
            <span className="font-medium">Vicharanshala Lab</span>
            <span>·</span>
            <span>IIT Ropar</span>
          </div>
          <p>© {new Date().getFullYear()} Indian Institute of Technology Ropar. All rights reserved.</p>
          <div className="flex gap-4">
            <Link to="/explore" className="hover:text-primary-400 transition-colors">Explore</Link>
            <Link to="/analytics" className="hover:text-primary-400 transition-colors">Analytics</Link>
            <Link to="/leaderboard" className="hover:text-primary-400 transition-colors">Leaderboard</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
