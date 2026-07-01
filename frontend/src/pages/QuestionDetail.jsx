// frontend/src/pages/QuestionDetail.jsx
import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronUp, ChevronDown, CheckCircle, Shield, Pencil, Trash2,
  Bookmark, Flag, Share2, Clock, Eye, MessageSquare, Star,
  ThumbsUp, AlertCircle, User, History, Lock
} from 'lucide-react';
import { questionService, answerService, commentService } from '../services/api';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';
import { formatDistanceToNow, format } from 'date-fns';

// Rich text renderer
function HtmlContent({ html, className = '' }) {
  return (
    <div
      className={`prose-content text-sm leading-relaxed text-primary-color ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

// Vote widget
function VoteWidget({ score, userVote, onVote, disabled }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        onClick={() => onVote('upvote')}
        disabled={disabled}
        className={`vote-btn ${userVote === 'upvote' ? 'active-up' : 'text-secondary-color'} disabled:opacity-40 disabled:cursor-not-allowed`}
      >
        <ChevronUp className="w-6 h-6" />
      </button>
      <span className={`text-lg font-bold ${score > 0 ? 'text-primary-400' : score < 0 ? 'text-red-400' : 'text-secondary-color'}`}>
        {score}
      </span>
      <button
        onClick={() => onVote('downvote')}
        disabled={disabled}
        className={`vote-btn ${userVote === 'downvote' ? 'active-down' : 'text-secondary-color'} disabled:opacity-40 disabled:cursor-not-allowed`}
      >
        <ChevronDown className="w-6 h-6" />
      </button>
    </div>
  );
}

// Answer editor
function AnswerEditor({ questionId, onSuccess }) {
  const [body, setBody] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const { user, isAuthenticated } = useAuthStore();
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => answerService.create(questionId, {
      body,
      body_text: body.replace(/<[^>]*>/g, ''),
      is_anonymous: isAnonymous,
    }),
    onSuccess: () => {
      toast.success('Answer posted!');
      setBody('');
      qc.invalidateQueries(['answers', questionId]);
      qc.invalidateQueries(['question', questionId]);
      onSuccess?.();
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to post answer'),
  });

  if (!isAuthenticated) {
    return (
      <div className="glass-card rounded-2xl p-6 text-center">
        <Lock className="w-8 h-8 text-secondary-color mx-auto mb-3" />
        <p className="text-secondary-color mb-4">Sign in to post an answer</p>
        <Link to="/login"><button className="bg-gradient-to-r from-primary-600 to-purple-600 text-white font-semibold py-2.5 px-6 rounded-xl">Sign In</button></Link>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-6">
      <h3 className="font-display font-bold text-primary-color mb-4 flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-primary-400" />
        Your Answer
      </h3>
      <textarea
        value={body}
        onChange={e => setBody(e.target.value)}
        placeholder="Write a detailed answer. You can use HTML tags for formatting: <b>bold</b>, <i>italic</i>, <code>code</code>, <pre>code block</pre>, <ul><li>list</li></ul>"
        rows={8}
        className="w-full bg-white/5 border border-white/10 focus:border-primary-500/50 rounded-xl p-4 text-sm text-primary-color placeholder-secondary-color outline-none resize-none transition-all font-mono"
      />
      <div className="flex items-center justify-between mt-4 flex-wrap gap-3">
        <label className="flex items-center gap-2 cursor-pointer text-sm text-secondary-color">
          <input
            type="checkbox"
            checked={isAnonymous}
            onChange={e => setIsAnonymous(e.target.checked)}
            className="rounded accent-primary-500"
          />
          Post anonymously
        </label>
        <button
          onClick={() => mutation.mutate()}
          disabled={!body.trim() || mutation.isPending}
          className="bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-500 hover:to-purple-500 disabled:opacity-50 text-white font-semibold py-2.5 px-6 rounded-xl transition-all text-sm"
        >
          {mutation.isPending ? 'Posting...' : 'Post Answer'}
        </button>
      </div>
    </div>
  );
}

// Single answer component
function AnswerCard({ answer, questionAuthorId, questionId }) {
  const { user, isAuthenticated } = useAuthStore();
  const qc = useQueryClient();
  const [localVote, setLocalVote] = useState(answer.user_vote);
  const [localScore, setLocalScore] = useState(answer.vote_score);
  const [localValidated, setLocalValidated] = useState(answer.user_validated);
  const [localValidCount, setLocalValidCount] = useState(answer.validation_count);

  const voteMutation = useMutation({
    mutationFn: (type) => answerService.vote(answer.id, type),
    onSuccess: (d) => {
      setLocalVote(d.data.data.user_vote);
      setLocalScore(d.data.data.vote_score);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Vote failed'),
  });

  const acceptMutation = useMutation({
    mutationFn: () => answerService.accept(answer.id),
    onSuccess: () => {
      qc.invalidateQueries(['answers', questionId]);
      qc.invalidateQueries(['question', questionId]);
      toast.success(answer.is_accepted ? 'Answer unaccepted' : 'Answer accepted!');
    },
  });

  const validateMutation = useMutation({
    mutationFn: () => answerService.validate(answer.id),
    onSuccess: (d) => {
      setLocalValidated(d.data.data.validated);
      setLocalValidCount(d.data.data.validation_count);
      toast.success(d.data.data.validated ? 'Answer validated!' : 'Validation removed');
    },
  });

  const isQuestionAuthor = user?.id === questionAuthorId;
  const isAnswerAuthor = user?.id === answer.author_id;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass-card rounded-2xl p-6 border ${answer.is_accepted ? 'border-green-500/30' : answer.is_verified ? 'border-primary-500/20' : 'border-white/5'}`}
    >
      {/* Badges */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {answer.is_accepted && (
          <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-green-500/15 text-green-400 border border-green-500/25 font-medium">
            <CheckCircle className="w-3 h-3" /> Accepted Answer
          </span>
        )}
        {answer.is_verified && (
          <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-primary-500/15 text-primary-300 border border-primary-500/25 font-medium">
            <Shield className="w-3 h-3" /> Community Verified
          </span>
        )}
        {answer.ai_assisted && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
            AI Assisted
          </span>
        )}
      </div>

      <div className="flex gap-5">
        {/* Vote */}
        <VoteWidget
          score={localScore}
          userVote={localVote}
          onVote={(t) => isAuthenticated ? voteMutation.mutate(t) : toast.error('Sign in to vote')}
          disabled={!isAuthenticated || isAnswerAuthor}
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <HtmlContent html={answer.body} />

          {/* Footer */}
          <div className="flex items-center justify-between mt-4 flex-wrap gap-3 pt-4 border-t border-white/5">
            {/* Author */}
            <div className="flex items-center gap-2">
              {answer.author ? (
                <>
                  {answer.author.avatar_url ? (
                    <img src={answer.author.avatar_url} className="w-7 h-7 rounded-full object-cover" alt="" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center text-[10px] text-white font-bold">
                      {answer.author.full_name?.[0]}
                    </div>
                  )}
                  <div>
                    <Link to={`/users/${answer.author.username}`} className="text-xs font-medium text-primary-400 hover:text-primary-300">
                      {answer.author.full_name}
                    </Link>
                    <p className="text-[10px] text-secondary-color capitalize">{answer.author.designation || answer.author.role}</p>
                  </div>
                </>
              ) : (
                <span className="text-xs text-secondary-color italic flex items-center gap-1">
                  <User className="w-3 h-3" /> Anonymous
                </span>
              )}
              <span className="text-xs text-secondary-color ml-2">
                {formatDistanceToNow(new Date(answer.created_at), { addSuffix: true })}
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* Validate */}
              {isAuthenticated && !isAnswerAuthor && (
                <button
                  onClick={() => validateMutation.mutate()}
                  className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-all ${localValidated ? 'bg-primary-500/15 text-primary-400' : 'text-secondary-color hover:bg-white/5'}`}
                >
                  <ThumbsUp className="w-3 h-3" />
                  Validate ({localValidCount}/5)
                </button>
              )}
              {/* Accept */}
              {isAuthenticated && isQuestionAuthor && (
                <button
                  onClick={() => acceptMutation.mutate()}
                  className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-all ${answer.is_accepted ? 'bg-green-500/15 text-green-400' : 'text-secondary-color hover:bg-white/5'}`}
                >
                  <CheckCircle className="w-3 h-3" />
                  {answer.is_accepted ? 'Accepted' : 'Accept'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function QuestionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const qc = useQueryClient();

  const { data: qData, isLoading } = useQuery({
    queryKey: ['question', id],
    queryFn: () => questionService.getOne(id),
    select: d => d.data?.data?.question,
  });

  const { data: answers = [] } = useQuery({
    queryKey: ['answers', id],
    queryFn: () => answerService.getAll(id),
    select: d => d.data?.data?.answers || [],
    enabled: !!qData,
  });

  const [localVote, setLocalVote] = useState(null);
  const [localScore, setLocalScore] = useState(0);
  const [bookmarked, setBookmarked] = useState(false);

  React.useEffect(() => {
    if (qData) {
      setLocalVote(qData.user_vote);
      setLocalScore(qData.vote_score);
      setBookmarked(qData.is_bookmarked || false);
    }
  }, [qData]);

  const voteMutation = useMutation({
    mutationFn: (type) => questionService.vote(id, type),
    onSuccess: (d) => {
      setLocalVote(d.data.data.user_vote);
      setLocalScore(d.data.data.vote_score);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Vote failed'),
  });

  const bookmarkMutation = useMutation({
    mutationFn: () => questionService.bookmark(id),
    onSuccess: (d) => {
      setBookmarked(d.data.data.bookmarked);
      toast.success(d.data.data.bookmarked ? 'Bookmarked!' : 'Bookmark removed');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => questionService.delete(id),
    onSuccess: () => { toast.success('Question deleted'); navigate('/explore'); },
    onError: () => toast.error('Failed to delete'),
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse space-y-4">
        <div className="skeleton h-8 w-3/4 rounded-xl" />
        <div className="skeleton h-4 w-1/3 rounded" />
        <div className="skeleton h-40 rounded-2xl" />
      </div>
    );
  }

  if (!qData) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-4">❓</div>
        <h2 className="font-display text-2xl font-bold text-primary-color mb-2">Question Not Found</h2>
        <Link to="/explore"><button className="mt-4 text-primary-400 hover:text-primary-300">← Back to Explore</button></Link>
      </div>
    );
  }

  const isAuthor = user?.id === qData.author_id;
  const isAdmin = ['admin', 'superadmin'].includes(user?.role);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-secondary-color mb-6">
        <Link to="/explore" className="hover:text-primary-400">Explore</Link>
        <span>/</span>
        {qData.category && (
          <>
            <Link to={`/explore?category=${qData.category.slug}`} className="hover:text-primary-400">{qData.category.name}</Link>
            <span>/</span>
          </>
        )}
        <span className="text-primary-color truncate max-w-xs">{qData.title}</span>
      </div>

      {/* ---- QUESTION ---- */}
      <div className="glass-card rounded-2xl p-6 mb-6">
        {/* Tags/status row */}
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium status-${qData.status}`}>
            {qData.status}
          </span>
          {qData.is_featured && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25 flex items-center gap-1">
              <Star className="w-3 h-3" /> Featured
            </span>
          )}
          {qData.is_wiki && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
              📝 Wiki Mode
            </span>
          )}
        </div>

        <h1 className="font-display text-xl sm:text-2xl font-bold text-primary-color mb-4 leading-snug">
          {qData.title}
        </h1>

        {/* Meta */}
        <div className="flex items-center gap-4 text-xs text-secondary-color mb-5 flex-wrap">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {format(new Date(qData.created_at), 'dd MMM yyyy')}</span>
          <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {qData.view_count} views</span>
          <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> {qData.answer_count} answers</span>
          {qData.last_activity_at !== qData.created_at && (
            <span className="flex items-center gap-1"><History className="w-3 h-3" /> Modified {formatDistanceToNow(new Date(qData.last_activity_at), { addSuffix: true })}</span>
          )}
        </div>

        <div className="flex gap-5">
          {/* Vote */}
          <VoteWidget
            score={localScore}
            userVote={localVote}
            onVote={(t) => isAuthenticated ? voteMutation.mutate(t) : toast.error('Sign in to vote')}
            disabled={!isAuthenticated || isAuthor}
          />

          {/* Body */}
          <div className="flex-1 min-w-0">
            <HtmlContent html={qData.body} />

            {/* Tags */}
            {qData.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-white/5">
                {qData.tags.map(tag => (
                  <Link key={tag.id} to={`/explore?tags=${tag.slug}`}>
                    <span className="text-xs px-2.5 py-1 rounded-lg bg-primary-500/10 text-primary-400 border border-primary-500/20 hover:border-primary-400/40 transition-colors">
                      #{tag.name}
                    </span>
                  </Link>
                ))}
              </div>
            )}

            {/* Author + Actions */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5 flex-wrap gap-3">
              {/* Author */}
              <div className="flex items-center gap-2">
                {qData.author ? (
                  <>
                    {qData.author.avatar_url ? (
                      <img src={qData.author.avatar_url} className="w-8 h-8 rounded-full object-cover" alt="" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center text-xs text-white font-bold">
                        {qData.author.full_name?.[0]}
                      </div>
                    )}
                    <div>
                      <Link to={`/users/${qData.author.username}`} className="text-sm font-medium text-primary-400 hover:text-primary-300">
                        {qData.author.full_name}
                      </Link>
                      <p className="text-xs text-secondary-color">{qData.author.designation || qData.author.role} · {qData.author.reputation_score} rep</p>
                    </div>
                  </>
                ) : (
                  <span className="text-sm text-secondary-color italic">Anonymous</span>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {isAuthenticated && (
                  <button
                    onClick={() => bookmarkMutation.mutate()}
                    className={`p-2 rounded-lg transition-all ${bookmarked ? 'text-amber-400 bg-amber-500/10' : 'text-secondary-color hover:text-primary-color hover:bg-white/5'}`}
                    title="Bookmark"
                  >
                    <Bookmark className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success('Link copied!'); }}
                  className="p-2 rounded-lg text-secondary-color hover:text-primary-color hover:bg-white/5 transition-all"
                  title="Share"
                >
                  <Share2 className="w-4 h-4" />
                </button>
                {(isAuthor || isAdmin) && (
                  <>
                    <Link to={`/ask?edit=${id}`}>
                      <button className="p-2 rounded-lg text-secondary-color hover:text-blue-400 hover:bg-blue-500/10 transition-all" title="Edit">
                        <Pencil className="w-4 h-4" />
                      </button>
                    </Link>
                    <button
                      onClick={() => { if (window.confirm('Delete this question?')) deleteMutation.mutate(); }}
                      className="p-2 rounded-lg text-secondary-color hover:text-red-400 hover:bg-red-500/10 transition-all"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---- ANSWERS ---- */}
      <div className="mb-6">
        <h2 className="font-display text-lg font-bold text-primary-color mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary-400" />
          {answers.length} Answer{answers.length !== 1 ? 's' : ''}
        </h2>

        <AnimatePresence>
          {answers.length === 0 ? (
            <div className="text-center py-12 glass-card rounded-2xl">
              <AlertCircle className="w-10 h-10 text-secondary-color mx-auto mb-3" />
              <p className="text-secondary-color">No answers yet. Be the first to help!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {answers.map(a => (
                <AnswerCard key={a.id} answer={a} questionAuthorId={qData.author_id} questionId={id} />
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* ---- ANSWER EDITOR ---- */}
      <AnswerEditor questionId={id} />
    </div>
  );
}
