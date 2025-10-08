# PART 3 - From Dev to Dairy - Production Testing, Real Bugs, and Lessons for Fellow Vibe Coders
## The Moment of Truth

It's September 15, 2025. I'm sitting in my office at PureDairy in Jalgaon, staring at a laptop screen showing 145 real customers in my database.

Three weeks ago, this was just an idea—a crazy plan to build an ERP with zero coding experience.

Now? It's real. It's working. And it's about to face the ultimate test: **real people using it for real work.**

**Me to my team:** "Starting tomorrow, we're using this for everything. No more Excel."

**Response:** Cautious optimism mixed with "let's see if this actually works."

**Me, internally:** *This is either going to be amazing or a complete disaster.*


![SCREENSHOT: Dashboard showing real customer data - anonymized](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/0sxldn4jz0jkj4u5b1yj.png)

## How My Team Found 47 Design Flaws in 48 Hours

I thought I'd built a great system. I'd tested everything. Or so I believed.

**Reality check:** I'd tested what I THOUGHT users would do, not what they ACTUALLY do.

My team became my best QA testers. Every "this doesn't work" revealed assumptions I didn't know I had. Within 48 hours, they'd found 47 issues I would never have caught testing alone.

Here are the most humbling ones:

### Issue #1: The Search That Required Psychic Powers (Day 1, 9:00 AM)

**Team:** "I can't find Mrs. Sharma's account."

**Me:** "Did you search for her name?"

**Team:** "Yes. 'sharma'. Nothing shows up."

**Me:** *checks database* "It's stored as 'Sharmaa' with two A's."

**My Design Failure:** I built a search that required EXACT spelling. Who builds search like that in 2025?

**The Fix (via Claude Code):** Implemented fuzzy search with case-insensitive matching. Now "sharma", "Sharma", "SHARMA", and "Sharmaa" all work.

**Time to fix:** 20 minutes of coding, 30 minutes of embarrassment.

**What I learned:** Real-world data is messy. Names have spelling variations. Search needs to be forgiving, not pedantic.

### Issue #2: The Invisible Save Button (Day 1, 11:00 AM)

**Team:** "I marked this delivery as completed, but it's still showing as pending."

**Me:** *looks at form* "Did you click the save button?"

**Team:** "What save button?"

**Me:** *realizes* "...oh no."

**My Design Failure:** I forgot to add a save button. The form looked complete but did nothing when you filled it out.

**The Fix:** Added the button. Yes, I forgot to add a save button. To a form. That people fill out.

**Time to fix:** 5 minutes.

**What I learned:** Test EVERY interaction. Don't assume "obvious" buttons exist. Actually click them.

### Issue #3: The Payment System That Rejected Reality (Day 2, 2:00 PM)

**Team:** "The app won't let me allocate this payment."

**Me:** "What's the error?"

**Team:** "It says 'amount exceeds invoice total'. The invoice is ₹1,200 and the customer paid ₹1,500."

**Me:** "Well, you can't pay more than the invoice amount—"

**Team:** "They overpaid. Customers do that all the time."

**Me:** "...they do?"

**Team:** "Yes. They round up. It's normal."

**My Design Failure:** My validation logic prevented overpayments because I didn't think they happened. They happen ALL THE TIME.

**The Fix (via Claude Code):** Allow overpayments, create "unapplied_payments" entries for the excess, show clear message explaining the split.

**Time to fix:** 2 hours (touched payment logic across multiple files).

**What I learned:** Ask your team about edge cases. They know the business better than you do.

![SCREENSHOT: Payment allocation dialog showing overpayment handling](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/11wmb6eydoblthmme03s.png)


### Issue #4: Search That Assumed Too Much (Day 2, 4:00 PM)

**Team:** "How do I find the customer on Route 1, house number 47?"

**Me:** "Search by their name."

**Team:** "I don't remember their name. I remember they're on Route 1, near the temple."

**Me:** "Oh. You can't search by that."

**Team:** "But that's how we think about customers—by location and route, not names."

**My Design Failure:** I assumed everyone searches by customer name. In reality, delivery personnel think in routes, landmarks, and house numbers.

**The Fix:** Added filters for route, delivery time, and area. Added sorting by delivery sequence.

**Time to fix:** 3 hours.

**What I learned:** Don't design based on how YOU think. Design based on how USERS think.

### Issue #5: The Date Timezone Bug I Thought I'd Fixed (Day 3, 8:00 AM)

Remember that IST timezone migration where I fixed 76 files? I missed one.

**Team:** "Orders generated for yesterday instead of today."

**Me:** *checks timestamp* "It's 11:45 PM. Should be generating for today."

**Team:** "But it says yesterday's date."

**My Design Failure:** ONE function in the reports module was still using `new Date()` instead of `getCurrentISTDate()`. At 11:30 PM IST, UTC was still the previous day.

**The Fix:** Found and fixed the last remaining timezone issue.

**Time to find:** 3 hours. **Time to fix:** 5 minutes.

**What I learned:** "I fixed all of them" is a dangerous assumption. Test edge cases at 11:59 PM.

### Issue #6: The Double-Click Disaster (Day 4, 10:00 AM)

**Team:** "I generated an invoice for Mrs. Reddy, and it created two identical PDFs."

**Me:** "How did that happen?"

**Team:** "I clicked 'Generate Invoice', it was taking time, so I clicked again to make sure it registered."

**My Design Failure:** No button disable during PDF generation. Users could click multiple times and create duplicates.

**The Fix:** Disable button on first click, show loading spinner, re-enable on completion or error.

**Time to fix:** 15 minutes.

**What I learned:** Users are impatient (rightfully so). If something is loading, SHOW THEM IT'S LOADING.

## The Breakthroughs (When It Actually Worked)

### Breakthrough #1: The 8-Second Miracle

Day 5, 6:00 AM. First real production use of order generation.

I clicked "Generate Orders for Today."

**The system:**
- Loaded 145 customers
- Checked their active subscriptions
- Applied 2-day pattern logic for 37 customers
- Applied 12 active modifications (skips and increases)
- Calculated quantities and prices
- Created 132 orders (13 customers had no active subscriptions)
- Generated production summary report
- Generated route-wise delivery lists for a whole month that led to more than 3000 deliveries

**Time taken: 8 seconds.**

My team watched the progress bar complete and just stared at the screen.

**Before:** 45 minutes of manual Excel work, cross-checking notes, verifying phone numbers.

**After:** 8 seconds. Automated. Accurate.

No one said anything for a moment. Then: "Can we trust this?"

**Me:** "Let's verify the first 20 orders against our manual list."

We did. **Perfect match.**

**Team reaction:** "This is going to save us hours every day."


![SCREENSHOT: Order generation success message with count](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/03om5ngjfzwi3tbqnzl0.png)


### Breakthrough #2: Professional Invoices That Changed Perception

Day 7. First real invoice generated and printed.

Professional PDF. PureDairy branding. GST calculations. Itemized deliveries. Bank details. Everything.

**Team reaction:** "This looks like it came from a big company."

**Me:** "We ARE a legitimate company."

Before this system, we used handwritten bills with carbon copies. Now we have invoices that look like they belong in a corporate office.

**Unexpected benefit:** Customers started paying faster. Professional invoices signal professionalism. Who knew?

### Breakthrough #3: The Outstanding Report That Actually Made Sense

Day 10. First time running the full outstanding report with real data.

**Output:**
- Total outstanding: ₹2,34,500
- Broken down by customer
- Then by type (invoices, opening balance, credit sales)
- Then by individual transactions
- With complete payment allocation history

**Team:** "Wait, we can see EXACTLY what each customer owes?"

**Me:** "Yes. Down to the paisa."

**Team:** "And WHY they owe it?"

**Me:** "Invoice number, date, amount, what's been paid, what's pending."

For the first time in 5 years of running this business, we had crystal clear financial visibility.

No more "I think they owe around ₹5,000."

Now it's: "They owe ₹5,234.50 across 3 invoices and 1 credit sale from September 3, with ₹1,000 paid on September 10 allocated to invoice #2025202600147."

![SCREENSHOT: Outstanding report showing customer breakdown](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/ljifenfrwvw7f19dxm5f.png)


### Breakthrough #4: The Mistake We Caught BEFORE It Happened

Day 14. A customer called: "We'll be out of town September 20-25."

**Old process:**
1. Write it down somewhere
2. Hope someone sees it
3. Probably forget
4. Deliver milk anyway
5. Lose money on spoiled milk
6. Apologize to angry customer

**New process:**
1. Open Modifications
2. Add Skip for that date range
3. Save

**Result:** Orders for those dates automatically show 0 quantity. No delivery scheduled. No milk wasted.

**The customer:** Never knew how close we came to messing up. Because we didn't.

**Team reaction:** "This is what we've needed for years."

## What My Team Taught Me About Building Software

### Lesson #1: Desktop vs Web Isn't About Intelligence

My team was used to desktop software: double-click icon, program opens.

Web apps work differently: open browser → type URL → bookmark for later.

**This wasn't a knowledge gap. It was a different mental model.**

Desktop apps = programs you install.
Web apps = websites that act like programs.

**Solution:** I created desktop shortcuts that opened the browser directly to the app. Bridged the gap between mental models.

**What I learned:** Don't design for "tech-savvy" vs "non-tech." Design for mental models and workflows.

### Lesson #2: Your Test Data Lies to You

I tested with clean data:
- "Customer A", "Customer B"
- Perfect spelling
- Consistent phone formats
- No edge cases

**Real data:**
- Names spelled 5 different ways
- Phone numbers with/without country codes
- Addresses like "near the temple, blue gate"
- Notes in random fields
- Edge cases EVERYWHERE

**What I learned:** Test with real data from Day 1. Export your messiest Excel sheet and use that.

### Lesson #3: "Obvious" Features Aren't Obvious

**Me:** "I added bulk payment entry. You can process 20 payments at once!"

**Team:** "Why would we do that?"

**Me:** "Instead of entering them one by one?"

**Team:** "We only get 2-3 payments a day."

**Me:** "What about month-end when customers pay in cash?"

**Team:** "Oh! That takes 2 hours. We can do them all at once now?"

**What I learned:** Features aren't valuable until users see them solving THEIR specific pain point.

### Lesson #4: Users Reveal What You Actually Need to Build

I spent 4 hours building a "Customer Timeline" showing every interaction.

**Usage count:** 0. Never used.

**Why?** My team doesn't care about timelines. They care about:
1. What does this customer owe?
2. What are they getting today?
3. Any special instructions?

**What I learned:** Watch users work. Find pain points. Build solutions for those. Not for what looks cool.

### Lesson #5: Error Messages Should Speak Human

**My original error:** "Foreign key constraint violation: 23503"

**Team:** "What does this mean?"

**Me:** *looks it up* "You're trying to create an order for a customer with no active subscription."

**Team:** "Then why doesn't it say that?"

**Me:** "...good point."

**New error:** "Cannot create order: This customer has no active subscriptions. Please add a subscription first."

**What I learned:** Error messages should explain the problem AND the solution. In plain language.

## The Real Impact (Numbers Don't Lie)

After 2 months of production use with 145 real customers:

### Time Savings:
- **Order generation:** 45 min → 8 sec (99.7% reduction)
- **Invoice creation:** 30 min → 2 min (93% reduction)
- **Payment tracking:** 60 min/day → 10 min/day (83% reduction)
- **Finding customer info:** 5 min → 10 sec (96% reduction)

**Total time saved per day:** ~2.5 hours
**Total time saved per month:** ~75 hours

That's nearly 2 full-time employees worth of productivity gained.

### Errors Eliminated:
- **Delivery mistakes:** 8-10/month → 0 (100% reduction)
- **Payment allocation errors:** 3-5/month → 1 (80% reduction)
- **Invoice mistakes:** 2-3/month → 0 (100% reduction)

### Money Saved:
- **Spoiled milk from wrong deliveries:** ~₹5,000/month → ₹0
- **Customer refunds for mistakes:** ~₹2,000/month → ₹0
- **Labor time saved (valued at ₹200/hour):** ~₹15,000/month

**Total monthly savings: ~₹23,000**
**Annual savings: ~₹2,76,000**

**Development cost: ₹5000 (just my time learning, little cost of Claude code pro subscription)**

**ROI: Infinite** (because initial cost was as good as zero)


## What's Working (And What Isn't)

### Working Great:

✅ **Order Generation** - Daily orders in 8 seconds, zero mistakes
✅ **Modification Tracking** - No more forgotten vacation skips
✅ **Invoice Generation** - Professional PDFs with GST compliance
✅ **Outstanding Tracking** - Complete financial visibility
✅ **Bulk Operations** - 2-hour tasks done in 10 minutes
✅ **Reports** - Production summaries, route lists, payment tracking

### Still Needs Work:

🔧 **Mobile Responsiveness** - Some tables don't display well on phones
🔧 **Search Performance** - Slowing down with more data
🔧 **Loading States** - Not all actions show clear feedback
🔧 **Offline Support** - Delivery personnel need offline capability
🔧 **Error Recovery** - Need better handling of network failures

### Lessons from What Isn't Working:

I didn't build mobile-first. Big mistake. Delivery happens in the field on phones.

**Fix planned:** Progressive Web App (PWA) with offline support.

**What I learned:** Build for the actual usage context, not your development environment.

## What I'd Do Differently

### 1. Study Some Coding Fundamentals First

I jumped in completely blind. While that worked, I wasted hours on things that 2 weeks of basic coding tutorials would've prevented.

**What I should've learned first:**
- Basic JavaScript/TypeScript syntax
- How React components work (at least conceptually)
- What a database query looks like
- Basic Git commands

**Why this matters:** You can still use AI to write code, but understanding fundamentals helps you:
- Ask better questions
- Spot obvious mistakes
- Understand what the AI is suggesting
- Debug issues faster

**Time investment:** 2-3 weeks of YouTube tutorials would've saved me months of confusion.

### 2. Start with a Vision (Even If Imperfect)

I built features reactively: "Oh, we need this. Now we need that."

**Better approach:** Spend a week mapping out the entire system:
- What are ALL the features needed?
- How do they connect?
- What's the data flow?
- What's the user journey?

**This doesn't mean perfect planning.** It means having a rough mental model of the complete system before coding your first feature.

**Why this matters:** I rebuilt the payment system 3 times because I didn't understand how it connected to invoices, sales, and outstanding calculations. A rough vision would've prevented that.

### 3. Always Understand What AI Wants to Do First

This is the biggest mistake I made.

**What I did:**
- Ask Claude Code to build something
- Copy-paste the code
- Run it
- Hope it works
- Get confused when it doesn't

**Like a monkey jumping around without thinking.**

**What I should've done:**
1. Ask Claude Code to explain the approach first
2. Understand the logic before seeing code
3. Ask questions about parts I don't understand
4. THEN have it write the code
5. Review the code with understanding

**Example:**

**Bad approach (what I did):**
> Me: "Build a payment allocation system"
> Claude: *generates 200 lines of code*
> Me: *copies without reading* "It doesn't work!"

**Good approach (what I should've done):**
> Me: "Explain how a payment allocation system should work"
> Claude: "First, you need to track payments. Then create mappings to invoices..."
> Me: "Wait, why do we need separate mapping tables?"
> Claude: "Because one payment can be split across multiple invoices..."
> Me: "Ah! Now I understand. Show me the code."

**Why this matters:** When you understand the approach, you can:
- Spot logical errors before implementation
- Modify the solution for your specific needs
- Debug issues without asking AI every time
- Learn from each implementation

### 4. Remember: AI is Support, Not You

AI writes code. **You** are the developer.

**What this means:**
- YOU define requirements
- YOU understand business logic
- YOU make architectural decisions
- YOU test with real scenarios
- YOU are responsible for what ships

**AI is a powerful assistant, not a replacement for thinking.**

**What I got wrong:** I treated Claude Code like a magic box. Put in requirements, get out working code.

**Reality:** Claude Code is like a junior developer who:
- Writes code faster than you
- Knows syntax better than you
- But doesn't understand YOUR business
- And can't test YOUR specific workflows

**Your job:** Be the senior developer who directs, reviews, tests, and ensures quality.

**Why this matters:** The moment you stop thinking and blindly trust AI is the moment you ship broken code.

### 5. Test with Real Data from Day 1

I wasted 2 weeks building features that broke with real data.

**Better approach:** Export your messiest Excel data on Day 1. Use that for all testing.

**Why this matters:** Clean test data ("Customer A", "Customer B") doesn't reveal:
- Spelling variations
- Missing fields
- Edge cases
- Real-world complexity

Real data breaks your assumptions early, when it's cheap to fix.

### 6. Involve Users Earlier

I should've had my team testing from Day 3, not Day 21.

**Why this matters:** They would've caught design flaws before I built entire features around wrong assumptions.

**One week of user testing saves one month of rebuilding.**

## Lessons for Fellow Vibe Coders

### 1. Your Users Are Your Best Teachers

Every "this doesn't work" is actually "you made an incorrect assumption."

Listen. Learn. Fix.

### 2. Real-World Usage Reveals Real Requirements

No amount of planning beats 48 hours of real users doing real work.

Ship early. Get feedback. Iterate.

### 3. Design Failures Aren't User Errors

If users can't figure out your interface, that's YOUR failure, not theirs.

Make it obvious. Make it forgiving. Make it helpful.

### 4. Perfect Code < Working Software

My code isn't perfect. Some functions are too long. Some components do too much.

But it works. It saves time. It solves problems.

Ship imperfect solutions that work over perfect solutions that never ship.

### 5. Mental Models Matter More Than Features

Don't build what you think is intuitive. Build what matches how users actually think.

Route → Customer → Order, not Customer → Order → Route.

### 6. Test at 11:59 PM

Edge cases live at boundaries:
- 11:59 PM (date changes)
- Month end (financial periods)
- Year end (financial years)
- First/last customer (sorting)
- 0 quantity (empty states)

Test there.

### 7. AI Writes Code, You Ensure It's Right

Claude Code wrote 90% of my code. But I:
- Defined the requirements
- Tested with real data
- Found the bugs
- Verified the fixes
- Made the decisions

AI is a powerful tool. YOU are still responsible for the outcome.

## The Question Everyone Asks

**"Can I really build production software with no coding experience?"**

**My honest answer:** Yes, but it's not magic. Here's the reality:

### What You CAN Do:

1. **Build real solutions to real problems** - If you understand the problem deeply
2. **Ship working software** - Not perfect, but functional
3. **Learn on the job** - YouTube tutorials + AI coding + real testing
4. **Save money** - ₹0 development cost vs ₹50,000+ for commercial ERP
5. **Customize perfectly** - Built exactly for YOUR business needs

### What You CAN'T Do (At Least Not Yet):

1. **Build it in 3 days** - My Day 1 was foundation. Day 30 was usable. Day 60 was solid.
2. **Understand everything** - I still don't know what half the code does
3. **Avoid all bugs** - 47 bugs in 48 hours. That's normal.
4. **Skip the learning curve** - You'll spend hours on YouTube, reading docs, asking AI
5. **Ignore user feedback** - Your assumptions WILL be wrong

### The Realistic Timeline:

- **Week 1:** Core features (messy but working)
- **Week 2-3:** Refinements and testing
- **Week 4-6:** Bug fixes and real usage
- **Month 3+:** Optimization and improvements

**This is a marathon, not a sprint.**

## Where I Am Now (October 2025)

The app is in production with 145 customers. Real business operations depend on it daily.

**Current status:**
- ✅ Daily orders generated automatically
- ✅ Deliveries tracked accurately
- ✅ Invoices sent professionally
- ✅ Payments allocated correctly
- ✅ Outstanding tracked precisely
- 🔧 Mobile optimization ongoing
- 🔧 Performance improvements in progress

**What's changed:**
- Zero delivery mistakes in 1.5 months
- 3 hours saved every day
- ₹23,000 saved every month
- Professional image with customers
- Complete financial clarity
- Confidence that I can build solutions

**Most importantly:** I'm not afraid of technology anymore. I don't wait for permission to build solutions.

**I'm a dairy farmer who codes. And it's working.**

## What's Next

I'm planning to:

1. **Open-source the dairy-specific logic** - Help other dairies
2. **Build customer self-service portal** - Let customers manage subscriptions
3. **Create video tutorials** - Show other business owners how
4. **Optimize for mobile** - Better field experience
5. **Add offline support** - Work without internet

**And most importantly:** Help others do the same.

Because if a dairy farmer in Jalgaon can build an ERP with AI, **anyone can solve their business problems with code.**

## For My Fellow Vibe Coders

You don't need to understand everything to build something valuable.

You need:
- A real problem you understand deeply
- Willingness to learn (YouTube + AI + testing)
- Patience with yourself and your users
- Courage to ship imperfect solutions
- Openness to feedback

**Start today.**

Not tomorrow. Not when you "know enough." Today.

Describe your problem to Claude Code. Let it write the first line.

Then the second. Then the third.

**You'll make mistakes.** (I made 47 in 48 hours)

**You won't understand everything.** (I still don't)

**Your users will find issues.** (They're your best teachers)

**But you'll build something that works.**

And that's what matters.

---

## **Read the Complete Series:**

- [Part 1: Why I Built an ERP for My Dairy Business](https://dev.to/dishankg/why-i-built-an-erp-for-my-dairy-business-and-why-you-should-too-19gg)
- [Part 2: Vibe Coding Through Subscriptions, Payments, and PDF Nightmares](https://dev.to/dishankg/vibe-coding-through-subscriptions-payments-and-pdf-nightmares-4bp8)
- Part 3: Production Testing & Lessons (You Are Here)

**Series:** *From Dairy Farmer to Developer: Building a Production ERP with AI*

---

**Follow my journey:** [dev.to/dishankg](https://dev.to/dishankg)

**Questions? Want to try this yourself?** Drop a comment. I'll answer honestly, including "I don't know, but here's how I'd figure it out."

*This and all the posts in this series are written with full assistance from Claude Code, but reflect my actual stories, experiences and problems to the fullest.*

---

**To my fellow vibe coders, non-technical founders, and small business owners:**

You don't need permission to solve your problems with code.

You just need to start.

**Now go build something.**

_This and all the posts in this series are written with full assistance from Claude Code, but reflect my actual stories, experiences and problems to the fullest_

---

*Dishank Gupta*
*Dairy Farmer | Vibe Coder | Building solutions with AI*
*Jalgaon, Maharashtra, India*

---

*Stay tuned for more*
