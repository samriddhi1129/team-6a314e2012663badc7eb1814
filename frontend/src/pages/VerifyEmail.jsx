// frontend/src/pages/VerifyEmail.jsx
import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { authService } from '../services/api';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    if (!token) { setStatus('error'); return; }
    authService.verifyEmail(token)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [token]);

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass-card rounded-3xl p-10 max-w-md w-full text-center border border-white/10">
        {status === 'loading' && (
          <>
            <div className="w-12 h-12 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white/70">Verifying your email...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="text-5xl mb-4">✅</div>
            <h2 className="font-display text-2xl font-bold text-white mb-3">Email Verified!</h2>
            <p className="text-white/60 mb-6">Your account is now active. Start exploring Vicharanshala Lab!</p>
            <Link to="/login"><button className="w-full bg-gradient-to-r from-primary-500 to-purple-500 text-white font-bold py-3 rounded-xl">Sign In</button></Link>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="text-5xl mb-4">❌</div>
            <h2 className="font-display text-2xl font-bold text-white mb-3">Verification Failed</h2>
            <p className="text-white/60 mb-6">This link may have expired or is invalid. Please try registering again.</p>
            <Link to="/register"><button className="w-full bg-gradient-to-r from-primary-500 to-purple-500 text-white font-bold py-3 rounded-xl">Register Again</button></Link>
          </>
        )}
      </motion.div>
    </div>
  );
}
