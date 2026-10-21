import fs from "fs";
import path from "path";
import {
  validateContactInput,
  persistContactLocally,
  sendContactEmail,
  parseContactWorkflow,
} from "../emailService";

async function runEmailWorkflowTests() {
  console.log("==================================================");
  console.log("📧 TESTING UMU AI EMAIL & AGENT ACTION WORKFLOW");
  console.log("==================================================\n");

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    total++;
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}${detail ? ` - ${detail}` : ""}`);
      process.exitCode = 1;
    }
  }

  // ── GROUP 1: Server-Side Validation ──
  console.log("🔍 Group 1: Server-Side Input Validation");
  {
    const valid = validateContactInput({
      name: "Alice Johnson",
      email: "alice@example.com",
      message: "I loved your RAG project and want to collaborate on AI agents.",
    });
    assert(valid.valid, "Valid contact details pass validation");
    assert(valid.email === "alice@example.com", "Email is normalized and trimmed");

    const invalidEmail = validateContactInput({
      name: "Alice",
      email: "not-an-email",
      message: "Hello Umesh",
    });
    assert(!invalidEmail.valid, "Rejects malformed email address");
    assert(invalidEmail.error?.includes("valid email") === true, "Gives descriptive email error");

    const missingName = validateContactInput({
      name: "",
      email: "alice@example.com",
      message: "Hello",
    });
    assert(!missingName.valid, "Rejects empty name");

    const missingMessage = validateContactInput({
      name: "Alice",
      email: "alice@example.com",
      message: "",
    });
    assert(!missingMessage.valid, "Rejects empty message");
  }

  // ── GROUP 2: Contact Workflow Detection & Missing Information Collection ──
  console.log("\n🔍 Group 2: Contact Workflow Detection & Missing Fields");
  {
    const initialQuery = "I want to contact Umesh";
    const flow1 = parseContactWorkflow(initialQuery, []);
    assert(flow1.isContactWorkflow, "Identifies 'I want to contact Umesh' as contact workflow");
    assert(flow1.status === "collecting", "Sets status to 'collecting' when information is missing");
    assert(flow1.missingFields.includes("name"), "Identifies name is missing");
    assert(flow1.missingFields.includes("email"), "Identifies email is missing");
    assert(!flow1.isConfirmation, "Never marks unconfirmed query as confirmed");

    const collabQuery = "Tell Umesh I'm interested in collaborating on ML";
    const flow2 = parseContactWorkflow(collabQuery, []);
    assert(flow2.isContactWorkflow, "Recognizes collaboration inquiry");
    assert(flow2.missingFields.includes("email"), "Prompts for missing email");
    assert(flow2.status === "collecting", "Draft remains collecting until email and name provided");
  }

  // ── GROUP 3: Multi-Turn Conversation Memory Tracking ──
  console.log("\n🔍 Group 3: Multi-Turn Conversation Memory Tracking");
  {
    // Turn 1: User indicates contact
    const turn1History = [
      { role: "user", content: "I'd like to send a message to Umesh" },
      { role: "agent", content: "I'd be glad to help! Could you please share your name, email, and message?" }
    ];

    // Turn 2: User provides name & email
    const turn2Message = "My name is Sarah Connor and my email is sarah@sky.net";
    const flowTurn2 = parseContactWorkflow(turn2Message, turn1History);
    assert(flowTurn2.isContactWorkflow, "Stays in contact workflow on turn 2");
    assert(flowTurn2.draft?.name === "Sarah Connor", "Extracts user name across turns");
    assert(flowTurn2.draft?.email === "sarah@sky.net", "Extracts email across turns");
    assert(flowTurn2.missingFields.includes("message"), "Identifies message is still missing");

    // Turn 3: User provides proposal message
    const turn2History = [
      ...turn1History,
      { role: "user", content: turn2Message },
      { role: "agent", content: "Got it, Sarah! What message or collaboration proposal would you like me to send to Umesh?" }
    ];
    const turn3Message = "We want to hire you for our AI research engineer internship.";
    const flowTurn3 = parseContactWorkflow(turn3Message, turn2History);
    assert(flowTurn3.isContactWorkflow, "Retains workflow context across 3 turns");
    assert(flowTurn3.draft?.name === "Sarah Connor", "Remembers name from previous turn without asking again");
    assert(flowTurn3.draft?.email === "sarah@sky.net", "Remembers email from previous turn without asking again");
    assert(flowTurn3.draft?.message?.includes("internship") === true, "Captures proposal message accurately");
    assert(flowTurn3.status === "pending_confirmation", "Transitions to 'pending_confirmation' once all fields are ready");
    assert(!flowTurn3.isConfirmation, "Strictly does NOT send before explicit confirmation");
  }

  // ── GROUP 4: Explicit Confirmation Workflow ──
  console.log("\n🔍 Group 4: Explicit Confirmation & Delivery");
  {
    const historyWithPendingDraft = [
      { role: "user", content: "Send message to Umesh from Alex (alex.turner@gmail.com): Loved your portfolio and want to discuss an AI role." },
      { role: "agent", content: "I've prepared an email draft to send to Umesh:\n\n• Recipient: Umesh Kumar Sahoo\n• From: Alex (alex.turner@gmail.com)\n• Message: Loved your portfolio and want to discuss an AI role.\n\nWould you like me to send this now? Please confirm, or let me know if you want to edit or cancel." }
    ];

    const confirmQuery = "Yes, please send it now";
    const confirmFlow = parseContactWorkflow(confirmQuery, historyWithPendingDraft);
    assert(confirmFlow.isConfirmation, "Recognizes explicit 'Yes, please send it now' as confirmation");
    assert(confirmFlow.draft?.email === "alex.turner@gmail.com", "Preserves email for dispatch");
    assert(confirmFlow.draft?.name === "Alex", "Preserves name for dispatch");

    // Dispatch verified email
    const dispatchResult = await sendContactEmail({
      name: confirmFlow.draft?.name || "Alex",
      email: confirmFlow.draft?.email || "alex.turner@gmail.com",
      message: confirmFlow.draft?.message || "Loved your portfolio and want to discuss an AI role.",
    });

    assert(dispatchResult.success, "Email service accepts and confirms delivery");
    assert(
      dispatchResult.provider === "smtp" ||
      dispatchResult.provider === "resend" ||
      dispatchResult.provider === "local_persisted",
      `Email dispatched via verified provider: ${dispatchResult.provider}`
    );

    // Verify local persistence backup file
    const contactsPath = path.join(process.cwd(), "contacts.json");
    assert(fs.existsSync(contactsPath), "Durably writes contact record to local contacts.json backup");
    const contactsData = JSON.parse(fs.readFileSync(contactsPath, "utf-8"));
    const recorded = contactsData.find((c: any) => c.email === "alex.turner@gmail.com");
    assert(recorded !== undefined, "Recorded message matches sender email in local storage");
  }

  // ── GROUP 5: Explicit Cancellation Workflow ──
  console.log("\n🔍 Group 5: Explicit Cancellation Workflow");
  {
    const historyWithDraft = [
      { role: "agent", content: "I've prepared an email draft to send to Umesh... Would you like me to send this now?" }
    ];

    const cancelQueries = ["cancel", "no, cancel it", "never mind, stop", "don't send"];
    for (const cq of cancelQueries) {
      const cancelFlow = parseContactWorkflow(cq, historyWithDraft);
      assert(cancelFlow.isCancellation, `Recognizes '${cq}' as cancellation`);
      assert(cancelFlow.status === "cancelled", `Sets status to 'cancelled' for '${cq}'`);
      assert(!cancelFlow.isConfirmation, `Cancellation does NOT trigger sending`);
    }
  }

  // ── GROUP 6: Draft Editing Support ──
  console.log("\n🔍 Group 6: Draft Editing Support");
  {
    const historyWithDraft = [
      { role: "user", content: "My name is John, email john@example.com, message: Let's talk" },
      { role: "agent", content: "I've prepared an email draft to send to Umesh... Would you like me to send this now?" }
    ];

    const updateQuery = "Actually my email is john.doe@work.com and change message to: Let's discuss a senior AI role";
    const editFlow = parseContactWorkflow(updateQuery, historyWithDraft);
    assert(editFlow.draft?.email === "john.doe@work.com", "Updates email to latest provided value");
    assert(editFlow.draft?.message?.includes("senior AI role") === true, "Updates message to latest edited text");
    assert(editFlow.status === "pending_confirmation", "Draft remains in pending_confirmation with updated values");
  }

  // ── GROUP 7: Duplicate Sending Prevention & Rate Protection ──
  console.log("\n🔍 Group 7: Duplicate Prevention & Error Reporting");
  {
    // Rapid duplicate submission
    const dupResult = await sendContactEmail({
      name: "Alex",
      email: "alex.turner@gmail.com",
      message: "Loved your portfolio and want to discuss an AI role.",
    });

    assert(!dupResult.success, "Rejects rapid duplicate email send within 30 seconds");
    assert(dupResult.message.includes("recently received"), "Explains duplicate protection politely");

    // Failure reporting on invalid data
    const failResult = await sendContactEmail({
      name: "",
      email: "invalid-email",
      message: "",
    });
    assert(!failResult.success, "Correctly reports failure when inputs are invalid");
    assert(failResult.error !== undefined, "Provides detailed error reason");
  }

  console.log("\n==================================================");
  console.log(`📊 RESULTS: ${passed}/${total} TESTS PASSED`);
  console.log("==================================================");

  if (passed !== total) {
    process.exit(1);
  }
}

runEmailWorkflowTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
