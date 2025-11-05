// frontend/src/components/AIChat.jsx
import { useState, useRef, useEffect } from 'react';

export default function AIChat({ onIntentExtracted, onPlanGenerated, className = "", seedMessage = "", autoSendSeed = false, showGreeting = true, prefix = "", extraContext = {}, getExtraContext = null, externalSendRef = null, showHeader = true }) {
  const [messages, setMessages] = useState(() => {
    return showGreeting ? [
      {
        id: 1,
        type: 'ai',
        content: "Hello! I'm Voyage AI, your personal travel planning assistant. I can help you plan amazing trips with flights, hotels, and daily itineraries. Where would you like to go?",
        timestamp: new Date()
      }
    ] : [];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId] = useState(`conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-send a seed message when provided (e.g., from Trips page)
  useEffect(() => {
    if (autoSendSeed && seedMessage && typeof seedMessage === 'string') {
      // slight delay to allow component to mount
      const t = setTimeout(() => {
        askAI(seedMessage);
      }, 100);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSendSeed, seedMessage]);

  function fetchWithTimeout(url, options = {}, timeoutMs = 12000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { ...options, signal: controller.signal })
      .finally(() => clearTimeout(timer));
  }

  // Allow parent to send messages without remounting
  useEffect(() => {
    if (!externalSendRef) return;
    externalSendRef.current = askAI;
    return () => { if (externalSendRef) externalSendRef.current = null; };
  }, [externalSendRef]);

  async function askAI(messageText) {
    if (!messageText.trim() || isLoading) return;

    const displayText = messageText.trim();
    const ctx = (getExtraContext ? getExtraContext() : extraContext) || {};
    const hiddenTopicTag = ctx.topic ? `[[topic:${ctx.topic}]]\n` : '';
    const finalText = hiddenTopicTag + (prefix ? `${prefix}\n\n${displayText}` : displayText);

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: displayText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    const safety = setTimeout(() => setIsLoading(false), 20000);

    (async () => {
      try {
        const lower = messageText.toLowerCase();
        const reList = [
          /\btrip to\s+([a-zA-Z\s]+?)(?=[,\.!]|$)/,
          /\bvisit\s+([a-zA-Z\s]+?)(?=[,\.!]|$)/,
          /\bgo to\s+([a-zA-Z\s]+?)(?=[,\.!]|$)/,
          /\btravel to\s+([a-zA-Z\s]+?)(?=[,\.!]|$)/,
          /\bcity to\s+([a-zA-Z\s]+?)(?=[,\.!]|$)/
        ];
        let city = null;
        for (const re of reList) {
          const m = lower.match(re);
          if (m && m[1]) { city = m[1].trim(); break; }
        }
        if (!city) {
          const single = lower.match(/\b([a-z]{3,})\b(?=[,\.!]|$)/i)?.[1];
          if (single) city = single.trim();
        }
        if (!city) return;
        const resp = await fetch(`/api/destinations/suggest?q=${encodeURIComponent(city)}&limit=1`);
        if (!resp.ok) return;
        const json = await resp.json();
        const code = Array.isArray(json.data) && json.data[0]?.code;
        if (code && onIntentExtracted) {
          onIntentExtracted({ destination: code });
        }
      } catch {}
    })();

    const lower = messageText.trim().toLowerCase();
    if (lower === 'what can you do?' || lower.includes('what can you do')) {
      const aiMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content:
          "I can help you plan trips end-to-end: extract your intent, auto-fill the form, find real flights and hotels, build a daily itinerary, and provide AI insights. Try: ‘Plan Delhi to Paris Dec 12–17, $1200, 2 adults, culture & food’.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
      setIsLoading(false);
      clearTimeout(safety);
      return;
    }
    try {
      const response = await fetchWithTimeout('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: finalText,
          conversationId,
          context: {
            hasFormData: !!onIntentExtracted,
            timestamp: new Date().toISOString(),
            ...(ctx),
          }
        })
      }, 15000); // 15s timeout

      if (!response.ok) {
        throw new Error(`AI ${response.status}`);
      }
      let data;
      try {
        data = await response.json();
      } catch (_) {
        const txt = await response.text();
        throw new Error(txt || 'Invalid AI response');
      }

      if (data.success) {
        const aiMessage = {
          id: Date.now() + 1,
          type: 'ai',
          content: data.response,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, aiMessage]);

        if (data.intent && onIntentExtracted) {
          onIntentExtracted(data.intent);
        }
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: (error?.name === 'AbortError' || error?.message === 'timeout')
          ? "The AI took too long to respond. Here’s what I can do: help plan trips, suggest destinations, find flights and hotels, and draft daily itineraries. Try asking: ‘Plan Delhi to Paris next month for $1200’."
          : "I'm sorry, I'm having trouble processing your request right now. Please try again.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      clearTimeout(safety);
    }
  }

  const sendMessage = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput('');
    await askAI(text);
  };

  const quickActions = [
    "Plan a trip to Paris",
    "I want to visit Tokyo",
    "Help me plan a beach vacation",
    "What can you do?",
    "Show me budget travel options"
  ];

  const handleQuickAction = (action) => {
    if (isLoading) return;
    setInput('');
    askAI(action);
  };

  return (
    <div className={`flex flex-col h-full bg-white rounded-2xl border border-slate-200 shadow-sm ${className}`}>
      {/* Header */}
      {showHeader && (
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">AI</span>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Voyage AI Assistant</h3>
              <p className="text-xs text-slate-500">Your personal travel planner</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-slate-500">Online</span>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                message.type === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-900'
              }`}
            >
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {message.content}
              </div>
              <div
                className={`text-xs mt-2 ${
                  message.type === 'user' ? 'text-indigo-200' : 'text-slate-500'
                }`}
              >
                {message.timestamp.toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-100 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-sm text-slate-500">AI is thinking...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      {messages.length <= 2 && (
        <div className="px-4 pb-2">
          <p className="text-xs text-slate-500 mb-2">Quick actions:</p>
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={() => handleQuickAction(action)}
                disabled={isLoading}
                className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 rounded-full border border-slate-200 transition-colors"
              >
                {action}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-slate-200">
        <form onSubmit={sendMessage} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything about your trip..."
            className="flex-1 px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 outline-none text-sm"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl font-medium text-sm transition-colors"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              'Send'
            )}
          </button>
        </form>
        <p className="text-xs text-slate-500 mt-2">
          Try: "I want to visit Paris in spring with a $2000 budget, love culture and food"
        </p>
      </div>
    </div>
  );
}
