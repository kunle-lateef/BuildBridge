'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { AlertCircle, ArrowRight, Send, X } from '@/components/ui/icons';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/cn';

type ChatMessage = {
  id: string;
  role: 'User' | 'Assistant';
  content: string;
};

/** A finding the designer asked about, e.g. "Pay button · Loading state". */
export type AskAbout = { label: string; suggestions: string[] };

/** Fired by a finding card's "Ask about this finding"; the header's Ask BuildBridge opens with it. */
export const ASK_ABOUT_EVENT = 'buildbridge:ask-about';

type AssistantPanelProps = {
  handoffId: string;
  about?: AskAbout | null;
  onClearAbout?: () => void;
  className?: string;
};

/**
 * Strictly scoped to the current handoff — see
 * .agents/rules/architecture.md's Contextual Assistant section and
 * lib/ai/prompts.ts's ASSISTANT_SYSTEM_PROMPT. Placed in components/review/
 * rather than components/shared/ — it's designer-review workspace tooling,
 * not used outside that context (the plan flagged this placement as
 * undecided; this is the call made, not a specified one).
 */
export function AssistantPanel({ handoffId, about = null, onClearAbout, className }: AssistantPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendMessage(event: React.FormEvent | null, text?: string) {
    event?.preventDefault();
    const question = (text ?? input).trim();
    if (!question || isStreaming) return;
    // The finding being asked about travels with the question, visibly, so
    // the answer is about the right thing and the history reads the same
    // as what was sent.
    const trimmed = about ? `About ${about.label}: ${question}` : question;

    setError(null);
    setInput('');
    setMessages((prev) => [...prev, { id: `user-${Date.now()}`, role: 'User', content: trimmed }]);
    setIsStreaming(true);

    const assistantMessageId = `assistant-${Date.now()}`;
    setMessages((prev) => [...prev, { id: assistantMessageId, role: 'Assistant', content: '' }]);

    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handoffId, conversationId: conversationId ?? undefined, message: trimmed }),
      });

      if (!response.ok || !response.body) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.error?.message ?? 'The assistant could not respond.');
      }

      const newConversationId = response.headers.get('X-Conversation-Id');
      if (newConversationId) setConversationId(newConversationId);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantMessageId ? { ...m, content: m.content + chunk } : m)),
        );
      }
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'The assistant could not respond.');
      setMessages((prev) => prev.filter((m) => m.id !== assistantMessageId));
    } finally {
      setIsStreaming(false);
    }
  }

  return (
    <Card className={cn('flex h-full flex-col overflow-hidden', className)}>
      {/* min-h-0 is required for a flex child to actually shrink and scroll
          instead of stretching its flex-1 parent — without it this grows to
          fit every message, and the drawer's own overflow-y-auto is what
          would scroll instead of just this list. Padded on its own — the
          form below deliberately isn't, so it can span edge-to-edge. */}
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
        <p className="shrink-0 text-[--color-text-muted]">
          Ask about this handoff&apos;s confirmed data. Scoped to this handoff only.
        </p>

        {about && (
          <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-[6px] bg-[--color-surface] px-2.5 py-1 text-[12px] leading-4">
            <span className="text-[--color-text-secondary]">Asking about</span>
            <span className="text-[--color-text-primary]">{about.label}</span>
            {onClearAbout && (
              <button type="button" onClick={onClearAbout} aria-label="Stop asking about this finding" className="text-[--color-text-secondary] hover:text-[--color-text-primary]">
                <X aria-hidden="true" size={12} />
              </button>
            )}
          </span>
        )}

        {about && messages.length === 0 && about.suggestions.length > 0 && (
          <div className="flex shrink-0 flex-col gap-2">
            <h3 className="m-0 text-[11px] font-semibold uppercase leading-4 tracking-[0.12em] text-[--color-text-secondary]">Try asking</h3>
            {about.suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                disabled={isStreaming}
                onClick={() => void sendMessage(null, suggestion)}
                className="flex items-center justify-between gap-3 rounded-[8px] border border-[--color-border] bg-white px-3 py-3 text-left text-[14px] leading-5 text-[--color-text-primary] hover:bg-[--color-background]"
              >
                {suggestion}
                <ArrowRight aria-hidden="true" size={14} className="shrink-0 text-[--color-text-secondary]" />
              </button>
            ))}
          </div>
        )}

        {messages.length > 0 && (
          <div className="flex flex-col gap-2">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'rounded-[--radius-md] px-3 py-2',
                  message.role === 'User'
                    ? 'self-end bg-[--color-primary-light] text-[--color-primary-dark]'
                    : 'self-start bg-[--color-surface] text-[--color-text-body]',
                )}
              >
                {message.content || (isStreaming && message.role === 'Assistant' ? '…' : '')}
              </div>
            ))}
          </div>
        )}

        {error && (
          <p role="alert" className="flex shrink-0 items-center gap-2 text-[--color-error]">
            <AlertCircle aria-hidden="true" size={14} />
            {error}
          </p>
        )}
      </div>

      {/* Its own band with generous vertical padding and the same
          horizontal inset on both sides as the message area above it —
          previously this shared the message area's p-4 wrapper directly,
          which squeezed it vertically; now it's independent so the
          vertical rhythm can differ while the horizontal one still matches. */}
      <form
        onSubmit={(event) => void sendMessage(event)}
        className="flex shrink-0 items-center gap-3 border-t border-[--color-border] px-4 py-6"
      >
        <Input
          id="assistant-input"
          label="Ask the assistant"
          hideLabel
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="What happens to the sidebar on mobile?"
          disabled={isStreaming}
          className="flex-1"
        />
        <Button type="submit" disabled={isStreaming || !input.trim()} aria-label="Send message">
          <Send aria-hidden="true" size={16} />
        </Button>
      </form>
    </Card>
  );
}
