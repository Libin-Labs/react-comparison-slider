# @lp-labs/react-comparison-slider

A responsive two-image comparison for React 18.2 and 19. Reveal the after image
from left to right or top to bottom using pointer capture or keyboard input.
React is the only peer and there are no runtime dependencies.

## Install and use

```sh
npm install @lp-labs/react-comparison-slider react
```

```tsx
import { ComparisonSlider } from "@lp-labs/react-comparison-slider";
import "@lp-labs/react-comparison-slider/style.css";

export function PhotoComparison() {
  return (
    <ComparisonSlider
      before={{ src: "/garden-before.jpg", alt: "Garden before planting" }}
      after={{ src: "/garden-after.jpg", alt: "Garden after planting" }}
      defaultValue={50}
      label="Garden renovation comparison"
      onValueCommit={(value) => console.log("Reveal percent:", value)}
    />
  );
}
```

## Component API and types

`ComparisonOrientation = "horizontal" | "vertical"`.
`ComparisonImage` has required `src: string` and `alt: string`, optional
`srcSet?: string`, `sizes?: string`, and `loading?: "eager" | "lazy"`. Optional
fields are passed to the image with no package defaults.

`ComparisonSlider(props: ComparisonSliderProps)`:

| Prop | Type | Default / behavior |
| --- | --- | --- |
| `before` | `ComparisonImage` | Required; full background image. |
| `after` | `ComparisonImage` | Required; clipped foreground image. |
| `value` | `number` | Omitted: uncontrolled. Supplied: controlled reveal percentage. |
| `defaultValue` | `number` | `50`; used only for initial uncontrolled state. |
| `onValueChange` | `(value: number) => void` | Optional; bounded value requested by input, when different from displayed value. |
| `onValueCommit` | `(value: number) => void` | Optional; pointerup or handled keyboard action, including actions at a bound. Not fired on pointercancel/lost capture/unmount. |
| `orientation` | `ComparisonOrientation` | `"horizontal"`; X-axis or Y-axis reveal. |
| `step` | `number` | `1`; keyboard increment, must be finite and greater than 0 and at most 100. |
| `disabled` | `boolean` | `false`; prevents interaction, removes handle from Tab order, exposes aria-disabled. |
| `label` | `string` | `"Image comparison"`; accessible slider name. |
| `valueText` | `(value: number) => string` | Rounded percentage followed by `"% after image"`; accessible value description. |
| `aspectRatio` | `CSSProperties["aspectRatio"]` | `"16 / 9"`; responsive frame ratio. |
| `objectFit` | `CSSProperties["objectFit"]` | `"cover"` for both images. |
| `className` | `string` | `""`; appended to `lp-comparison`. |
| `style` | `CSSProperties` | Omitted; frame style, can override aspect ratio. |

Percentages below 0 or above 100 are clamped; nonfinite values fall back to 50.
Invalid step throws `RangeError` during rendering. Pointer movement is continuous
and is not snapped to step. Keep controlled/uncontrolled mode stable for the
component lifetime. In controlled mode update `value` in `onValueChange` to show
the requested position. Callback exceptions propagate.

```tsx
import { useState } from "react";
import { ComparisonSlider } from "@lp-labs/react-comparison-slider";
import "@lp-labs/react-comparison-slider/style.css";

export function VerticalComparison() {
  const [value, setValue] = useState(35);
  return (
    <>
      <ComparisonSlider
        before={{ src: "/original.jpg", alt: "Original exposure" }}
        after={{ src: "/edited.jpg", alt: "Edited exposure" }}
        orientation="vertical"
        value={value}
        onValueChange={setValue}
        valueText={(percent) => `${Math.round(percent)} percent edited exposure`}
        step={5}
        aspectRatio="4 / 3"
        objectFit="contain"
      />
      <output>{Math.round(value)}%</output>
    </>
  );
}
```

## Helpers (all exported)

- `clampComparisonValue(value: number): number` returns the input clamped to
  0-100, or 50 for NaN/infinity. It does not round.
- `positionToValue(position: number, start: number, length: number): number`
  converts an absolute X or Y coordinate to a percentage relative to an element.
  It clamps outside positions to 0-100 and returns 50 for nonfinite arguments or
  zero/negative length. Neither helper uses the DOM or throws for numeric edge
  cases.

```tsx
import { clampComparisonValue, positionToValue } from "@lp-labs/react-comparison-slider";

console.log(clampComparisonValue(120)); // 100
console.log(positionToValue(110, 10, 200)); // 50
```

## Interaction, accessibility, and CSS

The handle exposes role slider, min/max/current values, descriptive value text,
orientation, name, and disabled state. It is focusable by Tab and gets focus on
pointerdown anywhere in the frame. Horizontal Left/Right decrease/increase;
vertical Up/Down decrease/increase. Home/End jump to 0/100. PageUp/PageDown
increase/decrease by ten steps. Native page scrolling is prevented only for
handled keys. This vertical image-coordinate model intentionally makes Down
increase the reveal, matching downward pointer movement.

Import CSS explicitly. Customize `--comparison-accent`, `.lp-comparison`,
`.lp-comparison-handle`, and its `span`. The frame is 100% of its parent width;
both images share the same fixed ratio and object fit. Use aligned images with
matching composition. Empty alt text is allowed for decorative images, but give
informative comparisons useful alt descriptions. Color is not the only signal:
the handle and accessible percentage remain available.

The first active pointer is captured on the frame; other pointers do not move
it. Capture is released on pointerup/cancel/lost capture, disabling, or unmount.
No document-global pointer listeners or state are installed. Horizontal mode
permits vertical touch scrolling and vertical mode permits horizontal scrolling;
the browser may cancel a gesture to scroll. Canceled gestures retain the most
recent value but do not commit.

## Browser limits

Requires modern CSS aspect-ratio/clip-path and Pointer Events for full behavior.
Where pointer capture is unavailable, dragging outside the frame is not reliable;
keyboard interaction still works. Imports and server rendering do not access
browser globals. Images load through the browser; this package has no loading
placeholder, error callback, image validation, zooming, or pixel-perfect alignment.
Use trusted image URLs and your application's CSP; React escaping is not a URL
allowlist. Touch screen-reader gestures depend on browser/assistive technology
support for custom sliders. No animation, worker, canvas, or image processing is
performed.

## License

[MIT](./LICENSE).

## Support

If this library is useful to you, consider supporting its maintenance with a [donation via PayPal](https://www.paypal.me/LibinPrasanth).

## Author

Created by [Libin Prasanth](https://www.linkedin.com/in/libinprasanth/). Connect on LinkedIn for updates and discussion.
