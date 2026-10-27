TRADEPILOT FULL BUILD FINAL

This is a COMPLETE upload folder. Do not merge it with older folders.
Unzip this ZIP, then drag the whole unzipped folder into Netlify Drop.

Included:
- index.html
- styles.css
- app.js
- manifest.json
- netlify.toml
- netlify/functions/check-access.js
- netlify/functions/stripe-webhook.js
- supabase/user_access.sql

Behavior:
- Free Preview opens without login.
- Pro $29 opens Stripe without login.
- AI $79 opens Stripe without login.
- If email is typed, Stripe checkout is pre-filled.
- If no email is typed, Stripe checkout still opens.
- Login is only required to access paid dashboard after payment.
- Master owner emails unlock full AI access automatically.
- App can switch between Free, Pro, and AI.
- Instant unlock polling runs after payment return.

Master owner emails:
- timeeka99@me.com
- nefera99@gmail.com
- pinnacleperformancetax@gmail.com

Payment links:
Pro: https://buy.stripe.com/eVq14h3tF0sR6Hg3IPaEE02
AI:  https://buy.stripe.com/14A3cpe8j1wVc1A5QXaEE04

Required Netlify Environment Variables:
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
STRIPE_WEBHOOK_SECRET

Webhook endpoint:
https://benevolent-toffee-cc5f3a.netlify.app/.netlify/functions/stripe-webhook

Webhook events:
checkout.session.completed
invoice.payment_succeeded
customer.subscription.deleted


MASTER CODE ADDED

Master code:
TP-MASTER-2026

How to use:
1. Open TradePilot.
2. Enter your owner email.
3. Enter master code.
4. Click Master Unlock.
5. Login with the same email.
6. Full AI access opens.

Optional Netlify env override:
MASTER_UNLOCK_CODE

If you add MASTER_UNLOCK_CODE in Netlify, that value replaces TP-MASTER-2026.
