# Component Library / Design System

**Design System Approach:** Create custom component library based on Material Design principles adapted for costume industry workflows. Focus on mobile-first components with accessibility built-in.

## Core Components

### Timeline Component
**Purpose:** Visual representation of 13-stage manufacturing progress

**Variants:** Horizontal (mobile), vertical (desktop), compact (dashboard preview)

**States:** Current, completed, pending, delayed, blocked

**Usage Guidelines:** Always show stage names, use consistent iconography, provide estimated completion dates where available

### Order Card Component
**Purpose:** Dashboard display of order summary information

**Variants:** Standard, compact, featured (urgent actions)

**States:** Normal, requires action, delayed, completed

**Usage Guidelines:** Consistent layout for scanability, clear action indicators, touch-friendly sizing

### Status Badge Component
**Purpose:** Quick visual indicator of order or payment status

**Variants:** Success, warning, error, info, pending

**States:** Static display, animated (processing), with notification count

**Usage Guidelines:** Use sparingly for high-priority information, maintain color consistency with system palette

### Navigation Tab Component
**Purpose:** Primary navigation for order detail sections

**Variants:** Bottom tabs (mobile), top tabs (desktop), with notification badges

**States:** Active, inactive, disabled, with notification count

**Usage Guidelines:** Limit to 5 tabs maximum, use icons with labels, maintain thumb-friendly touch targets
