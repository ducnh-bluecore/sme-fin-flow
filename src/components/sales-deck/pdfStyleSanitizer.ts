import React from "react";

type Style = Record<string, unknown>;

const BORDER_COLOR_KEYS = [
  "borderColor",
  "borderTopColor",
  "borderRightColor",
  "borderBottomColor",
  "borderLeftColor",
] as const;

const BORDER_WIDTH_KEYS = [
  "borderWidth",
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
] as const;

const BORDER_SHORTHAND_KEYS = [
  "border",
  "borderTop",
  "borderRight",
  "borderBottom",
  "borderLeft",
] as const;

const BORDER_SHORTHAND_REGEX = /(-?\d+(?:\.\d+)?(?:in|mm|cm|pt|vw|vh|px|rem)?)\s(\S+)\s(.+)/;

function ensureBorderWidths(style: Style): Style {
  // React-PDF v4.3.x bug: numeric border shorthands (e.g. `border: 0`) can crash
  // inside resolveBorderShorthand. Strip invalid shorthand values.
  {
    let mutated = false;
    let next: Style = style;

    for (const key of BORDER_SHORTHAND_KEYS) {
      const v = next[key];
      if (v == null) continue;

      const isValidString = typeof v === "string" && BORDER_SHORTHAND_REGEX.test(v.trim());
      const isInvalid = typeof v === "number" || typeof v === "boolean" || (typeof v === "string" && !isValidString);

      if (isInvalid) {
        if (!mutated) {
          next = { ...next };
          mutated = true;
        }
        delete next[key];
      }
    }

    style = next;
  }

  // React-PDF can crash if any border width key exists but is undefined.
  // Normalize all border width keys to numbers.
  let next: Style = style;
  let mutated = false;
  for (const key of BORDER_WIDTH_KEYS) {
    if (next[key] === undefined || next[key] === null) {
      if (!mutated) {
        next = { ...next };
        mutated = true;
      }
      // Default to 0 unless a border color is present (handled below)
      next[key] = 0;
    }
  }

  const hasAnyBorderColor = BORDER_COLOR_KEYS.some((k) => style[k] != null);
  if (!hasAnyBorderColor) return next;

  // If any border color is set but *no* width is specified, default to 1.
  const hasAnyBorderWidth = BORDER_WIDTH_KEYS.some((k) => next[k] != null);
  if (!hasAnyBorderWidth) {
    return { ...next, borderWidth: 1 };
  }

  // If a side color is set but its width is missing, default that side width to 1.
  const withColorFix: Style = mutated ? next : { ...next };
  if (withColorFix.borderTopColor != null && Number(withColorFix.borderTopWidth ?? 0) === 0) withColorFix.borderTopWidth = 1;
  if (withColorFix.borderRightColor != null && Number(withColorFix.borderRightWidth ?? 0) === 0) withColorFix.borderRightWidth = 1;
  if (withColorFix.borderBottomColor != null && Number(withColorFix.borderBottomWidth ?? 0) === 0) withColorFix.borderBottomWidth = 1;
  if (withColorFix.borderLeftColor != null && Number(withColorFix.borderLeftWidth ?? 0) === 0) withColorFix.borderLeftWidth = 1;
  if (withColorFix.borderColor != null && Number(withColorFix.borderWidth ?? 0) === 0) withColorFix.borderWidth = 1;

  return withColorFix;
}

function sanitizeStyleProp(styleProp: unknown): unknown {
  if (!styleProp) return styleProp;

  if (Array.isArray(styleProp)) {
    return styleProp
      .filter(Boolean)
      .map((s) => sanitizeStyleProp(s))
      .filter(Boolean);
  }

  if (typeof styleProp === "object") {
    return ensureBorderWidths(styleProp as Style);
  }

  return styleProp;
}

/**
 * Sanitizes a React-PDF element tree to avoid runtime crashes when border colors
 * are present but border widths are missing/undefined.
 */
export function sanitizePdfElement(element: React.ReactElement): React.ReactElement {
  const walk = (node: React.ReactNode): React.ReactNode => {
    if (!React.isValidElement(node)) return node;

    const props: Record<string, unknown> = { ...(node.props as Record<string, unknown>) };

    if ("style" in props) {
      props.style = sanitizeStyleProp(props.style);
    }

    if (props.children) {
      props.children = React.Children.map(props.children as React.ReactNode, walk);
    }

    return React.cloneElement(node, props);
  };

  return walk(element) as React.ReactElement;
}
