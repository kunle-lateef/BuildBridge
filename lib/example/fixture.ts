import type {
  ComponentStateName,
  IssueSeverity,
  ProvenanceType,
  ReadinessCategory,
  SpecificationCategory,
  ViewportCategory,
} from '@prisma/client';

import { CHECKOUT_REGIONS, type Region } from '@/lib/example/screens';

// ---------------------------------------------------------------------------
// The example handoff: "Ledger · Checkout v3" (Figma `03 — Dashboard` first
// run, `04 — Handoff` Example handoff, `05 — Share view` Example handoff).
//
// One description, two uses: the public /example page builds a developer
// projection from it with no database (lib/example/projection.ts), and
// "Open the example" copies it into the user's account as an isExample
// handoff (lib/example/create.ts). Made-up data, but shaped exactly like
// real analysis output: lib/example/fixture.test.ts runs every finding
// through the pipeline's own Zod schemas, and the 78% comes out of
// calculateReadiness, never typed in.
// ---------------------------------------------------------------------------

export type ExampleScreenKey = 'cart' | 'checkout' | 'processing' | 'confirmation';
export type ExampleComponentKey = 'payButton' | 'cardNumber' | 'expiry' | 'orderSummary';

type Finding = { provenance: ProvenanceType; confidence: number; confirmed?: boolean };

export type ExampleSpec = Finding & { category: SpecificationCategory; property: string; value: string; unit?: string; numericValue?: number };
export type ExampleState = Finding & { name: ComponentStateName; description: string };

export type ExampleComponent = Finding & {
  key: ExampleComponentKey;
  name: string;
  type: string;
  description: string;
  screen: ExampleScreenKey;
  region: Region;
  specifications: ExampleSpec[];
  states: ExampleState[];
};

export type ExampleRule = Finding & { viewportCategory: ViewportCategory; behavior: string; component: ExampleComponentKey | null };

export type ExampleGap = {
  key: string;
  title: string;
  description: string;
  severity: IssueSeverity;
  category: ReadinessCategory;
  recommendation?: string;
  provenance: ProvenanceType;
  confidence: number;
  screen: ExampleScreenKey | null;
  component: ExampleComponentKey | null;
};

export type ExampleData = {
  name: string;
  description: string;
  screens: { key: ExampleScreenKey; name: string; file: string }[];
  flows: { from: ExampleScreenKey; to: ExampleScreenKey; label: string }[];
  components: ExampleComponent[];
  responsiveRules: ExampleRule[];
  gaps: ExampleGap[];
  notes: { component: ExampleComponentKey | null; content: string }[];
};

export const EXAMPLE: ExampleData = {
  name: 'Ledger · Checkout v3',
  description: 'Payment step of the Ledger checkout: card entry, order summary and the Pay button.',
  screens: [
    { key: 'cart', name: 'Cart', file: 'cart.png' },
    { key: 'checkout', name: 'Checkout', file: 'checkout.png' },
    { key: 'processing', name: 'Processing', file: 'processing.png' },
    { key: 'confirmation', name: 'Confirmation', file: 'confirmation.png' },
  ] satisfies { key: ExampleScreenKey; name: string; file: string }[],
  flows: [
    { from: 'cart', to: 'checkout', label: 'Continue' },
    { from: 'checkout', to: 'processing', label: 'Pay' },
    { from: 'processing', to: 'confirmation', label: 'Success' },
  ] satisfies { from: ExampleScreenKey; to: ExampleScreenKey; label: string }[],
  components: [
    {
      key: 'payButton',
      name: 'Pay button',
      type: 'Button',
      description: 'Primary action that pays the order total.',
      screen: 'checkout',
      region: CHECKOUT_REGIONS.payButton,
      provenance: 'Detected',
      confidence: 0.95,
      confirmed: true,
      specifications: [
        { category: 'Radius', property: 'Corner radius', value: '8', unit: 'px', numericValue: 8, provenance: 'Detected', confidence: 0.95, confirmed: true },
        { category: 'Color', property: 'Fill', value: '#4F46E5', provenance: 'Detected', confidence: 0.95 },
        { category: 'Dimensions', property: 'Height', value: '56', unit: 'px', numericValue: 56, provenance: 'Detected', confidence: 0.9 },
        { category: 'Color', property: 'Hover', value: 'darkens 8%', provenance: 'Inferred', confidence: 0.6 },
      ],
      states: [
        { name: 'Default', description: 'As shown', provenance: 'Detected', confidence: 0.95, confirmed: true },
        { name: 'Loading', description: 'Spinner only, button keeps its size', provenance: 'Suggested', confidence: 0.4 },
        { name: 'Focus', description: '3px primary ring, offset 2', provenance: 'Inferred', confidence: 0.55 },
      ],
    },
    {
      key: 'cardNumber',
      name: 'Card number field',
      type: 'Input',
      description: 'Text field for the card number.',
      screen: 'checkout',
      region: CHECKOUT_REGIONS.cardNumber,
      provenance: 'Detected',
      confidence: 0.93,
      specifications: [
        { category: 'Dimensions', property: 'Height', value: '52', unit: 'px', numericValue: 52, provenance: 'Detected', confidence: 0.92, confirmed: true },
        { category: 'Radius', property: 'Corner radius', value: '8', unit: 'px', numericValue: 8, provenance: 'Detected', confidence: 0.92, confirmed: true },
        { category: 'Border', property: 'Border', value: '1px #E1E5EC', provenance: 'Detected', confidence: 0.9, confirmed: true },
        { category: 'Typography', property: 'Placeholder', value: '16px #8A93A6', provenance: 'Detected', confidence: 0.85 },
        { category: 'Spacing', property: 'Padding', value: '16', unit: 'px', numericValue: 16, provenance: 'Inferred', confidence: 0.6 },
      ],
      states: [
        { name: 'Default', description: 'As shown', provenance: 'Detected', confidence: 0.92, confirmed: true },
        { name: 'Focus', description: '2px primary ring, offset 2', provenance: 'Inferred', confidence: 0.55 },
        { name: 'Error', description: 'Inline message below the field', provenance: 'Suggested', confidence: 0.4 },
      ],
    },
    {
      key: 'expiry',
      name: 'Expiry field',
      type: 'Input',
      description: 'Text field for the card expiry date.',
      screen: 'checkout',
      region: CHECKOUT_REGIONS.expiry,
      provenance: 'Detected',
      confidence: 0.9,
      specifications: [
        { category: 'Dimensions', property: 'Width', value: '196', unit: 'px', numericValue: 196, provenance: 'Detected', confidence: 0.9, confirmed: true },
        { category: 'Dimensions', property: 'Height', value: '52', unit: 'px', numericValue: 52, provenance: 'Detected', confidence: 0.9, confirmed: true },
        { category: 'Radius', property: 'Corner radius', value: '8', unit: 'px', numericValue: 8, provenance: 'Detected', confidence: 0.9 },
        { category: 'Spacing', property: 'Gap to CVC', value: '16', unit: 'px', numericValue: 16, provenance: 'Inferred', confidence: 0.6 },
      ],
      states: [
        { name: 'Default', description: 'As shown', provenance: 'Detected', confidence: 0.9, confirmed: true },
        { name: 'Focus', description: '2px primary ring, offset 2', provenance: 'Inferred', confidence: 0.55 },
        { name: 'Error', description: 'Inline, below field', provenance: 'Inferred', confidence: 0.5 },
      ],
    },
    {
      key: 'orderSummary',
      name: 'Order summary',
      type: 'Section',
      description: 'Subtotal, shipping and total above the Pay button.',
      screen: 'checkout',
      region: CHECKOUT_REGIONS.orderSummary,
      provenance: 'Detected',
      confidence: 0.88,
      specifications: [
        { category: 'Spacing', property: 'Row gap', value: '32', unit: 'px', numericValue: 32, provenance: 'Detected', confidence: 0.85, confirmed: true },
        { category: 'Typography', property: 'Total weight', value: '600', provenance: 'Detected', confidence: 0.85, confirmed: true },
        { category: 'Border', property: 'Divider', value: '1px #E1E5EC', provenance: 'Detected', confidence: 0.85 },
      ],
      states: [{ name: 'Default', description: 'As shown', provenance: 'Detected', confidence: 0.88 }],
    },
  ] satisfies ExampleComponent[],
  responsiveRules: [
    { viewportCategory: 'Mobile', behavior: 'Order summary moves below the form', component: 'orderSummary', provenance: 'Detected', confidence: 0.8 },
    { viewportCategory: 'Mobile', behavior: 'Form fields go full width', component: null, provenance: 'Detected', confidence: 0.8 },
    { viewportCategory: 'Mobile', behavior: 'Pay button sticks to the bottom of the screen', component: 'payButton', provenance: 'Suggested', confidence: 0.4 },
    { viewportCategory: 'Mobile', behavior: 'Step indicator shortens to “Step 2 of 3”', component: null, provenance: 'Inferred', confidence: 0.55 },
    { viewportCategory: 'Desktop', behavior: 'Order summary sits beside the form', component: 'orderSummary', provenance: 'Detected', confidence: 0.8 },
    { viewportCategory: 'Desktop', behavior: 'Content stops growing at 1120px', component: null, provenance: 'Inferred', confidence: 0.55 },
  ] satisfies ExampleRule[],
  // 1 critical, 4 high, 1 medium, one per category: (60 + 80 + 80 + 80 + 80 + 90) ÷ 6 = 78%.
  gaps: [
    {
      key: 'declined',
      title: 'No declined-card state',
      description: 'The design shows success only. Not decided yet: ask the designer before building the error path.',
      severity: 'Critical',
      category: 'EdgeCases',
      recommendation: 'Design the declined-card message and where it appears.',
      provenance: 'Inferred',
      confidence: 0.8,
      screen: 'checkout',
      component: 'payButton',
    },
    {
      key: 'tablet',
      title: 'Tablet breakpoint undefined',
      description: 'Summary sits beside the form on desktop and below it on mobile. 768px is never shown.',
      severity: 'High',
      category: 'ResponsiveBehavior',
      recommendation: 'Stack the summary below the form until 1024px.',
      provenance: 'Suggested',
      confidence: 0.6,
      screen: 'checkout',
      component: 'orderSummary',
    },
    {
      key: 'focusOrder',
      title: 'Missing focus order on the payment form',
      description: 'The screens don’t show which field takes focus first or where Tab goes after CVC.',
      severity: 'High',
      category: 'Accessibility',
      recommendation: 'Card number → Expiry → CVC → Pay.',
      provenance: 'Inferred',
      confidence: 0.65,
      screen: 'checkout',
      component: null,
    },
    {
      key: 'disabledPay',
      title: 'Pay button disabled state not shown',
      description: 'It isn’t shown whether Pay is disabled until the card details are complete.',
      severity: 'High',
      category: 'InteractionStates',
      provenance: 'Inferred',
      confidence: 0.6,
      screen: 'checkout',
      component: 'payButton',
    },
    {
      key: 'errorColour',
      title: 'No error colour for invalid fields',
      description: 'Field errors are implied, but no error colour or icon appears on any screen.',
      severity: 'High',
      category: 'VisualSpecifications',
      provenance: 'Inferred',
      confidence: 0.6,
      screen: 'checkout',
      component: 'cardNumber',
    },
    {
      key: 'promo',
      title: 'Promo code entry not shown',
      description: 'The cart has no promo code field, so the totals assume none.',
      severity: 'Medium',
      category: 'Components',
      provenance: 'Suggested',
      confidence: 0.45,
      screen: 'cart',
      component: null,
    },
  ] satisfies ExampleGap[],
  notes: [
    { component: 'payButton', content: 'The label always shows the full total, tax included. Never shorten it to “Pay”.' },
    { component: null, content: 'Payment errors use the shared inline error banner from the design system, not a toast.' },
    { component: 'cardNumber', content: 'Format the number in groups of four as the user types. Don’t block pasting.' },
  ] satisfies { component: ExampleComponentKey | null; content: string }[],
};
