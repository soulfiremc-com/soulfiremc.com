After making changes, run `bun run check` and fix all errors.

## React conventions

- Use PascalCase for React component names. Match the existing component filename convention.
- Use kebab-case for new hook and utility filenames, unless this repository documents another convention.
- Use stable domain identities as React keys. Do not use array indexes as keys.
- Use an existing `generateN` helper or stable placeholder IDs for fixed skeleton slots.
- Keep page structure, headings, navigation, labels, and independent content mounted while data loads.
- Show skeletons only for unresolved values, rows, and permission-dependent actions. Do not block a page on its slowest query.

## Tailwind spacing

- Use `gap-*` utilities for spacing between elements. Do not use `space-*` utilities.

## shadcn/ui

- For shadcn/ui work, use the `shadcn` skill and component documentation.
- Compose existing shadcn/ui components before writing custom primitives. Use `Field`, `InputGroup`, and `Item` where appropriate.
- Fix application consumers before changing `components/ui`. Change a shared primitive only for a demonstrated component defect.

## Design skills

- For visual design work, use `frontend-design` and `uncodixfy`.

## Cloudflare tooling

- Use `cf` for direct Cloudflare CLI commands. Prefer existing package scripts for project workflows.
- For new Cloudflare configuration, prefer `cloudflare.config.ts`. Preserve existing configuration formats during unrelated work.

## Drizzle migrations

- Edit the schema referenced by `drizzle.config.ts` first.
- From the repository root, run `bunx --bun drizzle-kit generate --name <migration-name>`.
- Treat `drizzle-d1/` SQL and metadata as generated output. Do not hand-edit them.
- Commit generated migration artifacts together, exactly as Drizzle produces them.
- Check the deployment workflow before applying migrations. Do not assume a push applies them automatically.

## Organization access

- Resolve application access from explicit organization IDs or slugs.
- Do not use Better Auth active-organization session state to determine application access.

## Fumadocs content

- Keep collection paths and front matter consistent with `source.config.ts`.
- Use `.md` for plain content and `.mdx` when imports or React components are needed.
- Use the front-matter title as the page heading. Start body sections at `##`.
- Register shared MDX components through the existing component registry. Extract reusable components instead of long inline JSX.
- Use registered Fumadocs components for callouts, related links, tabs, steps, FAQs, and API tables.
- Give each `Tab` an explicit `value`. Use stable heading anchors when other pages link to them.
- Use descriptive links, language-tagged code fences, and useful image alt text.
- Preview changed pages and check links, code blocks, tables, and images before publishing.
- For YouTube embeds, reuse the existing component when available. Use `/embed/VIDEO_ID` with a clear title.
- Keep video embeds responsive at 16:9. Include a text summary and do not autoplay.

## Blog content

- Apply these rules to `content/blog/`.
- Define the reader goal and search intent before writing. Choose a specific angle.
- Put the useful answer near the top. Use short paragraphs and clear section headings.
- Follow the collection schema for front matter. Do not invent unsupported metadata fields.
- Link relevant internal pages and credible references. Use images only when they help explain the topic.
- End with a practical next step, checklist, or related links. Preview the rendered post before publishing.

## Branding and product language

Before naming features or changing user-facing text and visuals, read the [SoulFire brand guidance](https://github.com/soulfiremc-com/brand).
Use its terminology, naming, writing, and visual identity guides.
Keep proposed renames separate from accepted guidance.
Preserve public identifiers until the owning repository approves a migration.

## Effect workflows

Use Effect v4 for fallible application workflows. Keep framework rendering, pure helpers, and short SDK adapters direct.
Compose native programs inside services. Run `runWebsiteEffect` only at HTTP, TanStack, or external SDK callbacks.
The runtime boundary preserves public messages and removes internal error properties before framework serialization.

Review queries use `ReviewDatabase` and `reviewQuery`. Preserve each query's primary or review session.
Wait for submitted D1 statements before returning from cancellation so the response can publish its write bookmark.
Provider and documentation aggregations use bounded concurrency. Preserve result order and unknown-stock fallbacks.
The shared HTTP helper owns headers, response readers, deadlines, and late-response cleanup.
Do not acquire a network wait through an interruption-masked resource acquisition.
Email callbacks compose `authNotificationEffects` with `WebsiteMailer`. Finish each submitted email call before returning from cancellation.
Never add automatic retries to email, writes, or authorization-code exchange.
