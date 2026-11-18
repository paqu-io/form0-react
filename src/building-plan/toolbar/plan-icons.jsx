import React from 'react';

/**
 * Plan tool icons that lucide has no match for, drawn on lucide's 24-unit grid with the same
 * stroke, so they sit next to lucide icons: a wall band, a cut column, a beam, a rejoin.
 */
function planIcon(displayName, paths) {
  function Icon({ size = 24, strokeWidth = 1.75, ...props }) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
        {...props}
      >
        {paths.map((d) => (
          <path key={d} d={d} />
        ))}
      </svg>
    );
  }
  Icon.displayName = displayName;
  return Icon;
}

/** A length of wall, seen in plan: a hatched band. */
export const WallIcon = planIcon('WallIcon', [
  'M3 7.5h18v9H3z',
  'M9 7.5l-6 6',
  'M16 7.5l-9 9',
  'M21 9.5l-7 7',
]);

/** A column, cut by the plan: a square with its diagonals. */
export const ColumnIcon = planIcon('ColumnIcon', ['M5 5h14v14H5z', 'M5 5l14 14', 'M19 5 5 19']);

/** A beam over the plan: two rails with their ends. */
export const BeamIcon = planIcon('BeamIcon', ['M2 7.5h20', 'M2 16.5h20', 'M5 7.5v9', 'M19 7.5v9']);

/** Rejoin: two portions of a wall meeting again. */
export const RejoinIcon = planIcon('RejoinIcon', ['M2 12h7', 'M15 12h7', 'M9 6v12', 'M15 6v12']);
