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

function ensureBorderWidths(style: Style): Style {
  const hasAnyBorderColor = BORDER_COLOR_KEYS.some((k) => style[k] != null);
  if (!hasAnyBorderColor) return style;

  // If any border color is set but *no* width is specified, default to 1.
  const hasAnyBorderWidth = BORDER_WIDTH_KEYS.some((k) => style[k] != null);
  if (!hasAnyBorderWidth) {
    return { ...style, borderWidth: 1 };
  }

  // If a side color is set but its width is missing, default that side width to 1.
  const next: Style = { ...style };
  if (next.borderTopColor != null && next.borderTopWidth == null) next.borderTopWidth = 1;
  if (next.borderRightColor != null && next.borderRightWidth == null) next.borderRightWidth = 1;
  if (next.borderBottomColor != null && next.borderBottomWidth == null) next.borderBottomWidth = 1;
  if (next.borderLeftColor != null && next.borderLeftWidth == null) next.borderLeftWidth = 1;
  if (next.borderColor != null && next.borderWidth == null) next.borderWidth = 1;

  return next;
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
