import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { ReactNode } from "react";
import { sendEmail } from "@/lib/resend";

interface BaseEmailParams {
  user: {
    id: string;
    name?: string | null;
    email: string;
  };
}

interface EmailWithUrlParams extends BaseEmailParams {
  url: string;
}

interface OTPEmailParams extends BaseEmailParams {
  otp: string;
}

interface EmailOTPParams {
  email: string;
  otp: string;
  type: "sign-in" | "email-verification" | "forget-password" | "change-email";
}

const siteName = "SoulFire";
const baseUrl = "https://soulfiremc.com";
const imageUrl = `${baseUrl}/apple-icon.png`;
const fromAddress = "SoulFire Auth <auth@transactional.soulfiremc.com>";
const replyTo = "SoulFire Support <support@transactional.soulfiremc.com>";

function AuthEmailTemplate({
  action,
  children,
  heading,
  preview = heading,
  url,
}: {
  action?: string;
  children: ReactNode;
  heading: string;
  preview?: string;
  url?: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={emailStyles.body}>
        <Container style={emailStyles.container}>
          <Section style={emailStyles.logoSection}>
            <Img
              src={imageUrl}
              alt={`${siteName} logo`}
              width="48"
              height="48"
              style={emailStyles.logo}
            />
          </Section>
          <Heading style={emailStyles.heading}>{heading}</Heading>
          <Section style={emailStyles.content}>{children}</Section>
          {url && action ? (
            <Section style={emailStyles.actionSection}>
              <Button href={url} style={emailStyles.button}>
                {action}
              </Button>
            </Section>
          ) : null}
          <Hr style={emailStyles.separator} />
          <Text style={emailStyles.footer}>
            If you did not request this, you can ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const emailStyles = {
  body: {
    margin: 0,
    backgroundColor: "#f6f6f6",
    color: "#171717",
    fontFamily: "Geist, sans-serif",
  },
  container: {
    margin: "0 auto",
    padding: "40px 20px",
    maxWidth: "560px",
  },
  logoSection: {
    marginBottom: "24px",
  },
  logo: {
    borderRadius: "10px",
  },
  heading: {
    margin: "0 0 20px",
    fontSize: "24px",
    lineHeight: "32px",
    fontWeight: 700,
  },
  content: {
    fontSize: "15px",
    lineHeight: "24px",
  },
  actionSection: {
    marginTop: "28px",
  },
  button: {
    backgroundColor: "#171717",
    borderRadius: "8px",
    color: "#ffffff",
    display: "inline-block",
    fontSize: "14px",
    fontWeight: 600,
    padding: "12px 18px",
    textDecoration: "none",
  },
  separator: {
    borderColor: "#dedede",
    margin: "32px 0 16px",
  },
  footer: {
    color: "#737373",
    fontSize: "13px",
    lineHeight: "20px",
  },
} as const;

export const authNotifications = {
  async sendPasswordReset({ user, url }: EmailWithUrlParams) {
    const name = user.name ?? user.email.split("@")[0];
    await sendEmail(
      fromAddress,
      user.email,
      replyTo,
      `Your password reset request for ${siteName}`,
      <AuthEmailTemplate
        action="Reset Password"
        heading="Password reset request"
        url={url}
      >
        <Text>{`Hello ${name},`}</Text>
        <Text>
          You have requested to reset your password. Please click the button
          below to confirm your request.
        </Text>
      </AuthEmailTemplate>,
    );
  },

  async sendEmailVerification({ user, url }: EmailWithUrlParams) {
    const name = user.name ?? user.email.split("@")[0];
    await sendEmail(
      fromAddress,
      user.email,
      replyTo,
      `Verify your email address for ${siteName}`,
      <AuthEmailTemplate
        action="Verify Email"
        heading="Verify your email address"
        url={url}
      >
        <Text>{`Hello ${name},`}</Text>
        <Text>Click the button below to verify your email address.</Text>
      </AuthEmailTemplate>,
    );
  },

  async sendChangeEmailConfirmation({ user, url }: EmailWithUrlParams) {
    const name = user.name ?? user.email.split("@")[0];
    await sendEmail(
      fromAddress,
      user.email,
      replyTo,
      `Your email change verification for ${siteName}`,
      <AuthEmailTemplate
        action="Change Email"
        heading="Email change verification"
        url={url}
      >
        <Text>{`Hello ${name},`}</Text>
        <Text>
          You have requested to change your email. Please click the button below
          to confirm your request.
        </Text>
      </AuthEmailTemplate>,
    );
  },

  async sendDeleteAccountVerification({ user, url }: EmailWithUrlParams) {
    const name = user.name ?? user.email.split("@")[0];
    await sendEmail(
      fromAddress,
      user.email,
      replyTo,
      `Your account deletion request for ${siteName}`,
      <AuthEmailTemplate
        action="Delete Account"
        heading="Account deletion request"
        url={url}
      >
        <Text>{`Hello ${name},`}</Text>
        <Text>
          You have requested to delete your account. Please click the button
          below to confirm your request.
        </Text>
      </AuthEmailTemplate>,
    );
  },

  async sendTwoFactorOTP({ user, otp }: OTPEmailParams) {
    const name = user.name ?? user.email.split("@")[0];
    await sendEmail(
      fromAddress,
      user.email,
      replyTo,
      `Your verification code for ${siteName}`,
      <AuthEmailTemplate heading="Two-factor authentication code">
        <Text>{`Hello ${name},`}</Text>
        <Text>
          Your verification code is <strong>{otp}</strong>.
        </Text>
        <Text>If you did not request this, please ignore this email.</Text>
      </AuthEmailTemplate>,
    );
  },

  async sendEmailOTP({ email, otp, type }: EmailOTPParams) {
    const headingMap = {
      "sign-in": "Sign in code",
      "email-verification": "Email verification code",
      "forget-password": "Password reset code",
      "change-email": "Change email",
    };
    const subjectMap = {
      "sign-in": `Your sign-in code for ${siteName}`,
      "email-verification": `Your verification code for ${siteName}`,
      "forget-password": `Your password reset code for ${siteName}`,
      "change-email": `Your email change verification code for ${siteName}`,
    };

    await sendEmail(
      fromAddress,
      email,
      replyTo,
      subjectMap[type],
      <AuthEmailTemplate heading={headingMap[type]}>
        <Text>
          Your code is <strong>{otp}</strong>.
        </Text>
        <Text>If you did not request this, please ignore this email.</Text>
      </AuthEmailTemplate>,
    );
  },
};
