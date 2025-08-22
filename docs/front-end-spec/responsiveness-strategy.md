# Responsiveness Strategy

## Breakpoints

| Breakpoint | Min Width | Max Width | Target Devices |
|------------|-----------|-----------|----------------|
| Mobile | 320px | 767px | Smartphones, small tablets |
| Tablet | 768px | 1023px | Tablets, small laptops |
| Desktop | 1024px | 1439px | Laptops, desktop monitors |
| Wide | 1440px | - | Large monitors, widescreen displays |

## Adaptation Patterns

**Layout Changes:** Single column mobile layout expanding to multi-column layouts on larger screens. Timeline component transitions from horizontal scroll (mobile) to vertical display (desktop).

**Navigation Changes:** Bottom tab navigation on mobile transforms to horizontal navigation bar on desktop. Hamburger menu for secondary navigation items on mobile.

**Content Priority:** Progressive disclosure hides less critical information on mobile with expand/collapse patterns. Dashboard shows more order details on larger screens.

**Interaction Changes:** Touch-optimized interactions on mobile (swipe, tap, long-press) with mouse hover states and keyboard shortcuts on desktop.
