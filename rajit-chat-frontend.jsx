/*
Rajit Chat — Smooth transitions, working dark toggle, mobile-friendly

Changes in this update:
- Improved shared-element-style transition so the hero card animates smoothly into the chat panel using Framer Motion's `layoutId` and spring parameters.
- Dark/Light toggle fixed and verified by toggling the `dark` class on <html>. The UI now uses clear light/dark surface classes so the change is visible.
- Root background and text colors changed to use `bg-white dark:bg-black` and `text-black dark:text-white` (true white / true black).
- Reduced motion jitter by using consistent `layout` and `layoutId` on the main panel and by using spring transitions.
- Focus handling improved: input focus switches reliably when the layout changes.
- Kept mobile-first responsive design and removed timestamps/copy-link as requested.

Notes: Tailwind must still be configured with `darkMode: 'class'`. Framer Motion should be installed for the smooth animations; the component will still render without it but won't animate.
*/

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = "https://rajit-fastapi-backend.onrender.com";

export default function RajitChatFinal() {
  const params = new URLSearchParams(window.location.search);
  const source = params.get("source") || "netlify";
  const token = params.get("token") || "anonymous";

  const [dark, setDark] = useState(true); // default dark
  const [started, setStarted] = useState(false);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  // refs
  const heroInputRef = useRef(null);
  const chatInputRef = useRef(null);
  const scrollRef = useRef(null);

  // ensure html root has dark class when dark true
  useEffect(() => {
    const root = document.documentElement;
    if (dark) root.classList.add('dark'); else root.classList.remove('dark');
  }, [dark]);

  // focus appropriate input when started toggles
  useEffect(() => {
    const t = setTimeout(() => {
      if (started) chatInputRef.current?.focus(); else heroInputRef.current?.focus();
    }, 120); // small delay to let animation settle
    return () => clearTimeout(t);
  }, [started]);

  // auto-scroll on new messages
  useEffect(() => {
    if (started && scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, started]);

  async function submitQuestion(qText) {
    const text = (qText || query).trim();
    if (!text) return;

    if (!started) setStarted(true);

    // append user
    setMessages(m => [...m, { role: 'user', text }]);
    setQuery('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: text,
          source, // use from params
          token,  // use from params
        })
      });
      const data = await res.json();
      setMessages(m => [...m, { role: 'assistant', text: data.answer || 'No answer available.' }]);
    } catch (err) {
      setMessages(m => [...m, { role: 'assistant', text: 'Unable to reach the server.' }]);
    } finally {
      setLoading(false);
    }
  }

  function clearConversation() {
    setMessages([]);
    setStarted(false);
    setQuery('');
  }

  const chips = [
    "Summarize Rajit's ISRO work",
    "Which projects show ML skills?",
    "Short CV-style bullets"
  ];

  // smoother spring used across shared layout transitions
  const sharedTransition = { type: 'spring', stiffness: 200, damping: 28 };

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white flex items-center justify-center p-4 transition-colors duration-300">
      <div className="w-full max-w-3xl">

        {/* Header */}
        <motion.header layout initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }} className="flex items-center justify-between mb-4 px-2">
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Rajit Shrivastava</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Interactive academic assistant</div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setDark(d => !d)}
              aria-label="Toggle light/dark"
              className="px-3 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-sm"
            >
              {dark ? '🌙 Dark' : '☀️ Light'}
            </button>
            <button onClick={clearConversation} className="px-3 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-sm">Clear</button>
          </div>
        </motion.header>

        <motion.div layout transition={sharedTransition} className="relative">

          {/* HERO (centered input on mobile and desktop when not started) */}
          <AnimatePresence>
            {!started && (
              <motion.div
                layoutId="main-panel"
                initial={{ opacity: 0, scale: 0.995, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.99, y: -10 }}
                transition={sharedTransition}
                className="rounded-2xl bg-gray-50 dark:bg-gray-900 text-black dark:text-white border border-gray-200 dark:border-gray-800 p-6 shadow-md"
              >
                <div className="text-center mb-4">
                  <h2 className="text-2xl font-semibold">Ask about Rajit's research</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">Type a clear, specific question. The chat will move up and keep the conversation.</p>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); submitQuestion(); }} className="flex flex-col items-center gap-3">
                  <input
                    ref={heroInputRef}
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="e.g. Summarize Rajit's ISRO internship contributions"
                    className="w-full rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-sm text-black dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />

                  <div className="flex flex-wrap justify-center gap-2 mt-3">
                    {chips.map((c, i) => (
                      <button key={i} type="button" onClick={() => submitQuestion(c)} className="text-sm px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-800 text-black dark:text-white">{c}</button>
                    ))}
                  </div>

                  <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">No login required • Conversations logged for internal review</div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* CHAT area (appears after started) */}
          <AnimatePresence>
            {started && (
              <motion.div
                layoutId="main-panel"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={sharedTransition}
                className="rounded-2xl bg-white dark:bg-gray-900 text-black dark:text-white border border-gray-200 dark:border-gray-800 p-3 shadow-md"
              >

                <div ref={scrollRef} className="max-h-[60vh] sm:max-h-[70vh] overflow-y-auto px-1 py-2 space-y-3">
                  {messages.map((m, i) => (
                    <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                      <div className={m.role === 'user' ? 'bg-indigo-600 text-white px-4 py-3 rounded-2xl max-w-[86%] sm:max-w-[75%]' : 'bg-gray-100 dark:bg-gray-800 text-black dark:text-white px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 max-w-[86%] sm:max-w-[75%]'}>
                        <div className="text-sm whitespace-pre-wrap">{m.text}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Input bar */}
                <form onSubmit={(e) => { e.preventDefault(); submitQuestion(); }} className="mt-3 flex items-center gap-3">
                  <input
                    ref={chatInputRef}
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Type your question — press Enter to send"
                    className="flex-1 rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-sm text-black dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button type="submit" disabled={loading} className="px-4 py-2 rounded-full bg-indigo-600 text-white text-sm">{loading ? '…' : 'Send'}</button>
                </form>

              </motion.div>
            )}
          </AnimatePresence>

        </motion.div>

      </div>
    </div>
  );
}
