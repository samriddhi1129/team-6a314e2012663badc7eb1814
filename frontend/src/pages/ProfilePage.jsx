// frontend/src/pages/ProfilePage.jsx
import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  MapPin, Globe, Github, Linkedin, Calendar, MessageSquare,
  CheckCircle, Award, Star, TrendingUp, BookOpen, ExternalLink
} from 'lucide-react';
import { userService } from '../services/api';
import { format, formatDistanceToNow } from 'date-fns';
import useAuthStore from '../store/authStore';

const BADGE_STYLES = {
  bronze:   'badge-bronze',
  silver:   'badge-silver',
  gold:     'badge-gold',
  platinum: 'badge-platinum',
  diamond:  'badge-diamond',
};

function TrustMeter({ score }) {
  const pct  = Math.min(100, score);
  const color = pct >= 80 ? '#10b981' : pct >= 50 ? '#6366f1' : '#f59e0b';
  const label = pct >= 80 ? 'Expert' : pct >= 50 ? 'Trusted' : pct >= 25 ? 'Active' : 'Newcomer';
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-secondary-color">Community Trust</span>
        <span className="font-semibold" style={{ color }}>{label} ({pct}%)</span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${color}80, ${color})` }}
        />
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { username } = useParams();
  const { user: currentUser } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['profile', username],
    queryFn: () => userService.getProfile(username),
    select: d => d.data?.data,
  });

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 animate-pulse">
        <div className="flex gap-6 mb-8">
          <div className="skeleton w-24 h-24 rounded-2xl flex-shrink-0" />
          <div className="flex-1 space-y-3">
            <div className="skeleton h-7 w-48 rounded" />
            <div className="skeleton h-4 w-64 rounded" />
            <div className="skeleton h-4 w-32 rounded" />
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center">
        <p className="text-4xl mb-4">👤</p>
        <h2 className="font-display text-2xl font-bold text-primary-color mb-2">User Not Found</h2>
        <Link to="/explore"><button className="text-primary-400 hover:text-primary-300 mt-4">← Back to Explore</button></Link>
      </div>
    );
  }

  const { user, recent_questions, top_answers } = data;
  const isOwn = currentUser?.username === username;

  const roleColors = {
    student: 'from-emerald-500 to-teal-500',
    researcher: 'from-purple-500 to-indigo-500',
    faculty: 'from-amber-500 to-orange-500',
    admin: 'from-red-500 to-pink-500',
  };

  const stats = [
    { label: 'Reputation', value: user.reputation_score, icon: Star, color: 'text-amber-400' },
    { label: 'Questions', value: user.question_count, icon: MessageSquare, color: 'text-blue-400' },
    { label: 'Answers', value: user.answer_count, icon: CheckCircle, color: 'text-green-400' },
    { label: 'Trust Score', value: `${user.trust_score}%`, icon: TrendingUp, color: 'text-purple-400' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Profile Header */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 mb-6">
        <div className="flex flex-col sm:flex-row gap-6">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            {user.avatar_url ? (
              <img src={user.avatar_url} className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover ring-2 ring-primary-500/30" alt="" />
            ) : (
              <div className={`w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-br ${roleColors[user.role] || 'from-primary-500 to-purple-500'} flex items-center justify-center text-white text-4xl font-display font-extrabold`}>
                {user.full_name?.[0]}
              </div>
            )}
            <div className="absolute -bottom-2 -right-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize bg-gradient-to-r ${roleColors[user.role] || 'from-primary-500 to-purple-500'} text-white`}>
                {user.role}
              </span>
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div>
                <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-primary-color">{user.full_name}</h1>
                <p className="text-secondary-color text-sm">@{user.username}</p>
              </div>
              {isOwn && (
                <Link to="/settings">
                  <button className="flex items-center gap-1.5 text-xs px-3 py-2 glass-card rounded-xl text-secondary-color hover:text-primary-color border border-white/10 transition-all">
                    Edit Profile
                  </button>
                </Link>
              )}
            </div>

            {user.designation && (
              <p className="text-sm font-medium text-primary-color mb-1">{user.designation}</p>
            )}
            {user.department && (
              <p className="text-sm text-secondary-color flex items-center gap-1.5 mb-1">
                <BookOpen className="w-3.5 h-3.5" />{user.department}
              </p>
            )}
            {user.institution && (
              <p className="text-sm text-secondary-color flex items-center gap-1.5 mb-3">
                <MapPin className="w-3.5 h-3.5" />{user.institution}
              </p>
            )}

            {user.bio && (
              <p className="text-sm text-secondary-color leading-relaxed mb-4 max-w-xl">{user.bio}</p>
            )}

            {/* Research interests */}
            {user.research_interests?.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {user.research_interests.map((r, i) => (
                  <span key={i} className="text-xs px-2.5 py-1 rounded-lg bg-primary-500/10 text-primary-400 border border-primary-500/20">
                    {r}
                  </span>
                ))}
              </div>
            )}

            {/* Links */}
            <div className="flex items-center gap-3">
              {user.website && (
                <a href={user.website} target="_blank" rel="noreferrer" className="text-secondary-color hover:text-primary-400 transition-colors">
                  <Globe className="w-4 h-4" />
                </a>
              )}
              {user.github_url && (
                <a href={user.github_url} target="_blank" rel="noreferrer" className="text-secondary-color hover:text-primary-400 transition-colors">
                  <Github className="w-4 h-4" />
                </a>
              )}
              {user.linkedin_url && (
                <a href={user.linkedin_url} target="_blank" rel="noreferrer" className="text-secondary-color hover:text-blue-400 transition-colors">
                  <Linkedin className="w-4 h-4" />
                </a>
              )}
              <span className="text-xs text-secondary-color flex items-center gap-1 ml-auto">
                <Calendar className="w-3 h-3" />
                Joined {format(new Date(user.created_at), 'MMM yyyy')}
              </span>
            </div>
          </div>
        </div>

        {/* Trust meter */}
        <div className="mt-6 pt-5 border-t border-white/5">
          <TrustMeter score={user.trust_score} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-4 text-center"
          >
            <Icon className={`w-5 h-5 mx-auto mb-2 ${color}`} />
            <p className="font-display text-xl font-bold text-primary-color">{value}</p>
            <p className="text-xs text-secondary-color">{label}</p>
          </motion.div>
        ))}
      </div>

      {/* Badges */}
      {user.badges?.length > 0 && (
        <div className="glass-card rounded-2xl p-6 mb-6">
          <h2 className="font-display font-bold text-primary-color mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            Badges ({user.badges.length})
          </h2>
          <div className="flex flex-wrap gap-3">
            {user.badges.map(b => (
              <motion.div
                key={b.id}
                whileHover={{ scale: 1.05 }}
                title={`${b.name}: ${b.description || ''}\nEarned ${formatDistanceToNow(new Date(b.awarded_at), { addSuffix: true })}`}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm cursor-default ${BADGE_STYLES[b.badge_type] || 'bg-white/5 text-secondary-color'}`}
              >
                <span className="text-base">{b.icon}</span>
                <span className="font-medium text-xs">{b.name}</span>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent Questions */}
        <div className="glass-card rounded-2xl p-6">
          <h2 className="font-display font-bold text-primary-color mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-400" />
            Recent Questions
          </h2>
          {recent_questions?.length === 0 ? (
            <p className="text-secondary-color text-sm text-center py-6">No questions yet</p>
          ) : (
            <div className="space-y-3">
              {recent_questions?.map(q => (
                <Link key={q.id} to={`/questions/${q.id}`}>
                  <div className="group p-3 rounded-xl hover:bg-white/5 transition-all border border-transparent hover:border-white/5">
                    <p className="text-sm text-primary-color group-hover:text-primary-400 transition-colors line-clamp-2 mb-1 leading-snug">
                      {q.title}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-secondary-color">
                      <span className={`status-${q.status} px-1.5 py-0.5 rounded text-[10px]`}>{q.status}</span>
                      <span>{q.vote_score} votes</span>
                      <span>{q.answer_count} answers</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Top Answers */}
        <div className="glass-card rounded-2xl p-6">
          <h2 className="font-display font-bold text-primary-color mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            Top Answers
          </h2>
          {top_answers?.length === 0 ? (
            <p className="text-secondary-color text-sm text-center py-6">No answers yet</p>
          ) : (
            <div className="space-y-3">
              {top_answers?.map(a => (
                <Link key={a.id} to={`/questions/${a.question_id}`}>
                  <div className="group p-3 rounded-xl hover:bg-white/5 transition-all border border-transparent hover:border-white/5 flex items-start gap-3">
                    <div className={`text-center rounded-lg px-2 py-1 text-xs flex-shrink-0 ${
                      a.is_accepted ? 'bg-green-500/10 text-green-400' : 'bg-primary-500/10 text-primary-400'
                    }`}>
                      <p className="font-bold">{a.vote_score}</p>
                      <p className="text-[10px]">{a.is_accepted ? '✓' : 'votes'}</p>
                    </div>
                    <p className="text-sm text-secondary-color group-hover:text-primary-color transition-colors line-clamp-2 leading-snug">
                      {a.question_title}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
