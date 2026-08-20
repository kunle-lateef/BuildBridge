'use client';

import { AlertCircle, Send } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/cn';

type ChatMessage = {
  id: string;
  role: 'User' | 'Assistant';
  content: string;
};

type AssistantPanelProps = {
  handoffId: string;
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
export function AssistantPanel({ handoffId, className }: AssistantPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendMessage(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

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
    <Card className={cn('flex flex-col gap-3', className)}>
      <p className="text-[--color-text-muted]">
        Ask about this handoff&apos;s confirmed data. Scoped to this handoff only.
      </p>

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
        <p role="alert" className="flex items-center gap-1.5 text-[--color-error]">
          <AlertCircle aria-hidden="true" size={14} />
          {error}
        </p>
      )}

      <form onSubmit={(event) => void sendMessage(event)} className="flex items-end gap-2">
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
