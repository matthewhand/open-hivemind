import React, { useState, useRef } from 'react';
import { X, Send, Loader2, Sparkles } from 'lucide-react';
import Button from '../DaisyUI/Button';
import Card from '../DaisyUI/Card';
import Input from '../DaisyUI/Input';
import { useSuccessToast, useErrorToast } from '../DaisyUI/ToastNotification';

interface LlmTestChatProps {
  providerKey: string;
  providerType: string;
  onClose: () => void;
}

interface ChatMsg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  latency?: number;
  model?: string;
}

/**
 * Inline test chat drawer for LLM provider profiles.
 * Opens on the right side when the user clicks "Test" on a profile card.
 */
const LlmTestChat: React.FC<LlmTestChatProps> = ({ providerKey, providerType, onClose }) => {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const showSuccess = useSuccessToast();
  const showError = useErrorToast();

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const userMsg: ChatMsg = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSending(true);

    try {
      const start = Date.now();
      const res = await fetch(`/api/admin/llm-providers/providers/${encodeURIComponent(providerKey)}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg.content,
          llmProviderKey: providerKey,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || err.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const assistantMsg: ChatMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply || data.message || data.content || '(empty response)',
        timestamp: Date.now(),
        latency: Date.now() - start,
        model: data.model,
      };
      setMessages(prev => [...prev, assistantMsg]);
      showSuccess('Test successful', `${assistantMsg.latency}ms`);
    } catch (err: any) {
      const errMsg: ChatMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `⚠️ Error: ${err.message}`,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errMsg]);
      showError('Test failed', err.message);
    } finally {
      setSending(false);
    }
  };

  // Auto-scroll to bottom
  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  return (
    <div className="fixed top-0 right-0 z-50 h-full w-full md:w-[480px] bg-base-100 shadow-2xl border-l border-base-300 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-base-300 bg-base-200/50">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">Test: {providerKey}</span>
          <span className="text-xs text-base-content/50 px-1.5 py-0.5 bg-base-200 rounded">
            {providerType}
          </span>
        </div>
        <button
          className="btn btn-ghost btn-xs btn-circle"
          onClick={onClose}
          aria-label="Close test chat"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-12 text-base-content/40">
            <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Send a test message to this provider</p>
            <p className="text-xs mt-1">The response will use the configured model & API key</p>
          </div>
        )}
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-content rounded-br-md'
                  : 'bg-base-200 rounded-bl-md'
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{msg.content}</p>
              {msg.role === 'assistant' && msg.latency != null && (
                <p className="text-[10px] opacity-50 mt-1">
                  {msg.model ? `${msg.model} · ` : ''}{msg.latency}ms
                </p>
              )}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-base-200 rounded-2xl rounded-bl-md px-3 py-2">
              <Loader2 className="w-4 h-4 animate-spin text-base-content/50" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-base-300 bg-base-100">
        <div className="flex gap-2">
          <Input
            placeholder="Type a test message..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={sending}
            size="sm"
          />
          <Button
            variant="primary"
            size="sm"
            onClick={handleSend}
            disabled={sending || !input.trim()}
            aria-label="Send test message"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LlmTestChat;
