// frontend/src/pages/NotFoundPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <div className="font-display text-9xl font-black gradient-text mb-4">404</div>
        <h1 className="font-display text-3xl font-bold text-white mb-3">Page Not Found</h1>
        <p className="text-white/60 mb-8">This page doesn't exist. Let's get you back on track.</p>
        <div className="flex gap-4 justify-center">
          <Link to="/"><button className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold py-3 px-6 rounded-xl transition-all">← Home</button></Link>
          <Link to="/explore"><button className="bg-gradient-to-r from-primary-500 to-purple-500 text-white font-bold py-3 px-6 rounded-xl transition-all">Explore FAQs</button></Link>
        </div>
      </motion.div>
    </div>
  );
}
