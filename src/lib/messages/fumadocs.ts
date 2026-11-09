import type { Translations } from "fumadocs-ui/i18n";
import type { Locale } from "../i18n";
import { translate, type MessageKey } from ".";

// Fumadocs owns the external identifiers; application messages use stable keys.
const messageKeys = {
  "Ask AI(AI chat button)": "docs.askAi",
  "Back to Home(404 not found page)": "docs.backToHome",
  "Choose a language(language switcher)": "docs.chooseALanguage",
  "Choose a language(language switcher)(aria-label)": "docs.chooseALanguage",
  "Close Banner(banner)(aria-label)": "docs.closeBanner",
  "Close Search(search dialog)(aria-label)": "docs.closeSearch",
  "Close Sidebar(aria-label)": "docs.closeSidebar",
  "Close Sidebar(sidebar)(aria-label)": "docs.closeSidebar",
  "Collapse Sidebar(sidebar)(aria-label)": "docs.collapseSidebar",
  "Copied Text(code block)(aria-label)": "docs.copiedText",
  "Copied Anchor Link(heading anchor)(aria-label)": "docs.copiedAnchorLink",
  "Copied Link(accordion)(aria-label)": "docs.copiedLink",
  "Copied Markdown(page actions)": "docs.copiedMarkdown",
  "Copy Anchor Link(heading anchor)(aria-label)": "docs.copyAnchorLink",
  "Copy Link(accordion)(aria-label)": "docs.copyLink",
  "Copy Markdown(page actions)": "docs.copyMarkdown",
  "Copy Text(code block)(aria-label)": "docs.copyText",
  "Dark(theme switcher)(aria-label)": "docs.dark",
  "Default(type table)": "docs.default",
  "Edit on GitHub(edit page)": "docs.editOnGithub",
  "Hide Sidebar(sidebar)": "docs.hideSidebar",
  "Last updated on(page footer)": "docs.lastUpdatedOn",
  "Layout Tab(layout tab trigger)": "docs.layoutTab",
  "Light(theme switcher)(aria-label)": "docs.light",
  "Next Page(pagination)": "docs.nextPage",
  "No Headings(table of contents)": "docs.noHeadings",
  "No results found(search dialog)": "docs.noResultsFound",
  "On this page(table of contents)": "docs.onThisPage",
  "Open Search(search trigger)(aria-label)": "docs.openSearch",
  "Open Sidebar(aria-label)": "docs.openSidebar",
  "Open Sidebar(sidebar)(aria-label)": "docs.openSidebar",
  "Open in ChatGPT(page actions)": "docs.openInChatgpt",
  "Open in Claude(page actions)": "docs.openInClaude",
  "Open in Cursor(page actions)": "docs.openInCursor",
  "Open in GitHub(page actions)": "docs.openInGithub",
  "Open in Scira AI(page actions)": "docs.openInSciraAi",
  "Open(page actions)": "docs.open",
  "Page Not Found(404 not found page)": "docs.pageNotFound",
  "Parameters(type table)": "docs.parameters",
  "Previous Page(pagination)": "docs.previousPage",
  "Prop(type table)": "docs.prop",
  "Read {url}, I want to ask questions about it.(page actions)":
    "docs.pageActions.prompt",
  "Returns(type table)": "docs.returns",
  "Search(search dialog)": "docs.search",
  "Search(search trigger)": "docs.search",
  "Show Sidebar(sidebar)": "docs.showSidebar",
  "System(theme switcher)(aria-label)": "docs.system",
  "Table of Contents(inline table of contents)": "docs.tableOfContents",
  "The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.(404 not found page)":
    "docs.notFound.description",
  "Toggle Menu(home layout header)(aria-label)": "docs.toggleMenu",
  "Toggle Theme(theme switcher)(aria-label)": "docs.toggleTheme",
  "Type(type table)": "download.type",
  "View as Markdown(page actions)": "docs.viewAsMarkdown",
} satisfies Partial<Record<keyof Translations, MessageKey>>;

export function fumadocsMessages(locale: Locale): Partial<Translations> {
  return Object.fromEntries(
    Object.entries(messageKeys).map(([externalKey, key]) => [
      externalKey,
      translate(locale, key),
    ]),
  );
}
