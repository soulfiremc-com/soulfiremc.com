import { createFileRoute, Link } from "@tanstack/react-router";
import { reopenCookieConsent, useAnalyticsConsent } from "@/lib/cookie-consent";
import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { isPostHogConfigured } from "@/lib/integrations/posthog";
import { getCanonicalLinks, getPageMeta } from "@/lib/seo";

const CONSENT_LABELS = {
  granted: "You accepted analytics cookies.",
  denied: "You declined analytics cookies.",
  pending: "You have not made a choice yet.",
} as const;

function CookieSettings() {
  const consent = useAnalyticsConsent();
  if (!isPostHogConfigured) return null;

  return (
    <div className="not-prose flex flex-col items-start gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm" aria-live="polite">
        {consent ? CONSENT_LABELS[consent] : "Checking your choice..."}
      </p>
      <Button type="button" variant="outline" onClick={reopenCookieConsent}>
        Change cookie settings
      </Button>
    </div>
  );
}

function CookiePolicy() {
  return (
    <main className="mx-auto prose w-full max-w-3xl px-4 py-12">
      <h1>Cookie Policy</h1>
      <p>
        <strong>Last updated:</strong> November 23, 2026
      </p>

      <p>
        This Cookie Policy explains how SoulFire (&quot;we,&quot;
        &quot;us,&quot; or &quot;our&quot;) uses cookies and similar tracking
        technologies on <a href="https://soulfiremc.com">soulfiremc.com</a>.
      </p>

      <h2>1. What Are Cookies?</h2>
      <p>
        Cookies are small text files stored on your device when you visit a
        website. They help websites function correctly, remember your
        preferences, and collect information about website usage.
      </p>
      <p>Cookies may be:</p>
      <ul>
        <li>
          <strong>First-party cookies</strong> &mdash; set by our website
          directly.
        </li>
        <li>
          <strong>Third-party cookies</strong> &mdash; set by external service
          providers embedded on our site.
        </li>
        <li>
          <strong>Session cookies</strong> &mdash; expire when you close your
          browser.
        </li>
        <li>
          <strong>Persistent cookies</strong> &mdash; remain on your device for
          a defined period.
        </li>
      </ul>

      <h2>2. Why Do We Use Cookies?</h2>
      <p>We use cookies for the following purposes:</p>
      <ul>
        <li>
          <strong>Authentication and session management</strong> &mdash; to keep
          you signed in and manage your session securely.
        </li>
        <li>
          <strong>Security</strong> &mdash; to protect against fraud and
          unauthorized access (e.g., CAPTCHA verification, CSRF protection).
        </li>
        <li>
          <strong>Analytics</strong> &mdash; to understand how visitors use our
          website and improve the user experience (with your consent).
        </li>
        <li>
          <strong>SEO monitoring</strong> &mdash; to monitor website performance
          and search engine visibility.
        </li>
        <li>
          <strong>Preferences</strong> &mdash; to remember your cookie consent
          choice and other preferences stored in your browser.
        </li>
      </ul>

      <h2>3. Cookie Categories</h2>

      <h3>Strictly Necessary Cookies</h3>
      <p>
        These cookies are essential for the website to function and cannot be
        switched off. They are set in response to actions you take, such as
        signing in or filling in forms.
      </p>
      <Table className="[&_td]:min-w-32 [&_td]:whitespace-normal">
        <TableHeader>
          <TableRow>
            <TableHead>Cookie / Storage</TableHead>
            <TableHead>Provider</TableHead>
            <TableHead>Purpose</TableHead>
            <TableHead>Duration</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>
              <code>__Secure-better-auth.session_token</code>
            </TableCell>
            <TableCell>SoulFire (better-auth)</TableCell>
            <TableCell>
              Maintains your authenticated session after signing in
            </TableCell>
            <TableCell>Session / up to 7 days</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              <code>__Secure-better-auth.session_data</code>
            </TableCell>
            <TableCell>SoulFire (better-auth)</TableCell>
            <TableCell>
              Encrypted copy of your session so pages load without a database
              lookup
            </TableCell>
            <TableCell>5 minutes</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              <code>discord_oauth_state</code>
            </TableCell>
            <TableCell>SoulFire</TableCell>
            <TableCell>
              CSRF protection during Discord OAuth linked roles flow
            </TableCell>
            <TableCell>Short-lived (minutes)</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              <code>cf_clearance</code> / Turnstile cookies
            </TableCell>
            <TableCell>Cloudflare</TableCell>
            <TableCell>
              CAPTCHA verification to protect authentication forms from bots
            </TableCell>
            <TableCell>Session / up to 30 minutes</TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <h3>Analytics Cookies (Consent Required)</h3>
      <p>
        These cookies help us understand how visitors interact with our website
        by collecting and reporting information. They are only set{" "}
        <strong>after you accept analytics cookies</strong> via our cookie
        consent banner. Until you choose, the analytics script does not load.
      </p>
      <p>
        If you accept, PostHog records page views, clicks, page performance,
        errors, and session replays with text in form fields hidden. Events go
        through our proxy at <code>t.soulfiremc.com</code> to PostHog&apos;s EU
        servers.
      </p>
      <p>
        If you decline, PostHog stores no cookies or visitor ID on your device.
        We still count page views, clicks, page performance, and errors
        anonymously. PostHog groups these events with a temporary hash that
        changes every day, and session replay stays off.
      </p>
      <Table className="[&_td]:min-w-32 [&_td]:whitespace-normal">
        <TableHeader>
          <TableRow>
            <TableHead>Cookie / Storage</TableHead>
            <TableHead>Provider</TableHead>
            <TableHead>Purpose</TableHead>
            <TableHead>Duration</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>
              <code>ph_*_posthog</code> cookie and local storage,{" "}
              <code>ph_*</code> session storage
            </TableCell>
            <TableCell>
              <a
                href="https://posthog.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                PostHog
              </a>{" "}
              (EU-hosted)
            </TableCell>
            <TableCell>
              Product analytics &mdash; stores an anonymous visitor ID and the
              current session so page views, feature usage, and interactions can
              be grouped. Data is hosted in the EU.
            </TableCell>
            <TableCell>
              Cookie up to 1 year, session storage until the tab closes
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <h3>Performance and SEO Measurement</h3>
      <p>
        We use{" "}
        <a href="https://ahrefs.com" target="_blank" rel="noopener noreferrer">
          Ahrefs Web Analytics
        </a>{" "}
        for SEO analysis and website performance monitoring. It does not set
        cookies or use browser storage. It receives page visit data, such as the
        page address, referrer, and browser type.
      </p>

      <h3>Third-Party Cookies</h3>
      <p>
        The following third-party services embedded on our website may set their
        own cookies:
      </p>
      <Table className="[&_td]:min-w-32 [&_td]:whitespace-normal">
        <TableHeader>
          <TableRow>
            <TableHead>Service</TableHead>
            <TableHead>Purpose</TableHead>
            <TableHead>More Info</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>YouTube</TableCell>
            <TableCell>
              Embedded demo video on the homepage. YouTube may set cookies and
              collect viewing data.
            </TableCell>
            <TableCell>
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
              >
                Google Privacy Policy
              </a>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Gravatar</TableCell>
            <TableCell>
              Avatar images loaded from Gravatar. Requests include an MD5 hash
              of the user&apos;s email.
            </TableCell>
            <TableCell>
              <a
                href="https://automattic.com/privacy/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Automattic Privacy Policy
              </a>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <h3>Local Storage</h3>
      <p>
        In addition to cookies, we use browser local storage for the following:
      </p>
      <Table className="[&_td]:min-w-32 [&_td]:whitespace-normal">
        <TableHeader>
          <TableRow>
            <TableHead>Key</TableHead>
            <TableHead>Purpose</TableHead>
            <TableHead>Duration</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>
              <code>__ph_opt_in_out_*</code>
            </TableCell>
            <TableCell>
              Remembers whether you accepted or declined analytics cookies
            </TableCell>
            <TableCell>Persistent (until cleared)</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              <code>theme</code>
            </TableCell>
            <TableCell>Remembers your light or dark theme choice</TableCell>
            <TableCell>Persistent (until cleared)</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              <code>docs-feedback-&#123;url&#125;</code>
            </TableCell>
            <TableCell>
              Remembers whether you&apos;ve already submitted feedback on a
              documentation page
            </TableCell>
            <TableCell>Persistent (until cleared)</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              <code>tsr-scroll-restoration-*</code>,{" "}
              <code>better-auth-ui.*</code> (session storage)
            </TableCell>
            <TableCell>
              Restores your scroll position and remembers the email address for
              a pending sign-in, verification, or password reset step
            </TableCell>
            <TableCell>Until you close the tab</TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <h2>4. How to Manage Cookies</h2>
      <h3 id="cookie-settings" className="scroll-mt-20">
        Cookie Consent Banner
      </h3>
      <p>
        When you first visit our website, a cookie consent banner will appear
        allowing you to accept or decline analytics cookies. You can change your
        choice at any time here:
      </p>
      <CookieSettings />

      <h3>Browser Settings</h3>
      <p>
        Most web browsers allow you to control cookies through their settings.
        You can typically:
      </p>
      <ul>
        <li>View what cookies are stored on your device</li>
        <li>Delete individual or all cookies</li>
        <li>Block third-party cookies</li>
        <li>Block all cookies from specific sites</li>
        <li>Block all cookies entirely</li>
      </ul>
      <p>
        Please note that blocking strictly necessary cookies may prevent you
        from signing in or using core features of the website.
      </p>
      <p>
        For instructions on managing cookies in your browser, visit your
        browser&apos;s help documentation:
      </p>
      <ul>
        <li>
          <a
            href="https://support.google.com/chrome/answer/95647"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google Chrome
          </a>
        </li>
        <li>
          <a
            href="https://support.mozilla.org/en-US/kb/clear-cookies-and-site-data-firefox"
            target="_blank"
            rel="noopener noreferrer"
          >
            Mozilla Firefox
          </a>
        </li>
        <li>
          <a
            href="https://support.apple.com/en-us/105082"
            target="_blank"
            rel="noopener noreferrer"
          >
            Safari
          </a>
        </li>
        <li>
          <a
            href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09"
            target="_blank"
            rel="noopener noreferrer"
          >
            Microsoft Edge
          </a>
        </li>
      </ul>

      <h2>5. Updates to This Cookie Policy</h2>
      <p>
        We may update this Cookie Policy from time to time to reflect changes in
        the cookies we use or for other operational, legal, or regulatory
        reasons. The &quot;Last updated&quot; date at the top of this page
        indicates when it was last revised.
      </p>

      <h2>6. Contact Us</h2>
      <p>
        If you have questions about our use of cookies, please contact us at:
      </p>
      <ul>
        <li>
          <strong>Email:</strong>{" "}
          <a href="mailto:support@soulfiremc.com">support@soulfiremc.com</a>
        </li>
        <li>
          <strong>GitHub:</strong>{" "}
          <a
            href="https://github.com/soulfiremc-com/SoulFire"
            target="_blank"
            rel="noopener noreferrer"
          >
            github.com/soulfiremc-com/SoulFire
          </a>
        </li>
      </ul>

      <h2>7. More Information</h2>
      <p>
        For more details on how we handle your personal data, please see our{" "}
        <Link to="/privacy-policy">Privacy Policy</Link>.
      </p>

      <p className="text-sm text-muted-foreground">
        This policy is adapted from the{" "}
        <a
          href="https://www.cookieyes.com/blog/cookie-policy-template/"
          target="_blank"
          rel="noopener noreferrer"
        >
          CookieYes free cookie policy template
        </a>
        .
      </p>
    </main>
  );
}

export const Route = createFileRoute("/cookie-policy")({
  head: () => ({
    meta: getPageMeta({
      title: "Cookie Policy - SoulFire",
      description:
        "Which cookies and browser storage soulfiremc.com uses, and how to change your analytics choice.",
      path: "/cookie-policy",
    }),
    links: getCanonicalLinks("/cookie-policy"),
  }),
  component: CookiePolicyPage,
});

function CookiePolicyPage() {
  return (
    <SiteShell>
      <CookiePolicy />
    </SiteShell>
  );
}
