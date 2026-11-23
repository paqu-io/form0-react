import { planText } from './plan-text.js';

/**
 * The selected wall's plaster as text (step 2, S6): from the canvas snapshot's `plaster` of its
 * row (core: its own side's thickness and, where the face across is this row's too, that one's;
 * metres, null where not plastered).
 */

/** @typedef {{ inside: number | null, outside: number | null, outsideFace: boolean }} FacePlaster */

/**
 * A plaster thickness in the plan's thickness unit (mm, or in for imperial) and the locale's
 * decimal sign: "15 mm", "0.59 in".
 * @param {number} metres
 * @param {{ unitFor?: (kind: string) => string, locale?: string } | null | undefined} presentation
 */
export function formatThickness(metres, presentation) {
  const unit = presentation?.unitFor?.('thickness') || 'mm';
  const value = unit === 'in' ? metres / 0.0254 : metres * 1000;
  const format = new Intl.NumberFormat(presentation?.locale || 'en', {
    maximumFractionDigits: unit === 'in' ? 2 : 1,
    useGrouping: false,
  });
  return `${format.format(value)} ${unit}`;
}

/**
 * What the selected wall's name adds (S6, as worded at the 2b hand test): "plaster: 35 mm (int.) ·
 * 20 mm (ext.)"; a free wall's "(this side)" and "(other side)"; one face, no tag ("plaster:
 * 15 mm", a shared wall); a face without plaster "none", none at all "plaster: none".
 * @param {FacePlaster | null} plaster
 * @param {{ freeWall?: boolean, presentation?: object }} [options]
 * @returns {string | null}
 */
export function plasterLabel(plaster, { freeWall = false, presentation = null } = {}) {
  if (!plaster) return null;
  const value = (metres) =>
    metres ? formatThickness(metres, presentation) : planText('plan.plaster.none');
  const faces =
    !plaster.outsideFace || (!plaster.inside && !plaster.outside)
      ? value(plaster.inside)
      : [
          [freeWall ? 'plan.plaster.thisSide' : 'plan.plaster.inside', plaster.inside],
          [freeWall ? 'plan.plaster.otherSide' : 'plan.plaster.outside', plaster.outside],
        ]
          .map(([key, metres]) => planText(key, { value: value(metres) }))
          .join(' · ');
  return planText('plan.plaster.label', { faces });
}
