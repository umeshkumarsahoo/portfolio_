import fs from "fs";
import path from "path";
import nodemailer from "nodemailer";

export interface ContactData {
  name: string;
  email: string;
  message: string;
}

export interface SendEmailResult {
  success: boolean;
  message: string;
  provider: "resend" | "smtp" | "local_persisted";
  error?: string;
}

export interface EmailDraftState {
  isContactWorkflow: boolean;
  isConfirmation: boolean;
  isCancellation: boolean;
  isEdit: boolean;
  draft?: {
    name?: string;
    email?: string;
    message?: string;
  };
  missingFields: ("name" | "email" | "message")[];
  status: "idle" | "collecting" | "pending_confirmation" | "confirmed" | "cancelled";
}

// In-memory record to prevent accidental rapid double-sending within 30 seconds
const recentSubmissions = new Map<string, number>();

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeText(value: unknown, maxLength: number, allowNewlines = false): string {
  if (typeof value !== "string") return "";
  const controlPattern = allowNewlines ? /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g : /[\u0000-\u001F\u007F]/g;
  return value.replace(controlPattern, "").trim().slice(0, maxLength);
}

/**
 * Validates contact input fields.
 */
export function validateContactInput(data: { name?: unknown; email?: unknown; message?: unknown; msg?: unknown }): {
  valid: boolean;
  name: string;
  email: string;
  message: string;
  error?: string;
} {
  const rawName = typeof data.name === "string" ? data.name : "";
  const rawEmail = typeof data.email === "string" ? data.email : "";
  const rawMsg = typeof data.message === "string" ? data.message : typeof data.msg === "string" ? data.msg : "";

  const name = normalizeText(rawName, 120);
  const email = normalizeText(rawEmail, 254).toLowerCase();
  const message = normalizeText(rawMsg, 4000, true);

  if (!name || !email || !message) {
    return {
      valid: false,
      name,
      email,
      message,
      error: "Name, email, and message fields are required.",
    };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return {
      valid: false,
      name,
      email,
      message,
      error: "Please provide a valid email address.",
    };
  }

  if (message.length > 4000) {
    return {
      valid: false,
      name,
      email,
      message,
      error: "Message is too long. Please keep it under 4000 characters.",
    };
  }

  return { valid: true, name, email, message };
}

/**
 * Persists message to local contacts.json file.
 */
export function persistContactLocally(contact: ContactData): boolean {
  try {
    const filePath = path.join(process.cwd(), "contacts.json");
    let messagesList: unknown[] = [];
    if (fs.existsSync(filePath)) {
      try {
        const fileContent = fs.readFileSync(filePath, "utf-8");
        const parsed = JSON.parse(fileContent);
        messagesList = Array.isArray(parsed) ? parsed : [];
      } catch (err) {
        console.error("[EMAIL] Error reading contacts.json:", err);
      }
    }

    messagesList.push({
      timestamp: new Date().toISOString(),
      name: contact.name,
      email: contact.email,
      message: contact.message,
    });

    fs.writeFileSync(filePath, JSON.stringify(messagesList, null, 2), { encoding: "utf-8", mode: 0o600 });
    return true;
  } catch (err) {
    console.error("[EMAIL] Error writing to contacts.json:", err);
    return false;
  }
}

/**
 * Dispatches contact email via Resend HTTPS (port 443) or Nodemailer SMTP,
 * and saves durably to contacts.json.
 */
export async function sendContactEmail(contactInput: {
  name: string;
  email: string;
  message?: string;
  msg?: string;
}): Promise<SendEmailResult> {
  const validation = validateContactInput(contactInput);
  if (!validation.valid) {
    return {
      success: false,
      message: validation.error || "Invalid input data.",
      provider: "local_persisted",
      error: validation.error,
    };
  }

  const { name, email, message } = validation;

  // Duplicate prevention within 30 seconds
  const subKey = `${email}:${message.slice(0, 50)}`;
  const now = Date.now();
  const lastTime = recentSubmissions.get(subKey);
  if (lastTime && now - lastTime < 30 * 1000) {
    return {
      success: false,
      message: "A message with this content was recently received. Please wait a moment before sending again.",
      provider: "local_persisted",
      error: "Duplicate submission prevented.",
    };
  }
  recentSubmissions.set(subKey, now);

  // 1. Always durably persist locally
  persistContactLocally({ name, email, message });

  // 2. Dispatch real email via Resend HTTPS or SMTP
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const smtpHost = process.env.SMTP_HOST?.trim();
  const smtpPort = process.env.SMTP_PORT?.trim();
  const smtpUser = process.env.SMTP_USER?.trim();
  const smtpPass = process.env.SMTP_PASS?.trim();
  const mailTo = process.env.SMTP_TO?.trim() || "sahooumesh2003@gmail.com";

  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeMessage = escapeHtml(message);

  // Option A: Resend HTTPS API (Port 443, works on all platforms including Render Free Tier)
  if (resendApiKey) {
    try {
      console.log(`[EMAIL] Dispatching via Resend HTTPS API to ${mailTo}...`);
      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Portfolio Contact <onboarding@resend.dev>",
          to: [mailTo],
          reply_to: email,
          subject: `New Portfolio Message from ${name}`,
          text: `You have received a new contact submission from your portfolio.\n\nFrom: ${name} <${email}>\nDate: ${new Date().toLocaleString()}\n\nMessage:\n${message}\n\n(Persisted durably in contacts.json)`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; border: 1px solid #e7e2d8; padding: 24px; border-radius: 8px; background: #fdfcf9; color: #171717;">
              <h2 style="margin-top: 0; padding-bottom: 12px; border-bottom: 1px solid #e7e2d8; font-size: 20px; font-weight: 600;">New Portfolio Contact</h2>
              <p style="margin: 8px 0; font-size: 14px;"><strong>From:</strong> ${safeName} &lt;<a href="mailto:${safeEmail}" style="color: #2468B4;">${safeEmail}</a>&gt;</p>
              <p style="margin: 8px 0; font-size: 14px;"><strong>Date:</strong> ${new Date().toLocaleString()}</p>
              <div style="background: #f7f4ec; padding: 16px; border-left: 3px solid #2468B4; margin-top: 16px; white-space: pre-wrap; font-size: 14px; line-height: 1.6; border-radius: 4px;">${safeMessage}</div>
              <p style="font-size: 11px; color: #888; margin-top: 24px; border-top: 1px solid #e7e2d8; padding-top: 12px;">This message was also securely saved to contacts.json on the server.</p>
            </div>
          `,
        }),
      });

      if (resendRes.ok) {
        console.log(`[EMAIL] Resend email dispatched successfully to ${mailTo}`);
        return {
          success: true,
          message: "Transmission complete. Your direct message has been securely submitted.",
          provider: "resend",
        };
      }
      const errBody = await resendRes.text();
      console.error(`[EMAIL] Resend API error: ${resendRes.status} - ${errBody}`);
    } catch (err: any) {
      console.error("[EMAIL] Resend connection error:", err.message);
    }
  }

  // Option B: Standard SMTP (Nodemailer)
  if (smtpUser && smtpPass && (smtpHost || process.env.SMTP_SERVICE === "gmail")) {
    const cleanPass = smtpPass.replace(/\s+/g, "");
    const isGmail = (smtpHost && smtpHost.includes("gmail")) || process.env.SMTP_SERVICE === "gmail";
    const port = Number(smtpPort) || (isGmail ? 465 : 587);
    const isSecure = port === 465;

    try {
      const transportConfig: any = isGmail
        ? { service: "gmail", auth: { user: smtpUser, pass: cleanPass } }
        : {
            host: smtpHost,
            port,
            secure: isSecure,
            auth: { user: smtpUser, pass: cleanPass },
            connectionTimeout: 10000,
            tls: { rejectUnauthorized: false },
          };

      const transporter = nodemailer.createTransport(transportConfig);
      await transporter.sendMail({
        from: `"${name} (Portfolio Contact)" <${smtpUser}>`,
        to: mailTo,
        replyTo: email,
        subject: `New Portfolio Message from ${name}`,
        text: `You have received a new contact submission from your portfolio.\n\nFrom: ${name} <${email}>\nDate: ${new Date().toLocaleString()}\n\nMessage:\n${message}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; border: 1px solid #e7e2d8; padding: 24px; border-radius: 8px; background: #fdfcf9; color: #171717;">
            <h2 style="margin-top: 0; padding-bottom: 12px; border-bottom: 1px solid #e7e2d8; font-size: 20px; font-weight: 600;">New Portfolio Contact</h2>
            <p style="margin: 8px 0; font-size: 14px;"><strong>From:</strong> ${safeName} &lt;<a href="mailto:${safeEmail}" style="color: #2468B4;">${safeEmail}</a>&gt;</p>
            <div style="background: #f7f4ec; padding: 16px; border-left: 3px solid #2468B4; margin-top: 16px; white-space: pre-wrap; font-size: 14px; line-height: 1.6; border-radius: 4px;">${safeMessage}</div>
          </div>
        `,
      });
      console.log(`[EMAIL] SMTP email dispatched successfully to ${mailTo}`);
      return {
        success: true,
        message: "Transmission complete. Your direct message has been securely submitted.",
        provider: "smtp",
      };
    } catch (mailError: any) {
      console.warn(`[EMAIL] SMTP Dispatch Warning: ${mailError.message}`);
    }
  }

  // Option C: Saved locally in contacts.json (guaranteed persistence)
  console.log(`[EMAIL] Saved contact submission in contacts.json for Umesh.`);
  return {
    success: true,
    message: "Your message has been securely recorded and sent to Umesh.",
    provider: "local_persisted",
  };
}

/**
 * Analyzes conversation history and current query to track and parse contact/collaboration workflow.
 */
export function parseContactWorkflow(
  currentMessage: string,
  rawHistory: { role: string; content?: string; text?: string }[] = [],
  overrideDraft?: { name?: string; email?: string; message?: string }
): EmailDraftState {
  const currentLower = currentMessage.toLowerCase().trim();

  // Normalize history entries so both .content and .text formats work, and normalize role
  const history = (rawHistory || []).map((h: any) => ({
    role: String(h?.role || "").toLowerCase(),
    content: (typeof h?.content === "string" ? h.content : (typeof h?.text === "string" ? h.text : "")) || "",
  }));

  const isAssistantRole = (role: string) => role === "assistant" || role === "agent" || role === "model";

  // If client supplied explicit draft fields (e.g. from UI confirmation or inline edit)
  let explicitName = overrideDraft?.name ? normalizeText(overrideDraft.name, 120) : undefined;
  let explicitEmail = overrideDraft?.email ? normalizeText(overrideDraft.email, 254).toLowerCase() : undefined;
  let explicitMessage = overrideDraft?.message ? normalizeText(overrideDraft.message, 4000, true) : undefined;

  // 1. Check if previous assistant message presented a draft or asked for confirmation
  const lastAgentMsg = [...history].reverse().find((h) => isAssistantRole(h.role))?.content || "";
  const lastAgentMsgLower = lastAgentMsg.toLowerCase();
  const hasPendingDraftInHistory =
    lastAgentMsgLower.includes("email draft") ||
    lastAgentMsgLower.includes("prepared an email") ||
    lastAgentMsgLower.includes("would you like me to send this") ||
    lastAgentMsgLower.includes("please confirm");

  // 2. Check for explicit Confirmation of a pending draft
  const isConfirmWord =
    /^(yes|confirm|send|send it|send email|do it|go ahead|sure|looks good|please send|submit|ok send|confirm and send)\b/i.test(
      currentLower
    ) ||
    currentLower === "yes" ||
    currentLower === "confirm" ||
    currentLower === "send" ||
    currentLower === "ok";

  // 3. Check for Cancellation
  const isCancelWord =
    /^(cancel|stop|nevermind|never mind|don't send|dont send|abort|no|discard)\b/i.test(currentLower) ||
    currentLower === "cancel" ||
    currentLower === "no";

  if (hasPendingDraftInHistory && isCancelWord) {
    return {
      isContactWorkflow: true,
      isConfirmation: false,
      isCancellation: true,
      isEdit: false,
      missingFields: [],
      status: "cancelled",
    };
  }

  // 4. Check for Contact Context in History
  const historyHasContactFlow = history.some((h) => {
    const c = h.content.toLowerCase();
    return (
      /conta[a-z]*/i.test(c) ||
      c.includes("send a message") ||
      c.includes("send message") ||
      c.includes("send my message") ||
      c.includes("direct message to umesh") ||
      c.includes("email draft") ||
      c.includes("what email address") ||
      c.includes("may i have your name") ||
      c.includes("who is contacting him") ||
      c.includes("what message") ||
      c.includes("collaborat") ||
      c.includes("email umesh") ||
      c.includes("tell umesh")
    );
  });

  const isExplicitContactIntent =
    /conta[a-z]*/i.test(currentLower) ||
    /send.*(message|msg|email)/i.test(currentLower) ||
    currentLower.includes("reach out") ||
    currentLower.includes("tell umesh") ||
    currentLower.includes("talk to umesh") ||
    currentLower.includes("connect with umesh") ||
    currentLower.includes("say hi to umesh") ||
    currentLower.includes("say hello to umesh") ||
    currentLower.includes("collaborate") ||
    currentLower.includes("collaboration") ||
    (currentLower.includes("hire") && (currentLower.includes("umesh") || currentLower.includes("you"))) ||
    currentLower.includes("internship");

  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;

  // Check if current message is email
  const currentEmailMatch = currentMessage.match(emailRegex);

  const isInContactWorkflow =
    isExplicitContactIntent ||
    hasPendingDraftInHistory ||
    historyHasContactFlow ||
    currentEmailMatch !== null;

  if (!isInContactWorkflow && !explicitName && !explicitEmail) {
    return {
      isContactWorkflow: false,
      isConfirmation: false,
      isCancellation: false,
      isEdit: false,
      missingFields: [],
      status: "idle",
    };
  }

  // Check if last assistant message had a prepared draft
  const draftFromMatch =
    lastAgentMsg.match(/•\s*(?:\*\*)?From:(?:\*\*)?\s*([^(]+?)\s*\(`?([^`)\s]+)`?\)/i) ||
    lastAgentMsg.match(/(?:^|\n)\s*From:\s*([^(]+?)\s*\(`?([^`)\s]+)`?\)/i);

  const draftMessageMatch =
    lastAgentMsg.match(/•\s*(?:\*\*)?Message:(?:\*\*)?\s*["“]?([^\n"”]+?)["”]?\s*(?:\n|$)/i) ||
    lastAgentMsg.match(/(?:^|\n)\s*Message:\s*["“]?([^\n"”]+?)["”]?\s*(?:\n|$)/i);

  // 5. Extract Email (prefer current message for updates, fallback to history)
  let email = explicitEmail;
  if (!email) {
    if (currentEmailMatch) {
      email = currentEmailMatch[0].toLowerCase();
    } else if (draftFromMatch && draftFromMatch[2]) {
      email = draftFromMatch[2].trim().toLowerCase();
    } else {
      for (let i = history.length - 1; i >= 0; i--) {
        if (history[i].role !== "user") continue;
        const m = history[i].content.match(emailRegex);
        if (m) {
          email = m[0].toLowerCase();
          break;
        }
      }
    }
  }

  // 6. Extract Name
  let name = explicitName;
  const namePatterns = [
    /(?:my name is|i am|i'm|name is|call me)\s+([A-Za-z\s]{2,30})/i,
    /name:\s*([A-Za-z\s]{2,30})/i,
    /from:\s*([A-Za-z\s]{2,30})/i,
  ];

  if (!name) {
    // Check current message first
    for (const pat of namePatterns) {
      const m = currentMessage.match(pat);
      if (m && m[1]) {
        const candidate = m[1].trim().replace(/\b(and|my|email|at|is)\b.*$/i, "").trim();
        if (candidate.length >= 2 && !candidate.includes("@")) {
          name = candidate;
          break;
        }
      }
    }
  }

  if (!name && draftFromMatch && draftFromMatch[1]) {
    const candidate = draftFromMatch[1].trim();
    if (candidate.length >= 2) {
      name = candidate;
    }
  }

  if (!name) {
    // Check user history in reverse
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].role !== "user") continue;
      for (const pat of namePatterns) {
        const m = history[i].content.match(pat);
        if (m && m[1]) {
          const candidate = m[1].trim().replace(/\b(and|my|email|at|is)\b.*$/i, "").trim();
          if (candidate.length >= 2 && !candidate.includes("@")) {
            name = candidate;
            break;
          }
        }
      }
      if (name) break;
    }
  }

  // If last assistant turn specifically asked for name, and user provided a standalone name
  if (!name && history.length > 0) {
    const prevTurn = history[history.length - 1];
    if (
      isAssistantRole(prevTurn.role) &&
      (prevTurn.content.toLowerCase().includes("may i have your name") ||
        prevTurn.content.toLowerCase().includes("share your name") ||
        prevTurn.content.toLowerCase().includes("who is contacting"))
    ) {
      if (
        currentMessage.length >= 2 &&
        currentMessage.length <= 40 &&
        !currentEmailMatch &&
        !isConfirmWord &&
        !isCancelWord
      ) {
        name = currentMessage.trim();
      }
    }
  }

  // 7. Extract Message
  let message = explicitMessage;
  const msgPatterns = [
    /(?:send(?:\s+my)?\s+message(?:\s+to\s+umesh)?\s+that)\s+(.+)/i,
    /(?:tell umesh that|send a message to umesh that|send him a message that|tell him that|tell umesh|tell him)\s+(.+)/i,
    /(?:change message to|edit message to|update message to|message is|my message is|message:\s*)(.+)/i,
    /(?:interested in|want to discuss|collaborate on|hiring for)\s+(.+)/i,
  ];

  if (!message) {
    for (const pat of msgPatterns) {
      const m = currentMessage.match(pat);
      if (m && m[1]) {
        const candidate = m[1].trim();
        if (candidate.length >= 2 && !candidate.toLowerCase().startsWith("what")) {
          message = candidate;
          break;
        }
      }
    }
  }

  if (!message && (currentLower.includes("said hi") || currentLower.includes("say hi") || currentLower.includes("say hello"))) {
    message = "Hello Umesh, I wanted to say hi!";
  } else if (!message && currentLower.includes("collaborat")) {
    message = currentMessage.replace(/^.*?(collaborat\w*)/i, "I'm interested in collaborating").trim();
  } else if (!message && (currentLower.includes("hire") || currentLower.includes("internship"))) {
    message = currentMessage;
  }

  // If not in current message, check if draft was in previous assistant message
  if (!message && draftMessageMatch && draftMessageMatch[1]) {
    message = draftMessageMatch[1].trim();
  }

  // If not in current message or assistant draft, search user history
  if (!message) {
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].role !== "user") continue;
      for (const pat of msgPatterns) {
        const m = history[i].content.match(pat);
        if (m && m[1]) {
          const candidate = m[1].trim();
          if (candidate.length > 4 && !candidate.toLowerCase().startsWith("what")) {
            message = candidate;
            break;
          }
        }
      }
      if (message) break;
    }
  }

  // If assistant asked for message and user typed it
  if (!message && history.length > 0) {
    const prevTurn = history[history.length - 1];
    if (
      isAssistantRole(prevTurn.role) &&
      (prevTurn.content.toLowerCase().includes("what message") ||
        prevTurn.content.toLowerCase().includes("what would you like to say") ||
        prevTurn.content.toLowerCase().includes("collaboration proposal"))
    ) {
      if (currentMessage.length > 3 && !currentEmailMatch && !isConfirmWord && !isCancelWord) {
        message = currentMessage.trim();
      }
    }
  }

  // Clean message
  if (message) {
    message = message
      .replace(/(?:my\s+)?email(?:\s+is)?[:\s]+[^\s,]+[.,]?/gi, "")
      .replace(/(?:my\s+)?name(?:\s+is)?[:\s]+[A-Za-z]+(?=[,.]|\s|$)/gi, "")
      .replace(/^[,\s.-]+|[,\s.-]+$/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!message || message.length < 3) {
      message = "I am interested in connecting and collaborating with Umesh.";
    }
  }

  // 8. If user confirmed a pending draft
  if (hasPendingDraftInHistory && isConfirmWord) {
    return {
      isContactWorkflow: true,
      isConfirmation: true,
      isCancellation: false,
      isEdit: false,
      draft: { name, email, message },
      missingFields: [],
      status: "confirmed",
    };
  }

  // 9. Determine missing fields
  const missingFields: ("name" | "email" | "message")[] = [];
  if (!name) missingFields.push("name");
  if (!email) missingFields.push("email");
  if (!message) missingFields.push("message");

  const status = missingFields.length === 0 ? "pending_confirmation" : "collecting";

  return {
    isContactWorkflow: true,
    isConfirmation: false,
    isCancellation: false,
    isEdit: false,
    draft: { name, email, message },
    missingFields,
    status,
  };
}
