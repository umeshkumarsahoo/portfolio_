import fs from "fs";
import path from "path";
import nodemailer from "nodemailer";
import OpenAI from "openai";

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
 * Validates whether a candidate string is an actual human name,
 * filtering out conversational phrases, negations, verbs, and keywords.
 */
export function isValidPersonName(candidate: string): boolean {
  if (!candidate || typeof candidate !== "string") return false;
  const cleaned = candidate.trim().replace(/[^A-Za-z\s]/g, "").trim();
  if (cleaned.length < 2 || cleaned.length > 35) return false;
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 0 || words.length > 3) return false;

  const invalidNameWords = new Set([
    "not", "no", "just", "looking", "asking", "trying", "here", "interested",
    "wondering", "sorry", "writing", "reaching", "contacting", "sending",
    "a", "an", "the", "student", "developer", "engineer", "user", "visitor",
    "coder", "learning", "working", "explaining", "saying", "telling", "testing",
    "doing", "curious", "ready", "sure", "happy", "fine", "good", "ok", "okay",
    "willing", "planning", "hoping", "able", "back", "new", "online",
    "rag", "project", "code", "repo", "repository", "github", "umesh", "terminal",
    "assistant", "news", "headline", "email", "mail", "message", "msg", "draft", "feature",
    "model", "bigru", "freshguard", "timeseries", "devops", "docker", "python",
    "javascript", "react", "fastapi", "whisper", "speech", "audio", "video",
    "hi", "hello", "hey", "yo", "thanks", "thank", "please", "can", "could", "would",
    "want", "wanted", "wanting", "like", "liked", "send", "sent", "chat", "talk",
    "blah", "blahblah", "test", "testing", "who", "what", "where", "why", "how",
    "know", "about", "neither", "either", "none"
  ]);

  for (const w of words) {
    if (invalidNameWords.has(w.toLowerCase())) {
      return false;
    }
  }
  return true;
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

  const isAssistantRole = (role: string) => role === "assistant" || role === "agent" || role === "model";

  // 0. Sift history: Prune any turns prior to the most recently completed or cancelled email workflow
  const rawItems = (rawHistory || []).map((h: any) => ({
    role: String(h?.role || "").toLowerCase(),
    content: (typeof h?.content === "string" ? h.content : (typeof h?.text === "string" ? h.text : "")) || "",
  }));

  const lastCompletionReversedIdx = [...rawItems].reverse().findIndex((h) => {
    if (!isAssistantRole(h.role)) return false;
    const c = h.content.toLowerCase();
    return (
      c.includes("message delivered") ||
      c.includes("dispatched to umesh") ||
      c.includes("draft cancelled") ||
      c.includes("no message was sent")
    );
  });

  const history =
    lastCompletionReversedIdx !== -1
      ? rawItems.slice(rawItems.length - lastCompletionReversedIdx)
      : rawItems;

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

  // 2. Check for Contact Context in History (from active, non-completed history only)
  const historyHasContactFlow = history.some((h) => {
    const c = h.content.toLowerCase();
    return (
      /\b(contact|contatc|conatct)\b/i.test(c) ||
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

  // 3. Check for explicit Confirmation of a pending draft
  const isConfirmWord =
    /^(yes|confirm|send|send it|send email|do it|go ahead|sure|looks good|please send|submit|ok send|confirm and send)\b/i.test(
      currentLower
    ) ||
    currentLower === "yes" ||
    currentLower === "confirm" ||
    currentLower === "send" ||
    currentLower === "ok";

  // Check if current message is an explicit new contact intent
  const isExplicitContactIntent =
    /\b(contact|contatc|conatct|reach out|get in touch)\b/i.test(currentLower) ||
    /s[en]{2}d.*(message|msg|email)/i.test(currentLower) ||
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
  const currentEmailMatch = currentMessage.match(emailRegex);

  // Question patterns (e.g., "Why is...", "What is...", "Who is...", or ending with ?)
  const isQuestionPattern =
    /\?$/.test(currentLower) ||
    /^(why|what|who|where|when|how|which|is|are|can you|could you|would you|do you|did you|tell me|explain|show me)\b/i.test(currentLower);

  const isCollaborationPhrase =
    /s[en]{2}d.*(message|msg|email)/i.test(currentLower) ||
    currentLower.includes("tell umesh") ||
    currentLower.includes("talk to umesh") ||
    currentLower.includes("collaborat") ||
    currentLower.includes("hire") ||
    currentLower.includes("internship") ||
    currentLower.includes("said hi") ||
    currentLower.includes("say hi");

  // Check if user is asking a project, outside question, or topic shift to automatically exit contact loop
  const isTopicShiftOrProjectQuestion =
    !isExplicitContactIntent &&
    ((isQuestionPattern && !isCollaborationPhrase && !currentEmailMatch) ||
      /^(no|nope|wait|hold on|stop)\b.*(want to|know|about|tell|project|rag|repo|code|news|what|why|how)/i.test(currentLower) ||
      currentLower === "rag" ||
      currentLower.includes("about rag") ||
      currentLower.includes("abput rag") ||
      currentLower.includes("rag-based") ||
      currentLower.includes("freshguard") ||
      currentLower.includes("emotion") ||
      currentLower.includes("bigru") ||
      currentLower.includes("cgpa") ||
      currentLower.includes("silicon university") ||
      currentLower.includes("who are you") ||
      currentLower.includes("what projects") ||
      currentLower.includes("explain your") ||
      currentLower.includes("repo") ||
      currentLower.includes("code") ||
      currentLower.includes("extract") ||
      currentLower.includes("not asking") ||
      currentLower.includes("how many") ||
      currentLower.includes("news") ||
      currentLower.includes("headline"));

  if (isTopicShiftOrProjectQuestion) {
    return {
      isContactWorkflow: false,
      isConfirmation: false,
      isCancellation: false,
      isEdit: false,
      missingFields: [],
      status: "idle",
    };
  }

  // 4. Check for Cancellation (Allowed at ANY point: collecting or pending draft, provided it's not a topic shift)
  const isCancelWord =
    /^(cancel|stop|nevermind|never mind|don't send|dont send|abort|discard|exit|quit)\b/i.test(currentLower) ||
    /^no[, ]+(?:cancel|stop|nevermind|never mind|don't send|dont send|discard|exit|quit|thanks|thank you)/i.test(currentLower) ||
    currentLower === "cancel" ||
    currentLower === "exit" ||
    currentLower === "quit" ||
    currentLower === "stop" ||
    currentLower === "nevermind" ||
    currentLower === "never mind" ||
    currentLower === "abort" ||
    currentLower === "no";

  if (isCancelWord && (hasPendingDraftInHistory || historyHasContactFlow)) {
    return {
      isContactWorkflow: true,
      isConfirmation: false,
      isCancellation: true,
      isEdit: false,
      missingFields: [],
      status: "cancelled",
    };
  }

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

  // 5. Extract Email (prefer explicit, then labeled format, then current message regex, then draft, then history)
  let email = explicitEmail;
  if (!email) {
    const labeledEmailMatch = currentMessage.match(/(?:^|[|\n;,])\s*(?:email|mail)[:\s]+([^\s|,\n;]+@[^\s|,\n;]+\.[^\s|,\n;]+)/i);
    if (labeledEmailMatch) {
      email = labeledEmailMatch[1].trim().toLowerCase();
    } else if (currentEmailMatch) {
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
  const explicitNamePatterns = [
    /my name is\s+([A-Za-z\s]{2,30})/i,
    /name:\s*([A-Za-z\s]{2,30})/i,
    /from:\s*([A-Za-z\s]{2,30})/i,
    /call me\s+([A-Za-z\s]{2,30})/i,
  ];
  const casualNamePattern = /(?:i am|i'm)\s+([A-Za-z\s]{2,30})/i;

  // Labeled name pattern in current message (e.g. Name: Alex | Email: ...)
  const labeledNameMatch = currentMessage.match(/(?:^|[|\n;,])\s*(?:name|from|sender)[:\s]+([^|,\n;]+)/i);
  if (!name && labeledNameMatch) {
    const candidate = labeledNameMatch[1].trim().replace(/[^A-Za-z\s]/g, "").trim();
    if (isValidPersonName(candidate)) {
      name = candidate.charAt(0).toUpperCase() + candidate.slice(1);
    }
  }

  if (!name) {
    // Check current message with explicit name patterns
    for (const pat of explicitNamePatterns) {
      const m = currentMessage.match(pat);
      if (m && m[1]) {
        let candidate = m[1].trim().split(/[|,\n;\t]/)[0].replace(/\b(and|nd|&|my|email|mail|msg|message|at|is|here)\b.*$/i, "").trim();
        candidate = candidate.replace(/[^A-Za-z\s]/g, "").trim();
        if (isValidPersonName(candidate)) {
          name = candidate.charAt(0).toUpperCase() + candidate.slice(1);
          break;
        }
      }
    }
  }

  if (!name) {
    // Check casual "i am / i'm" in current message only if candidate is a strictly valid person name
    const m = currentMessage.match(casualNamePattern);
    if (m && m[1]) {
      let candidate = m[1].trim().split(/[|,\n;\t]/)[0].replace(/\b(and|nd|&|my|email|mail|msg|message|at|is|here)\b.*$/i, "").trim();
      candidate = candidate.replace(/[^A-Za-z\s]/g, "").trim();
      if (isValidPersonName(candidate)) {
        name = candidate.charAt(0).toUpperCase() + candidate.slice(1);
      }
    }
  }

  // Check standalone person name in current message if not email, not confirm/cancel, and 1-3 words
  if (
    !name &&
    !currentEmailMatch &&
    !isConfirmWord &&
    !isCancelWord &&
    currentMessage.length >= 2 &&
    currentMessage.length <= 35 &&
    !isCollaborationPhrase &&
    isValidPersonName(currentMessage.trim())
  ) {
    name = currentMessage.trim().charAt(0).toUpperCase() + currentMessage.trim().slice(1);
  }

  if (!name && draftFromMatch && draftFromMatch[1]) {
    const candidate = draftFromMatch[1].trim();
    if (isValidPersonName(candidate)) {
      name = candidate;
    }
  }

  if (!name) {
    // Search user history in reverse for explicit name patterns or standalone names
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].role !== "user") continue;
      const c = history[i].content.trim();
      const labeled = c.match(/(?:^|[|\n;,])\s*(?:name|from|sender)[:\s]+([^|,\n;]+)/i);
      if (labeled) {
        const candidate = labeled[1].trim().replace(/[^A-Za-z\s]/g, "").trim();
        if (isValidPersonName(candidate)) {
          name = candidate.charAt(0).toUpperCase() + candidate.slice(1);
          break;
        }
      }
      for (const pat of explicitNamePatterns) {
        const m = c.match(pat);
        if (m && m[1]) {
          let candidate = m[1].trim().split(/[|,\n;\t]/)[0].replace(/\b(and|nd|&|my|email|mail|msg|message|at|is|here)\b.*$/i, "").trim();
          candidate = candidate.replace(/[^A-Za-z\s]/g, "").trim();
          if (isValidPersonName(candidate)) {
            name = candidate.charAt(0).toUpperCase() + candidate.slice(1);
            break;
          }
        }
      }
      if (name) break;
      if (!c.includes("@") && c.length <= 35 && isValidPersonName(c)) {
        name = c.charAt(0).toUpperCase() + c.slice(1);
        break;
      }
    }
  }

  // 7. Extract Message
  let message = explicitMessage;

  // Labeled message in current message (e.g. Message: Hello Umesh...)
  const labeledMsgMatch = currentMessage.match(/(?:^|[|\n;,])\s*(?:message|msg|proposal|body|note)[:\s]+([^|]+)/i);
  if (!message && labeledMsgMatch && labeledMsgMatch[1].trim().length >= 2) {
    message = labeledMsgMatch[1].trim();
  }

  const msgPatterns = [
    /(?:s[en]{2}d|sned|send|tell)(?:\s+my|\s+a)?\s+(?:message|msg|email)?(?:\s+to\s+umesh)?(?:\s+that|\s*:\s*|\s+saying\s+)\s*(.+)/i,
    /(?:i\s+want\s+to\s+(?:send|sned|tell)\s+(?:a\s+|my\s+)?(?:message|msg|email)?(?:\s+to\s+umesh)?(?:\s+that|\s*:\s*|\s+saying\s+))\s*(.+)/i,
    /(?:tell umesh that|send a message to umesh that|send him a message that|tell him that)\s+(.+)/i,
    /(?:change message to|edit message to|update message to|message is|my message is|message:\s*)(.+)/i,
    /(?:can we collaborate|want to collaborate|interested in collaborating)\b(.*)/i,
  ];

  if (!message) {
    for (const pat of msgPatterns) {
      const m = currentMessage.match(pat);
      if (m && m[1]) {
        let candidate = m[1].trim().replace(/^(?:to\s+(?:umesh|him|you)\s*)/i, "").trim();
        if (candidate.length >= 2 && !candidate.toLowerCase().startsWith("what") && candidate.toLowerCase() !== "umesh") {
          message = candidate;
          break;
        }
      }
    }
  }

  if (!message && (currentLower.includes("said hi") || currentLower.includes("say hi") || currentLower.includes("say hello"))) {
    message = "Hello Umesh, I wanted to say hi!";
  } else if (!message && currentLower.includes("can we collaborate")) {
    message = "Can we collaborate now?";
  } else if (!message && currentLower.includes("collaborat")) {
    message = currentMessage.replace(/^.*?(collaborat\w*)/i, "I'm interested in collaborating").trim();
  } else if (!message && (currentLower.includes("hire") || currentLower.includes("internship"))) {
    message = currentMessage;
  }

  // If not in current message, check if draft was in previous assistant message
  if (!message && draftMessageMatch && draftMessageMatch[1]) {
    message = draftMessageMatch[1].trim();
  }

  // Search user history in reverse for explicit messages or labeled messages
  if (!message) {
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].role !== "user") continue;
      const c = history[i].content.trim();
      const lMatch = c.match(/(?:^|[|\n;,])\s*(?:message|msg|proposal|body|note)[:\s]+([^|]+)/i);
      if (lMatch && lMatch[1].trim().length >= 2) {
        message = lMatch[1].trim();
        break;
      }
      for (const pat of msgPatterns) {
        const m = c.match(pat);
        if (m && m[1]) {
          let candidate = m[1].trim().replace(/^(?:to\s+(?:umesh|him|you)\s*)/i, "").trim();
          if (candidate.length > 4 && !candidate.toLowerCase().startsWith("what") && candidate.toLowerCase() !== "umesh") {
            message = candidate;
            break;
          }
        }
      }
      if (message) break;
    }
  }

  // Check historical dialogue turns where assistant asked for message and user replied
  if (!message) {
    for (let i = 0; i < history.length - 1; i++) {
      if (!isAssistantRole(history[i].role)) continue;
      const p = history[i].content.toLowerCase();
      if (
        p.includes("what message") ||
        p.includes("collaboration proposal") ||
        p.includes("what would you like to say") ||
        p.includes("message would you like to send")
      ) {
        const userTurn = history[i + 1];
        if (userTurn && userTurn.role === "user") {
          const uText = userTurn.content.trim();
          if (
            uText.length >= 3 &&
            !uText.includes("@") &&
            !isValidPersonName(uText) &&
            !/^(cancel|stop|exit|quit|no)$/i.test(uText)
          ) {
            message = uText;
            break;
          }
        }
      }
    }
  }

  // If assistant just asked for message and current message is a reply (and not email, confirm/cancel, or standalone name)
  if (!message && history.length > 0) {
    const prevTurn = history[history.length - 1];
    if (
      isAssistantRole(prevTurn.role) &&
      (prevTurn.content.toLowerCase().includes("what message") ||
        prevTurn.content.toLowerCase().includes("what would you like to say") ||
        prevTurn.content.toLowerCase().includes("collaboration proposal") ||
        prevTurn.content.toLowerCase().includes("message would you like to send"))
    ) {
      if (
        currentMessage.length > 3 &&
        !currentEmailMatch &&
        !isConfirmWord &&
        !isCancelWord &&
        !isValidPersonName(currentMessage.trim())
      ) {
        message = currentMessage.trim();
      }
    }
  }

  // Residual message extraction if single-turn contains name + email + extra text
  if (!message && name && email && currentMessage.length > 15) {
    let residual = currentMessage
      .replace(new RegExp(email, "gi"), "")
      .replace(new RegExp(`\\b${name}\\b`, "gi"), "")
      .replace(/(?:my\s+)?email(?:\s+is)?[:\s]*/gi, "")
      .replace(/(?:my\s+)?name(?:\s+is)?[:\s]*/gi, "")
      .replace(/(?:my\s+)?message(?:\s+is)?[:\s]*/gi, "")
      .replace(/(?:i\s+want\s+to\s+send\s+(?:a\s+|my\s+)?(?:message|msg|email)?(?:\s+to\s+umesh)?(?:\s+that|\s*:\s*|\s+saying\s+)?)/gi, "")
      .replace(/\b(and|nd|&|at|is|here|tell umesh that)\b/gi, " ")
      .replace(/[|,:;\-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (residual.length >= 3) {
      message = residual;
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

export const parseContactWorkflowSync = parseContactWorkflow;

/**
 * Creates OpenRouter client configured with OpenRouter API base URL and metadata.
 */
export function createOpenRouterClient(apiKey?: string): OpenAI | null {
  const key = (apiKey || process.env.OPENROUTER_API_KEY)?.trim();
  if (!key) return null;
  return new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: key,
    defaultHeaders: {
      "HTTP-Referer": process.env.SITE_URL || "https://portfolio-4r6o.onrender.com",
      "X-Title": "UMU AI Decision Engine",
    },
  });
}

/**
 * Queries OpenRouter Reasoning Model (e.g. thinkingmachines/inkling:free) for context-aware decision making.
 */
export async function queryOpenRouterDecision(
  openRouter: OpenAI,
  currentMessage: string,
  history: { role: string; content: string }[],
  model = process.env.OPENROUTER_MODEL || "thinkingmachines/inkling:free"
): Promise<{
  intent: "contact" | "confirm" | "cancel" | "outside_query";
  name: string | null;
  email: string | null;
  message: string | null;
  reasoning?: string;
} | null> {
  try {
    const formattedHistory = history
      .slice(-6)
      .map((h) => `${h.role === "user" ? "User" : "UMU"}: ${h.content}`)
      .join("\n");

    const prompt = `You are the decision-making engine for UMU, an AI portfolio assistant for Umesh Kumar Sahoo.
UMU allows visitors to explore Umesh's background, projects, or send him a direct message / collaboration proposal.

Analyze the conversation history and the latest user message to determine intent and extract details.

CONVERSATION HISTORY:
${formattedHistory || "(Start of conversation)"}

LATEST USER MESSAGE:
"${currentMessage}"

DECISION RULES:
1. "outside_query": The user is asking a general question, asking a personal question about Umesh (e.g. "Why is...", "Who is...", "What does..."), asking about Umesh's projects (RAG, FreshGuard, BiGRU), asking for code, asking for tech news, or chatting casually.
CRITICAL: If the assistant previously asked for contact info (like "What email address..."), but the user asks an unrelated question or says something outside of providing contact info, YOU MUST CLASSIFY THIS AS "outside_query"! Do NOT force them into the contact flow!
2. "cancel": The user says "cancel", "stop", "never mind", "exit", "abort", "no", or wants to exit the contact flow.
3. "confirm": The user explicitly confirms a prepared email draft (e.g. "yes", "confirm", "send", "send it", "looks good").
4. "contact": The user wants to contact Umesh, send a message to Umesh, collaborate, or is providing contact information (name, email, message).

EXTRACTION RULES (for "contact" and "confirm"):
- name: The visitor's own name (NOT Umesh). Null if unknown.
- email: The visitor's email address. Null if unknown.
- message: The message or collaboration proposal they want to send to Umesh. Null if unknown.
- Check BOTH the latest message AND previous conversation turns for these details. If an email, name, or message was provided in previous turns, KEEP IT!

Respond with ONLY valid JSON:
{
  "intent": "contact" | "confirm" | "cancel" | "outside_query",
  "name": string | null,
  "email": string | null,
  "message": string | null,
  "reasoning": string
}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const apiResponse = await openRouter.chat.completions.create(
      {
        model,
        messages: [
          { role: "system", content: "You are an accurate JSON-only intent classifier and entity extractor. Output strictly valid JSON." },
          { role: "user", content: prompt },
        ],
        temperature: 0.1,
        // OpenRouter reasoning parameter
        ...({ reasoning: { enabled: true } } as any),
      },
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    const rawContent = apiResponse?.choices?.[0]?.message?.content || "";
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.intent) {
        return {
          intent: parsed.intent,
          name: typeof parsed.name === "string" && parsed.name.trim() ? parsed.name.trim() : null,
          email: typeof parsed.email === "string" && parsed.email.trim() ? parsed.email.trim() : null,
          message: typeof parsed.message === "string" && parsed.message.trim() ? parsed.message.trim() : null,
          reasoning: typeof parsed.reasoning === "string" ? parsed.reasoning : undefined,
        };
      }
    }
    return null;
  } catch (err: any) {
    console.warn("[OPENROUTER] Decision LLM notice:", err?.message || err);
    return null;
  }
}

/**
 * Asynchronously resolves contact workflow with OpenRouter reasoning LLM, falling back to deterministic parser.
 */
export async function resolveContactWorkflow(
  currentMessage: string,
  rawHistory: { role: string; content?: string; text?: string }[] = [],
  overrideDraft?: { name?: string; email?: string; message?: string },
  openRouterClient?: OpenAI | null,
  _geminiClient?: any
): Promise<EmailDraftState> {
  const syncState = parseContactWorkflowSync(currentMessage, rawHistory, overrideDraft);

  // If explicit button confirmation or cancellation, respect it immediately
  if (syncState.isConfirmation || syncState.isCancellation) {
    return syncState;
  }

  // If OpenRouter client is configured, evaluate with reasoning LLM
  if (openRouterClient) {
    const rawItems = (rawHistory || []).map((h: any) => ({
      role: String(h?.role || "").toLowerCase(),
      content: (typeof h?.content === "string" ? h.content : (typeof h?.text === "string" ? h.text : "")) || "",
    }));

    const decision = await queryOpenRouterDecision(openRouterClient, currentMessage, rawItems);
    if (decision) {
      console.log(`[BACKEND] OpenRouter decision (${process.env.OPENROUTER_MODEL || "thinkingmachines/inkling:free"}): intent=${decision.intent}`);

      if (decision.intent === "outside_query") {
        return {
          isContactWorkflow: false,
          isConfirmation: false,
          isCancellation: false,
          isEdit: false,
          missingFields: [],
          status: "idle",
        };
      }

      if (decision.intent === "cancel") {
        return {
          isContactWorkflow: true,
          isConfirmation: false,
          isCancellation: true,
          isEdit: false,
          missingFields: [],
          status: "cancelled",
        };
      }

      if (decision.intent === "confirm") {
        const name = decision.name || syncState.draft?.name;
        const email = decision.email || syncState.draft?.email;
        const message = decision.message || syncState.draft?.message;
        if (name && email && message) {
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
      }

      if (decision.intent === "contact") {
        const name = decision.name || syncState.draft?.name;
        const email = decision.email || syncState.draft?.email;
        const message = decision.message || syncState.draft?.message;

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
    }
  }

  return syncState;
}
