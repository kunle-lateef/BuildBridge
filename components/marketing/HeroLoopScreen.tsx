import {
  LOOP_FINDINGS,
  type LoopFinding,
  type LoopFindingId,
  type LoopState,
} from '@/components/marketing/heroLoopTimeline';
import { ProvenanceBadge } from '@/components/ui/ProvenanceBadge';
import { ReviewStatusBadge } from '@/components/ui/ReviewStatusBadge';
import { SeverityBadge } from '@/components/ui/SeverityBadge';
import { cn } from '@/lib/cn';

type HeroLoopScreenProps = {
  state: LoopState;
};

// Pixel positions on HeroHandoffLoop's fixed 770×744 stage, which is scaled
// as a whole to fit the column — so these are design coordinates, not
// layout values, and arbitrary px is the honest unit for them.
const BOX_POSITION: Record<LoopFindingId, string> = {
  focus: 'left-[38px] top-[210px] h-[60px] w-[326px]',
  button: 'left-[38px] top-[538px] h-[64px] w-[326px]',
  loading: 'left-[38px] top-[638px] h-[58px] w-[326px]',
  tablet: 'left-[4px] top-[42px] h-[684px] w-[394px] rounded-[--radius-2xl]',
};

/**
 * The uploaded design the loop analyzes — a checkout screen, the scan sweep,
 * and one outline per finding. Outline colors reuse the provenance/severity
 * tokens (the same exception ScreenPinOverlay documents: an outline can't
 * literally be a badge), and every outline still carries the real badge in
 * its tag, so the meaning never rests on border color alone.
 */
export function HeroLoopScreen({ state }: HeroLoopScreenProps) {
  return (
    <>
      <div className="absolute left-[16px] top-[54px] z-[3] h-[660px] w-[370px] overflow-hidden rounded-[--radius-xl] border border-[--color-border] bg-[--color-background] shadow-[0_30px_60px_-30px_rgba(30,41,59,0.35)]">
        <div
          className={cn(
            'absolute inset-0 transition-opacity ease-out',
            state.isScreenDim ? 'opacity-30 duration-700' : 'opacity-100 duration-1000',
          )}
        >
          <div className="flex h-9 items-center gap-[7px] border-b border-[--color-border] bg-[--color-surface] px-3.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[--color-text-muted] opacity-50" />
            <span className="h-2.5 w-2.5 rounded-full bg-[--color-text-muted] opacity-50" />
            <span className="h-2.5 w-2.5 rounded-full bg-[--color-text-muted] opacity-50" />
            <span className="ml-2.5 font-mono text-[length:var(--font-desktop-caption-regular-size)] text-[--color-text-muted]">
              checkout-redesign.png
            </span>
          </div>
          <div className="absolute left-6 right-6 top-[58px] text-[length:var(--font-desktop-heading-3-semi-bold-size)] font-semibold tracking-tight text-[--color-text-primary]">
            Checkout
          </div>
          <div className="absolute left-6 right-6 top-[96px] text-[length:var(--font-desktop-label-regular-size)] text-[--color-text-muted]">
            Step 2 of 3 · Payment
          </div>
          <div className="absolute left-6 right-6 top-[140px] flex flex-col gap-2">
            <FieldLabel>Card number</FieldLabel>
            <FieldInput>4242 4242 4242 4242</FieldInput>
          </div>
          <div className="absolute left-6 right-6 top-[232px] grid grid-cols-2 gap-3.5">
            <div className="flex flex-col gap-2">
              <FieldLabel>Expiry</FieldLabel>
              <FieldInput>MM / YY</FieldInput>
            </div>
            <div className="flex flex-col gap-2">
              <FieldLabel>CVC</FieldLabel>
              <FieldInput>123</FieldInput>
            </div>
          </div>
          <div className="absolute left-6 right-6 top-[330px] h-px bg-[--color-border]" />
          <div className="absolute left-6 right-6 top-[350px] flex flex-col gap-3 text-[length:var(--font-desktop-body-regular-size)] text-[--color-text-secondary]">
            <SummaryRow label="Wireless headphones" amount="$42.00" />
            <SummaryRow label="Shipping" amount="$6.00" />
            <SummaryRow
              label="Total"
              amount="$48.00"
              className="pt-2 font-semibold text-[--color-text-primary]"
            />
          </div>
          <div className="absolute left-6 right-6 top-[490px] flex h-[52px] items-center justify-center rounded-[--radius-md] bg-[image:var(--gradient-primary)] text-[length:var(--font-desktop-body-semi-bold-size)] font-semibold text-white">
            Pay $48.00
          </div>
        </div>

        <div
          className={cn(
            'absolute left-1/2 top-1/2 flex w-[280px] -translate-x-1/2 -translate-y-1/2 flex-col gap-2.5 rounded-[--radius-lg] border border-[--color-border] bg-[--color-background] p-4 shadow-[0_12px_30px_-12px_rgba(30,41,59,0.25)] transition-opacity duration-300',
            state.isUploadVisible ? 'opacity-100' : 'opacity-0',
          )}
        >
          <span className="text-[length:var(--font-desktop-label-medium-size)] font-medium text-[--color-text-body]">
            Uploading screen…
          </span>
          <div className="h-1.5 overflow-hidden rounded-full bg-[--color-surface]">
            <div
              className={cn(
                'h-full rounded-full bg-[image:var(--gradient-primary)]',
                state.isUploadFilled ? 'w-full transition-[width] duration-1000 ease-out' : 'w-0',
              )}
            />
          </div>
          <span className="font-mono text-[length:var(--font-desktop-caption-regular-size)] text-[--color-text-muted]">
            checkout-redesign.png · 1 of 1
          </span>
        </div>
      </div>

      <div
        className={cn(
          'pointer-events-none absolute left-[16px] z-[4] h-[120px] w-[370px] border-b-2 border-[--color-primary] bg-[linear-gradient(180deg,rgba(79,70,229,0)_0%,rgba(79,70,229,0.1)_100%)] shadow-[0_6px_18px_-2px_rgba(79,70,229,0.45)]',
          state.scanPhase === 'idle' && 'top-[-30px] opacity-0',
          state.scanPhase === 'sweeping' &&
            'top-[594px] opacity-100 [transition:top_1600ms_cubic-bezier(0.65,0,0.35,1),opacity_150ms_ease-out]',
          state.scanPhase === 'done' && 'top-[594px] opacity-0 transition-opacity duration-200',
        )}
      />
      <span
        className={cn(
          'absolute left-[374px] top-[72px] z-[5] -translate-x-full -translate-y-1/2 whitespace-nowrap rounded-[--radius-md] bg-[--color-primary-light] px-2.5 py-1 font-mono text-[length:var(--font-desktop-caption-regular-size)] text-[--color-primary-dark] transition-opacity duration-200',
          state.scanPhase === 'sweeping' ? 'opacity-100' : 'opacity-0',
        )}
      >
        Analyzing screen…
      </span>

      {LOOP_FINDINGS.map((finding) => (
        <FindingOutline key={finding.id} finding={finding} state={state} />
      ))}
    </>
  );
}

function FindingOutline({ finding, state }: { finding: LoopFinding; state: LoopState }) {
  const { isShown, isDone } = state.findings[finding.id];

  return (
    <div
      className={cn(
        'pointer-events-none absolute z-[6] rounded-[--radius-lg] border-2 transition-[opacity,transform] ease-out',
        BOX_POSITION[finding.id],
        outlineColor(finding, isDone),
        isShown ? 'scale-100 opacity-100' : 'scale-[1.03] opacity-0',
        state.isFadingOut ? 'duration-700' : 'duration-[350ms]',
      )}
    >
      {finding.id === 'loading' && (
        <div className="absolute inset-1 flex items-center justify-center gap-2.5 rounded-[--radius-md] bg-[--color-ai-suggested-light] text-[length:var(--font-desktop-label-medium-size)] font-medium text-[--color-ai-suggested]">
          <span className="h-4 w-4 rounded-full border-2 border-[--color-ai-suggested] border-t-transparent motion-safe:animate-spin" />
          Processing…
        </div>
      )}
      <div className="absolute bottom-[calc(100%+6px)] right-[-2px] flex items-center gap-1.5 whitespace-nowrap">
        {'provenance' in finding.label ? (
          <ProvenanceBadge provenance={finding.label.provenance} />
        ) : (
          <SeverityBadge severity={finding.label.severity} />
        )}
        {isDone && <ReviewStatusBadge status={finding.doneStatus} />}
      </div>
    </div>
  );
}

function outlineColor(finding: LoopFinding, isDone: boolean): string {
  if ('severity' in finding.label) {
    return cn('border-dashed', isDone ? 'border-[--color-success]' : 'border-[--color-error]');
  }
  switch (finding.label.provenance) {
    case 'Detected':
      return 'border-solid border-[--color-detected]';
    case 'Inferred':
      return 'border-dashed border-[--color-inferred]';
    case 'Suggested':
      return 'border-dashed border-[--color-ai-suggested]';
  }
}

function FieldLabel({ children }: { children: string }) {
  return (
    <span className="text-[length:var(--font-desktop-label-medium-size)] font-medium text-[--color-text-secondary]">
      {children}
    </span>
  );
}

function FieldInput({ children }: { children: string }) {
  return (
    <div className="flex h-12 items-center rounded-[--radius-md] border border-[--color-border] bg-[--color-background] px-3.5 font-mono text-[length:var(--font-desktop-label-regular-size)] text-[--color-text-muted]">
      {children}
    </div>
  );
}

function SummaryRow({
  label,
  amount,
  className,
}: {
  label: string;
  amount: string;
  className?: string;
}) {
  return (
    <div className={cn('flex justify-between', className)}>
      <span>{label}</span>
      <span>{amount}</span>
    </div>
  );
}
