<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/2843cea4-965a-426c-bc69-42dc27ef28ae

## Run Locally

**Prerequisites:** Node.js and a [Supabase](https://supabase.com) project.

All application data (users, courses, content, quizzes, progress, audit logs) is stored in
Supabase. Nothing is kept in browser `localStorage` except the light/dark theme choice
(and Supabase's own sign-in session).

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and fill in:
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`: Supabase → Project Settings → API
   - `SUPABASE_SERVICE_ROLE_KEY`: server only. Needed to invite users, persist email logs and
     upload large files through the server. Never expose it to the browser.
   - `GEMINI_API_KEY`: AI quiz generation from PDFs (optional)
   - `RESEND_API_KEY` or `SMTP_*`: custom emails (optional)
3. Set up the database (Supabase → SQL Editor). Run each file in `supabase/migrations`
   **in filename order**, then optionally `supabase/seed.sql` for the demo content.
   To regenerate the seed after editing `src/data/seedLmsData.ts`: `npx tsx scripts/generate-seed.ts`
4. In Supabase → Authentication → URL Configuration, set the Site URL (e.g. `http://localhost:3000`)
   so confirmation and password-reset links come back to the app.
5. Run the app: `npm run dev`

### Creating the first administrator

New sign-ups are always created as a **pending learner**. Register through the app (or create the
user in Supabase → Authentication), then promote that account once in the SQL editor:

```sql
update public.profiles
   set role = 'admin', account_status = 'active'
 where email = 'you@example.com';
```

After that, administrators approve registrations, change roles and invite users from the Admin Console.

### How data access is secured

- Row Level Security on every table: learners see published content and only their own
  progress and attempts; administrators manage everything.
- A trigger stops non-admins from changing their own role, status, employee ID or email.
- Quiz answer keys are hidden from learners (`*_quizzes_learner` views), and quizzes are graded
  in Postgres (`submit_license_quiz`, `submit_product_quiz`, `submit_skill_quiz`).
- Video and PDF progress are recorded by `record_video_heartbeat` and `record_pdf_page`, which
  use the database clock so skipping ahead is not counted as watched time.
