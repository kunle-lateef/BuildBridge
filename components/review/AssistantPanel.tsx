'use client';

import { useEffect, useRef, useState } from 'react';

import { reviewFinding, type AnswerSourceView, type AskAbout } from '@/components/review/assistantEvents';
import { ArrowRight, Plus, X } from '@/components/ui/icons';
import { ProvenanceBadge } from '@/components/ui/ProvenanceBadge';
import { SeverityBadge } from '@/components/ui/SeverityBadge';
import { cn } from '@/lib/cn';

export type { AskAbout } from '@/components/review/assistantEvents';

/** Must match lib/ai/assistantSources.ts's SOURCES_SEPARATOR. */
const SOURCES_SEPARATOR = '\u001e';

type ChatMessage =
  | { id: string; role: 'User'; content: string; failed?: boolean }
  | { id: string; role: 'Assistant'; content: string; sources: AnswerSourceView[] };

type AssistantPanelProps = {
  handoffId: string;
  handoffName: string;
  about?: AskAbout | null;
  onClearAbout?: () => void;
  onClose: () => void;
  className?: string;
};

/**
 * Ask BuildBridge (Figma `04 — Handoff / Assistant …`): strictly scoped to
 * this handoff (lib/ai/prompts.ts's ASSISTANT_SYSTEM_PROMPT). Each answer
 * can end with the findings it came from, resolved and checked by the
 * server; "Review this finding" / "Answer the gap" takes the designer there.
 */
export function AssistantPanel({ handoffId, handoffName, about = null, onClearAbout, onClose, className }: AssistantPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<{ message: string; retry: string } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  function startNew() {
    abortRef.current?.abort();
    setMessages([]);
    setConversationId(null);
    setError(null);
    setInput('');
  }

  async function send(text: string) {
    const question = text.trim();
    if (!question || isStreaming) return;
    // The finding being asked about travels with the question, visibly.
    const content = about ? `About ${about.label}: ${question}` : question;
    const userId = `user-${Date.now()}`;
    const replyId = `assistant-${Date.now()}`;

    setError(null);
    setInput('');
    setMessages((prev) => [...prev.filter((message) => !(message.role === 'User' && message.failed)), { id: userId, role: 'User', content }]);
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handoffId, conversationId: conversationId ?? undefined, message: content }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.error?.message ?? 'The assistant couldn’t answer. Try again.');
      }

      const newConversationId = response.headers.get('X-Conversation-Id');
      if (newConversationId) setConversationId(newConversationId);
      setMessages((prev) => [...prev, { id: replyId, role: 'Assistant', content: '', sources: [] }]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let raw = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        raw += decoder.decode(value, { stream: true });
        const [answer = '', record] = raw.split(SOURCES_SEPARATOR);
        let sources: AnswerSourceView[] = [];
        if (record) {
          try {
            sources = JSON.parse(record) as AnswerSourceView[];
          } catch {
            // Record not complete yet; it arrives whole at the very end.
          }
        }
        setMessages((prev) => prev.map((m) => (m.id === replyId && m.role === 'Assistant' ? { ...m, content: answer, sources } : m)));
      }
    } catch (fetchError) {
      if (controller.signal.aborted) return; // Stopped on purpose: keep what arrived.
      setMessages((prev) => prev.filter((m) => m.id !== replyId).map((m) => (m.id === userId ? { ...m, failed: true } : m)));
      setError({ message: fetchError instanceof Error ? fetchError.message : 'The assistant couldn’t answer. Try again.', retry: question });
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }

  return (
    <div className={cn('flex h-full min-h-0 flex-col bg-white', className)}>
      <div className="flex items-start gap-3 border-b border-[--color-border] px-6 py-4">
        <div className="flex min-w-0 flex-1 flex-col">
          <h2 className="m-0 text-[16px] font-medium leading-6 text-[--color-text-primary]">Ask BuildBridge</h2>
          <span className="truncate text-[12px] leading-4 text-[--color-text-secondary]">About {handoffName} only</span>
        </div>
        <button type="button" onClick={startNew} className="flex items-center gap-1 rounded-[6px] px-2 py-1 text-[12px] leading-4 text-[--color-text-body] hover:bg-[--color-surface]">
          <Plus aria-hidden="true" size={12} />
          New
        </button>
        <button type="button" onClick={onClose} aria-label="Close Ask BuildBridge" className="rounded-[6px] p-1 text-[--color-text-secondary] hover:bg-[--color-surface] hover:text-[--color-text-primary]">
          <X aria-hidden="true" size={18} />
        </button>
      </div>

      <div ref={listRef} aria-live="polite" className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 py-6">
        {messages.length === 0 && (
          <p className="m-0 text-[14px] leading-5 text-[--color-text-body]">
            Answers come only from this handoff. When an answer rests on a finding you haven’t confirmed, it says so.
          </p>
        )}

        {about && messages.length === 0 && (
          <span className="inline-flex items-center gap-1.5 self-start rounded-[6px] bg-[--color-surface] px-2.5 py-1 text-[12px] leading-4">
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
          <div className="flex flex-col gap-2">
            <h3 className="m-0 text-[11px] font-semibold uppercase leading-4 tracking-[0.12em] text-[--color-text-secondary]">Try asking</h3>
            {about.suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                disabled={isStreaming}
                onClick={() => void send(suggestion)}
                className="flex items-center justify-between gap-3 rounded-[8px] border border-[--color-border] bg-white px-3 py-3 text-left text-[14px] leading-5 text-[--color-text-primary] hover:bg-[--color-background]"
              >
                {suggestion}
                <ArrowRight aria-hidden="true" size={14} className="shrink-0 text-[--color-text-secondary]" />
              </button>
            ))}
          </div>
        )}

        {messages.map((message) =>
          message.role === 'User' ? (
            <p key={message.id} className={cn('m-0 max-w-[85%] self-end whitespace-pre-line rounded-[12px] bg-[--color-surface] px-3 py-2.5 text-[14px] leading-5 text-[--color-text-primary]', message.failed && 'opacity-60')}>
              {message.content}
            </p>
          ) : (
            <AssistantMessage key={message.id} content={message.content} sources={message.sources} isStreaming={isStreaming && message.id === messages[messages.length - 1]?.id} />
          ),
        )}

        {isStreaming && messages[messages.length - 1]?.role === 'User' && <TypingDots label="BuildBridge is answering" />}

        {error && (
          <div role="alert" className="flex flex-col items-start gap-2">
            <p className="m-0 text-[14px] leading-5 text-[--color-text-body]">{error.message}</p>
            <button type="button" onClick={() => void send(error.retry)} className="text-[14px] font-medium leading-5 text-[--color-primary] underline">
              Retry
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 border-t border-[--color-border] px-4 pb-4 pt-3">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void send(input);
          }}
          className="flex items-center gap-2 rounded-[8px] border border-[--color-border] bg-white py-1.5 pl-3 pr-1.5 focus-within:border-[--color-primary]"
        >
          <label htmlFor="assistant-input" className="sr-only">Ask about this handoff</label>
          <input
            id="assistant-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask about this handoff"
            maxLength={1800}
            className="min-w-0 flex-1 border-0 bg-transparent py-1.5 text-[14px] leading-5 text-[--color-text-primary] outline-none placeholder:text-[--color-text-muted]"
          />
          {isStreaming ? (
            <button type="button" onClick={() => abortRef.current?.abort()} className="flex items-center gap-1.5 rounded-[6px] border border-[--color-border] px-2.5 py-1 text-[12px] leading-4 text-[--color-text-primary] hover:bg-[--color-surface]">
              <span aria-hidden="true" className="h-2 w-2 rounded-[1px] bg-[--color-text-primary]" />
              Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              aria-label="Send"
              className="grid h-8 w-8 place-items-center rounded-[6px] bg-[--color-primary] text-white disabled:opacity-40"
            >
              <ArrowRight aria-hidden="true" size={16} />
            </button>
          )}
        </form>
        <p className="m-0 text-[12px] leading-4 text-[--color-text-secondary]">
          Answers can be wrong. Check anything important against the findings before you share.
        </p>
      </div>
    </div>
  );
}

function AssistantMessage({ content, sources, isStreaming }: { content: string; sources: AnswerSourceView[]; isStreaming: boolean }) {
  const paragraphs = content.split(/\n{2,}/).filter((paragraph) => paragraph.trim());
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[12px] leading-4 text-[--color-text-secondary]">BuildBridge</span>
      {paragraphs.map((paragraph, index) => (
        <p key={index} className="m-0 whitespace-pre-line text-[14px] leading-5 text-[--color-text-primary]">{paragraph}</p>
      ))}
      {isStreaming && <TypingDots label="Still answering" />}
      {!isStreaming && sources.map((source) => (
        <div key={source.tag} className="flex flex-col items-start gap-1.5">
          <span className="flex flex-wrap items-center gap-2 text-[12px] leading-4">
            <span className="text-[--color-text-secondary]">From</span>
            <span className="text-[--color-text-primary]">{source.label}</span>
            {source.severity ? <SeverityBadge severity={source.severity} /> : source.provenance && <ProvenanceBadge provenance={source.provenance} />}
          </span>
          <a
            href={source.kind === 'gap' ? `?tab=review#issue-${source.findingId}` : source.componentId ? `?tab=review#component-${source.componentId}` : '?tab=responsive'}
            onClick={(event) => {
              if (reviewFinding(source)) event.preventDefault();
            }}
            className="text-[12px] leading-4 text-[--color-primary] underline"
          >
            {source.kind === 'gap' ? 'Answer the gap' : 'Review this finding'}
          </a>
        </div>
      ))}
    </div>
  );
}

function TypingDots({ label }: { label: string }) {
  return (
    <span role="status" aria-label={label} className="flex gap-1 py-1">
      {[0, 1, 2].map((dot) => (
        <span key={dot} className="h-1.5 w-1.5 rounded-full bg-[--color-text-secondary] motion-safe:animate-pulse" style={{ animationDelay: `${dot * 150}ms` }} />
      ))}
    </span>
  );
}
