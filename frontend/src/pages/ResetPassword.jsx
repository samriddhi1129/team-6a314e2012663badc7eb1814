// frontend/src/pages/ResetPassword.jsx
import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import { BookOpen, Lock, Eye, EyeOff } from 'lucide-react';
import { authService } from '../services/api';
import toast from 'react-hot-toast';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  const mutation = useMutation({
    mutationFn: () => authService.resetPassword({ token, password }),
    onSuccess: () => { toast.success('Password reset! Please log in.'); navigate('/login'); },
    onError: (e) => toast.error(e.response?.data?.message || 'Reset failed'),
  });

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="glass-card rounded-3xl p-8 border border-white/10">
          <h1 className="font-display text-2xl font-bold text-white mb-1">Set New Password</h1>
          <p className="text-white/60 text-sm mb-6">Choose a strong password for your account.</p>
          <div className="relative mb-6">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
              placeholder="New password (min 8 chars)"
              className="w-full bg-white/5 border border-white/10 focus:border-primary-400/60 rounded-xl pl-10 pr-10 py-3 text-white placeholder-white/30 outline-none transition-all text-sm" />
            <button onClick={() => setShowPwd(!showPwd)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40">
              {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <button onClick={() => mutation.mutate()} disabled={!password || password.length < 8 || mutation.isPending}
            className="w-full bg-gradient-to-r from-primary-500 to-purple-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-all">
            {mutation.isPending ? 'Resetting...' : 'Reset Password'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
