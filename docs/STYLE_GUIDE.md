# Milk Subs Dairy Management System - Style Guide

> **Comprehensive Design System and Technical Specifications**  
> Built with Next.js 15, Tailwind CSS 4, and Shadcn/ui  
> Version: 1.0 | Last Updated: August 2025

## Table of Contents

1. [Overview](#overview)
2. [Design Principles](#design-principles)
3. [Color System](#color-system)
4. [Typography](#typography)
5. [Spacing & Layout](#spacing--layout)
6. [Component Library](#component-library)
7. [Navigation & Layout Patterns](#navigation--layout-patterns)
8. [Data Display Patterns](#data-display-patterns)
9. [Form Design](#form-design)
10. [Print System](#print-system)
11. [Responsive Design](#responsive-design)
12. [Implementation Guidelines](#implementation-guidelines)

---

## Overview

The Milk Subs Dairy Management System employs a modern, clean design system built on **Tailwind CSS 4** with the **Shadcn/ui** component library. The design emphasizes:

- **Functionality over aesthetics** - Optimized for daily dairy business operations
- **Data-first design** - Clear presentation of financial and operational data
- **Mobile responsiveness** - Works seamlessly on tablets and mobile devices
- **Print optimization** - Professional reports with PureDairy branding
- **Indian localization** - Currency formatting (₹) and business practices

### Technology Stack

- **Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS 4 with CSS custom properties
- **Components**: Shadcn/ui with Radix UI primitives
- **Fonts**: Geist Sans & Geist Mono (Google Fonts)
- **Icons**: Lucide React
- **State Management**: React Hook Form + Zod validation

---

## Design Principles

### 1. **Clarity & Readability**
- High contrast ratios for all text
- Generous whitespace for content breathing room
- Consistent typography scale

### 2. **Data-Centric Interface**
- Tables optimized for financial data display
- Clear status indicators with color coding
- Sortable columns with visual feedback

### 3. **Progressive Disclosure**
- Card-based layouts for complex information
- Expandable sections for detailed views
- Modal dialogs for secondary actions

### 4. **Professional Appearance**
- Consistent branding across all printed materials
- Clean, modern interface suitable for business use
- Conservative color palette with accent colors for actions

---

## Color System

### CSS Custom Properties

The color system is built on CSS custom properties with automatic light/dark theme support:

```css
:root {
  /* Primary Colors */
  --background: #ffffff;
  --foreground: #171717;
  --primary: #0f172a;           /* Slate 900 */
  --primary-foreground: #f8fafc;
  
  /* Secondary Colors */
  --secondary: #f1f5f9;         /* Slate 100 */
  --secondary-foreground: #0f172a;
  
  /* Accent Colors */
  --muted: #f1f5f9;
  --muted-foreground: #64748b;  /* Slate 500 */
  --accent: #f1f5f9;
  --accent-foreground: #0f172a;
  
  /* Status Colors */
  --destructive: #ef4444;       /* Red 500 */
  --destructive-foreground: #f8fafc;
  
  /* Utility Colors */
  --border: #e2e8f0;           /* Slate 200 */
  --input: #e2e8f0;
  --ring: #0f172a;             /* Focus ring color */
}
```

### Dark Theme (Media Query)

```css
@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
    --primary: #f8fafc;
    --primary-foreground: #0f172a;
    --secondary: #1e293b;       /* Slate 800 */
    --secondary-foreground: #f8fafc;
    --muted: #1e293b;
    --muted-foreground: #94a3b8; /* Slate 400 */
    --border: #1e293b;
    --input: #1e293b;
    --ring: #f8fafc;
  }
}
```

### Status Color Usage

| Color | Use Case | Example |
|-------|----------|---------|
| `--primary` | Active states, primary actions | Active sidebar links, primary buttons |
| `--destructive` | Errors, dangerous actions | Delete buttons, overdue status |
| `--muted-foreground` | Secondary text, labels | Table headers, form labels |
| `#10b981` (Green 500) | Success states | Active customer status |
| `#eab308` (Yellow 500) | Warning states | Pending payments |

### Dashboard Status Colors

```css
.icon-blue { background-color: #3b82f6; }    /* Total customers */
.icon-green { background-color: #10b981; }   /* Active customers */
.icon-purple { background-color: #8b5cf6; }  /* Products */
.icon-orange { background-color: #f59e0b; }  /* Routes */
.icon-red { background-color: #ef4444; }     /* Outstanding */
.icon-yellow { background-color: #eab308; }  /* Overdue invoices */
```

---

## Typography

### Font Stack

```css
/* Primary Font */
font-family: var(--font-geist-sans), 'Inter', Arial, sans-serif;

/* Monospace Font (Data & Code) */
font-family: var(--font-geist-mono), monospace;
```

### Type Scale

Based on Tailwind CSS typography scale with consistent line heights:

| Class | Size | Line Height | Usage |
|-------|------|-------------|-------|
| `.text-xs` | 12px (0.75rem) | 1.4 | Badges, captions |
| `.text-sm` | 14px (0.875rem) | 1.5 | Form labels, table headers |
| `.text-base` | 16px (1rem) | 1.6 | Body text, buttons |
| `.text-lg` | 18px (1.125rem) | 1.6 | Subheadings |
| `.text-xl` | 20px (1.25rem) | 1.6 | Card titles |
| `.text-2xl` | 24px (1.5rem) | 1.4 | Page headings |
| `.text-3xl` | 30px (1.875rem) | 1.3 | Section headings |
| `.text-4xl` | 36px (2.25rem) | 1.2 | Main page titles |

### Font Weights

- **400** (Normal): Body text, labels
- **500** (Medium): Button text, table headers
- **600** (Semibold): Card titles, form labels
- **700** (Bold): Page headings, important data

### Typography Usage Guidelines

```css
/* Page Titles */
h1 {
  font-size: 2rem;
  font-weight: 700;
  color: var(--foreground);
  margin-bottom: 1rem;
}

/* Section Headings */
h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--foreground);
  margin-bottom: 0.75rem;
}

/* Card Titles */
.card-title {
  font-weight: 600;
  line-height: 1;
  letter-spacing: -0.025em;
}

/* Muted Text */
.text-muted-foreground {
  color: var(--muted-foreground);
  font-size: 0.875rem;
}
```

---

## Spacing & Layout

### Spacing Scale

Based on `0.25rem` (4px) increments:

| Token | Value | Pixels | Usage |
|-------|-------|--------|-------|
| `xs` | 0.25rem | 4px | Tight spacing |
| `sm` | 0.5rem | 8px | Badge padding |
| `base` | 1rem | 16px | General spacing |
| `lg` | 1.5rem | 24px | Section spacing |
| `xl` | 2rem | 32px | Card padding |
| `2xl` | 3rem | 48px | Large sections |
| `3xl` | 4rem | 64px | Page sections |

### Layout Grid System

```css
/* Responsive Grid */
.responsive-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

/* Dashboard Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
}

/* Two-Column Layout */
.two-column {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

@media (max-width: 768px) {
  .two-column {
    grid-template-columns: 1fr;
  }
}
```

### Container Patterns

```css
/* Main Content Wrapper */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

/* Page Content */
.page-content {
  padding: 1.5rem;
}

/* Card Spacing */
.card {
  border-radius: 12px;
  padding: 1.5rem;
}

.card-header {
  padding: 1.5rem;
  padding-bottom: 0;
}

.card-content {
  padding: 1.5rem;
  padding-top: 0;
}
```

---

## Component Library

### Button Variants

#### Primary Styles

```css
/* Default Button */
.btn-default {
  background-color: var(--primary);
  color: var(--primary-foreground);
  border: none;
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
}

.btn-default:hover {
  background-color: color-mix(in srgb, var(--primary) 90%, transparent);
}

/* Destructive Button */
.btn-destructive {
  background-color: var(--destructive);
  color: var(--destructive-foreground);
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
}

/* Outline Button */
.btn-outline {
  border: 1px solid var(--input);
  background-color: var(--background);
  color: var(--foreground);
}

.btn-outline:hover {
  background-color: var(--accent);
  color: var(--accent-foreground);
}
```

#### Button Sizes

```css
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s;
  cursor: pointer;
}

/* Size Variants */
.btn-sm {
  height: 2rem;
  padding: 0 0.75rem;
  font-size: 0.75rem;
}

.btn-default-size {
  height: 2.25rem;
  padding: 0.5rem 1rem;
}

.btn-lg {
  height: 2.5rem;
  padding: 0 2rem;
}

.btn-icon {
  height: 2.25rem;
  width: 2.25rem;
  padding: 0;
}
```

### Card Components

```css
.card {
  border-radius: 12px;
  border: 1px solid var(--border);
  background-color: var(--card);
  color: var(--card-foreground);
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
}

.card-header {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  padding: 1.5rem;
}

.card-title {
  font-weight: 600;
  line-height: 1;
  letter-spacing: -0.025em;
}

.card-description {
  font-size: 0.875rem;
  color: var(--muted-foreground);
}

.card-content {
  padding: 1.5rem;
  padding-top: 0;
}

.card-footer {
  display: flex;
  align-items: center;
  padding: 1.5rem;
  padding-top: 0;
}
```

### Form Elements

```css
/* Form Item Container */
.form-item {
  margin-bottom: 1.5rem;
}

/* Form Labels */
.form-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
  color: var(--foreground);
}

.form-label.error {
  color: var(--destructive);
}

/* Input Fields */
.form-input {
  display: flex;
  height: 2.25rem;
  width: 100%;
  border-radius: 6px;
  border: 1px solid var(--input);
  background-color: transparent;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  transition: all 0.2s;
}

.form-input:focus-visible {
  outline: none;
  box-shadow: 0 0 0 1px var(--ring);
}

.form-input:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.form-input::placeholder {
  color: var(--muted-foreground);
}
```

### Badge Components

```css
.badge {
  display: inline-flex;
  align-items: center;
  border-radius: 6px;
  border: 1px solid transparent;
  padding: 0.125rem 0.625rem;
  font-size: 0.75rem;
  font-weight: 600;
  transition: all 0.2s;
}

/* Badge Variants */
.badge-default {
  background-color: var(--primary);
  color: var(--primary-foreground);
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
}

.badge-secondary {
  background-color: var(--secondary);
  color: var(--secondary-foreground);
}

.badge-destructive {
  background-color: var(--destructive);
  color: var(--destructive-foreground);
}

.badge-outline {
  color: var(--foreground);
  border: 1px solid var(--border);
  background-color: transparent;
}
```

---

## Navigation & Layout Patterns

### Sidebar Navigation

```css
/* Desktop Sidebar */
.sidebar {
  width: 16rem;
  background-color: var(--background);
  border-right: 1px solid var(--border);
  height: 100vh;
  position: fixed;
  left: 0;
  top: 0;
}

/* Mobile Sidebar (Hidden by default) */
@media (max-width: 1024px) {
  .sidebar {
    position: fixed;
    z-index: 50;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
  }
  
  .sidebar.open {
    transform: translateX(0);
  }
}

/* Navigation Links */
.nav-link {
  display: flex;
  align-items: center;
  padding: 0.5rem;
  margin: 0 0.5rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--muted-foreground);
  text-decoration: none;
  transition: all 0.2s;
}

.nav-link:hover {
  background-color: var(--muted);
  color: var(--foreground);
}

.nav-link.active {
  background-color: #dbeafe; /* Blue 100 */
  color: #1d4ed8;            /* Blue 700 */
}

.nav-link .icon {
  margin-right: 0.75rem;
  width: 1.25rem;
  height: 1.25rem;
}
```

### Main Content Area

```css
/* Main Layout */
.main-layout {
  display: flex;
  height: 100vh;
  background-color: #f9fafb; /* Gray 50 */
}

/* Content Area */
.main-content {
  flex: 1;
  overflow: hidden;
  margin-left: 16rem; /* Sidebar width */
}

@media (max-width: 1024px) {
  .main-content {
    margin-left: 0;
  }
}

.content-wrapper {
  height: 100%;
  overflow-y: auto;
  padding: 1.5rem;
}
```

### Mobile Header

```css
.mobile-header {
  display: none;
  height: 4rem;
  background-color: var(--background);
  border-bottom: 1px solid var(--border);
  padding: 0 1rem;
  align-items: center;
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
}

@media (max-width: 1024px) {
  .mobile-header {
    display: flex;
  }
}

.menu-button {
  padding: 0.625rem;
  color: var(--muted-foreground);
}

.mobile-title {
  margin-left: 1rem;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--foreground);
}
```

---

## Data Display Patterns

### Table Styling

```css
.table-container {
  position: relative;
  width: 100%;
  overflow-x: auto;
  border-radius: 8px;
  border: 1px solid var(--border);
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
  background-color: var(--card);
}

.table th {
  height: 2.5rem;
  padding: 0 0.5rem;
  text-align: left;
  vertical-align: middle;
  font-weight: 500;
  color: var(--muted-foreground);
  border-bottom: 1px solid var(--border);
  background-color: var(--muted);
}

.table td {
  padding: 0.5rem;
  vertical-align: middle;
  border-bottom: 1px solid var(--border);
}

.table tr:hover {
  background-color: color-mix(in srgb, var(--muted) 50%, transparent);
}
```

### Sortable Table Headers

```css
.sortable-header {
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s;
  position: relative;
}

.sortable-header:hover {
  background-color: color-mix(in srgb, var(--muted) 50%, transparent);
}

.sortable-header.sorted {
  background-color: color-mix(in srgb, var(--muted) 30%, transparent);
}

.sort-icon {
  display: inline-flex;
  align-items: center;
  margin-left: 0.5rem;
  width: 1rem;
  height: 1rem;
  opacity: 0.5;
}

.sortable-header.sorted .sort-icon {
  opacity: 1;
}
```

### Dashboard Statistics Cards

```css
.stat-card {
  background-color: var(--card);
  border-radius: 8px;
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
  padding: 1.5rem;
  border: 1px solid var(--border);
}

.stat-content {
  display: flex;
  align-items: center;
}

.stat-icon {
  flex-shrink: 0;
  width: 2rem;
  height: 2rem;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  font-size: 0.875rem;
  color: white;
}

.stat-info {
  margin-left: 1.25rem;
  flex: 1;
}

.stat-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--muted-foreground);
  margin-bottom: 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stat-value {
  font-size: 1.125rem;
  font-weight: 500;
  color: var(--foreground);
}
```

---

## Form Design

### Form Layout Patterns

```css
/* Standard Form Container */
.form-container {
  max-width: 600px;
  margin: 0 auto;
  padding: 2rem;
  background-color: var(--card);
  border-radius: 12px;
  border: 1px solid var(--border);
}

/* Two-Column Form */
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}

/* Form Section */
.form-section {
  margin-bottom: 2rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid var(--border);
}

.form-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.form-section h3 {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: var(--foreground);
}
```

### Form Validation States

```css
/* Error States */
.form-item.error .form-label {
  color: var(--destructive);
}

.form-item.error .form-input {
  border-color: var(--destructive);
  box-shadow: 0 0 0 1px var(--destructive);
}

.form-error-message {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--destructive);
  margin-top: 0.5rem;
}

/* Success States */
.form-item.success .form-input {
  border-color: #10b981; /* Green 500 */
  box-shadow: 0 0 0 1px #10b981;
}
```

### Select & Dropdown Styling

```css
.select-trigger {
  display: flex;
  height: 2.25rem;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  border-radius: 6px;
  border: 1px solid var(--input);
  background-color: transparent;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
}

.select-trigger:focus {
  outline: none;
  box-shadow: 0 0 0 1px var(--ring);
}

.select-trigger:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.select-trigger[data-placeholder] {
  color: var(--muted-foreground);
}

.select-content {
  position: relative;
  z-index: 50;
  max-height: 24rem;
  min-width: 8rem;
  overflow: hidden;
  border-radius: 6px;
  border: 1px solid var(--border);
  background-color: var(--popover);
  color: var(--popover-foreground);
  box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
}

.select-item {
  position: relative;
  display: flex;
  width: 100%;
  cursor: default;
  user-select: none;
  align-items: center;
  border-radius: 2px;
  padding: 0.375rem 0.5rem 0.375rem 2rem;
  font-size: 0.875rem;
  outline: none;
}

.select-item:focus {
  background-color: var(--accent);
  color: var(--accent-foreground);
}

.select-item[data-disabled] {
  pointer-events: none;
  opacity: 0.5;
}
```

---

## Print System

### Print Media Queries

```css
@media print {
  /* Reset all colors for print */
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  /* Page Setup */
  @page {
    margin: 1in;
    size: A4;
  }

  /* Body Styles */
  body {
    font-size: 12pt;
    line-height: 1.4;
    color: #000;
    background: #fff;
    font-family: Arial, sans-serif;
  }

  /* Hide Interactive Elements */
  .print\\:hidden,
  button:not(.print\\:inline):not(.print\\:block),
  .sidebar,
  nav,
  .navigation,
  .no-print,
  [data-print="hidden"] {
    display: none !important;
  }

  /* Show Print-Only Elements */
  .print\\:block {
    display: block !important;
  }

  .print\\:inline {
    display: inline !important;
  }

  .print\\:inline-block {
    display: inline-block !important;
  }
}
```

### Print Header & Branding

```css
@media print {
  .print-header {
    display: block !important;
    text-align: center;
    margin-bottom: 2rem;
    border-bottom: 2px solid #000;
    padding-bottom: 1rem;
  }

  .print-header h1 {
    font-size: 18pt;
    font-weight: bold;
    margin-bottom: 0.5rem;
    letter-spacing: 1px;
  }

  .print-header h2 {
    font-size: 16pt;
    font-weight: bold;
    margin-bottom: 0.5rem;
  }

  .print-header p {
    font-size: 12pt;
    margin-bottom: 0.25rem;
    color: #666;
  }
}
```

### Print Table Styles

```css
@media print {
  table {
    border-collapse: collapse;
    width: 100%;
    font-size: 11pt;
    page-break-inside: avoid;
  }

  th, td {
    border: 1px solid #ccc;
    padding: 8px;
    text-align: left;
  }

  th {
    background-color: #f5f5f5 !important;
    font-weight: bold;
    color: #000 !important;
  }

  /* Optimize for Black & White Printing */
  .text-red-600,
  .text-red-500 {
    color: #000 !important;
    font-weight: bold !important;
  }

  .text-green-600,
  .text-green-500 {
    color: #000 !important;
  }

  .badge,
  [data-badge] {
    border: 1px solid #000 !important;
    color: #000 !important;
    background-color: transparent !important;
    padding: 2px 6px !important;
    font-size: 10pt !important;
  }
}
```

### Print Utility Classes

```css
@media print {
  /* Typography */
  .print\\:text-xs { font-size: 0.75rem !important; }
  .print\\:text-sm { font-size: 0.875rem !important; }
  .print\\:text-base { font-size: 1rem !important; }
  .print\\:text-lg { font-size: 1.125rem !important; }
  .print\\:text-xl { font-size: 1.25rem !important; }
  .print\\:text-2xl { font-size: 1.5rem !important; }

  /* Layout */
  .print\\:w-full { width: 100% !important; }
  .print\\:max-w-none { max-width: none !important; }
  .print\\:text-center { text-align: center !important; }
  .print\\:text-left { text-align: left !important; }
  .print\\:text-right { text-align: right !important; }

  /* Spacing */
  .print\\:mb-2 { margin-bottom: 0.5rem !important; }
  .print\\:mb-4 { margin-bottom: 1rem !important; }
  .print\\:mt-4 { margin-top: 1rem !important; }
  .print\\:p-2 { padding: 0.5rem !important; }
  .print\\:p-4 { padding: 1rem !important; }

  /* Page Breaks */
  .print\\:break-before { page-break-before: always; }
  .print\\:break-after { page-break-after: always; }
  .print\\:break-inside-avoid { page-break-inside: avoid; }

  /* Borders */
  .print\\:border-b { border-bottom: 1px solid #000 !important; }
  .print\\:border-t { border-top: 1px solid #000 !important; }
  .print\\:font-bold { font-weight: bold !important; }
}
```

---

## Responsive Design

### Breakpoint System

Following Tailwind CSS breakpoints:

```css
/* Mobile First Approach */
/* Default: 0px and up */

/* Small devices (640px and up) */
@media (min-width: 640px) {
  .sm\\:text-lg { font-size: 1.125rem; }
  .sm\\:px-6 { padding-left: 1.5rem; padding-right: 1.5rem; }
}

/* Medium devices (768px and up) */
@media (min-width: 768px) {
  .md\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .md\\:text-left { text-align: left; }
}

/* Large devices (1024px and up) */
@media (min-width: 1024px) {
  .lg\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .lg\\:block { display: block; }
  .lg\\:hidden { display: none; }
}

/* Extra large devices (1280px and up) */
@media (min-width: 1280px) {
  .xl\\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .xl\\:max-w-6xl { max-width: 72rem; }
}
```

### Mobile Navigation Patterns

```css
/* Mobile Sidebar Overlay */
@media (max-width: 1023px) {
  .mobile-sidebar-overlay {
    position: fixed;
    inset: 0;
    z-index: 40;
    background-color: rgb(0 0 0 / 0.75);
  }

  .mobile-sidebar {
    position: fixed;
    inset-y: 0;
    left: 0;
    z-index: 50;
    width: 16rem;
    background-color: var(--background);
    transform: translateX(-100%);
    transition: transform 0.3s ease-in-out;
  }

  .mobile-sidebar.open {
    transform: translateX(0);
  }
}
```

### Responsive Table Patterns

```css
/* Horizontal Scroll on Mobile */
@media (max-width: 768px) {
  .table-responsive {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .table {
    min-width: 600px;
  }

  /* Stack Cards on Mobile */
  .card-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
}

/* Hide Less Important Columns on Small Screens */
@media (max-width: 640px) {
  .table .hide-sm {
    display: none;
  }
}
```

---

## Implementation Guidelines

### CSS Architecture

1. **Use CSS Custom Properties** for theming and consistency
2. **Follow Tailwind CSS patterns** for utility classes
3. **Maintain component isolation** with scoped styles
4. **Optimize for print** with dedicated media queries

### Component Development

1. **Base Components** - Build on Radix UI primitives
2. **Composition Pattern** - Combine smaller components
3. **Consistent Props** - Use standard size, variant, and className props
4. **Accessibility First** - Ensure proper ARIA attributes

### File Organization

```
src/
├── components/
│   └── ui/                    # Base UI components
│       ├── button.tsx
│       ├── card.tsx
│       ├── form.tsx
│       └── table.tsx
├── app/
│   ├── globals.css           # Global styles & CSS variables
│   └── dashboard/
│       └── layout.tsx        # Layout components
└── lib/
    └── utils.ts              # Utility functions
```

### Best Practices

#### CSS Custom Properties

```css
/* Good: Semantic naming */
--color-destructive: #ef4444;
--spacing-card-padding: 1.5rem;

/* Avoid: Generic naming */
--red: #ef4444;
--padding-big: 1.5rem;
```

#### Component Styling

```tsx
// Good: Composable with consistent API
<Button variant="destructive" size="sm">
  Delete Customer
</Button>

// Good: Extensible with className
<Card className="border-destructive">
  <CardHeader>...</CardHeader>
</Card>
```

#### Responsive Design

```css
/* Good: Mobile-first approach */
.stats-grid {
  grid-template-columns: 1fr;
  gap: 1rem;
}

@media (min-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 1.5rem;
  }
}
```

### Theme Customization

To customize the theme, modify the CSS custom properties in `globals.css`:

```css
:root {
  /* Primary brand color */
  --primary: #your-brand-color;
  
  /* Adjust accent colors */
  --secondary: #your-secondary-color;
  
  /* Custom spacing */
  --spacing-custom: 1.25rem;
}
```

### Performance Considerations

1. **Use system fonts** as fallbacks for web fonts
2. **Minimize CSS bundle size** with Tailwind's purge configuration
3. **Optimize print styles** for faster printing
4. **Use CSS Grid and Flexbox** for efficient layouts

---

## Invoice System

### Invoice Template Design

The invoice system features a professional PureDairy-branded template optimized for A4 printing with responsive content scaling.

#### Layout Structure

```css
/* A4 Page Setup */
@page {
  size: A4;
  margin: 15mm 15mm 15mm 10mm; /* 15mm all sides, 10mm right */
}

/* Main Layout Grid */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding: 15px 0;
}

.main-content {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}

.left-section {
  flex: 1;
  max-width: 35%;
}

.right-section {
  flex: 2;
}
```

#### Invoice Color Scheme

| Color | Hex Code | Usage |
|-------|----------|-------|
| Primary Green | `#025e24` | Table headers, borders |
| Table Background | `#fdfbf9` | Items table, totals table |
| Body Background | `#ffffff` | Page background |
| Text Primary | `#333333` | Main content text |
| Text Secondary | `#666666` | Labels, metadata |
| Border | `#dddddd` | Table cell borders |

#### Typography System

```css
/* Font Stack */
font-family: "Open Sans", sans-serif;

/* Font Weights */
font-weight: 400; /* Regular - body text */
font-weight: 500; /* Medium - labels, content */
font-weight: 800; /* Extra Bold - headers, titles */

/* Responsive Font Sizes */
.responsive-base {
  font-size: clamp(9px, 12px, 12px); /* Scales based on content volume */
}

.invoice-title {
  font-size: 30px; /* Scales to 22.5px for high-density content */
  font-weight: 800;
  letter-spacing: 2px;
}

.section-header {
  font-size: 18px; /* Scales to 13.5px for high-density content */
  font-weight: 800;
}
```

#### Header Layout

```css
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.invoice-title {
  flex: 1;
  text-align: left;
  font-size: 30px;
  font-weight: 800;
  color: #000000;
  letter-spacing: 2px;
}

.logo-section {
  flex: 1;
  display: flex;
  justify-content: center;
}

.logo-img {
  width: 120px;
  height: auto;
}

.company-address {
  flex: 1;
  text-align: right;
  font-size: 11px;
  font-weight: 400;
  color: #666;
  line-height: 1.3;
}
```

#### Customer Information Section

```css
.customer-title {
  font-size: 16px;
  font-weight: 800;
  color: black;
  margin-bottom: 8px;
  text-transform: uppercase;
}

.customer-info {
  font-weight: 500;
  margin-bottom: 20px;
}

.customer-name {
  font-size: 16px;
  font-weight: 500;
  color: #333;
  margin-bottom: 8px;
}

.invoice-meta {
  font-weight: 500;
  margin-bottom: 20px;
}

.invoice-number {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 4px;
}
```

#### Items Table Design

```css
.items-table {
  width: 100%;
  border-collapse: collapse;
  background: #fdfbf9;
  border: 1px solid #025e24;
}

.items-table th {
  background: #025e24;
  color: white;
  padding: 12px 8px;
  text-align: center;
  font-weight: 800;
  font-size: 11px;
  border: 1px solid #025e24;
}

.items-table th:first-child {
  text-align: left;
}

.items-table th:last-child {
  text-align: right;
}

.items-table td {
  padding: 8px;
  border: 1px solid #ddd;
  font-weight: 500;
  font-size: 11px;
}

.items-table td:last-child {
  text-align: right;
  font-weight: 500;
}
```

#### Totals Section

```css
.totals-section {
  margin: 15px 0;
  display: flex;
  justify-content: flex-end;
}

.totals-table {
  border-collapse: collapse;
  background: #fdfbf9;
}

.totals-table td {
  padding: 6px 15px;
  border: 1px solid #ddd;
  font-weight: 500;
  font-size: 11px;
}

.totals-table .label {
  text-align: right;
  font-weight: 500;
}

.totals-table .amount {
  text-align: right;
}

.grand-total {
  font-weight: 800;
  font-size: 12px;
}
```

#### QR Code Section

```css
.qr-section {
  margin: 20px 0;
  text-align: center;
}

.qr-code-img {
  max-width: 105px;
  height: auto;
  border: 1px solid #ddd;
}
```

#### Daily Summary Section

```css
.daily-summary {
  margin: 20px 0;
  border: 1px solid #666;
  background: white;
}

.daily-summary-title {
  padding: 8px 15px;
  font-size: 12px;
  font-weight: 800;
  color: black;
  border-bottom: 1px solid #666;
}

.daily-summary-content {
  padding: 15px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 15px;
  font-size: 11px;
  font-weight: 400;
}

.daily-column {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.daily-entry {
  margin-bottom: 8px;
}

.daily-date {
  font-weight: 500;
  color: black;
  margin-bottom: 3px;
}

.daily-product {
  font-size: 10px;
  color: #666;
  margin-left: 8px;
  line-height: 1.2;
}
```

#### Footer Design

```css
.footer {
  margin-top: 20px;
  padding-top: 15px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 40px;
  font-size: 10px;
  color: black;
  background: white;
  padding: 10px;
}

.footer-item {
  display: flex;
  align-items: center;
  gap: 5px;
}

.footer-icon {
  width: 16px;
  height: 16px;
}
```

#### Print Optimizations

```css
@media print {
  body {
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }

  .items-table, .daily-summary {
    break-inside: avoid;
  }

  .daily-summary-content {
    break-inside: avoid;
  }
}
```

#### Responsive Font Scaling

The invoice system includes intelligent font scaling based on content volume:

```typescript
// Font size calculation based on content density
const contentDensity = Math.min(
  (dailySummaryDays / 31) * 0.4 +
  (productCount / 7) * 0.3 +
  (totalLineItems / 15) * 0.3,
  1.0
)

// Base font size: 12px normal, scales down to 9px for high content
const baseSize = Math.max(12 - (contentDensity * 3), 9)
```

#### Invoice Assets

- **Logo**: `PureDairy_Logo-removebg-preview.png` (120px width)
- **QR Code**: `QR_code.png` (105px max-width)
- **Footer Icons**: SVG assets converted to base64
  - Website: `1www.svg`
  - Phone: `2phone.svg`
  - Email: `3email.svg`

#### Business Rules

1. **A4 Constraint**: All content must fit on a single A4 page
2. **Maximum Content**: Supports up to 31 days of daily summary and 7 products
3. **Font Scaling**: Automatically reduces font sizes for high-density content
4. **GST Compliance**: Includes proper GST breakdown and totals
5. **Professional Branding**: Consistent PureDairy branding throughout

---

## Currency & Localization

### Indian Rupee Formatting

```typescript
// Utility function for currency formatting
export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return '₹0.00'
  
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(numAmount)) return '₹0.00'
  
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numAmount)
}
```

### Date Formatting (IST)

```typescript
// IST Date utilities
export function formatDateIST(date: Date): string {
  return date.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}
```

---

This style guide provides a comprehensive foundation for maintaining design consistency and implementing new features in the Milk Subs Dairy Management System. For questions or clarifications, refer to the existing component implementations in the codebase.

**Last Updated**: August 2025  
**Version**: 1.0  
**Maintainer**: Development Team