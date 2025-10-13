# **PART 1: Why I Built an ERP for My Dairy Business (And Why You Should Too)**
## The ₹800 Mistake That Changed Everything

It was mid-July 2025. A customer had asked us to skip their daily milk delivery from July 15-20 because they were going on vacation. They told us in mid-June—plenty of notice, right?

We wrote it down. Multiple times. In multiple places.

And we still delivered milk to their house. Every. Single. Day.

For five days, 2 liters of fresh milk sat outside their locked door in the Jalgaon heat. Spoiled. Wasted. Gone.

Cost to us: ₹800 in lost milk.
Cost to our reputation: One very angry customer.
Cost to my sanity: Watching this happen again and again and again.

This wasn't a one-time thing. This was **every week**. Different customers, same story. Manual notes failed. WhatsApp reminders failed. Even printed schedules taped to the delivery vehicle failed.

I run PureDairy in Jalgaon, Maharashtra—a small town where tech is still catching up. We have 50 animals, 5 employees, and about 150 customers. We're not a big operation. We can't afford expensive ERPs that cost lakhs of rupees.

But we also can't afford to keep losing money on spoiled milk and frustrated customers.

So on August 5, 2025, I did something crazy.

I decided to build my own ERP system.

From scratch.

With zero coding experience.


![SCREENSHOT: Dashboard of the final app showing customer stats](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/cs0t315dtb04dnmokcp1.png)


## "But You Don't Know How to Code!"

Correct. I didn't know what Next.js was. I didn't know what Supabase was. I didn't know what TypeScript was.

But I knew my dairy business inside out. And I had Claude Code.

If you've read my previous posts ([here](https://dev.to/dishankg/from-non-coder-to-production-in-4-days-my-ai-powered-app-journey-and-why-imperfect-is-perfect-56n6) and [here](https://dev.to/dishankg/ai-pair-programming-magic-building-an-advanced-blog-system-in-one-session-and-why-i-chose-1phb)), you know I'm a "vibe coder"—someone who codes by intuition, AI assistance, and sheer determination rather than formal training.

I'd built a few projects before (a task manager, a coloring page generator, a blog system). But those were hobby projects. This was different.

**This had to work. Real customers. Real money. Real consequences.**

## The Decision Point

Here's what I knew I needed:

1. **Customer Management** - Profiles, contact info, delivery routes
2. **Subscription System** - Daily deliveries, 2-day patterns (like Mon: 1L, Tue: 2L, repeat)
3. **Modification Tracking** - Skips, increases, decreases with date ranges
4. **Order Generation** - Automated daily orders from subscriptions
5. **Delivery Confirmation** - Track what was actually delivered vs planned
6. **Payment Management** - Track payments and outstanding amounts
7. **Invoice Generation** - Professional PDFs with GST compliance
8. **Sales Tracking** - Manual cash/credit sales
9. **Reports** - Production summaries, delivery lists, outstanding reports

I looked at existing dairy management software:
- **Option 1:** Big ERPs - ₹50,000-₹2,00,000+ setup costs + monthly fees
- **Option 2:** Generic apps - Didn't fit our specific workflows
- **Option 3:** Excel - What we were already doing (and failing at)
- **Option 4:** Build it myself - ₹0 + my time + learning

The choice was obvious. I'd rather spend time learning than money we don't have.

## Day 1: August 5, 2025 - "Let's Just Start"

I opened Claude Code at 6:00 PM IST with one simple goal: **Get something running.**

I didn't have a perfect plan. I didn't have a complete design. I just had a requirements document I'd typed out explaining what a dairy business needs.

**6:00 PM - Project Setup**

```bash
create-next-app milk_subs --typescript --tailwind --app
cd milk_subs
pnpm install
```

I had no idea what half of those flags meant. But Claude Code did.

**7:30 PM - Database Schema**

By 7:30 PM, I had a Supabase PostgreSQL database with 9 tables:
- `customers` - Billing info, contact details, routes
- `products` - Cow Milk (₹75/L), Buffalo Milk (₹80/L)
- `routes` - Route 1 & Route 2 with personnel
- `base_subscriptions` - Daily and 2-day pattern support
- `modifications` - Temporary changes with date ranges
- `daily_orders` - Generated orders with pricing
- `deliveries` - Actual delivery tracking
- `payments` - Payment history
- `product_pricing_history` - Price audit trail


![SCREENSHOT: Today's Supabase table and views list (didn't have old screenshot so used this.)](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/f5bvwcsknbg3aoinvw85.png)

I didn't design this schema. I described my business to Claude Code:

> "We deliver milk in the morning and evening. Some customers get 1L every day. Some get 1L on odd days and 2L on even days. We need to track when they skip, increase, or decrease deliveries temporarily. We need to know what we actually delivered vs what was planned. We need to track payments and outstanding balances."

Claude Code turned that into a normalized database schema with foreign keys, constraints, and proper relationships.

**9:00 PM - Authentication + UI**

By 9 PM, I had:
- Login/logout working (Supabase Auth)
- Protected admin routes
- A responsive dashboard with a sidebar
- Mobile-friendly navigation
- Indian Rupee (₹) formatting

**10:00 PM - Customer Management**

By 10 PM, I could:
- Add customers with billing names and contact persons
- Store 3 phone numbers per customer
- Assign them to routes
- Set delivery times (Morning/Evening)
- Track opening balances

**11:00 PM - Subscription System**

This is where it got interesting. I needed to explain subscription patterns:

**Me:** "Some customers want the same quantity every day—that's easy. But some want alternating patterns. Like Day 1: 1 liter, Day 2: 2 liters, then repeat. Based on a start date."

**Claude Code:** "Got it. We'll store daily_quantity for fixed subscriptions and pattern_day1_quantity + pattern_day2_quantity + pattern_start_date for alternating patterns."

By 11 PM, the subscription system was working. I could create subscriptions, see 14-day pattern previews, and the system would automatically calculate which day of the pattern we were on.


![SCREENSHOT: Subscription creation form or pattern preview](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/hbx2bgjw7c2g3upoi09p.png)


## What I Actually Understood vs What I Faked

Let me be honest about what I knew at this point:

**What I Understood:**
- Forms collect data and save it to database
- Tables display data from database
- Dates are hard (timezone issues everywhere)
- Buttons need to do something when clicked

**What I Had No Clue About:**
- What "Server Actions" were
- Why some components were "client" and some were "server"
- What the hell "middleware" did
- Why everyone kept talking about "revalidation"
- What Row Level Security actually secured

**What I Just Trusted:**
- If Claude Code said it needed TypeScript, fine
- If it said use Zod for validation, okay
- If it said I need this package, I installed it
- If it compiled without errors, good enough

## The Resources That Saved Me

I spent the gaps between coding sessions watching YouTube:

1. **[Ray Amjad](https://www.youtube.com/@RAmjad)** - AI Coding expert with amazing simplicity. Too much to learn from him.
2. **[Riley Brown](https://www.youtube.com/@rileybrownai)** - How to quickly develop an app.
3. **[Sean Kochel](https://www.youtube.com/@iamseankochel)** - Prompting guides and avoiding pitfalls.
4. **[100x Engineers](https://www.youtube.com/@100xEngineers)** - Varun Mayya, an amazing Indian content creator on AI.

I didn't watch them to become an expert. I watched them to understand just enough to ask Claude Code better questions.

When Claude Code said "We'll use Server Actions for this," I'd watch a 10-minute video on Server Actions. Not to master them, but to know what Claude was talking about.

## End of Day 1: 11:30 PM

By 11:30 PM on August 5, 2025, I had:

✅ Complete database structure (9 tables)
✅ Authentication system
✅ Customer management (CRUD operations)
✅ Subscription management with 2-day patterns
✅ Mobile-responsive UI
✅ All code compiling without errors

From 6:00 PM to 11:30 PM. **5.5 hours.**

I didn't write most of this code. Claude Code did. But I understood the business logic. I tested every feature. I knew what each button should do and verified that it worked.

Was the code perfect? Probably not.
Did it work? Yes.
Could I keep building on it? Absolutely.

## Why This Matters for You

If you're a small business owner like me, sitting with Excel sheets that aren't cutting it anymore, here's what I learned on Day 1:

1. **You Don't Need to Know Everything** - I didn't know React, Next.js, or TypeScript. I learned just enough to direct Claude Code.

2. **Start with What You Know** - I knew my dairy business. I knew what deliveries looked like, what customers needed, what went wrong. That was enough.

3. **Real Problems > Perfect Code** - I wasn't trying to build the "best" ERP. I was trying to stop losing ₹800 on spoiled milk.

4. **AI is a Co-Pilot, Not Auto-Pilot** - Claude Code couldn't read my mind. I had to explain my business clearly. The clearer I was, the better it coded.

5. **Ship Fast, Learn Faster** - By the end of Day 1, I had working software. Not finished. Not perfect. But working. That momentum is everything.

## What's Next

In Part 2, I'll take you through the full development journey—from modifications and orders to the nightmare that was PDF invoice generation, the payment allocation system that almost broke me, and the IST timezone migration that made me question everything.

Spoiler: I built a complete dairy ERP in about 3 weeks. It's now running in production with 145 real customers.

But it wasn't smooth. There were moments I wanted to quit. Moments I had no idea what I was doing. Moments where Claude Code said "this is a breaking change" and I panicked.

**Part 2 coming soon: "Vibe Coding Through Subscriptions, Payments, and PDF Nightmares"**

---

**Read the series:**
- Part 1: Why I Built an ERP (You Are Here)
- Part 2: The Coding Journey 
- Part 3: Production Testing & Lessons 

---

**About Me:** I'm Dishank, a dairy farmer in Jalgaon, Maharashtra, learning to code with AI. Follow my journey at [dev.to/dishankg](https://dev.to/dishankg).

**Want to try this yourself?** You don't need my exact code. You need Claude Code (or similar AI tools), a clear problem, and the willingness to ask "dumb" questions until things work.

**Questions? Comments?** Drop them below! I'll answer everything honestly—including the stuff I still don't understand.

*This and all the posts in this series are written with full assistance from Claude Code, but reflect my actual stories, experiences and problems to the fullest*

---

*Next up: Part 2 - where things get messy, I learn about database migrations the hard way, and invoice generation becomes my nemesis.*
