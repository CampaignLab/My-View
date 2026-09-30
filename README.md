# My View — Facebook prototype

A Chrome Manifest V3 side panel for signing into My View, deliberately capturing a Facebook post, writing/editing a reply, and inserting or copying it. The participant personally clicks Facebook's final **Comment/Post** button. There is no publishing automation.

The first milestone prioritises **login → capture → edit → insert/copy**. AI suggestions are optional: manual replies work with no OpenAI key. Live authentication needs a configured Clerk application; persistence needs Neon. No credentials or external services have been provisioned in this repository.

## What's implemented

- React/TypeScript extension, Tailwind, a shared shadcn/ui-style Button and UI primitives.
- Toolbar opens the side panel; highlighted text → right-click **Use in My View** captures text. Without a selection, click a post to capture its supported message element.
- Editable reply with browser-session draft recovery. Three optional AI variants, tone selection and current instructions.
- Scoped comment insertion into an empty composer on the captured post. Clipboard fallback. Existing Facebook drafts are preserved.
- Clerk native sign-in/sign-up inside the panel and Clerk web sign-in for onboarding/preferences. The panel retrieves a fresh session token for each API request.
- Authenticated Next.js endpoints, explicit origin allowlist, request limits and per-user record ownership checks.
- Neon/Drizzle schema and migration for users, organisations, cohorts, memberships, views, style, captures, suggestions and interactions. No administrator routes expose individual views.
- Minimal four-step onboarding and preference editor. Profile data comes from Neon for generation, never from browser-supplied profile fields.
- Connection check: `/api/me` verifies the signed-in identity and creates/looks up the database user. This is distinct from a configuration-only health check.

## Repository

```text
apps/extension/          Extension source and generated dist/
  src/background/       User invocation, message routing and session capture
  src/content/          Injected only after deliberate invocation
  src/sidepanel/        Clerk sign-in and React reply interface
  src/platforms/facebook/
                        detectPost, extractPost, findComposer, insertText
apps/web/               Next.js app/API, deployed to Vercel
packages/shared/        Contracts and Zod validation
packages/ui/            Shared components and Tailwind styling
packages/db/            Drizzle schema and checked-in SQL migrations
tests/                  Focused auth/validation and DOM handoff checks
```

## Local setup

Use Node.js **22.17+** (or a current Node 24 LTS) and **pnpm 11.25.0**. The lockfile records resolved dependency versions. From the repository root:

```powershell
pnpm install --frozen-lockfile
Copy-Item apps/web/.env.example apps/web/.env.local
Copy-Item apps/extension/.env.example apps/extension/.env.local
pnpm dev
```

Open [localhost:3000](http://localhost:3000). With no credentials, the website displays a setup state and the extension can still capture/edit/copy locally; it does not pretend to authenticate. The server never silently bypasses authentication.

### Environment variables

| Location | Variable | Purpose |
| --- | --- | --- |
| Web/Vercel only | `CLERK_SECRET_KEY` | Server-side session verification and identity lookup |
| Web/Vercel only | `DATABASE_URL` | Neon pooled Postgres connection string |
| Web/Vercel only | `OPENAI_API_KEY` | Optional server-side generation; leave unset for the auth/handoff pilot |
| Web/Vercel only | `OPENAI_MODEL` | Defaults to `gpt-4.1-mini`; choose a model supported by your OpenAI project |
| Web/Vercel | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Public web key from the same Clerk instance |
| Web/Vercel | `APP_ALLOWED_ORIGINS` | Comma-separated web and `chrome-extension://<id>` origins; no wildcard |
| Web/Vercel | `STORE_CAPTURED_POST_TEXT` | Defaults false; only opt in to retention for an agreed test |
| Extension build only | `MY_VIEW_API_URL` | Local or deployed API origin |
| Extension build only | `CLERK_PUBLISHABLE_KEY` | Same Clerk instance's public key |
| Extension build only | `EXTENSION_PUBLIC_KEY` | Optional public manifest key for a stable extension ID |

**Only public values go into the extension.** OpenAI, Clerk secret and database credentials belong in the server environment. Extension settings are embedded at build time, so rebuild after changing the API URL or public Clerk key.

## Clerk setup — first service to connect

1. Create a Clerk application. Use **email + verification code** (or email/password) for this first pilot.
2. Enable **Native API** in Clerk's Native applications settings, as required for the Chrome Extension SDK.
3. Put the application's secret key and public key in `apps/web/.env.local`. Put the same public key in `apps/extension/.env.local`.
4. Build/load the extension as below and copy its ID from `chrome://extensions`.
5. Allow `chrome-extension://YOUR_EXTENSION_ID` in your Clerk instance's `allowed_origins`. Follow Clerk's [extension deployment guide](https://clerk.com/docs/guides/development/deployment/chrome-extension) for the supported instance configuration API. Preserve existing allowed origins when updating that setting. Repeat for the production instance when deploying.
6. Add that exact origin plus your local web origin to `APP_ALLOWED_ORIGINS`. Restart the web server.
7. Open the extension and sign up/sign in. Click **Check connection**. With Neon migrated, it should display **Account & API connected**.

The API verifies signed Clerk session tokens; it never trusts a user ID from the browser. Native Clerk credentials remain in the SDK's extension storage. No Facebook cookies or passwords are requested.

The current design uses native panel authentication, without Sync Host. Signing into the web preferences page is a separate session in the same Clerk application. The panel session persists across reopens. OAuth/social redirects are a later extension-auth choice; the initial panel flow uses the native-supported methods. See [Clerk's extension authentication options](https://clerk.com/docs/reference/chrome-extension/overview).

For shared builds, configure a consistent CRX public manifest key through Clerk's [consistent ID guide](https://clerk.com/docs/guides/development/configure-consistent-crx-id) and set `EXTENSION_PUBLIC_KEY`. This is a public key; do not place a private signing key in the repository. An unpacked extension's ID can change if its folder or packaging changes; update both allowlists if that happens.

## Neon and Drizzle

1. Create a Neon project/database and obtain its **pooled/serverless** connection string with SSL enabled.
2. Set `DATABASE_URL` in `apps/web/.env.local`.
3. Apply the checked-in migrations:

```powershell
pnpm db:migrate
```

For future schema changes, edit `packages/db/schema.ts`, run `pnpm db:generate`, review the generated SQL, then run `pnpm db:migrate`. Migration commands read `apps/web/.env.local`, or the process environment in CI. Do not run migrations during every web request or automatically from the Vercel build.

The API uses Neon's HTTP driver. Profile changes use a transactional Neon batch. Each capture/suggestion read or write uses the authenticated user's database ID. Organisations/cohorts are schema foundations only; no campaign management UI is included.

## Build and load the unpacked extension

```powershell
pnpm build:extension
```

1. Open `chrome://extensions` in Chrome/Chromium **116+** (a current browser is recommended).
2. Enable **Developer mode**, click **Load unpacked**, and select `apps/extension/dist`.
3. Pin **My View** to the toolbar.
4. Browse Facebook normally. Highlight the post text and right-click **Use in My View**, or click the extension icon and then the post.
5. Sign into My View if configured. The captured post is retained while signing in.
6. Write a reply directly. Open an **empty** comment field on the captured post, click that field, and choose **Insert into Facebook**.
7. If the adapter cannot identify the composer, the reply is copied. Paste it yourself.
8. Personally review and click Facebook's final **Comment** button.

Reload the extension after rebuilding. Reload an already-open Facebook tab after a code update so it does not keep an older injected adapter. No content scripts run automatically on every Facebook page load. The manifest uses `activeTab` and on-demand `scripting`, not persistent Facebook host access. Host permissions are generated only for the API and Clerk instance; there is no cookies/history permission.

## Optional OpenAI connection

Set `OPENAI_API_KEY` in the server environment (Vercel in deployment), then restart/redeploy. The `/api/suggest` route retrieves the user's profile from Neon and uses the OpenAI Responses API with a structured output schema. It returns a neutral summary, an optional clarification, and conversational/concise/question-led options. Post text is treated as untrusted data. Requests use `store: false` (this does not supersede OpenAI's separate provider retention policies). See [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs).

AI is not called at capture time; the participant explicitly requests a starting point. If the user's position is unknown, the prompt asks for neutral responses and a short clarification. Inference does not alter stored views. Generation quality and live API access remain to be evaluated after configuration. The initial per-user generation cap is approximately 20 batches/hour; it is a prototype guard rather than a concurrency-safe billing quota.

## API

All routes except `health` require `Authorization: Bearer <Clerk session token>`. JSON mutation requests are limited to 65 KB. Captured post text is capped at 12,000 characters; replies at 5,000. No browser-supplied profile is accepted for suggestion generation.

| Route | Purpose |
| --- | --- |
| `GET /api/health` | Configuration flags only; does not prove service connectivity |
| `GET /api/me` | Verify session and find/create Neon user |
| `GET /api/profile` | Read only the caller's preferences |
| `PUT /api/profile` | Explicitly save only the caller's preferences |
| `POST /api/capture` | Record a chosen capture, independently of AI |
| `POST /api/suggest` | Generate and store three options |
| `POST /api/interaction` | Record selection, edit, copy or insertion |

Capture request: `{ "captureId": "UUID", "post": { "text": "selected text", "author": "optional", "url": "optional Facebook URL", "visibleComments": [] } }`.

Suggestion requests add optional `instructions`, `tone` (`short`, `friendly`, `detailed`), and `regenerate`. Replies contain `summary`, `clarification` and `suggestions` with `id`, `text` and `style`. The extension doesn't collect comments by default.

## Vercel deployment

1. Push this repository to your chosen Git host and import it into Vercel.
2. Select **Next.js** and set the project's **Root Directory** to `apps/web`. Enable access to files outside the root directory so workspace packages are included. Use pnpm/frozen-lockfile installation and the Next.js build defaults. See [Vercel monorepos](https://vercel.com/docs/monorepos).
3. Add the web/server variables from the table above in Vercel. OpenAI can remain unset.
4. Set `APP_ALLOWED_ORIGINS` to your final web origin and approved extension origin. Preview URLs need their own explicit entry if used.
5. Run the Drizzle migration against the intended Neon database from a trusted local shell/CI job.
6. Deploy. Use Clerk keys from the same instance in the web app and extension. For Clerk production, complete its domain/native-origin configuration.
7. Set `MY_VIEW_API_URL=https://your-deployment.vercel.app` and the public Clerk key in the extension build environment. Rebuild and distribute/load `apps/extension/dist`.
8. Verify sign-in and **Check connection** from the extension before testing capture and insertion.

Vercel hosts the API/web app. The extension remains an unpacked Chrome build until a later Chrome Web Store release. No deployment has been performed by this implementation.

## Validation and first pilot

```powershell
pnpm typecheck
pnpm test
pnpm build
```

The focused checks cover missing/forged session rejection, origin restrictions, payload size, chosen-post isolation, preserving existing drafts, plain-text insertion, and never submitting a form. A fixture check is not evidence that Facebook's current editor accepts every insertion.

After configuring Clerk and Neon, test one account: sign in, close/reopen the panel, check connection, capture a real public post, edit a manual reply, copy, insert into an empty comment field, and personally decide whether to publish. Try two accounts to confirm profiles stay separate. Next, test selector changes, navigation, closed tabs, expired sessions, and clipboard fallback. These live service and Facebook checks have intentionally not been performed yet.

## Privacy and metrics

- Captured post text and active draft use **browser session storage**; no full-feed scraping or background discovery. Closing the captured tab clears its session draft. Signing out clears the capture and draft.
- Neon stores capture metadata, saved preferences, generated replies, final replies and interaction events. Captured Facebook text remains NULL unless `STORE_CAPTURED_POST_TEXT=true`.
- Choosing a post/capture while authenticated sends capture metadata to My View; AI receives post text only when suggestions are requested. No private-message pages are supported.
- Events: `my_view_opened`, `post_captured`, `suggestion_generated`, `suggestion_selected`, `suggestion_regenerated`, `suggestion_edited`, `suggestion_copied`, `suggestion_inserted`.
- Edited generated replies retain both original and final text and their edit distance. Manual replies have variant `manual` and no generated text.
- A copy/insert event proves **handoff**, not publication. Measure distinct capture IDs with a handoff for conversion, rather than counting every repeat copy as another published response. Weekly participation remains a proxy until participants report their actual posting.
- Individual private views are not exposed through organisation/cohort APIs. There are no such administrator APIs in this prototype.

## Known limits

Facebook's DOM is unstable. Auto-extraction uses known message selectors within the clicked article; selected text is the robust fallback. Insertion requires a connected captured article and an unambiguous, empty, visible composer in that same article. Navigation or another tab requires recapture. Facebook may render editor text but fail to enable its submit button; use copy/paste if so. No publish button is ever clicked by My View.

The prototype is focused on comments below captured discussions. Generic timeline/new-post composers, media-only posts, nested ambiguous editors, and every localisation/layout are not guaranteed. It doesn't infer political beliefs, monitor browsing, discover conversations, publish automatically or use Facebook's publishing API. Clerk/Neon/OpenAI service behaviour and real Facebook insertion remain unverified until keys and a test account are configured.
