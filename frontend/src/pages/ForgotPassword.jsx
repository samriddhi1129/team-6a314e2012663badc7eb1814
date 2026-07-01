// frontend/src/pages/ForgotPassword.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import { BookOpen, Mail, ArrowLeft, Send } from 'lucide-react';
import { authService } from '../services/api';
import toast from 'react-hot-toast';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent]   = useState(false);

  const mutation = useMutation({
    mutationFn: () => authService.forgotPassword(email),
    onSuccess: () => setSent(true),
    onError: () => toast.error('Something went wrong'),
  });

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
          </Link>
        </div>

        <div className="glass-card rounded-3xl p-8 border border-white/10">
          {sent ? (
            <div className="text-center">
              <div className="text-5xl mb-4">📧</div>
              <h2 className="font-display text-2xl font-bold text-white mb-3">Check Your Email</h2>
              <p className="text-white/60 mb-6">If that account exists, we sent a password reset link to <strong className="text-white">{email}</strong>.</p>
              <Link to="/login"><button className="text-primary-300 hover:text-primary-200 text-sm flex items-center gap-1 mx-auto"><ArrowLeft className="w-4 h-4" /> Back to Login</button></Link>
            </div>
          ) : (
            <>
              <h1 className="font-display text-2xl font-bold text-white mb-1">Reset Password</h1>
              <p className="text-white/60 text-sm mb-6">Enter your email and we'll send you a reset link.</p>
              <div className="relative mb-6">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address"
                  className="w-full bg-white/5 border border-white/10 focus:border-primary-400/60 rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/30 outline-none transition-all text-sm" />
              </div>
              <button onClick={() => mutation.mutate()} disabled={!email || mutation.isPending}
                className="w-full bg-gradient-to-r from-primary-500 to-purple-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2">
                <Send className="w-4 h-4" />
                {mutation.isPending ? 'Sending...' : 'Send Reset Link'}
              </button>
              <Link to="/login" className="flex items-center justify-center gap-1 text-white/50 hover:text-white/80 text-sm mt-4 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back to Login
              </Link>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
