// ---------------------------------------------------------------------------
// The example handoff's four screens (Figma `04 — Handoff`, the Ledger
// checkout card). Drawn as SVG and rendered once to public/example/*.png by
// scripts/render-example-screens.ts. The component regions below are in
// the same pixel space, so pins land on the drawn elements.
// ---------------------------------------------------------------------------

export const EXAMPLE_SCREEN_SIZE = { width: 480, height: 600 } as const;

export type Region = { x: number; y: number; width: number; height: number };

/** Where each example component sits on the Checkout screen. */
export const CHECKOUT_REGIONS = {
  payButton: { x: 36, y: 486, width: 408, height: 56 },
  cardNumber: { x: 36, y: 150, width: 408, height: 52 },
  expiry: { x: 36, y: 254, width: 196, height: 52 },
  orderSummary: { x: 36, y: 344, width: 408, height: 112 },
} satisfies Record<string, Region>;

const FONT = 'Inter, Segoe UI, Arial, sans-serif';
const INK = '#0E1320';
const BODY = '#1F2633';
const MUTED = '#636B7E';
const LINE = '#E1E5EC';
const BUTTON = '#4F46E5';

const frame = (inner: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="600" viewBox="0 0 480 600">
  <rect width="480" height="600" rx="16" fill="#FFFFFF"/>
  <rect x="0.5" y="0.5" width="479" height="599" rx="16" fill="none" stroke="${LINE}"/>
  ${inner}
</svg>`;

const text = (x: number, y: number, value: string, { size = 16, weight = 400, color = BODY, anchor = 'start' } = {}) =>
  `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${color}" text-anchor="${anchor}">${value}</text>`;

const field = ({ x, y, width, height }: Region, placeholder: string) =>
  `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="8" fill="#FFFFFF" stroke="${LINE}"/>${text(x + 16, y + 32, placeholder, { color: '#8A93A6' })}`;

const button = ({ x, y, width, height }: Region, label: string) =>
  `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="8" fill="${BUTTON}"/>${text(x + width / 2, y + 35, label, { size: 17, weight: 600, color: '#FFFFFF', anchor: 'middle' })}`;

const row = (y: number, label: string, value: string, bold = false) =>
  text(36, y, label, { size: 16, weight: bold ? 600 : 400, color: bold ? INK : BODY }) +
  text(444, y, value, { size: 16, weight: bold ? 600 : 400, color: bold ? INK : BODY, anchor: 'end' });

export const EXAMPLE_SCREENS = [
  {
    file: 'cart.png',
    name: 'Cart',
    svg: frame(
      text(36, 72, 'Your cart', { size: 26, weight: 600, color: INK }) +
        text(36, 100, 'Step 1 of 3 · Cart', { size: 15, color: MUTED }) +
        `<rect x="36" y="140" width="56" height="56" rx="8" fill="#EEF0F4"/>` +
        text(108, 164, 'Wireless headphones', { size: 16, color: INK }) +
        text(108, 186, 'Qty 1', { size: 14, color: MUTED }) +
        text(444, 164, '$29.00', { anchor: 'end' }) +
        `<rect x="36" y="220" width="56" height="56" rx="8" fill="#EEF0F4"/>` +
        text(108, 244, 'Charging case', { size: 16, color: INK }) +
        text(108, 266, 'Qty 1', { size: 14, color: MUTED }) +
        text(444, 244, '$9.50', { anchor: 'end' }) +
        `<line x1="36" y1="316" x2="444" y2="316" stroke="${LINE}"/>` +
        row(356, 'Subtotal', '$38.50') +
        row(388, 'Shipping', '$4.95') +
        row(422, 'Total', '$43.45', true) +
        button({ x: 36, y: 486, width: 408, height: 56 }, 'Continue'),
    ),
  },
  {
    file: 'checkout.png',
    name: 'Checkout',
    svg: frame(
      text(36, 72, 'Checkout', { size: 26, weight: 600, color: INK }) +
        text(36, 100, 'Step 2 of 3 · Payment', { size: 15, color: MUTED }) +
        text(36, 140, 'Card number', { size: 15, weight: 500, color: INK }) +
        field(CHECKOUT_REGIONS.cardNumber, 'Enter card number') +
        text(36, 244, 'Expiry', { size: 15, weight: 500, color: INK }) +
        field(CHECKOUT_REGIONS.expiry, 'MM / YY') +
        text(248, 244, 'CVC', { size: 15, weight: 500, color: INK }) +
        field({ x: 248, y: 254, width: 196, height: 52 }, '123') +
        `<line x1="36" y1="332" x2="444" y2="332" stroke="${LINE}"/>` +
        row(372, 'Subtotal', '$38.50') +
        row(404, 'Shipping', '$4.95') +
        row(438, 'Total', '$43.45', true) +
        button(CHECKOUT_REGIONS.payButton, 'Pay $43.45'),
    ),
  },
  {
    file: 'processing.png',
    name: 'Processing',
    svg: frame(
      `<circle cx="240" cy="230" r="34" fill="none" stroke="#E1E5EC" stroke-width="6"/>` +
        `<path d="M240 196 A34 34 0 0 1 274 230" fill="none" stroke="${BUTTON}" stroke-width="6" stroke-linecap="round"/>` +
        text(240, 318, 'Processing your payment', { size: 22, weight: 600, color: INK, anchor: 'middle' }) +
        text(240, 348, 'This takes a few seconds. Don’t close this page.', { size: 15, color: MUTED, anchor: 'middle' }),
    ),
  },
  {
    file: 'confirmation.png',
    name: 'Confirmation',
    svg: frame(
      `<circle cx="240" cy="200" r="34" fill="#EEF0F4"/>` +
        `<path d="M224 200 l11 11 l22 -24" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>` +
        text(240, 288, 'Order placed', { size: 26, weight: 600, color: INK, anchor: 'middle' }) +
        text(240, 318, 'Step 3 of 3 · Done', { size: 15, color: MUTED, anchor: 'middle' }) +
        row(392, 'Order', '#48213') +
        row(424, 'Arrives', 'Thursday') +
        button({ x: 36, y: 486, width: 408, height: 56 }, 'Track order'),
    ),
  },
] as const;
