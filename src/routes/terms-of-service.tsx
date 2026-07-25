import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site-shell";
import { AUTH_UI_VIEW_PATHS } from "@/lib/auth-ui-config";
import { getCanonicalLinks, getPageMeta } from "@/lib/seo";

function TermsOfService() {
  return (
    <main className="px-4 py-12 w-full max-w-(--fd-layout-width) mx-auto prose">
      <h1>Terms of Service</h1>
      <p>
        <strong>Last updated:</strong> February 25, 2026
      </p>

      <p>
        This Terms of Service template is adapted from{" "}
        <a
          href="https://gist.github.com/devver/380029"
          target="_blank"
          rel="noopener noreferrer"
        >
          a general Terms of Service template
        </a>{" "}
        licensed under the{" "}
        <a
          href="https://creativecommons.org/licenses/by/3.0/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Creative Commons Attribution 3.0 License
        </a>
        , originally derived from the{" "}
        <a
          href="https://www.heroku.com/policy/tos"
          target="_blank"
          rel="noopener noreferrer"
        >
          Heroku Terms of Service
        </a>
        .
      </p>

      <h2>1. Agreement to Terms</h2>
      <p>
        By accessing or using the SoulFire website at{" "}
        <a href="https://soulfiremc.com">soulfiremc.com</a>{" "}
        (&quot;Service&quot;), you agree to be bound by these Terms of Service
        (&quot;Terms&quot;). If you do not agree to these Terms, do not use the
        Service.
      </p>
      <p>
        We reserve the right to update these Terms at any time. Continued use of
        the Service after changes constitutes acceptance of the revised Terms.
        We will update the &quot;Last updated&quot; date at the top of this page
        when changes are made.
      </p>

      <h2>2. Description of Service</h2>
      <p>
        SoulFire is an open-source Minecraft bot software project. The website
        at soulfiremc.com provides:
      </p>
      <ul>
        <li>Documentation for the SoulFire software</li>
        <li>User accounts for community features</li>
        <li>Blog posts and guides</li>
        <li>Links to third-party account, proxy, and resource providers</li>
        <li>Discord linked roles integration</li>
      </ul>

      <h2>3. Account Registration</h2>
      <p>
        To access certain features, you may need to create an account. When
        registering, you agree to:
      </p>
      <ul>
        <li>Provide accurate, current, and complete information</li>
        <li>Maintain the security of your password and account credentials</li>
        <li>
          Accept responsibility for all activities that occur under your account
        </li>
        <li>Notify us immediately of any unauthorized use of your account</li>
      </ul>
      <p>
        You may register using email and password, social login (Discord or
        GitHub), email OTP (magic link), or WebAuthn passkeys. You must be at
        least 13 years of age to create an account.
      </p>
      <p>
        We reserve the right to suspend or terminate accounts that violate these
        Terms, including the right to ban users with or without reason at our
        discretion.
      </p>

      <h2>4. Acceptable Use</h2>
      <p>You agree not to use the Service to:</p>
      <ul>
        <li>Violate any applicable law or regulation</li>
        <li>Infringe the intellectual property or privacy rights of others</li>
        <li>Transmit any malware, viruses, or other harmful code</li>
        <li>
          Attempt to gain unauthorized access to the Service or its related
          systems
        </li>
        <li>
          Scrape, crawl, or use automated means to access the Service without
          our express permission
        </li>
        <li>Harass, abuse, or threaten other users</li>
        <li>
          Impersonate any person or entity, or misrepresent your affiliation
        </li>
        <li>Interfere with or disrupt the Service or servers</li>
        <li>Create multiple accounts to circumvent bans or restrictions</li>
      </ul>

      <h2>5. Intellectual Property</h2>
      <p>
        The SoulFire software is open-source and licensed under its respective
        open-source license. The website content, design, and branding
        (excluding user-generated content and open-source components) are the
        property of SoulFire and its contributors.
      </p>
      <p>
        Third-party listings (accounts, proxies, resources) linked on the
        website are the property of their respective owners. We do not claim
        ownership of third-party content.
      </p>

      <h2>6. User-Generated Content</h2>
      <p>
        When you submit content to the Service (such as documentation feedback
        or ratings and reviews), you retain ownership of your content. By
        submitting content, you grant us a non-exclusive, worldwide,
        royalty-free license to use, display, and distribute your content in
        connection with the Service.
      </p>
      <p>
        We reserve the right to remove any user-generated content at our
        discretion.
      </p>

      <h2>7. Third-Party Services and Links</h2>
      <p>
        The Service may contain links to or integrations with third-party
        websites and services, including but not limited to:
      </p>
      <ul>
        <li>Discord (OAuth login, linked roles, community server)</li>
        <li>GitHub (OAuth login, source code repository)</li>
        <li>Ko-fi (donations)</li>
        <li>YouTube (embedded video content)</li>
        <li>Third-party Minecraft account, proxy, and resource providers</li>
      </ul>
      <p>
        We are not responsible for the content, privacy practices, or terms of
        any third-party services. Your use of third-party services is governed
        by their respective terms and policies.
      </p>

      <h2>8. Privacy</h2>
      <p>
        Your use of the Service is also governed by our{" "}
        <Link to="/privacy-policy">Privacy Policy</Link>, which describes how we
        collect, use, and protect your personal information, and our{" "}
        <Link to="/cookie-policy">Cookie Policy</Link>, which describes how we
        use cookies and similar technologies.
      </p>

      <h2>9. Disclaimer of Warranties</h2>
      <p>
        THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot;
        WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT
        NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
        PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
      </p>
      <p>
        We do not warrant that the Service will be uninterrupted, error-free, or
        secure. We do not warrant the accuracy or completeness of any
        information provided through the Service.
      </p>

      <h2>10. Limitation of Liability</h2>
      <p>
        TO THE MAXIMUM EXTENT PERMITTED BY LAW, SOULFIRE AND ITS CONTRIBUTORS
        SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
        CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES,
        WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE,
        GOODWILL, OR OTHER INTANGIBLE LOSSES RESULTING FROM:
      </p>
      <ul>
        <li>Your use of or inability to use the Service</li>
        <li>
          Any unauthorized access to or use of our servers and/or any personal
          information stored therein
        </li>
        <li>Any interruption or cessation of the Service</li>
        <li>
          Any bugs, viruses, or other harmful code transmitted through the
          Service by any third party
        </li>
      </ul>

      <h2>11. Account Termination</h2>
      <p>
        You may delete your account at any time from your{" "}
        <Link
          to="/account/$path"
          params={{ path: AUTH_UI_VIEW_PATHS.settings.account }}
        >
          account settings
        </Link>
        . Upon deletion, your personal data will be removed in accordance with
        our <Link to="/privacy-policy">Privacy Policy</Link>.
      </p>
      <p>
        We may suspend or terminate your account and access to the Service at
        our sole discretion, without prior notice, for conduct that we determine
        violates these Terms or is harmful to other users, us, or third parties,
        or for any other reason.
      </p>

      <h2>12. Indemnification</h2>
      <p>
        You agree to indemnify and hold harmless SoulFire and its contributors
        from and against any claims, liabilities, damages, losses, and expenses
        (including reasonable attorney fees) arising out of or in any way
        connected with your access to or use of the Service or your violation of
        these Terms.
      </p>

      <h2>13. Governing Law</h2>
      <p>
        These Terms shall be governed by and construed in accordance with the
        laws applicable in the jurisdiction of your residence, without regard to
        conflict of law principles.
      </p>

      <h2>14. Severability</h2>
      <p>
        If any provision of these Terms is found to be unenforceable or invalid,
        that provision shall be limited or eliminated to the minimum extent
        necessary so that these Terms shall otherwise remain in full force and
        effect.
      </p>

      <h2>15. Contact Us</h2>
      <p>If you have any questions about these Terms, please contact us at:</p>
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

export const Route = createFileRoute("/terms-of-service")({
  head: () => ({
    meta: getPageMeta({
      title: "Terms of Service - SoulFire",
      description: "SoulFire Terms of Service.",
      path: "/terms-of-service",
    }),
    links: getCanonicalLinks("/terms-of-service"),
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <SiteShell>
      <TermsOfService />
    </SiteShell>
  );
}
