# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 15 application called "milk_subs" using:
- TypeScript for type safety
- Tailwind CSS 4 for styling
- pnpm as the package manager
- Supabase for backend services (@supabase/ssr, @supabase/supabase-js)
- Radix UI components for accessible UI primitives
- Lucide React for icons

## Development Commands

- `pnpm dev` - Start development server with Turbopack (recommended)
- `pnpm build` - Build production application
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint

## Architecture

The project follows Next.js App Router structure:
- `/src/app/` - App Router pages and layouts
- `/src/app/layout.tsx` - Root layout with Geist fonts
- `/src/app/page.tsx` - Homepage
- `/src/app/globals.css` - Global styles
- `/public/` - Static assets

Key dependencies suggest this will be a subscription management app with database integration:
- Supabase client configured for SSR
- Radix UI for form components and dialogs
- Class utilities for conditional styling (clsx, tailwind-merge, class-variance-authority)

## TypeScript Configuration

- Uses path mapping with `@/*` pointing to `./src/*`
- Strict mode enabled
- ES2017 target for modern browser support

## Development Notes

- pnpm dev server is usually running at port 3000. Please don't start again and again.
- Remember to update @dev-journal.md after every small milestone.

## Deployment Notes

- Remember to use MCP servers as per your need.