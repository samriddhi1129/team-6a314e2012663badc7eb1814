// frontend/src/pages/LeaderboardPage.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Trophy, Crown, Medal, Star, TrendingUp, Users, Award } from 'lucide-react';
import { userService } from '../services/api';

const PERIODS = [
  { value: 'all',   label: 'All Time' },
  { value: 'month', label: 'This Month' },
  { value: 'week',  label: 'This Week' },
];

const BADGE_COLORS = {
  bronze:   'badge-bronze',
  silver:   'badge-silver',
  gold:     'badge-gold',
  platinum: 'badge-platinum',
  diamond:  'badge-diamond',
};

function RankBadge({ rank }) {
  if (rank === 1) return <Crown className="w-6 h-6 text-yellow-400" />;
  if (rank === 2) return <Medal className="w-6 h-6 text-gray-300" />;
  if (rank === 3) return <Medal className="w-6 h-6 text-amber-600" />;
  return <span className="text-sm font-bold text-secondary-color w-6 text-center">{rank}</span>;
}

function TrustBar({ score }) {
  const pct = Math.min(100, score);
  const color = pct >= 80 ? '#10b981' : pct >= 50 ? '#6366f1' : '#f59e0b';
  return (
    <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="h-full rounded-full"
        style={{ background: color }}
      />
    </div>
  );
}

export default function LeaderboardPage() {
  const [period, setPeriod] = useState('all');

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['leaderboard', period],
    queryFn: () => userService.getLeaderboard({ period, limit: 50 }),
    select: d => d.data?.data?.users || [],
  });

  const top3 = users.slice(0, 3);
  const rest  = users.slice(3);

  const roleColor = {
    student:    'role-student',
    researcher: 'role-researcher',
    faculty:    'role-faculty',
    admin:      'role-admin',
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-10">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-glow-md mb-4">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-display text-4xl font-extrabold text-primary-color mb-2">
            <span className="gradient-text-gold">Leaderboard</span>
          </h1>
          <p className="text-secondary-color">Top contributors building IIT Ropar's knowledge base</p>
        </motion.div>

        {/* Period selector */}
        <div className="flex gap-2 justify-center mt-6">
          {PERIODS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setPeriod(value)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                period === value
                  ? 'bg-primary-500/20 text-primary-300 border border-primary-500/40'
                  : 'glass-card text-secondary-color hover:text-primary-color border border-white/5'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="skeleton h-16 rounded-2xl" />
          ))}
        </div>
      ) : (
        <>
          {/* ---- Podium Top 3 ---- */}
          {top3.length > 0 && (
            <div className="flex items-end justify-center gap-4 mb-10">
              {/* 2nd */}
              {top3[1] && (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="flex flex-col items-center"
                >
                  <Link to={`/users/${top3[1].username}`}>
                    <div className="relative">
                      {top3[1].avatar_url ? (
                        <img src={top3[1].avatar_url} className="w-16 h-16 rounded-2xl object-cover border-2 border-gray-400/50" alt="" />
                      ) : (
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white text-2xl font-bold">
                          {top3[1].full_name?.[0]}
                        </div>
                      )}
                      <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gray-400 flex items-center justify-center text-[10px] font-bold text-white">2</div>
                    </div>
                    <p className="text-xs font-semibold text-primary-color mt-2 text-center max-w-[80px] truncate">{top3[1].full_name}</p>
                    <p className="text-xs text-secondary-color text-center">{top3[1].reputation_score} pts</p>
                  </Link>
                  <div className="w-24 h-16 bg-gradient-to-t from-gray-500/20 to-gray-400/10 rounded-t-xl mt-2 border border-gray-400/20 flex items-center justify-center">
                    <Medal className="w-6 h-6 text-gray-400" />
                  </div>
                </motion.div>
              )}

              {/* 1st */}
              {top3[0] && (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center"
                >
                  <Link to={`/users/${top3[0].username}`}>
                    <div className="relative">
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-yellow-400 animate-float">👑</div>
                      {top3[0].avatar_url ? (
                        <img src={top3[0].avatar_url} className="w-20 h-20 rounded-2xl object-cover border-2 border-yellow-400/70 shadow-glow-md" alt="" />
                      ) : (
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-yellow-500 to-amber-500 flex items-center justify-center text-white text-3xl font-bold shadow-glow-md">
                          {top3[0].full_name?.[0]}
                        </div>
                      )}
                    </div>
                    <p className="text-sm font-bold text-primary-color mt-3 text-center max-w-[90px] truncate">{top3[0].full_name}</p>
                    <p className="text-sm font-bold gradient-text-gold text-center">{top3[0].reputation_score} pts</p>
                  </Link>
                  <div className="w-28 h-24 bg-gradient-to-t from-yellow-500/20 to-yellow-400/10 rounded-t-xl mt-2 border border-yellow-400/25 flex items-center justify-center">
                    <Crown className="w-8 h-8 text-yellow-400" />
                  </div>
                </motion.div>
              )}

              {/* 3rd */}
              {top3[2] && (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex flex-col items-center"
                >
                  <Link to={`/users/${top3[2].username}`}>
                    <div className="relative">
                      {top3[2].avatar_url ? (
                        <img src={top3[2].avatar_url} className="w-14 h-14 rounded-2xl object-cover border-2 border-amber-700/50" alt="" />
                      ) : (
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-700 to-amber-900 flex items-center justify-center text-white text-xl font-bold">
                          {top3[2].full_name?.[0]}
                        </div>
                      )}
                      <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-amber-700 flex items-center justify-center text-[10px] font-bold text-white">3</div>
                    </div>
                    <p className="text-xs font-semibold text-primary-color mt-2 text-center max-w-[70px] truncate">{top3[2].full_name}</p>
                    <p className="text-xs text-secondary-color text-center">{top3[2].reputation_score} pts</p>
                  </Link>
                  <div className="w-20 h-12 bg-gradient-to-t from-amber-700/20 to-amber-600/10 rounded-t-xl mt-2 border border-amber-700/20 flex items-center justify-center">
                    <Medal className="w-5 h-5 text-amber-600" />
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {/* ---- Rest of leaderboard ---- */}
          <div className="space-y-2">
            <AnimatePresence>
              {rest.map((u, i) => {
                const rank = i + 4;
                const trustScore = Math.min(100, Math.floor(u.reputation_score / 10));
                return (
                  <motion.div
                    key={u.id}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="glass-card rounded-2xl px-5 py-4 flex items-center gap-4 hover-lift border border-white/5 hover:border-primary-500/20 transition-all"
                  >
                    {/* Rank */}
                    <div className="w-8 flex-shrink-0 flex items-center justify-center">
                      <RankBadge rank={rank} />
                    </div>

                    {/* Avatar */}
                    <Link to={`/users/${u.username}`} className="flex-shrink-0">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} className="w-10 h-10 rounded-xl object-cover" alt="" />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                          {u.full_name?.[0]}
                        </div>
                      )}
                    </Link>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link to={`/users/${u.username}`} className="font-semibold text-sm text-primary-color hover:text-primary-400 transition-colors truncate">
                          {u.full_name}
                        </Link>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize ${roleColor[u.role] || 'bg-white/10 text-secondary-color'}`}>
                          {u.role}
                        </span>
                      </div>
                      <p className="text-xs text-secondary-color truncate">{u.department || '@' + u.username}</p>
                    </div>

                    {/* Stats */}
                    <div className="hidden sm:flex items-center gap-6 text-xs text-secondary-color flex-shrink-0">
                      <div className="text-center">
                        <p className="font-bold text-primary-color">{u.question_count}</p>
                        <p>Q</p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-primary-color">{u.answer_count}</p>
                        <p>A</p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-primary-color">{u.badge_count || 0}</p>
                        <p>🏅</p>
                      </div>
                      <div className="text-center">
                        <TrustBar score={trustScore} />
                        <p className="mt-1">Trust</p>
                      </div>
                    </div>

                    {/* Score */}
                    <div className="text-right flex-shrink-0">
                      <p className="font-display font-bold text-primary-400 text-sm">
                        {period === 'all' ? u.reputation_score : (u.period_score || 0)}
                      </p>
                      <p className="text-[10px] text-secondary-color">pts</p>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {users.length === 0 && (
            <div className="text-center py-20">
              <Users className="w-12 h-12 text-secondary-color mx-auto mb-4" />
              <p className="text-secondary-color">No users found for this period</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
