// frontend/src/pages/AIAssistantPage.jsx
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Send, Sparkles, RotateCcw, User, Copy, ThumbsUp, ThumbsDown, Lightbulb, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import { Link } from 'react-router-dom';

const SUGGESTED_QUESTIONS = [
  'What is the process for PhD admissions at IIT Ropar?',
  'How do I apply for a research internship?',
  'What fellowships are available for PhD students?',
  'How does the GATE cutoff work for M.Tech admissions?',
  'What research labs are active in AI/ML at IIT Ropar?',
  'What is the hostel allotment process for new students?',
];

const SYSTEM_PROMPT = `You are the Vicharanshala Lab AI Assistant for IIT Ropar — an intelligent knowledge base assistant that helps students, researchers, and faculty with academic queries.

You specialize in:
- IIT Ropar admissions (B.Tech/M.Tech/PhD/MBA), processes, eligibility, deadlines
- Research opportunities, labs, faculty profiles, publications
- Academic policies, grading, course structure, curriculum
- Campus life: hostels, facilities, sports, cultural events
- Placements, internships, career guidance
- Financial aid, scholarships, fellowships (MHRD, TRF, etc.)
- General academic advice for the IIT Ropar community

Be helpful, accurate, concise, and professional. Format answers with clear structure. If you don't know something specific, honestly say so and suggest where to find the information.

Always end factual answers about deadlines/procedures with: "Please verify this information on the official IIT Ropar website (iitrpr.ac.in) as details may have changed."`;

export default function AIAssistantPage() {
  const { isAuthenticated } = useAuthStore();
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hello! I'm the Vicharanshala AI Assistant, here to help you with all your IIT Ropar queries. Ask me about admissions, research, campus life, or anything academic!\n\nWhat would you like to know today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    const content = text || input.trim();
    if (!content || loading) return;

    // Check if logged in
    if (!isAuthenticated) {
      toast.error('Please login first to use the AI Assistant!');
      return;
    }

    setInput('');
    const userMsg = { role: 'user', content, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      // Get token from localStorage
      const stored = JSON.parse(localStorage.getItem('vicharanshala-auth') || '{}');
      const token = stored?.state?.accessToken;

      if (!token) {
        throw new Error('Not authenticated');
      }

      // Build conversation history
      const history = messages
        .filter(m => m.role !== 'system')
        .map(m => ({ role: m.role, content: m.content }));
      history.push({ role: 'user', content });

      // Call our backend API (not Anthropic directly!)
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ messages: history }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'API error');
      }

      const data = await response.json();
      const aiText = data.data?.text || 'Sorry, I could not generate a response.';

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: aiText,
        timestamp: new Date(),
      }]);

    } catch (err) {
      console.error('AI error:', err);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please make sure you are logged in and try again!",
        timestamp: new Date(),
        error: true,
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const reset = () => {
    setMessages([{
      role: 'assistant',
      content: "Chat cleared! How can I help you today?",
      timestamp: new Date(),
    }]);
  };

  const copyMessage = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const formatContent = (text) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="font-mono text-sm bg-primary-500/15 text-primary-300 px-1.5 py-0.5 rounded">$1</code>')
      .replace(/^### (.*$)/gm, '<h3 class="font-bold text-primary-color mt-3 mb-1">$1</h3>')
      .replace(/^## (.*$)/gm, '<h2 class="font-bold text-primary-color text-lg mt-4 mb-2">$1</h2>')
      .replace(/^- (.*$)/gm, '<li class="ml-4 list-disc text-secondary-color">$1</li>')
      .replace(/^\d+\. (.*$)/gm, '<li class="ml-4 list-decimal text-secondary-color">$1</li>')
      .replace(/\n\n/g, '</p><p class="mb-2">')
      .replace(/\n/g, '<br/>');
  };

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="glass-card rounded-3xl p-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
            <Bot className="w-8 h-8 text-white" />
          </div>
          <h2 className="font-display text-2xl font-bold text-primary-color mb-3">
            AI Assistant
          </h2>
          <p className="text-secondary-color mb-6">
            Please login to use the AI Assistant powered by Claude.
          </p>
          <Link to="/login">
            <button className="bg-gradient-to-r from-primary-600 to-purple-600 text-white font-bold py-3 px-8 rounded-xl">
              Login to Continue
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col" style={{ height: 'calc(100vh - 80px)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center shadow-glow-sm">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-primary-color flex items-center gap-2">
              AI Assistant
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary-500/15 text-primary-400 border border-primary-500/25 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Powered by Claude
              </span>
            </h1>
            <p className="text-xs text-secondary-color">Ask anything about IIT Ropar</p>
          </div>
        </div>
        <button
          onClick={reset}
          className="flex items-center gap-1.5 px-3 py-2 glass-card rounded-xl text-xs text-secondary-color hover:text-primary-color transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          New Chat
        </button>
      </div>

      {/* Suggested questions - only show at start */}
      {messages.length <= 1 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 flex-shrink-0"
        >
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            <p className="text-xs font-semibold text-secondary-color">Suggested Questions</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            {SUGGESTED_QUESTIONS.map((q, i) => (
              <motion.button
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => sendMessage(q)}
                className="text-left text-xs text-secondary-color hover:text-primary-400 px-3 py-2.5 glass-card rounded-xl hover:border-primary-500/30 border border-white/5 transition-all group"
              >
                <span className="text-primary-500/50 group-hover:text-primary-400 mr-1.5">→</span>
                {q}
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1 no-scrollbar min-h-0">
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center ${
                msg.role === 'assistant'
                  ? 'bg-gradient-to-br from-primary-500 to-purple-600'
                  : 'bg-gradient-to-br from-emerald-500 to-teal-600'
              }`}>
                {msg.role === 'assistant' ? (
                  <Bot className="w-4 h-4 text-white" />
                ) : (
                  <User className="w-4 h-4 text-white" />
                )}
              </div>

              {/* Bubble */}
              <div className={`group max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-primary-600 to-purple-600 text-white rounded-tr-sm'
                    : msg.error
                      ? 'glass-card border border-red-500/25 text-secondary-color rounded-tl-sm'
                      : 'glass-card border border-white/8 text-primary-color rounded-tl-sm'
                }`}>
                  {msg.role === 'assistant' ? (
                    <div
                      className="prose-content text-sm"
                      dangerouslySetInnerHTML={{ __html: `<p class="mb-2">${formatContent(msg.content)}</p>` }}
                    />
                  ) : (
                    <p>{msg.content}</p>
                  )}
                </div>

                {/* Actions for assistant messages */}
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => copyMessage(msg.content)}
                      className="p-1 rounded-lg text-secondary-color hover:text-primary-color hover:bg-white/5 transition-all"
                      title="Copy"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                    <button className="p-1 rounded-lg text-secondary-color hover:text-green-400 hover:bg-green-500/10 transition-all" title="Helpful">
                      <ThumbsUp className="w-3 h-3" />
                    </button>
                    <button className="p-1 rounded-lg text-secondary-color hover:text-red-400 hover:bg-red-500/10 transition-all" title="Not helpful">
                      <ThumbsDown className="w-3 h-3" />
                    </button>
                    <span className="text-[10px] text-secondary-color ml-1">
                      {msg.timestamp?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Loading dots */}
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
            <div className="w-8 h-8 rounded-xl flex-shrink-0 bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="glass-card rounded-2xl rounded-tl-sm px-4 py-3 border border-white/8">
              <div className="flex gap-1.5 items-center h-5">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full bg-primary-400"
                    animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input box */}
      <div className="flex-shrink-0">
        <div className="flex gap-3 glass-card rounded-2xl p-2 border border-white/10 focus-within:border-primary-500/40 transition-all">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Ask about admissions, research, campus life..."
            className="flex-1 bg-transparent text-sm text-primary-color placeholder-secondary-color outline-none px-3 py-2"
            disabled={loading}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-purple-600 hover:from-primary-400 hover:to-purple-500 disabled:opacity-40 flex items-center justify-center transition-all shadow-glow-sm disabled:shadow-none flex-shrink-0"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
        <p className="text-[10px] text-secondary-color text-center mt-2">
          AI responses are for guidance only. Always verify important information on iitrpr.ac.in
        </p>
      </div>
    </div>
  );
}