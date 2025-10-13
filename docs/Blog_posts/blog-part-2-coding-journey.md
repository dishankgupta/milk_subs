# **PART 2: Vibe Coding Through Subscriptions, Payments, and PDF Nightmares**
## Day 2: When "Easy" Features Aren't Easy

I woke up on August 6, 2025, feeling like a coding god.

I mean, I'd built a working customer management system in 5.5 hours. Database, authentication, forms, everything. How hard could the rest be?

**Narrator:** *It was harder.*

Today's mission: Build the order generation system and delivery tracking. Should be simple, right? Subscriptions exist. Just... generate orders from them.

**4 hours later:** I was staring at code that looked like ancient hieroglyphics, trying to understand why a "2-day pattern" calculation was 47 lines of logic.


![SCREENSHOT: Code editor showing complex pattern calculation logic](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/5xkhd67q2jdchwfjh32t.png)

Let me take you through the real journey—not the polished version, but the messy, confused, "what am I even doing" version.

## The Features That Seemed Simple (But Weren't)

### 1. **Modifications System (Aug 5-6)** - "Just Let Them Skip Days"

**What I thought:** Add a "skip this date" button. Done.

**What it actually needed:**
- Skip modifications (quantity → 0)
- Increase modifications (1L → 2L temporarily)
- Decrease modifications (2L → 1L temporarily)
- Date ranges (apply from Aug 10-20)
- Automatic integration with order generation
- Status management (active/inactive)
- Customer + product relationship tracking

I remember asking Claude Code: *"Can't we just... mark the order as skipped?"*

Claude Code: *"That would work, but then you lose the audit trail of WHY it was skipped, WHEN it was planned, and WHO requested it. Also, what if they want to increase quantity for a date range? You'd need..."*

Me: *"Okay, okay! Show me the 'proper' way."*

Turns out, the "proper" way involves:
- A separate `modifications` table
- Date-based filtering during order generation
- Validation to prevent conflicting modifications
- UI to show active vs expired modifications

Did I understand all of it? No.
Did it work? Yes.
Did I move on? Absolutely.

### 2. **Order Generation (Aug 6)** - "The Math That Broke My Brain"

Here's where things got spicy.

Daily orders need to:
1. Look at active subscriptions
2. Apply 2-day pattern logic
3. Apply active modifications
4. Calculate the final quantity
5. Calculate the price
6. Create the order

The 2-day pattern logic alone made my head spin:

**Me:** "Wait, so if the pattern started on August 1 (a Thursday), and today is August 6 (a Tuesday), how do we know if it's Day 1 or Day 2 of the pattern?"

**Claude Code:** "We calculate the number of days between the pattern start date and today, then use modulo 2 to determine the cycle position."

**Me:** "...modulo?"

**Claude Code:** "The remainder after division. If days difference is even, it's the same day as the start. If odd, it's the other day."

**Me:** *googles "what is modulo"*

I spent 2 hours just testing this logic:
- Create subscription with Day 1: 1L, Day 2: 2L, Start: Aug 1
- Generate orders for Aug 1-14
- Manually verify each day matched the pattern

It worked. I still don't fully understand modulo arithmetic, but it worked.

### 3. **Delivery Tracking (Aug 6)** - "Planned vs Actual: A Novel"

This seemed straightforward: Record what was actually delivered vs what was planned.

But then:
- What if they delivered 1.5L when 1L was planned?
- What if they delivered 0L (customer wasn't home)?
- What about additional items (like butter or paneer)?
- How do we calculate variance?
- What's acceptable variance (+/- 20%)?

I ended up with:
- `deliveries` table with planned_quantity and actual_quantity
- `delivery_additional_items` table for extras
- Variance calculations with color-coded indicators
- Delivery performance reports

The report generation alone took 3 hours because I kept finding edge cases:
- What if an order has no delivery?
- What if a delivery has no order? (manual delivery)
- What if the variance is exactly 0?

Each time I thought I was done, I'd test with real data from our business and find another gap.

## The "Oh God, What Have I Done" Moments

### Moment #1: Invoice Generation (Aug 13)


![Invoice PDF template with PureDairy branding](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/vvqr1lqeoagxrkbrm5p6.png)


I needed invoices. Professional invoices. With GST. In PDF format.

**Me:** "I need to generate invoices as PDFs."

**Claude Code:** "We'll use Puppeteer to convert HTML to PDF."

**Me:** "What's Puppeteer?"

**Claude Code:** "It's a headless Chrome browser we can control programmatically."

**Me:** "We're... launching a whole browser... to make a PDF?"

**Claude Code:** "Yes."

**Me:** "That seems excessive."

**Claude Code:** "It's the best way to get professional PDFs from HTML templates."

**Me:** "...okay."

Installing Puppeteer:
```bash
pnpm add puppeteer
```

**Output:** Downloading Chromium... 150MB...

**Me, watching the progress bar:** "This is fine. Everything is fine."

Then came the invoice template. I spent an ENTIRE DAY on the invoice HTML:
- PureDairy logo positioning
- GST breakdown calculations
- Line items layout
- Subscription deliveries + manual sales in one invoice
- Footer with bank details
- Page breaks for multiple pages

I don't know CSS well. I know it even less after that day.

Favorite Claude Code moment:

**Me:** "The logo is showing up on the second page too. I want it only on page 1."

**Claude Code:** "Add this CSS: `@page { @top-left { content: ''; } }` and use `thead { display: table-header-group; }`"

**Me:** "I understood literally none of those words, but let me try it."

It worked. I still don't know why.

### Moment #2: Financial Year Logic (Aug 13)

Indian financial year runs April-March. Invoice numbering needed format: `YYYYYYYYNNNNN` (start year + end year + sequential number).

Example: First invoice of FY 2025-26 = `2025202600001`

**Me:** "How do we get the financial year from a date?"

**Claude Code:** "If the month is April or later, FY starts that year. Otherwise, it started the previous year."

**Me:** "So if it's March 2026, the FY is 2025-2026?"

**Claude Code:** "Correct. March 2026 is the last month of FY 2025-26."

**Me:** *brain melting* "Just... write the function."

```typescript
export function calculateFinancialYear(date: Date): { startYear: number; endYear: number } {
  const year = date.getFullYear()
  const month = date.getMonth()

  if (month >= 3) { // April = month 3 (0-indexed)
    return { startYear: year, endYear: year + 1 }
  } else {
    return { startYear: year - 1, endYear: year }
  }
}
```

I tested this for an hour with different dates, convinced it would break somewhere. It didn't.

### Moment #3: Payment Allocation (Aug 20-21)

This is where things got COMPLICATED.

Customers make payments. Those payments need to be allocated to:
1. **Invoices** (for subscription deliveries)
2. **Opening balance** (old outstanding from before the system)
3. **Direct sales** (cash/credit sales without invoices)

The payment screen needed to show:
- All unpaid invoices for this customer
- Their opening balance
- All unpaid credit sales
- Let the admin allocate the payment across all three

I read the conversation file `payment_gaps_conv.txt` where I asked Claude to analyze the entire payment system for gaps.

**Claude found 12 potential issues.**

Race conditions. Circular logic. Missing validations. Inconsistent outstanding calculations.

![SCREENSHOT: Payment allocation dialog showing multiple allocation options](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/twd80hnddubyq2yvejrm.png)


I spent 2 days fixing payment logic. The breakthrough came when Claude suggested:

**"Instead of calculating outstanding from payments, calculate it from invoices and sales. Payments reduce outstanding, they don't create it."**

Mind. Blown.

I'd been thinking about it backwards the entire time.

### Moment #4: The IST Timezone Migration (Aug 25)

**76 files. 76 files were using the wrong date pattern.**

The problem:
```typescript
// ❌ WRONG (uses local browser timezone)
new Date()
new Date().toISOString().split('T')[0]

// ✅ CORRECT (uses IST consistently)
getCurrentISTDate()
formatDateForDatabase(getCurrentISTDate())
```

Why does this matter?

If a customer in Jalgaon (IST) generates an order at 11 PM, and the browser thinks it's UTC (5.5 hours behind), it might generate the order for the NEXT day.

Invoice numbers could be wrong. Financial years could be wrong. Reports could be wrong.

**Everything date-related was potentially wrong.**

I created a Task in Claude Code to find and fix all 76 files.

**4 hours later:** All fixed. Zero TypeScript errors. All tests passing.

Do I fully understand timezone handling? No.
Do I trust the IST utilities now? Absolutely.

## The "I Have No Idea What I'm Doing" Moment

It was August 23. I was working on database migrations.

**Me:** "I need to re-enable Row Level Security policies."

**Claude Code:** "That's a breaking change. Many things will break, but we can fix them slowly."

**Me:** *panic rising* "MANY THINGS? How many things?"

**Claude Code:** "Potentially any query that accesses the database without proper authentication context."

**Me:** "...which is how many queries?"

**Claude Code:** "Most of them."

I sat there for 10 minutes, staring at the screen, thinking:

*"What am I doing? I don't understand RLS. I don't understand authentication contexts. I don't understand middleware. If this breaks, I don't know how to fix it. Why did I think I could build this? This is insane. I'm going to break everything and have nothing."*

Then I took a deep breath and asked:

**Me:** "Can we do this incrementally? Fix one thing at a time?"

**Claude Code:** "Yes. Let's start with the customers table and see what breaks."

**Me:** "Okay. Let's do that."

We fixed it. One table at a time. With Claude Code explaining each step.

That's the moment I realized: **I don't need to know everything. I need to know how to ask the right questions.**

## The Bulk Operations That Changed Everything

By late August, I had individual features working. But using them one-by-one was painful:

- Generate orders for 145 customers? 145 button clicks.
- Enter 50 sales? 50 forms.
- Process 30 payments? 30 allocation dialogs.

I needed bulk operations.

**Bulk Sales Entry (Aug 28):**
- Multi-row form with customer search
- Product selection with GST auto-calculation
- Keyboard shortcuts (Alt+A to add row, Tab on last field for new row)
- Real-time validation
- Progress tracking

**Bulk Payment Entry (Sept 2):**
- Same multi-row pattern
- Per-row allocation dialog
- Auto-add on save
- Real-time status badges

**Bulk Modifications (Oct 3):**
- Customer search with subscription filtering
- Product dropdown (only their active subscriptions)
- Type selection (Skip/Increase/Decrease/Add Note)
- Date range selection

These took FOREVER to build. Each one had unique challenges:

- How to validate 20 rows at once?
- How to handle partial success (10 succeed, 5 fail)?
- How to show progress without freezing the UI?
- How to make keyboard navigation feel natural?

But once they worked? *Chef's kiss.*

Data entry that used to take 2 hours now took 10 minutes.

## What I Actually Learned (vs What I Pretended to Learn)

**Things I Actually Understand Now:**
- Server Actions are like API endpoints but simpler
- Forms collect data, validation checks it, actions save it
- Dates are hard and timezones are harder
- Database relationships are important
- Good error messages save lives

**Things I Still Fake Understanding:**
- What exactly middleware is doing under the hood
- Why some things need to be client components
- What "hydration" means (I know it's bad when there's an error)
- Why TypeScript yells at me sometimes
- How Supabase RLS actually secures data

**Things I Just Trust:**
- If Claude Code says I need a package, I install it
- If the build succeeds, it's probably okay
- If tests pass, good enough
- If it works in dev, it'll probably work in production (narrator: it didn't always)

```
PS C:\Learn\Claude code projects\milk_subs> pnpm build

> milk_subs@0.1.0 build C:\Learn\Claude code projects\milk_subs
> next build

   ▲ Next.js 15.4.5
   - Environments: .env.local, .env

   Creating an optimized production build ...
 ✓ Compiled successfully in 9.0s

./src/lib/file-utils.ts
4:29  Warning: 'formatDateForDatabase' is defined but never used.  @typescript-eslint/no-unused-vars (118 Warning like this one)

info  - Need to disable some ESLint rules? Learn more here: https://nextjs.org/docs/app/api-reference/config/eslint#disabling-rules
 ✓ Linting and checking validity of types 
 ✓ Collecting page data    
 ✓ Generating static pages (56/56)
 ✓ Collecting build traces    
 ✓ Finalizing page optimization

Route (app)                                         Size  First Load JS
┌ ƒ /                                              182 B         101 kB
├ ○ /_not-found                                     1 kB         101 kB
├ ƒ /api/customers/with-unapplied-payments         182 B         101 kB
├ ƒ /api/invoices/bulk-generate                    182 B         101 kB
├ ƒ /api/print/customer-delivered-quantity         182 B         101 kB
├ ƒ /api/print/customer-invoice                    182 B         101 kB                  
├ AND MANY OTHERS
├ AND MANY OTHERS
├ AND MANY OTHERS
├ ƒ /dashboard/sales/products                      182 B         101 kB
├ ƒ /dashboard/sales/reports                       183 B         104 kB
├ ƒ /dashboard/settings                            182 B         101 kB
├ ƒ /dashboard/subscriptions                     5.57 kB         176 kB
├ ƒ /dashboard/subscriptions/[id]                  183 B         104 kB
├ ƒ /dashboard/subscriptions/[id]/edit             159 B         196 kB
├ ƒ /dashboard/subscriptions/new                   159 B         196 kB
└ ○ /icon.png                                        0 B            0 B
+ First Load JS shared by all                     100 kB
  ├ chunks/0a9a203b-524236b7ed69f56d.js          54.1 kB
  ├ chunks/7742-f909f68c9802a9dd.js              44.2 kB
  └ other shared chunks (total)                  2.09 kB


ƒ Middleware                                     67.6 kB

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

## The Resources That Kept Me Sane

Between coding sessions, I watched:

1. **[Ray Amjad](https://www.youtube.com/@RAmjad)** - AI Coding expert with amazing simplicity. Too much to learn from him.
2. **[Riley Brown](https://www.youtube.com/@rileybrownai)** - How to quickly develop an app.
3. **[Sean Kochel](https://www.youtube.com/@iamseankochel)** - Prompting guides and avoiding pitfalls.
4. **[100x Engineers](https://www.youtube.com/@100xEngineers)** - Varun Mayya, an amazing Indian content creator on AI.

I didn't watch to master anything. I watched to understand just enough to ask Claude Code better questions.

**Example:**

**Me initially:** "The thing isn't working."

**Me after watching tutorials:** "The server action is returning data, but the client component isn't re-rendering. Do I need revalidatePath?"

Better questions = better answers = faster progress.

## Tools That Actually Mattered

1. **Claude Code** - My primary coding partner. Wrote 90% of the code.
2. **Perplexity** - For quick answers to "what is X?" questions.
3. **YouTube** - For conceptual understanding.
4. **Supabase Dashboard** - For debugging database issues visually.
5. **Browser DevTools** - For finding why things looked broken (usually CSS).

That's it. No fancy setup. No paid courses. Just some paid tools and determination.

## By End of August: What Actually Worked

✅ **Customer Management** - 145 real customers migrated
✅ **Subscription System** - Daily + 2-day patterns working
✅ **Modification Tracking** - Skips, increases, decreases
✅ **Order Generation** - Automated daily orders
✅ **Delivery Tracking** - Planned vs actual with variance
✅ **Payment Management** - Multi-allocation support
✅ **Invoice Generation** - Professional PDFs with GST
✅ **Sales Tracking** - Cash/Credit/QR payment support
✅ **Outstanding Reports** - Triple-level expandable reports
✅ **Bulk Operations** - Sales, payments, modifications

From August 5 to August 29: **24 days.**

Not perfect. But functional. Actually usable. Ready for real testing.

## The Lessons I Learned the Hard Way

1. **Start Messy, Refine Later** - My first invoice template was ugly. It got better. Don't wait for perfect.

2. **Real Data Exposes Real Problems** - Testing with "Customer A" and "Customer B" didn't show the issues that 145 real customers exposed.

3. **Complex Features Are Just Many Simple Features** - Payment allocation felt impossible until I broke it into: select invoice, enter amount, validate, save, update outstanding. Simple steps.

4. **AI Doesn't Read Your Mind** - Clear explanations = better code. "Make a payment system" vs "Create a form where admins can allocate a payment across multiple invoices, sales, and opening balance with validation" = very different results.

5. **You Don't Need to Understand Everything** - I still don't fully understand half the code. But I understand the business logic, and that's enough to direct the AI.

6. **Panic is Part of the Process** - Every "this will break everything" moment passed. Every one.

7. **Build for Real Use, Not Portfolio** - I wasn't trying to impress anyone. I was trying to stop losing money on spoiled milk. That focus helped.

## What's Next

In Part 3, I'll take you through the real test: **actually using this thing in production.**

Spoiler: I found bugs I never imagined. I discovered workflows that made no sense in practice. I had to explain to my 60-year-old admin how a "browser" works.

But it's working. Real customers. Real data. Real business running on software I built.

**Part 3 coming soon: "From Dev to Dairy: Production Testing, Real Bugs, and Lessons for Fellow Vibe Coders"**

---

**Read the series:**
- [Part 1: Why I Built an ERP](https://dev.to/dishankg/why-i-built-an-erp-for-my-dairy-business-and-why-you-should-too-19gg)
- Part 2: The Coding Journey (You Are Here)
- Part 3: Production Testing & Lessons

---

**About Me:** I'm Dishank, a dairy farmer in Jalgaon, Maharashtra, learning to code with AI to solve real business problems. Follow along at [dev.to/dishankg](https://dev.to/dishankg).

**Your Questions:**
- "How did you handle X?" - Probably poorly at first, then Claude Code fixed it.
- "Did you really not know Y?" - Correct. Still don't fully understand it.
- "Can I do this too?" - Yes. If I can, you definitely can.

Drop questions below! I'll answer honestly, including the parts I still don't understand.

*This and all the posts in this series are written with full assistance from Claude Code, but reflect my actual stories, experiences and problems to the fullest*

---

*Part 3 is where it gets real: bugs in production, explaining "the internet" to my admin, and why testing with real users is both terrifying and essential.*
