import { render } from "@react-email/render";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import VerificationEmail from "./verification";
import PasswordResetEmail from "./password-reset";

const TEMPLATES_DIR = join(process.cwd(), "supabase", "templates");

async function exportTemplates() {
  mkdirSync(TEMPLATES_DIR, { recursive: true });

  // Export verification email with Supabase template variable
  const verificationHtml = await render(
    VerificationEmail({ confirmationUrl: "{{ .ConfirmationURL }}" })
  );
  writeFileSync(join(TEMPLATES_DIR, "confirmation.html"), verificationHtml);
  console.log("Exported: confirmation.html");

  // Export password reset email with Supabase template variable
  const resetHtml = await render(
    PasswordResetEmail({ resetUrl: "{{ .ConfirmationURL }}" })
  );
  writeFileSync(join(TEMPLATES_DIR, "recovery.html"), resetHtml);
  console.log("Exported: recovery.html");

  console.log("\nTemplates exported to supabase/templates/");
}

exportTemplates().catch(console.error);
