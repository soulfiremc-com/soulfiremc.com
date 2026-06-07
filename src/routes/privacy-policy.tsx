import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site-shell";
import { getCanonicalLinks, getPageMeta } from "@/lib/seo";

function PrivacyPolicy() {
  return (
    <main className="px-4 py-12 w-full max-w-(--fd-layout-width) mx-auto prose">
      <h1>Privacy Policy</h1>
      <p>
        <strong>Last updated:</strong> February 25, 2026
      </p>

      <p>
        This privacy notice for SoulFire (&quot;we,&quot; &quot;us,&quot; or
        &quot;our&quot;) describes how and why we might collect, store, use,
        and/or share (&quot;process&quot;) your information when you use our
        services (&quot;Services&quot;), such as when you visit our website at{" "}
        <a href="https://soulfiremc.com">soulfiremc.com</a>, or any website of
        ours that links to this privacy notice.
      </p>
      <p>
        This privacy policy template is based on{" "}
        <a
          href="https://termly.io/resources/templates/privacy-policy-template/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Termly&apos;s free privacy policy template
        </a>
        .
      </p>

      <h2>1. What Information Do We Collect?</h2>
      <h3>Personal Information You Provide</h3>
      <p>
        We collect personal information that you voluntarily provide when you
        register on our website, express an interest in obtaining information
        about us or our products and Services, or otherwise contact us.
      </p>
      <p>
        <strong>Personal information provided by you.</strong> The personal
        information we collect depends on the context of your interactions with
        us and the choices you make. It may include:
      </p>
      <ul>
        <li>Email address</li>
        <li>Name and display username</li>
        <li>Passwords (hashed, never stored in plaintext)</li>
        <li>
          Avatar image (from OAuth provider or{" "}
          <a
            href="https://gravatar.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Gravatar
          </a>
          )
        </li>
        <li>
          OAuth account identifiers (Discord user ID, GitHub user ID) when you
          link social accounts
        </li>
        <li>
          WebAuthn passkey credentials (public key, device type) when you
          register a passkey
        </li>
        <li>Two-factor authentication secrets and backup codes</li>
        <li>Docs feedback text you voluntarily submit</li>
      </ul>

      <h3>Information Collected Automatically</h3>
      <p>
        We automatically collect certain information when you visit, use, or
        navigate our website. This information does not reveal your specific
        identity but may include:
      </p>
      <ul>
        <li>
          <strong>IP address</strong> &mdash; recorded per authenticated session
        </li>
        <li>
          <strong>User agent / browser information</strong> &mdash; recorded per
          authenticated session
        </li>
        <li>
          <strong>Device and usage information</strong> &mdash; collected via
          analytics cookies (see our{" "}
          <Link to="/cookie-policy">Cookie Policy</Link>)
        </li>
      </ul>

      <h2>2. How Do We Process Your Information?</h2>
      <p>We process your information to:</p>
      <ul>
        <li>
          <strong>Provide and maintain our Services</strong> &mdash; including
          account creation, authentication, and session management.
        </li>
        <li>
          <strong>Send you transactional emails</strong> &mdash; email
          verification, password resets, email change confirmation, account
          deletion verification, and two-factor authentication codes. These are
          sent via{" "}
          <a
            href="https://resend.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Resend
          </a>{" "}
          from <code>auth@transactional.soulfiremc.com</code>.
        </li>
        <li>
          <strong>Protect our Services</strong> &mdash; we use{" "}
          <a
            href="https://www.cloudflare.com/products/turnstile/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Cloudflare Turnstile
          </a>{" "}
          CAPTCHA, including invisible Turnstile challenges for actions such as
          ratings and reviews, to prevent automated abuse. For more information,
          see Cloudflare&apos;s{" "}
          <a
            href="https://www.cloudflare.com/trust-hub/turnstile-privacy-addendum/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Turnstile Privacy Addendum
          </a>
          . We also check passwords against the{" "}
          <a
            href="https://haveibeenpwned.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Have I Been Pwned
          </a>{" "}
          breached password database.
        </li>
        <li>
          <strong>Analyze usage and improve our website</strong> &mdash; with
          your consent, we use{" "}
          <a
            href="https://posthog.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            PostHog
          </a>{" "}
          (EU-hosted) for product analytics.
        </li>
        <li>
          <strong>SEO monitoring</strong> &mdash; we use{" "}
          <a
            href="https://ahrefs.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Ahrefs Analytics
          </a>{" "}
          for website performance and SEO analysis.
        </li>
      </ul>

      <h2>3. When and With Whom Do We Share Your Information?</h2>
      <p>
        We do not sell your personal information. We may share your data with
        the following third-party service providers who process it on our
        behalf:
      </p>
      <table>
        <thead>
          <tr>
            <th>Service</th>
            <th>Purpose</th>
            <th>Data Shared</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <a
                href="https://www.cloudflare.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                Cloudflare
              </a>
            </td>
            <td>Website hosting and database connection pooling</td>
            <td>All account and session data</td>
          </tr>
          <tr>
            <td>
              <a
                href="https://vercel.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                Vercel
              </a>
            </td>
            <td>Website hosting and CDN</td>
            <td>Request metadata (IP, headers)</td>
          </tr>
          <tr>
            <td>
              <a
                href="https://resend.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                Resend
              </a>
            </td>
            <td>Transactional email delivery</td>
            <td>Email address, email content</td>
          </tr>
          <tr>
            <td>
              <a
                href="https://posthog.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                PostHog (EU)
              </a>
            </td>
            <td>Product analytics (consent-gated)</td>
            <td>Usage data, device info, feedback text</td>
          </tr>
          <tr>
            <td>
              <a
                href="https://ahrefs.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                Ahrefs
              </a>
            </td>
            <td>SEO analytics</td>
            <td>Page visit data</td>
          </tr>
          <tr>
            <td>
              <a
                href="https://www.cloudflare.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                Cloudflare
              </a>
            </td>
            <td>Turnstile CAPTCHA</td>
            <td>Browser interaction data for bot detection</td>
          </tr>
          <tr>
            <td>
              <a
                href="https://discord.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                Discord
              </a>
            </td>
            <td>OAuth login &amp; linked roles</td>
            <td>OAuth tokens, user ID</td>
          </tr>
          <tr>
            <td>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub
              </a>
            </td>
            <td>OAuth login</td>
            <td>OAuth tokens, user ID</td>
          </tr>
          <tr>
            <td>
              <a
                href="https://gravatar.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                Gravatar
              </a>
            </td>
            <td>Avatar fallback</td>
            <td>MD5 hash of email address</td>
          </tr>
          <tr>
            <td>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                YouTube
              </a>
            </td>
            <td>Embedded demo video</td>
            <td>Standard YouTube embed data</td>
          </tr>
        </tbody>
      </table>

      <h2>4. Do We Use Cookies and Tracking Technologies?</h2>
      <p>
        Yes. We use cookies and similar tracking technologies to access and
        store information. For details on what cookies we use and how you can
        manage them, please see our{" "}
        <Link to="/cookie-policy">Cookie Policy</Link>.
      </p>

      <h2>5. How Long Do We Keep Your Information?</h2>
      <p>
        We keep your personal information for as long as your account is active
        or as needed to provide you our Services. When you delete your account,
        we will delete or anonymize your personal information within a
        reasonable time, except where retention is required by law.
      </p>
      <p>
        Session records (including IP address and user agent) are retained for
        the duration of the session and may be retained for a reasonable period
        after expiration for security and debugging purposes.
      </p>

      <h2>6. How Do We Keep Your Information Safe?</h2>
      <p>
        We implement appropriate technical and organizational security measures
        to protect your personal information, including:
      </p>
      <ul>
        <li>Passwords are hashed before storage (never stored in plaintext)</li>
        <li>Row-Level Security (RLS) is enabled on all database tables</li>
        <li>HTTPS is enforced across the entire website</li>
        <li>Content Security Policy (CSP) headers restrict script execution</li>
        <li>
          Security headers (X-Frame-Options, X-Content-Type-Options) are set
          globally
        </li>
        <li>Breached password detection via Have I Been Pwned</li>
        <li>Two-factor authentication (TOTP and email OTP) is supported</li>
        <li>WebAuthn passkeys for passwordless authentication</li>
      </ul>
      <p>
        However, no method of electronic transmission or storage is 100% secure.
        We cannot guarantee absolute security of your data.
      </p>

      <h2>7. What Are Your Privacy Rights?</h2>
      <p>
        Depending on your location, you may have the following rights regarding
        your personal data:
      </p>
      <ul>
        <li>
          <strong>Access</strong> &mdash; request a copy of the personal data we
          hold about you.
        </li>
        <li>
          <strong>Rectification</strong> &mdash; request correction of
          inaccurate data.
        </li>
        <li>
          <strong>Deletion</strong> &mdash; request deletion of your account and
          associated data. You can initiate account deletion from your{" "}
          <Link to="/account/$path" params={{ path: "settings" }}>
            account settings
          </Link>
          .
        </li>
        <li>
          <strong>Withdraw consent</strong> &mdash; you can withdraw consent for
          analytics cookies at any time via our cookie consent banner.
        </li>
        <li>
          <strong>Data portability</strong> &mdash; request your data in a
          portable format.
        </li>
      </ul>
      <p>
        To exercise any of these rights, contact us at{" "}
        <a href="mailto:support@soulfiremc.com">support@soulfiremc.com</a>.
      </p>

      <h2>8. Do We Collect Information from Minors?</h2>
      <p>
        We do not knowingly collect data from or market to children under 13
        years of age. By using our Services, you represent that you are at least
        13 years old. If we learn that we have collected personal information
        from a child under 13, we will take steps to delete that information as
        soon as possible.
      </p>

      <h2>9. Do We Make Updates to This Policy?</h2>
      <p>
        We may update this privacy notice from time to time. The updated version
        will be indicated by an updated &quot;Last updated&quot; date at the top
        of this page. We encourage you to review this page periodically to stay
        informed about how we protect your information.
      </p>

      <h2>10. How Can You Contact Us?</h2>
      <p>
        If you have questions or concerns about this privacy notice or our data
        practices, contact us at:
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
    </main>
  );
}

export const Route = createFileRoute("/privacy-policy")({
  head: () => ({
    meta: getPageMeta({
      title: "Privacy Policy - SoulFire",
      description: "SoulFire Privacy Policy.",
      path: "/privacy-policy",
    }),
    links: getCanonicalLinks("/privacy-policy"),
  }),
  component: PrivacyPolicyPage,
});

function PrivacyPolicyPage() {
  return (
    <SiteShell>
      <PrivacyPolicy />
    </SiteShell>
  );
}
