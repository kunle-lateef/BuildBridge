import type { LoopRowId, LoopState } from '@/components/marketing/heroLoopTimeline';
import { cn } from '@/lib/cn';
import type { ProvenanceType } from '@/lib/types';

type HeroLoopScreenProps = {
  state: LoopState;
};

/** Pin outline by provenance: Detected solid, Inferred dashed, Suggested dotted. */
export const PIN_STYLE: Record<ProvenanceType, string> = {
  Detected: 'border-solid border-[--color-detected] text-[--color-detected]',
  Inferred: 'border-dashed border-[--color-inferred] text-[--color-inferred]',
  Suggested: 'border-dotted border-[--color-ai-suggested] text-[--color-ai-suggested]',
};

export const PIN_BASE =
  'grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 bg-white text-[12px] font-medium leading-4 tabular-nums';

const SCREEN_PINS: { row: LoopRowId; label: string; provenance: ProvenanceType; position: string }[] = [
  { row: 'r1', label: '1', provenance: 'Detected', position: 'left-[322px] top-[339px]' },
  { row: 'r2', label: '2', provenance: 'Inferred', position: 'left-[320px] top-[108px]' },
  { row: 'r3', label: '3', provenance: 'Suggested', position: 'left-[12px] top-[393px]' },
  { row: 'r4', label: '4', provenance: 'Inferred', position: 'left-[12px] top-[190px]' },
];

const PIN_KEY: { label: string; className: string }[] = [
  { label: 'Detected', className: 'border-solid border-[--color-detected]' },
  { label: 'Inferred', className: 'border-dashed border-[--color-inferred]' },
  { label: 'Suggested', className: 'border-dotted border-[--color-ai-suggested]' },
  { label: 'Gap', className: 'border-solid border-[--color-error]' },
];

const MOTION = 'duration-[240ms] ease-[cubic-bezier(0.65,0,0.35,1)]';

// The selected finding's outline on the screen, as on the Review page.
const selected = (isOn: boolean) =>
  cn(
    'outline outline-[1.5px] outline-offset-4 transition-[outline-color]',
    MOTION,
    isOn ? 'outline-[--color-primary]' : 'outline-transparent',
  );

/**
 * The canvas column of the Review page: the screen switcher with the pin
 * key, and the customer's own checkout screen. The screen itself never
 * moves; only what BuildBridge adds on top of it (scan line, pins, the
 * selection outline) does. The Pay button keeps the customer's own colour,
 * not BuildBridge's.
 */
export function HeroLoopScreen({ state }: HeroLoopScreenProps) {
  return (
    <div className="grid min-h-0 grid-rows-[53px_1fr]">
      <div className="flex items-center gap-3 border-b border-[--color-border] bg-white px-4">
        <span className="grid h-6 w-6 place-items-center rounded-[6px] border border-[--color-border] text-[12px] text-[--color-text-secondary]">
          ‹
        </span>
        <span className="font-medium text-[--color-text-primary]">Checkout</span>
        <span className="text-[12px] text-[--color-text-muted]">1 of 4</span>
        <span className="grid h-6 w-6 place-items-center rounded-[6px] border border-[--color-border] text-[12px] text-[--color-text-secondary]">
          ›
        </span>
        <span className="flex-1" />
        {PIN_KEY.map((key) => (
          <span key={key.label} className="flex items-center gap-2 text-[12px] text-[--color-text-secondary]">
            <span className={cn('h-2 w-2 rounded-full border-[1.5px]', key.className)} />
            {key.label}
          </span>
        ))}
      </div>

      <div className="relative grid place-items-center overflow-hidden bg-[--color-surface]">
        <div className="relative grid w-[360px] gap-4 rounded-[12px] border border-[--color-border] bg-white p-7">
          <span
            className={cn(
              'absolute -inset-x-px z-[3] h-0.5 bg-[--color-primary] shadow-[0_0_12px_rgba(43,72,200,0.45)]',
              state.scanPhase === 'idle' && 'top-0 opacity-0',
              state.scanPhase === 'sweeping' &&
                'top-full opacity-100 [transition:top_1300ms_cubic-bezier(0.65,0,0.35,1),opacity_150ms_ease-out]',
              state.scanPhase === 'done' && 'top-full opacity-0 transition-opacity duration-150',
            )}
          />

          <div>
            <h3 className="m-0 text-[18px] font-semibold leading-6 text-[--color-text-primary]">Checkout</h3>
            <div className="mt-0.5 text-[12px] leading-4 text-[--color-text-secondary]">Step 2 of 3 · Payment</div>
          </div>
          <Field label="Card number" placeholder="Enter card number" isSelected={state.screenSelection === 'cardField'} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Expiry" placeholder="MM / YY" />
            <Field label="CVC" placeholder="123" />
          </div>
          <div className="grid gap-2 border-t border-[--color-border] pt-3 text-[--color-text-secondary] tabular-nums">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>$38.50</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping</span>
              <span>$4.95</span>
            </div>
            <div className="flex justify-between font-medium text-[--color-text-primary]">
              <span>Total</span>
              <span>$43.45</span>
            </div>
          </div>
          {/* The customer's own brand colour, deliberately not a BuildBridge token. */}
          <div
            className={cn(
              'grid h-11 place-items-center rounded-[8px] bg-[#4F46E5] font-semibold text-white',
              selected(state.screenSelection === 'payButton'),
            )}
          >
            Pay $43.45
          </div>

          {SCREEN_PINS.map((pin) => (
            <span
              key={pin.row}
              className={cn(
                PIN_BASE,
                PIN_STYLE[pin.provenance],
                'absolute z-[2] transition-[opacity,transform]',
                MOTION,
                pin.position,
                state.rowsShown[pin.row] ? 'scale-100 opacity-100' : 'scale-[0.6] opacity-0',
              )}
            >
              {pin.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Field({ label, placeholder, isSelected = false }: { label: string; placeholder: string; isSelected?: boolean }) {
  return (
    <div className="grid gap-2 text-[13px] font-medium leading-[18px] text-[--color-text-body]">
      {label}
      <span
        className={cn(
          'flex h-[42px] items-center rounded-[8px] border border-[--color-border] px-3 text-[14px] font-normal text-[--color-text-dismissed]',
          selected(isSelected),
        )}
      >
        {placeholder}
      </span>
    </div>
  );
}
