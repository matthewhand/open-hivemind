import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Sparkles, Send, Loader2, RotateCcw, AlertTriangle, Zap,
  Clock, FileText, Cpu, DollarSign,
} from 'lucide-react';
import type { BotConfig } from '../../types/bot';
import Button from '../../components/DaisyUI/Button';
import Input from '../../components/DaisyUI/Input';
import Textarea from '../../components/DaisyUI/Textarea';
import Toggle from '../../components/DaisyUI/Toggle';
import { Stat, Stats } from '../../components/DaisyUI/Stat';
import { useSuccessToast, useErrorToast } from '../../components/DaisyUI/ToastNotification';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  latency?: number;
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

interface BotTestDriveTabProps {
  bot: BotConfig;
}

interface StreamEvent {
  type: 'chunk' | 'done' | 'error';
  content?: string;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  model?: string;
  error?: string;
}

/**
 * Test Drive tab — lets users chat with the bot's configured LLM
 * using its actual persona/systemInstruction as the system prompt.
 * Streams responses via SSE from the /api/admin/llm-providers/providers/:key/test-stream endpoint.
 */
const BotTestDriveTab: React.FC<BotTestDriveTabProps> = ({ bot }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [streamingContent, setStreamingContent] = useState<string | null>(null);
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [sessionTokens, setSessionTokens] = useState({ prompt: 0, completion: 0, total: 0 });
  const bottomRef = useRef<HTMLDivElement>(null);
  const showSuccess = useSuccessToast();
  const showError = useErrorToast();
  const abortControllerRef = useRef<AbortController | null>(null);

  // Build the system prompt from the bot's persona / systemInstruction
  const effectiveSystemPrompt = systemPrompt.trim() || bot.systemInstruction || '';

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending, streamingContent]);

  // Clean up abort controller on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const handleReset = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setMessages([]);
    setStreamingContent(null);
    setSending(false);
    setSessionTokens({ prompt: 0, completion: 0, total: 0 });
  }, []);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    if (!bot.llmProvider) {
      showError('No provider configured', 'This bot does not have an LLM provider configured.');
      return;
    }

    const userContent = input.trim();
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userContent,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSending(true);
    setStreamingContent('');

    const startTime = Date.now();

    try {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const res = await fetch(
        `/api/admin/llm-providers/providers/${encodeURIComponent(bot.llmProvider)}/test-stream`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userContent,
            systemPrompt: effectiveSystemPrompt || undefined,
            conversationHistory: messages.map(m => ({ role: m.role, content: m.content })),
          }),
          signal: controller.signal,
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const errMsg = err.message || err.error || `HTTP ${res.status}`;
        const assistantMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Error: ${errMsg}`,
          timestamp: Date.now(),
          latency: Date.now() - startTime,
        };
        setMessages(prev => [...prev, assistantMsg]);
        showError('Test Drive failed', errMsg);
        setStreamingContent(null);
        setSending(false);
        return;
      }

      // Parse SSE stream
      const reader = res.body?.getReader();
      if (!reader) throw new Error('ReadableStream not supported');

      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          try {
            const event: StreamEvent = JSON.parse(trimmed.slice(6));

            if (event.type === 'chunk') {
              fullContent += event.content || '';
              setStreamingContent(fullContent);
            } else if (event.type === 'done') {
              const latency = Date.now() - startTime;
              const usage = event.usage;
              const assistantMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: fullContent || '(empty response)',
                timestamp: Date.now(),
                latency,
                model: event.model,
                promptTokens: usage?.prompt_tokens,
                completionTokens: usage?.completion_tokens,
                totalTokens: usage?.total_tokens,
              };
              setMessages(prev => [...prev, assistantMsg]);
              setStreamingContent(null);

              if (usage) {
                setSessionTokens(prev => ({
                  prompt: prev.prompt + usage.prompt_tokens,
                  completion: prev.completion + usage.completion_tokens,
                  total: prev.total + usage.total_tokens,
                }));
              }

              showSuccess('Response received', `${latency}ms`);
            } else if (event.type === 'error') {
              const assistantMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: `Error: ${event.error || 'Unknown streaming error'}`,
                timestamp: Date.now(),
                latency: Date.now() - startTime,
              };
              setMessages(prev => [...prev, assistantMsg]);
              setStreamingContent(null);
              showError('Stream error', event.error || 'Unknown error');
            }
          } catch {
            // Not valid JSON, skip
          }
        }
      }

      // If stream ended without a 'done' event but we have content
      if (streamingContent && fullContent) {
        const latency = Date.now() - startTime;
        const assistantMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: fullContent,
          timestamp: Date.now(),
          latency,
        };
        setMessages(prev => [...prev, assistantMsg]);
        setStreamingContent(null);
        showSuccess('Response received', `${latency}ms`);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;

      const errMsg = err.message || 'Network error';
      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: ${errMsg}`,
        timestamp: Date.now(),
        latency: Date.now() - startTime,
      };
      setMessages(prev => [...prev, assistantMsg]);
      showError('Test Drive failed', errMsg);
    } finally {
      setSending(false);
      abortControllerRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Show warning if no LLM provider configured
  if (!bot.llmProvider) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertTriangle className="w-12 h-12 text-warning mb-3" />
        <h4 className="font-bold text-sm mb-1">No LLM Provider Configured</h4>
        <p className="text-xs text-base-content/60 max-w-[280px]">
          Configure an LLM provider first to test this bot.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Token Usage Stats */}
      {(sessionTokens.total > 0 || messages.length > 0) && (
        <Stats className="bg-base-200 w-full shadow-sm">
          <Stat
            className="p-2"
            title={<span className="text-[10px] uppercase font-bold flex items-center gap-1"><FileText className="w-3 h-3" /> Tokens</span>}
            value={sessionTokens.total}
            description={
              <span className="text-[10px]">
                In: {sessionTokens.prompt} / Out: {sessionTokens.completion}
              </span>
            }
          />
          <Stat
            className="p-2"
            title={<span className="text-[10px] uppercase font-bold flex items-center gap-1"><Zap className="w-3 h-3" /> Messages</span>}
            value={messages.length}
            description={<span className="text-[10px]">{Math.round(sessionTokens.total / Math.max(messages.length, 1))} avg/msg</span>}
          />
          <Stat
            className="p-2"
            title={<span className="text-[10px] uppercase font-bold flex items-center gap-1"><DollarSign className="w-3 h-3" /> Est. Cost</span>}
            value={`$${(sessionTokens.total * 0.00001).toFixed(4)}`}
            description={<span className="text-[10px]">~$0.01/1K tokens</span>}
          />
        </Stats>
      )}

      {/* System Prompt Toggle */}
      <div className="bg-base-200/50 rounded-lg p-2">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-base-content/60">
            <FileText className="w-3 h-3" />
            System prompt
          </label>
          <Toggle
            size="sm"
            checked={showSystemPrompt}
            onChange={(e) => setShowSystemPrompt(e.target.checked)}
          />
        </div>
        {showSystemPrompt && (
          <Textarea
            size="sm"
            className="mt-2 h-20 resize-none"
            placeholder={bot.systemInstruction || 'You are a helpful assistant...'}
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
          />
        )}
      </div>

      {/* Chat Messages */}
      <div className="bg-base-200/30 rounded-lg p-3 min-h-[200px] max-h-[350px] overflow-y-auto space-y-3 custom-scrollbar">
        {messages.length === 0 && !sending && (
          <div className="flex flex-col items-center justify-center h-full py-12 text-center text-base-content/40">
            <Sparkles className="w-10 h-10 mb-2 opacity-50" />
            <p className="text-xs font-medium">Test Drive this bot</p>
            <p className="text-[10px] mt-1">Send a message to see how the bot responds</p>
            <div className="flex items-center gap-3 mt-3 text-[10px]">
              {bot.llmProvider && (
                <span className="flex items-center gap-1"><Cpu className="w-3 h-3" /> {bot.llmProvider}</span>
              )}
              {bot.llmModel && (
                <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {bot.llmModel}</span>
              )}
            </div>
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
                  : msg.content.startsWith('Error:')
                  ? 'bg-error/10 text-error rounded-bl-md border border-error/20'
                  : 'bg-base-100 rounded-bl-md'
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{msg.content}</p>
              {msg.role === 'assistant' && !msg.content.startsWith('Error:') && (
                <div className="flex items-center gap-2 mt-1 text-[10px] opacity-50">
                  {msg.model && (
                    <span className="flex items-center gap-0.5">
                      <Cpu className="w-2.5 h-2.5" /> {msg.model}
                    </span>
                  )}
                  {msg.latency != null && (
                    <span className="flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" /> {msg.latency}ms
                    </span>
                  )}
                  {msg.totalTokens != null && (
                    <span className="flex items-center gap-0.5">
                      <FileText className="w-2.5 h-2.5" /> {msg.totalTokens}t
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Streaming indicator */}
        {streamingContent !== null && (
          <div className="flex justify-start">
            <div className="max-w-[85%] bg-base-100 rounded-2xl rounded-bl-md px-3 py-2 text-sm">
              <p className="whitespace-pre-wrap break-words">{streamingContent}</p>
              <div className="flex items-center gap-1 mt-1">
                <Loader2 className="w-3 h-3 animate-spin text-base-content/50" />
                <span className="text-[10px] opacity-50">Streaming...</span>
              </div>
            </div>
          </div>
        )}

        {/* Sending spinner (non-streaming fallback) */}
        {sending && streamingContent === null && (
          <div className="flex justify-start">
            <div className="bg-base-100 rounded-2xl rounded-bl-md px-3 py-2">
              <Loader2 className="w-4 h-4 animate-spin text-base-content/50" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input + Reset */}
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            placeholder="Type a message to test the bot..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
            size="sm"
          />
          <p className="text-[10px] text-base-content/40 mt-1">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={handleSend}
            disabled={sending || !input.trim()}
            aria-label="Send test message"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="xs"
            onClick={handleReset}
            disabled={messages.length === 0 && !sending}
            aria-label="Reset conversation"
            className="btn-square"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BotTestDriveTab;
