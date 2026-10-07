# Contributing to soulfiremc.com

This repository maintains the SoulFire website, documentation, and executable examples.
This guide covers local development, validation, and pull requests.

## Before you start

Search [open and closed issues](https://github.com/soulfiremc-com/soulfiremc.com/issues) before reporting a problem or proposing a feature.
Small fixes can go directly to a pull request. Discuss substantial changes in an issue before implementation.
For usage questions and issue routing, read [SUPPORT.md](SUPPORT.md).
Follow the [community code of conduct](https://github.com/soulfiremc-com/.github/blob/main/CODE_OF_CONDUCT.md).
Report vulnerabilities privately through the [security policy](https://github.com/soulfiremc-com/.github/blob/main/SECURITY.md).

## Website and application changes

Install Git and Bun at the version in `package.json`.
Documentation reference checks also need Python 3.14 and Java 25.
Use the pinned Cloudflare `cf` CLI through the package scripts.

```bash
bun install --frozen-lockfile
bun run db:migrate
bun dev
```

The migration command above updates the local D1 database, not the remote database.
Do not use production OAuth credentials, API tokens, or database exports for ordinary development.
For features that require secrets, configure private local values according to `cloudflare.config.ts` and keep them out of Git.

- `src/routes/`: website routes and application flows.
- `src/components/`: shared and application UI.
- `src/lib/` and `src/server.ts`: application logic and server integration.
- `content/docs/`: documentation pages and navigation metadata.
- `public/docs/`: downloadable examples and documentation assets.
- `scripts/`: reference generation, example checks, and development tools.
- `tests/`: application and documentation logic tests.

For schema changes, edit the schema first and run `bunx drizzle-kit generate --name <migration-name>`.
Commit the generated `drizzle-d1/` SQL and metadata exactly as produced. Do not hand-edit migration artifacts.
Run local migrations and relevant tests before submission.
Remote migrations and deployment require maintainer coordination. Follow the [README migration workflow](README.md#database-migrations).

Use the existing Oxlint and Oxfmt configuration. Run `bun run check` after every change.
Use `bun run typecheck` and `bun run test` for application changes.
Run `bun run build` for changes that affect the production build.
For UI changes, verify keyboard access, mobile layouts, and leaf loading states.
Try consumer changes before modifying components in `src/components/ui/`.

## Documentation writing workflow

Write for a reader with a task to complete. Start with the result, state the
prerequisites, and show how the reader can verify that the task worked.

## Choose the right page

- **Get started:** guided tutorials with a small, repeatable result.
- **Use SoulFire, testing, automation, scripting, and server guides:** procedures
  for a specific task. Link to prerequisites instead of repeating installation.
- **Reference:** exact names, formats, defaults, methods, and schemas.
- **Concepts:** explain behavior and tradeoffs without turning into a procedure.

Each MDX page needs a `title` and `description` in its front matter. Fumadocs
renders the title as the page heading, so start the body headings at `##`.
Use short paragraphs, active voice, descriptive links, and fenced code blocks
with a language. Give complete programs a filename with `title="example.ts"`.
Use callouts for context that changes the reader's next action.

Use `sidebarTitle` for a short navigation label when the page title is longer.
Keep labels specific enough to identify a page within its section.
Each section uses its index page as the clickable collapsible heading. Leave that
page out of `pages` in `meta.json`, or set `pagesIndex` for a named overview.
Listing the overview in `pages` creates a separate child row instead.
Use folders in parentheses to group topics without changing their URLs.

Add child pages to their section's `meta.json`. When moving a page, preserve its old URL
in `src/lib/docs/redirects.ts` and update internal links to the new destination.
Do not remove a published URL just to make the sidebar simpler.

## Check facts against the implementation

The source revision in `scripts/sdk-source.ts` defines the SDK and built-in node
reference. Keep the SDK baseline aligned with a published release. Verify npm
and PyPI versions. Update the public installation guide in
`content/docs/(main)/(automation)/sdk/(start)/compatibility.mdx` when changing the
baseline. Check the backend handshake and required plugins, too.

For GUI procedures, inspect the matching SoulFireClient source or a running
client. Record the version when adding screenshots. For commands and settings,
check the backend declaration and the connected server's help or metadata.
Do not infer defaults from examples or turn a measured capacity into a universal
hardware recommendation.

Keep operational examples explicit about ports, storage paths, token audience,
working directories, and cleanup. Tutorials must include an expected result and
a stop procedure. SDK beginner examples use managed setup with the `DocsBot_1`
account and a Minecraft server at `localhost:25565`. Keep manual account discovery
for existing-backend guides.

## Regenerate references

Install Bun, Git, Python 3.14, and Java 25, then run:

```bash
bun run generate-node-reference
```

The node generator reads the registry and Java metadata from the pinned source.
Change the source or generator when a reference is wrong.
For each SDK release, update the source pin and installation baseline together.
The existing `--check` mode compares saved pages with generated output.

The full SDK references live at [ts.soulfiremc.com](https://ts.soulfiremc.com/)
and [py.soulfiremc.com](https://py.soulfiremc.com/).
TypeDoc and Sphinx with AutoAPI build these static sites from the SoulFire repository.
Keep signatures, defaults, comments, and docstrings in the SDK source.
See [the reference publishing instructions](https://github.com/soulfiremc-com/SoulFire/tree/main/sdk/reference).
Keep tutorials, recipes, and explanations in this website.

The homepage programs live in `src/lib/sdk-code-examples.ts`. After editing them,
run `bun run generate-sdk-code` to refresh their highlighted HTML.

## Validate executable examples

Mark complete SDK code blocks with `doc-test` and a filename:

````md
```ts title="example.ts" doc-test
// A complete program, including imports.
```
````

`check-sdk-recipes` checks every marked SDK block and both homepage programs
against the pinned SDK. It uses strict TypeScript and Python type checks, then
compiles the Python files. Each SDK recipe must contain one complete program
for each language. Keep focused API fragments unmarked and label them as fragments.

`check-plugin-examples` compiles marked Java examples in the first-plugin and
bot-control guides against the real backend classes. Bot-control fragments run
inside a method with a `BotConnection connection` parameter supplied by the checker.
These checks catch API drift. They do not start a Minecraft session.

Downloadable script graphs belong in `public/docs/scripts`. The script checker
checks their export shape, node IDs, ports, inline values, required inputs, and
execution edges against the generated node catalog. Its scope is the small,
acyclic documentation recipes. Import and run changed graphs on the matching
backend to verify their behavior before claiming runtime validation.

## Verify the result

```bash
bun run check
bun run check-docs
bun run typecheck
bun run test
bun run build
```

`check-docs` validates internal links and redirects, rejects stale generated
references, and checks SDK, script, and native plugin examples. CI runs these
checks. The first run needs network access to fetch the pinned source and build
dependencies. You can reuse a matching checkout through `SOULFIRE_SDK_SOURCE`.

Preview changed pages with `bun dev`. Check the sidebar, code tabs, downloads,
tables, images, search, and old URLs at desktop and mobile widths. Read the
procedure in order and follow it on a local test server. Record any runtime
checks that you could not perform.

## Submit a pull request

Keep the change focused on one problem. Avoid unrelated formatting and dependency updates.
Use Conventional Commit subjects such as `docs(contributing): clarify local setup` or `fix(build): correct packaging`.
Use a meaningful scope, imperative wording, and a subject under 72 characters.
For non-trivial changes, add a body that explains the motivation and important tradeoffs.
For breaking changes, include a `BREAKING CHANGE:` footer and migration instructions.
Do not bypass Git hooks. Let all configured checks finish.

Complete the pull request template with the problem, resulting behavior, and affected files.
If a related issue exists, link it.
Use `Closes #123` only if the change fully resolves that issue.
Record application and documentation check results, source versions, and any runtime or preview checks.
Explain any checks that you could not perform.
For visible changes, include screenshots and the environment used to capture them.
Open a draft for early feedback on substantial changes.
Respond to review comments and rerun affected checks after revisions.

Update documentation and examples with behavior changes. Remove obsolete code rather than leaving placeholders or shims.
Do not commit credentials, private logs, dependency directories, or generated build artifacts.
Respect existing license notices and submit only material that you have the right to contribute.
