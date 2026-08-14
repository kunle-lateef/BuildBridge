/**
 * Converts the Figma-exported design token files (color, typography, spacing/border)
 * into a single CSS custom-properties file: tokens.css
 *
 * Usage: node generate-tokens.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const COLOR_FILE = path.join(ROOT, 'color-tokens.tokens.json');
const TYPOGRAPHY_FILE = path.join(ROOT, 'typography-tokens.tokens.json');
const SPACING_FILE = path.join(ROOT, 'spacing-border-radius.json');
const OUTPUT_FILE = path.join(ROOT, 'tokens.css');

function readJSON(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

// Turns any string into a safe, lowercase, dash-separated CSS ident fragment.
function kebab(str) {
  return String(str)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function px(n) {
  return `${n}px`;
}

// ---------------------------------------------------------------------------
// Colors — the file only contains semantic roles (primary, background, text
// primary, success, warning, error, severity, info, ai-suggested, ...).
// Every role becomes its own --color-* variable. When a role's name already
// repeats its group name (e.g. group "primary" -> role "primary", or group
// "background, surface, border" -> role "background"), the group prefix is
// dropped so the variable name stays just the role (--color-primary,
// --color-background) instead of being redundant (--color-primary-primary).
// ---------------------------------------------------------------------------
function buildColorVars(data) {
  const lines = [];
  const colorGroups = data.color || {};

  for (const [group, roles] of Object.entries(colorGroups)) {
    const groupKebab = kebab(group);
    const groupParts = group.toLowerCase().split(/[, ]+/).filter(Boolean);

    for (const [role, token] of Object.entries(roles)) {
      if (!token || token.type !== 'color') continue;

      const roleKebab = kebab(role);
      const redundant = roleKebab === groupKebab || groupParts.includes(roleKebab);
      const name = redundant ? `color-${roleKebab}` : `color-${groupKebab}-${roleKebab}`;

      lines.push(`  --${name}: ${token.value};`);
    }
  }

  return lines;
}

// ---------------------------------------------------------------------------
// Gradients — composed of position/color stops, turned into linear-gradient().
// ---------------------------------------------------------------------------
function buildGradientVars(data) {
  const lines = [];
  const gradientGroups = data.gradient || {};

  for (const [group, roles] of Object.entries(gradientGroups)) {
    const groupKebab = kebab(group);

    for (const token of Object.values(roles)) {
      if (!token || token.type !== 'custom-gradient') continue;

      const { rotation, stops } = token.value;
      const stopStr = [...stops]
        .sort((a, b) => a.position - b.position)
        .map((s) => `${s.color} ${Math.round(s.position * 100)}%`)
        .join(', ');

      lines.push(`  --gradient-${groupKebab}: linear-gradient(${rotation}deg, ${stopStr});`);
    }
  }

  return lines;
}

// ---------------------------------------------------------------------------
// Typography — data.font.<breakpoint>.<style>.<weight> = custom-fontStyle.
// fontFamily / fontStyle / fontStretch / textDecoration / paragraph* are
// constant across every token in this file, so they're captured once
// (font-family) or skipped (the rest add no information as CSS variables).
// ---------------------------------------------------------------------------
function buildTypographyVars(data) {
  const propertyLines = [];
  const families = new Set();
  const font = data.font || {};

  for (const [breakpoint, styles] of Object.entries(font)) {
    for (const [styleName, weights] of Object.entries(styles)) {
      for (const [weightName, token] of Object.entries(weights)) {
        if (!token || token.type !== 'custom-fontStyle') continue;

        const v = token.value;
        families.add(v.fontFamily);

        const base = `font-${kebab(breakpoint)}-${kebab(styleName)}-${kebab(weightName)}`;
        propertyLines.push(`  --${base}-size: ${px(v.fontSize)};`);
        propertyLines.push(`  --${base}-weight: ${v.fontWeight};`);
        propertyLines.push(`  --${base}-line-height: ${px(v.lineHeight)};`);
        propertyLines.push(`  --${base}-letter-spacing: ${px(v.letterSpacing)};`);

        if (v.textCase && v.textCase !== 'none') {
          propertyLines.push(`  --${base}-text-transform: ${v.textCase};`);
        }
      }
    }
  }

  const familyLines = [...families].map((f) => `  --font-family-base: '${f}', sans-serif;`);

  return { familyLines, propertyLines };
}

// ---------------------------------------------------------------------------
// Spacing / border-radius / border-width — already flat key -> value maps.
// ---------------------------------------------------------------------------
function buildSpacingVars(data) {
  return Object.entries(data.spacing || {}).map(([key, value]) => `  --${kebab(key)}: ${value};`);
}

function buildRadiusVars(data) {
  return Object.entries(data.borderRadius || {}).map(([key, value]) => `  --${kebab(key)}: ${value};`);
}

function buildBorderWidthVars(data) {
  // Source keys look like "border-0", "border-0.5" — rename to "border-width-*"
  // so they can't be confused with color roles (--color-border) or radius tokens.
  return Object.entries(data.borderWidth || {}).map(([key, value]) => {
    const renamed = key.replace(/^border-/, 'border-width-');
    return `  --${kebab(renamed)}: ${value};`;
  });
}

// ---------------------------------------------------------------------------
// Assemble
// ---------------------------------------------------------------------------
function section(title, lines) {
  if (!lines.length) return '';
  return `  /* ---------- ${title} ---------- */\n${lines.join('\n')}\n\n`;
}

function main() {
  const colorData = readJSON(COLOR_FILE);
  const typographyData = readJSON(TYPOGRAPHY_FILE);
  const spacingData = readJSON(SPACING_FILE);

  const colorLines = buildColorVars(colorData);
  const gradientLines = buildGradientVars(colorData);
  const { familyLines, propertyLines } = buildTypographyVars(typographyData);
  const spacingLines = buildSpacingVars(spacingData);
  const radiusLines = buildRadiusVars(spacingData);
  const borderWidthLines = buildBorderWidthVars(spacingData);

  let css = '/**\n';
  css += ' * Design tokens as CSS custom properties.\n';
  css += ' * Auto-generated by generate-tokens.js — do not edit by hand.\n';
  css += ' * Regenerate with: node generate-tokens.js\n';
  css += ' */\n\n:root {\n';
  css += section('Colors (roles)', colorLines);
  css += section('Gradients', gradientLines);
  css += section('Typography — font family', familyLines);
  css += section('Typography — font styles', propertyLines);
  css += section('Spacing', spacingLines);
  css += section('Border radius', radiusLines);
  css += section('Border width', borderWidthLines);
  css = css.replace(/\n+$/, '\n');
  css += '}\n';

  fs.writeFileSync(OUTPUT_FILE, css, 'utf8');

  const total =
    colorLines.length +
    gradientLines.length +
    familyLines.length +
    propertyLines.length +
    spacingLines.length +
    radiusLines.length +
    borderWidthLines.length;

  console.log(`Wrote ${OUTPUT_FILE}`);
  console.log(`  colors:        ${colorLines.length}`);
  console.log(`  gradients:     ${gradientLines.length}`);
  console.log(`  font family:   ${familyLines.length}`);
  console.log(`  font styles:   ${propertyLines.length}`);
  console.log(`  spacing:       ${spacingLines.length}`);
  console.log(`  border radius: ${radiusLines.length}`);
  console.log(`  border width:  ${borderWidthLines.length}`);
  console.log(`  total variables: ${total}`);
}

main();
