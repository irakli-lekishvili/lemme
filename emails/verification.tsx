import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface VerificationEmailProps {
  confirmationUrl: string;
}

export default function VerificationEmail({
  confirmationUrl = "https://lemme.love/auth/confirm",
}: VerificationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Confirm your email to get started on Lemme Love</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Card */}
          <Section style={card}>
            {/* Logo */}
            <Section style={logoSection}>
              <Text style={logo}>
                LEMME<span style={logoDot}>.</span>LOVE
              </Text>
            </Section>

            {/* Content */}
            <Heading style={heading}>Verify your email</Heading>
            <Text style={paragraph}>
              Thanks for signing up! Click the button below to verify your email
              and start sharing with the community.
            </Text>

            {/* Button */}
            <Section style={buttonSection}>
              <Button style={button} href={confirmationUrl}>
                Verify Email
              </Button>
            </Section>

            {/* Divider */}
            <Hr style={divider} />

            {/* Fallback link */}
            <Text style={linkText}>
              Or copy this link into your browser:
            </Text>
            <Text style={urlText}>{confirmationUrl}</Text>
          </Section>

          {/* Footer */}
          <Text style={footer}>
            If you didn&apos;t create an account on Lemme Love, you can safely
            ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

// Design tokens matching your app
const colors = {
  bgBase: "#141414",
  bgCard: "#242424",
  bgSurface: "#1f1f1f",
  textPrimary: "#ffffff",
  textSecondary: "#a3a3a3",
  textMuted: "#737373",
  borderSubtle: "#1f1f1f",
  borderDefault: "#262626",
  primary500: "#e85d75",
  primary400: "#ff637a",
  secondary500: "#a855f7",
};

const main = {
  backgroundColor: colors.bgBase,
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
  padding: "40px 0",
};

const container = {
  margin: "0 auto",
  padding: "0 20px",
  maxWidth: "480px",
};

const card = {
  backgroundColor: colors.bgCard,
  borderRadius: "16px",
  border: `1px solid ${colors.borderDefault}`,
  padding: "40px 32px",
};

const logoSection = {
  textAlign: "center" as const,
  marginBottom: "32px",
};

const logo = {
  color: colors.textPrimary,
  fontSize: "22px",
  fontWeight: "700",
  letterSpacing: "-0.025em",
  margin: "0",
};

const logoDot = {
  color: colors.primary500,
};

const heading = {
  color: colors.textPrimary,
  fontSize: "24px",
  fontWeight: "600",
  textAlign: "center" as const,
  margin: "0 0 16px",
  letterSpacing: "-0.025em",
};

const paragraph = {
  color: colors.textSecondary,
  fontSize: "15px",
  lineHeight: "24px",
  textAlign: "center" as const,
  margin: "0 0 32px",
};

const buttonSection = {
  textAlign: "center" as const,
  marginBottom: "32px",
};

const button = {
  backgroundColor: colors.primary500,
  borderRadius: "12px",
  color: colors.textPrimary,
  fontSize: "15px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  padding: "14px 28px",
  display: "inline-block",
};

const divider = {
  borderColor: colors.borderDefault,
  borderTop: "none",
  margin: "0 0 24px",
};

const linkText = {
  color: colors.textMuted,
  fontSize: "13px",
  textAlign: "center" as const,
  margin: "0 0 8px",
};

const urlText = {
  color: colors.secondary500,
  fontSize: "13px",
  textAlign: "center" as const,
  margin: "0",
  wordBreak: "break-all" as const,
};

const footer = {
  color: colors.textMuted,
  fontSize: "13px",
  textAlign: "center" as const,
  margin: "24px 0 0",
  lineHeight: "20px",
};
