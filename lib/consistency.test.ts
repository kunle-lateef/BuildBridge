import { describe, expect, it } from 'vitest';

import { detectConsistencyOutliers, detectConsistencyOutliersWithSource, type ConsistencySpecInput } from './consistency';

function spec(overrides: Partial<ConsistencySpecInput> = {}): ConsistencySpecInput {
  return {
    componentName: 'Primary Button',
    category: 'Radius',
    property: 'corner-radius',
    value: '8',
    unit: 'px',
    ...overrides,
  };
}

describe('detectConsistencyOutliers', () => {
  it('flags a numeric value that diverges beyond tolerance from the established majority', () => {
    const specs = [
      spec({ componentName: 'Button A', value: '8' }),
      spec({ componentName: 'Button B', value: '8' }),
      spec({ componentName: 'Button C', value: '16' }),
    ];

    const findings = detectConsistencyOutliers(specs);

    expect(findings).toHaveLength(1);
    expect(findings[0]?.title).toBe("Button C's corner-radius is inconsistent with other components");
    expect(findings[0]?.description).toContain('16px');
    expect(findings[0]?.description).toContain('8px');
    expect(findings[0]?.category).toBe('VisualSpecifications');
    expect(findings[0]?.provenance).toBe('Detected');
    expect(findings[0]?.confidence).toBe(1.0);
  });

  it('does not flag a numeric value within tolerance of the majority', () => {
    const specs = [
      spec({ componentName: 'Button A', value: '8' }),
      spec({ componentName: 'Button B', value: '8' }),
      spec({ componentName: 'Button C', value: '9' }),
    ];

    expect(detectConsistencyOutliers(specs)).toHaveLength(0);
  });

  it('does not flag anything when every value in the group is identical', () => {
    const specs = [
      spec({ componentName: 'Button A', value: '8' }),
      spec({ componentName: 'Button B', value: '8' }),
      spec({ componentName: 'Button C', value: '8' }),
    ];

    expect(detectConsistencyOutliers(specs)).toHaveLength(0);
  });

  it('never flags a group smaller than the minimum comparable size, even with clearly different values', () => {
    const specs = [spec({ componentName: 'Button A', value: '8' }), spec({ componentName: 'Button B', value: '16' })];

    expect(detectConsistencyOutliers(specs)).toHaveLength(0);
  });

  it('does not flag anything when there is no clear majority (every value is a singleton)', () => {
    const specs = [
      spec({ componentName: 'Button A', value: '8' }),
      spec({ componentName: 'Button B', value: '16' }),
      spec({ componentName: 'Button C', value: '24' }),
    ];

    expect(detectConsistencyOutliers(specs)).toHaveLength(0);
  });

  it('flags a non-numeric (e.g. color) value that differs from the exact-match majority', () => {
    const specs = [
      spec({ componentName: 'Button A', category: 'Color', property: 'background-color', value: '#007AFF', unit: null }),
      spec({ componentName: 'Button B', category: 'Color', property: 'background-color', value: '#007AFF', unit: null }),
      spec({ componentName: 'Button C', category: 'Color', property: 'background-color', value: '#0080FF', unit: null }),
    ];

    const findings = detectConsistencyOutliers(specs);

    expect(findings).toHaveLength(1);
    expect(findings[0]?.title).toBe("Button C's background-color is inconsistent with other components");
    expect(findings[0]?.description).toContain('#0080FF');
    expect(findings[0]?.description).toContain('#007AFF');
  });

  it('never groups the same property name across different categories', () => {
    const specs = [
      spec({ componentName: 'Button A', category: 'Radius', property: 'size', value: '8' }),
      spec({ componentName: 'Button B', category: 'Radius', property: 'size', value: '8' }),
      spec({ componentName: 'Button C', category: 'Dimensions', property: 'size', value: '999' }),
    ];

    expect(detectConsistencyOutliers(specs)).toHaveLength(0);
  });

  it('never groups different property names within the same category', () => {
    const specs = [
      spec({ componentName: 'Button A', property: 'corner-radius', value: '8' }),
      spec({ componentName: 'Button B', property: 'corner-radius', value: '8' }),
      spec({ componentName: 'Button C', property: 'border-width', value: '999' }),
    ];

    expect(detectConsistencyOutliers(specs)).toHaveLength(0);
  });

  it('gives each outlier in the same group its own uniquely-titled finding, keyed by component name', () => {
    const specs = [
      spec({ componentName: 'Button A', value: '8' }),
      spec({ componentName: 'Button B', value: '8' }),
      spec({ componentName: 'Button C', value: '16' }),
      spec({ componentName: 'Button D', value: '32' }),
    ];

    const findings = detectConsistencyOutliers(specs);

    expect(findings).toHaveLength(2);
    const titles = findings.map((finding) => finding.title);
    expect(new Set(titles).size).toBe(2);
  });
});

describe('detectConsistencyOutliersWithSource', () => {
  it('produces the exact same findings as detectConsistencyOutliers, just paired with their source entry', () => {
    const specs = [
      spec({ componentName: 'Button A', value: '8' }),
      spec({ componentName: 'Button B', value: '8' }),
      spec({ componentName: 'Button C', value: '16' }),
    ];

    const plain = detectConsistencyOutliers(specs);
    const withSource = detectConsistencyOutliersWithSource(specs);

    expect(withSource.map((outlier) => outlier.finding)).toEqual(plain);
  });

  it('attributes each outlier back to the exact source entry that produced it', () => {
    const outlierSpec = spec({ componentName: 'Button C', value: '16' });
    const specs = [spec({ componentName: 'Button A', value: '8' }), spec({ componentName: 'Button B', value: '8' }), outlierSpec];

    const [outlier] = detectConsistencyOutliersWithSource(specs);

    expect(outlier?.source).toEqual(outlierSpec);
  });
});
