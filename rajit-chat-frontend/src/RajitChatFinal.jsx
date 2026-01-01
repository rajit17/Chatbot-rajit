/* Paste this entire file as src/RajitChatFinal.jsx (replace existing) */
/*
Rajit Chat — Smooth transitions, working dark toggle, mobile-friendly

Notes: Tailwind must still be configured with `darkMode: 'class'`. Framer Motion should be installed for the smooth animations; the component will still render without it but won't animate.
*/

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ShootingStars from './components/ShootingStars';
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const API_BASE = "https://rajit-fastapi-backend.onrender.com";

// Replace detectSource with detectToken
function detectToken() {
  try {
    const u = new URL(window.location.href);
    return u.searchParams.get('id') || 'anonymous';
  } catch {
    return 'anonymous';
  }
}

// add CSS-in-JS for three-dot typing + minimal markdown styles
const _dotCss = `
@keyframes dot-flash { 0% { opacity: .25 } 40% { opacity: 1 } 100% { opacity: .25 } }
.dot-typing { display:inline-flex; align-items:center; gap:4px; padding:6px 10px; border-radius:18px; background:rgba(0,0,0,0.06); }
.dot-typing span { width:6px; height:6px; border-radius:50%; background:currentColor; opacity:.25; animation:dot-flash 1s infinite linear; display:inline-block; }
.dot-typing span:nth-child(2){ animation-delay:0.15s } .dot-typing span:nth-child(3){ animation-delay:0.3s }
.dark .dot-typing{ background:rgba(255,255,255,0.04); }

/* minimal markdown styling for chat messages */
.chat-md { color: inherit; }
.chat-md blockquote { border-left: 3px solid rgba(0,0,0,0.12); margin:0 0 0.5rem; padding:0.25rem 0 0.25rem 0.75rem; color: rgba(0,0,0,0.8); }
.dark .chat-md blockquote { border-left-color: rgba(255,255,255,0.14); color: rgba(255,255,255,0.9); }
.chat-md code { background: rgba(0,0,0,0.06); padding: 2px 6px; border-radius:6px; font-size:0.92em; }
.dark .chat-md code { background: rgba(255,255,255,0.04); }
.chat-md pre { background: rgba(0,0,0,0.06); padding:8px; border-radius:8px; overflow:auto; }
.dark .chat-md pre { background: rgba(255,255,255,0.04); }
.chat-md strong { font-weight:600; }

/* Custom scrollbar for chat area */
::-webkit-scrollbar { width: 8px; background: transparent; }
::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 8px; }
.dark ::-webkit-scrollbar-thumb { background: #333; }
::-webkit-scrollbar-corner { background: transparent; }
`;

// ---- MICRO-PROMPT POOL (exact 30 items provided by user) ----
const MICRO_PROMPT_POOL = [
  "CV summary",
  "Research projects",
  "Machine learning work",
  "ISRO internship",
  "Technical skills",
  "Academic background",
  "Publications outputs",
  "Leadership experience",
  "Collaboration skills",
  "Research motivation",
  "Future PhD goals",
  "Optical polarization project",
  "Deep learning system",
  "BRAHMa tool",
  "Data analysis skills",
  "Astrophysics experience",
  "Python programming",
  "MATLAB proficiency",
  "Communication skills",
  "Critical thinking",
  "Scientific computing",
  "Awards and recognitions",
  "JEE Mains percentile",
  "BHU UET rank",
  "IIT JAM rank",
  "Mentorship experience",
  "Research exposure",
  "Stellar observations",
  "Image processing techniques",
  "Motivational background"
];

// small helper: shuffle array in place
function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// normalize a string into tokens (lowercase, remove punctuation)
function tokenize(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map(t => t.trim());
}

// compute simple token intersection size
function tokenIntersection(aTokens, bTokens) {
  const aset = new Set(aTokens);
  let count = 0;
  for (const t of bTokens) if (aset.has(t)) count++;
  return count;
}

// compute a simple near-duplicate check: share any token longer than 2 chars
function shareImportantToken(a, b) {
  const aT = tokenize(a).filter(t => t.length > 2);
  const bT = tokenize(b).filter(t => t.length > 2);
  return tokenIntersection(aT, bT) > 0;
}

export default function RajitChatFinal() {
  const params = new URLSearchParams(window.location.search);
  const source = params.get("source") || "netlify";
  const token = params.get("token") || "anonymous";

  const [dark, setDark] = useState(true); // default dark
  const [started, setStarted] = useState(false);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  // Micro-prompt state: unused prompts (stateful so UI re-renders), selection stats kept in refs
  const [unusedPrompts, setUnusedPrompts] = useState(() => shuffleInPlace([...MICRO_PROMPT_POOL]));
  const usedPromptsRef = useRef(new Set()); // used prompts set
  const shownTriosRef = useRef(new Set()); // to avoid repeating same trio
  const selectionCounterRef = useRef(0); // count selections to trigger periodic reshuffle

  // refs for streaming & scoring
  const heroInputRef = useRef(null);
  const chatInputRef = useRef(null);
  const scrollRef = useRef(null);
  const streamIntervalRef = useRef(null);
  const streamingAbortRef = useRef(false);
  const scrollUserAtBottomRef = useRef(true);

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

  // auto-scroll on new messages, but only if user is at bottom
  useEffect(() => {
    if (started && scrollRef.current && scrollUserAtBottomRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, started]);

  // track if user is at bottom of chat
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    function onScroll() {
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
      scrollUserAtBottomRef.current = atBottom;
    }
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, [started]);

  // inject dot CSS once
  useEffect(() => {
    const s = document.createElement('style');
    s.textContent = _dotCss;
    document.head.appendChild(s);
    return () => s.remove();
  }, []);

  // -------------------- Micro-prompt helpers --------------------

  // mark a prompt as used (removes from unusedPrompts and records in used set)
  function markPromptUsed(prompt) {
    if (!prompt) return;
    if (usedPromptsRef.current.has(prompt)) return;
    usedPromptsRef.current.add(prompt);
    setUnusedPrompts(prev => prev.filter(p => p !== prompt));
  }

  // When a free-text query is submitted, try to mark any equivalent micro-prompts as used.
  // Simple heuristic: if the prompt tokens are all present in the user text tokens, or the normalized prompt phrase appears.
  function markUsedEquivalentPrompts(freeText) {
    if (!freeText) return;
    const text = freeText.toLowerCase();
    const textTokens = tokenize(text);
    setUnusedPrompts(prev => {
      const remaining = [];
      for (const p of prev) {
        const pNormalized = p.toLowerCase();
        const pTokens = tokenize(pNormalized);
        // exact phrase match
        const phraseMatch = text.includes(pNormalized);
        // token-subset match (all tokens present in text)
        const allTokensInText = pTokens.every(t => textTokens.includes(t));
        // fallback: at least one important token match
        const someOverlap = tokenIntersection(pTokens, textTokens) >= 1;
        if (phraseMatch || allTokensInText || someOverlap) {
          usedPromptsRef.current.add(p);
          // skip from remaining
        } else {
          remaining.push(p);
        }
      }
      return remaining;
    });
  }

  // Periodically reshuffle unused prompts after N selections
  function maybePeriodicReshuffle() {
    const N = 6; // after every 6 selections reshuffle
    selectionCounterRef.current += 1;
    if (selectionCounterRef.current % N === 0) {
      setUnusedPrompts(prev => shuffleInPlace([...prev]));
    }
  }

  // select up to 3 suggestions based on context (last question + last answer)
  function selectSuggestions(lastUserQuestion = '', lastAssistantAnswer = '') {
    // if pool empty return empty
    if (!unusedPrompts || unusedPrompts.length === 0) return [];

    // build query tokens from last Q + last A
    const qTokens = tokenize(`${lastUserQuestion} ${lastAssistantAnswer}`);

    // score each unused prompt by token overlap
    const candidates = unusedPrompts.map(p => {
      const pTokens = tokenize(p);
      const score = tokenIntersection(qTokens, pTokens);
      return { prompt: p, score, tokens: pTokens };
    });

    // sort by score desc, then random tie-break
    candidates.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return Math.random() - 0.5;
    });

    const selected = [];
    const usedLocal = new Set();

    // helper to try add a candidate while avoiding redundancy in the trio
    function tryAddCandidate(c) {
      // avoid near-duplicates with already selected
      for (const s of selected) {
        if (shareImportantToken(s.prompt, c.prompt)) {
          return false; // consider it redundant
        }
      }
      selected.push(c);
      usedLocal.add(c.prompt);
      return true;
    }

    // first take top-scoring candidates (but enforce non-redundancy)
    for (const c of candidates) {
      if (selected.length >= 3) break;
      if (c.score === 0) break; // stop top-scores
      tryAddCandidate(c);
    }

    // fill remaining slots with random unused prompts that avoid redundancy when possible
    if (selected.length < 3) {
      // build pool excluding already taken
      const remainingPool = unusedPrompts.filter(p => !usedLocal.has(p));
      shuffleInPlace(remainingPool);
      for (const p of remainingPool) {
        if (selected.length >= 3) break;
        const candidate = { prompt: p, score: 0 };
        // if adding would be redundant, skip unless no other choice
        const wouldBeRedundant = selected.some(s => shareImportantToken(s.prompt, p));
        if (wouldBeRedundant) {
          // check if there exists a non-redundant remaining; if none, accept redundancy
          const altExists = remainingPool.some(ap => !selected.some(s2 => shareImportantToken(s2.prompt, ap)) && !usedLocal.has(ap));
          if (altExists) continue;
        }
        tryAddCandidate(candidate);
      }
    }

    // If all attempts failed (edge cases), just pick top 3 unique
    if (selected.length === 0) {
      const fallback = [...unusedPrompts].slice(0, 3);
      for (const p of fallback) selected.push({ prompt: p, score: 0 });
    }

    // ensure we don't show exact same trio twice: create normalized key (sorted)
    const trioKey = selected.map(s => s.prompt).sort().join('||');
    if (shownTriosRef.current.has(trioKey)) {
      // try to alter selection by choosing other random ones
      const altPool = unusedPrompts.filter(p => !selected.map(s => s.prompt).includes(p));
      if (altPool.length > 0) {
        shuffleInPlace(altPool);
        const altSelected = [];
        for (const p of altPool) {
          if (altSelected.length >= 3) break;
          const wouldBeRedundant = altSelected.some(s => shareImportantToken(s, p));
          if (!wouldBeRedundant || altPool.length <= 3) altSelected.push(p);
        }
        if (altSelected.length > 0) {
          // add alt trio to shown set and return
          const altKey = altSelected.slice(0, 3).sort().join('||');
          shownTriosRef.current.add(altKey);
          maybePeriodicReshuffle();
          return altSelected.slice(0, 3);
        }
      }
      // else continue and fall through (we'll still add current trio to set)
    }

    // record this trio as shown
    shownTriosRef.current.add(trioKey);
    maybePeriodicReshuffle();

    return selected.map(s => s.prompt).slice(0, 3);
  }

  // -------------------- End micro-prompt helpers --------------------

  // replaced submitQuestion with streaming behavior and micro-prompt marking
  async function submitQuestion(qText) {
    const text = (qText || query).trim();
    if (!text) return;

    // If the submitted text matches exactly an unused micro-prompt, mark it used
    if (unusedPrompts.includes(text)) {
      markPromptUsed(text);
    } else {
      // if it's a free-text typed query, try to mark equivalent micro-prompts used
      markUsedEquivalentPrompts(text);
    }

    // interrupt any existing streaming
    streamingAbortRef.current = true;
    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current);
      streamIntervalRef.current = null;
    }

    if (!started) setStarted(true);

    // append user message immediately
    const userMsg = { role: 'user', text };
    setMessages(m => [...m, userMsg]);
    setQuery('');
    setLoading(true);

    // append a single loading assistant message with an id
    const loadingId = `loading_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
    const loadingMsg = { id: loadingId, role: 'assistant', loading: true, text: '' };
    setMessages(m => [...m, loadingMsg]);

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
      const full = data.answer || 'No answer available.';

      // replace loading message with assistant message that will stream
      setMessages(prev => prev.map(m => (m.id === loadingId ? { id: loadingId, role: 'assistant', text: full, streamedText: '' } : m)));

      // start streaming characters into streamedText
      let pos = 0;
      streamingAbortRef.current = false;
      const delay = 8; // ms per tick
      streamIntervalRef.current = setInterval(() => {
        if (streamingAbortRef.current) {
          clearInterval(streamIntervalRef.current);
          streamIntervalRef.current = null;
          return;
        }
        pos += 2; // characters per tick
        setMessages(prev => prev.map(m => {
          if (m.id !== loadingId) return m;
          return { ...m, streamedText: full.slice(0, pos) };
        }));
        if (pos >= full.length) {
          // streaming finished naturally — clear and attach fixed suggestions once
          clearInterval(streamIntervalRef.current);
          streamIntervalRef.current = null;
          // compute suggestions ONCE and attach to the assistant message
          const suggestions = selectSuggestions(text, full); // use last user text and full answer
          setMessages(prev => prev.map(m => (m.id === loadingId ? { id: loadingId, role: 'assistant', text: full, streamedText: full, suggestions } : m)));
        }
      }, delay);

    } catch (err) {
      // replace loading with error assistant message
      setMessages(prev => prev.map(m => (m.loading ? { role: 'assistant', text: 'Unable to reach the server.' } : m)));
    } finally {
      setLoading(false);
    }
  }

  // allow user to stop current streaming (stop button)
  function stopStreaming(id) {
    streamingAbortRef.current = true;
    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current);
      streamIntervalRef.current = null;
    }
    // mark the message as stopped so suggestions can appear (attach suggestions based on current streamed text or full text if available)
    setMessages(prev => prev.map(m => {
      if (m.id !== id) return m;
      const lastUser = prev.slice(0).reverse().find(x => x.role === 'user')?.text || '';
      const currentText = m.streamedText ?? m.text ?? '';
      const suggestions = selectSuggestions(lastUser, currentText);
      return { ...m, stopped: true, suggestions };
    }));
  }

  function clearConversation() {
    setMessages([]);
    setStarted(false);
    setQuery('');
    // reset micro-prompt pool and used/trios so session restarts
    usedPromptsRef.current = new Set();
    shownTriosRef.current = new Set();
    selectionCounterRef.current = 0;
    setUnusedPrompts(shuffleInPlace([...MICRO_PROMPT_POOL]));
  }

  // restore original chips and example prompt
  const chips = [
    "Summarize Rajit's ISRO work",
    "Which projects show ML skills?",
    "Short CV-style bullets"
  ];

  // Minimal wrapper for old generateSuggestions call: compute contextual suggestions only from the message.suggestions field
  function generateSuggestionsFromMessage(mIndex) {
    // return stored suggestions if present; otherwise empty (do not compute live)
    const m = messages[mIndex];
    if (!m) return [];
    return m.suggestions ?? [];
  }

  // smoother spring used across shared layout transitions
  const sharedTransition = { type: 'spring', stiffness: 200, damping: 28 };

  // --- UI ---
  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white transition-colors duration-300" style={{ position: 'relative' }}>
      {/* add shooting stars behind the UI */}
      <ShootingStars />

      {/* Centered container for header + chat/hero */}
      <div className={started ? "fixed inset-0 z-10 flex flex-col items-center" : "w-full min-h-screen flex flex-col items-center justify-center"}>
        {/* Header */}
        <div className="w-full flex flex-col items-center mb-4">
          <div className="flex items-center justify-between w-full max-w-3xl px-4">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Rajit Shrivastava</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Academic profile assistant</div>
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
          </div>
        </div>

        <motion.div
          layout
          transition={sharedTransition}
          className={started ? "flex-1 flex flex-col relative w-full items-center" : "relative w-full flex justify-center items-center"}
          style={{
            // Ensure background is always consistent to avoid black flash
            background: started ? 'inherit' : 'inherit',
            minHeight: started ? '100vh' : undefined,
            transition: 'background 0.3s, opacity 0.3s'
          }}
        >

          {/* HERO (centered input when not started) */}
          <AnimatePresence>
            {!started && (
              <motion.div
                layoutId="main-panel"
                initial={{ opacity: 0, scale: 0.995, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.99, y: -10 }}
                transition={sharedTransition}
                className="rounded-2xl bg-gray-50 dark:bg-gray-900 text-black dark:text-white border border-gray-200 dark:border-gray-800 p-6 shadow-md max-w-3xl w-full mx-auto"
                style={{ minWidth: 340 }}
              >
                <div className="text-center mb-4">
                  <h2 className="text-2xl font-semibold">Ask about Rajit's academic work</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                    e.g. Summarize Rajit's ISRO internship contributions
                  </p>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); submitQuestion(); }} className="flex flex-col items-center gap-3">
                  <input
                    ref={heroInputRef}
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Ask a question…"
                    className="w-full rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-sm text-black dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />

                  <div className="flex flex-wrap justify-center gap-2 mt-3">
                    {chips.map((c, i) => (
                      <button key={i} type="button" onClick={() => submitQuestion(c)} className="text-sm px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-800 text-black dark:text-white">{c}</button>
                    ))}
                  </div>

                  {/* Send button always visible */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 rounded-full text-sm mt-3"
                    style={{
                      background: 'var(--accent)',
                      color: 'var(--on-accent)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.12)'
                    }}
                  >
                    {loading ? '…' : 'Send'}
                  </button>

                  {/* Helper text always visible under send button */}
                  <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 text-center">
                    Type your question or select a suggestion above to get started. 
                  </div>
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
                className="flex-1 flex flex-col bg-white dark:bg-black text-black dark:text-white w-full items-center"
                style={{
                  minHeight: '100vh', // ensure full height to avoid black flash
                  transition: 'opacity 0.3s',
                  opacity: started ? 1 : 0
                }}
              >

                {/* Messages scroll area */}
                <div
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto px-0 py-2 space-y-3 w-full flex flex-col items-center"
                  style={{
                    minHeight: 0,
                    maxHeight: 'calc(100vh - 110px)',
                    paddingBottom: 90,
                  }}
                >
                  <div className="w-full max-w-3xl flex flex-col gap-3 px-2">
                  {messages.map((m, i) => {
                    const isUser = m.role === 'user';
                    const isStreaming = m.streamedText !== undefined && m.text && (m.streamedText.length < m.text.length) && !m.stopped;
                    return (
                      <div key={m.id ?? i} className="flex flex-col w-full">
                        <div className={isUser ? 'flex justify-end' : 'flex justify-start items-start'}>
                          {isUser ? (
                            <div
                              className="px-4 py-3 rounded-2xl max-w-[86%] sm:max-w-[75%]"
                              style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
                            >
                              <div className="text-sm whitespace-pre-wrap">{m.text}</div>
                            </div>
                          ) : (
                            <div
                              className={'px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 max-w-[86%] sm:max-w-[75%]'}
                              style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
                            >
                              {m.loading ? (
                                <div className="dot-typing text-gray-700 dark:text-gray-200">
                                  <span></span><span></span><span></span>
                                </div>
                              ) : (
                                <div className="text-sm whitespace-pre-wrap chat-md">
                                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.streamedText ?? m.text ?? ''}</ReactMarkdown>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        {/* suggestions: only shown after streaming completed or stopped (and not during loading)
                            Now uses the stored m.suggestions computed once when streaming stopped/finished — not recomputed live */}
                        {!isUser && !m.loading && !isStreaming && (m.suggestions && m.suggestions.length > 0) && (
                          <div className="mt-2 flex gap-2 flex-wrap px-3">
                            {m.suggestions.map((s, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  // mark clicked prompt used and submit
                                  if (unusedPrompts.includes(s)) markPromptUsed(s);
                                  submitQuestion(s);
                                }}
                                className="text-xs px-2 py-1 rounded-full border border-gray-300 dark:border-gray-700 bg-transparent hover:shadow-sm"
                                style={{ color: 'var(--on-accent)', background: 'transparent' }}
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  </div>
                </div>

                {/* Input bar — absolutely positioned at bottom, above chat area */}
                <div
                  className="w-full flex justify-center items-center pt-4 pb-2 bg-white dark:bg-black"
                  style={{
                    position: 'fixed',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 20,
                    borderTop: '1px solid var(--tw-prose-invert-borders, #e5e7eb)',
                  }}
                >
                  <form
                    onSubmit={(e) => { e.preventDefault(); submitQuestion(); }}
                    className="flex items-center gap-3 w-full max-w-3xl justify-end px-2"
                  >
                    <input
                      ref={chatInputRef}
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      placeholder="Ask a question…"
                      className="w-full rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-sm placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      style={{ marginRight: '8px' }}
                    />
                    {/* Stop button: only show when streaming */}
                    {messages.some(m =>
                      m.role === 'assistant' &&
                      m.streamedText !== undefined &&
                      m.text &&
                      m.streamedText.length < m.text.length &&
                      !m.stopped
                    ) && (
                      <button
                        type="button"
                        onClick={() => {
                          // Find the streaming assistant message and stop it
                          const streamingMsg = messages.find(m =>
                            m.role === 'assistant' &&
                            m.streamedText !== undefined &&
                            m.text &&
                            m.streamedText.length < m.text.length &&
                            !m.stopped
                          );
                          if (streamingMsg) stopStreaming(streamingMsg.id);
                        }}
                        className="text-xs px-3 py-2 rounded-full border border-gray-300 dark:border-gray-700 bg-transparent"
                        style={{ color: 'var(--on-accent)' }}
                      >
                        Stop
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 rounded-full text-sm"
                      style={{
                        background: 'var(--accent)',
                        color: 'var(--on-accent)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.12)'
                      }}
                    >
                      {loading ? '…' : 'Send'}
                    </button>
                  </form>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
