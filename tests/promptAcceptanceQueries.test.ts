import assert from "node:assert";
import { ragEngine, resolveQueryProject, isCodeRequest, isPortfolioQuery } from "../ragEngine.js";

console.log("\n==================================================");
console.log("🎯 TESTING USER PROMPT ACCEPTANCE QUERIES");
console.log("==================================================\n");

let passedCount = 0;
let totalCount = 0;

function check(title: string, fn: () => void) {
  totalCount++;
  try {
    fn();
    console.log(`  ✅ [PASS] ${title}`);
    passedCount++;
  } catch (err: any) {
    console.error(`  ❌ [FAIL] ${title}: ${err.message}`);
    throw err;
  }
}

// 1. "What projects has Umesh built?"
check("What projects has Umesh built? -> returns structured list of core projects", () => {
  const ans = ragEngine.synthesizeDeterministicAnswer("What projects has Umesh built?", []);
  assert.ok(ans.includes("FreshGuard"), "Must mention FreshGuard");
  assert.ok(ans.includes("Teaching Assistant"), "Must mention Teaching Assistant");
  assert.ok(ans.includes("BiGRU"), "Must mention BiGRU");
  assert.ok(ans.includes("DevOps") || ans.includes("devops-umesh") || ans.includes("Terraform"), "Must mention DevOps/Cloud");
  assert.ok(ans.includes("ecommerce_advance") || ans.includes("E-Commerce"), "Must mention E-commerce");
});

// 2. "How many repositories does he have?"
check("How many repositories does he have? -> returns 30 total (23 original, 7 forks)", () => {
  const ans = ragEngine.synthesizeDeterministicAnswer("How many repositories does he have?", []);
  assert.ok(ans.includes("30"), "Must state 30 total repositories");
  assert.ok(ans.includes("23"), "Must state 23 original repositories");
  assert.ok(ans.includes("7"), "Must state 7 forks");
  assert.ok(ans.includes("umeshkumarsahoo"), "Must cite GitHub profile");
});

// 3. "Explain FreshGuard."
check("Explain FreshGuard -> produce shelf-life, GradientBoostingRegressor, lab_project_fresh_guard", () => {
  const ans = ragEngine.synthesizeDeterministicAnswer("Explain FreshGuard", []);
  assert.ok(ans.toLowerCase().includes("shelf-life") || ans.toLowerCase().includes("shelf life"), "Must mention shelf life");
  assert.ok(ans.includes("lab_project_fresh_guard"), "Must cite lab_project_fresh_guard");
  assert.ok(!ans.includes("Time_series-"), "Must NOT cite Time Series");
});

// 4. "What algorithms and metrics did FreshGuard use?"
check("What algorithms and metrics did FreshGuard use? -> GradientBoostingRegressor, RMSE, MAE, R²", () => {
  const ans = ragEngine.synthesizeDeterministicAnswer("What algorithms and metrics did FreshGuard use?", []);
  assert.ok(ans.includes("GradientBoostingRegressor"), "Must cite GradientBoostingRegressor");
  assert.ok(ans.includes("RMSE"), "Must cite RMSE");
  assert.ok(ans.includes("MAE"), "Must cite MAE");
  assert.ok(ans.includes("R²") || ans.includes("R2"), "Must cite R²");
  assert.ok(ans.includes("lab_project_fresh_guard"), "Must cite lab_project_fresh_guard");
});

// 5. "Explain the RAG Teaching Assistant."
check("Explain the RAG Teaching Assistant -> Whisper, BGE-M3, create_chunks.py, APP.PY", () => {
  const ans = ragEngine.synthesizeDeterministicAnswer("Explain the RAG Teaching Assistant", []);
  assert.ok(ans.includes("Whisper") || ans.includes("whisper"), "Must mention Whisper");
  assert.ok(ans.includes("create_chunks.py"), "Must mention create_chunks.py");
  assert.ok(ans.includes("Teaching_assistant-rag-based-"), "Must cite Teaching_assistant-rag-based-");
});

// 6. "Give me the actual RAG boilerplate code."
check("Give me the actual RAG boilerplate code -> returns code block FIRST", () => {
  const ans = ragEngine.synthesizeDeterministicAnswer("Give me the actual RAG boilerplate code", []);
  assert.ok(ans.startsWith("```"), "Must start immediately with code block");
  assert.ok(ans.includes("whisper") || ans.includes("create_chunks"), "Contains Whisper / chunking logic");
  assert.ok(ans.includes("Teaching_assistant-rag-based-"), "Cites source repository in explanation");
});

// 7. "Find the authentication function in my repository."
check("Find the authentication function in my repository -> returns code FIRST from ecommerce_advance", () => {
  const ans = ragEngine.synthesizeDeterministicAnswer("Find the authentication function in my repository", []);
  assert.ok(ans.startsWith("```"), "Must start immediately with code block");
  assert.ok(ans.includes("jwt") || ans.includes("bcrypt") || ans.includes("login") || ans.includes("auth"), "Contains auth implementation");
  assert.ok(ans.includes("ecommerce_advance") || ans.includes("auth.js"), "Cites repository / file path");
});

// 8. "Show the code for my BiGRU model."
check("Show the code for my BiGRU model -> returns code FIRST with honest remote repository disclaimer", () => {
  const ans = ragEngine.synthesizeDeterministicAnswer("Show the code for my BiGRU model", []);
  assert.ok(ans.startsWith("```"), "Must start immediately with code block");
  assert.ok(ans.includes("Bidirectional") && ans.includes("GRU"), "Contains Keras BiGRU architecture");
  assert.ok(ans.includes("sentiment_analysis"), "Cites sentiment_analysis repository");
  assert.ok(ans.includes("empty") || ans.includes("409") || ans.includes("0 commits") || ans.includes("local"), "Honest note about remote empty state");
});

// 9. "Which repositories use AWS or Terraform?"
check("Which repositories use AWS or Terraform? -> cites devops-umesh and portfolio_", () => {
  const ans = ragEngine.synthesizeDeterministicAnswer("Which repositories use AWS or Terraform?", []);
  assert.ok(ans.includes("devops-umesh"), "Must mention devops-umesh");
  assert.ok(ans.includes("Terraform") || ans.includes("terraform"), "Must explain Terraform usage");
});

// 10. "Compare my ML projects."
check("Compare my ML projects -> compares FreshGuard, BiGRU, SPEC2MODEL, Time Series", () => {
  const ans = ragEngine.synthesizeDeterministicAnswer("Compare my ML projects", []);
  assert.ok(ans.includes("FreshGuard"), "Must compare FreshGuard");
  assert.ok(ans.includes("BiGRU"), "Must compare BiGRU");
  assert.ok(ans.includes("SPEC2MODEL") || ans.includes("spec2model"), "Must compare SPEC2MODEL");
  assert.ok(ans.includes("Time Series") || ans.includes("Time_series-"), "Must compare Time Series");
});

// 11. "Explain the architecture of this repository."
check("Explain the architecture of this repository -> explains portfolio_ architecture", () => {
  const ans = ragEngine.synthesizeDeterministicAnswer("Explain the architecture of this repository", []);
  assert.ok(ans.includes("Vite") || ans.includes("React"), "Mentions Vite/React frontend");
  assert.ok(ans.includes("Express") || ans.includes("Node"), "Mentions Express/Node backend");
  assert.ok(ans.includes("RAG") || ans.includes("ragEngine"), "Mentions RAG Engine");
  assert.ok(ans.includes("portfolio_"), "Mentions portfolio_ repo");
});

// 12. "hi" -> short, natural greeting
check("'hi' -> short, natural greeting under 5 sentences", () => {
  const ans = ragEngine.synthesizeDeterministicAnswer("hi", []);
  assert.ok(ans.includes("UMU") || ans.includes("umu"), "Greets as UMU");
  const sentenceCount = ans.split(/[.!?]+/).filter(Boolean).length;
  assert.ok(sentenceCount <= 5, `Expected <= 5 sentences, got ${sentenceCount}`);
});

// 13. "ummm" -> casual response, not retrieval error
check("'ummm' -> casual response, not retrieval error", () => {
  const ans = ragEngine.synthesizeDeterministicAnswer("ummm", []);
  assert.ok(!ans.toLowerCase().includes("error"), "Must not be an error");
  assert.ok(!ans.toLowerCase().includes("retrieval failed"), "Must not be a retrieval failure");
  assert.ok(ans.toLowerCase().includes("take your time") || ans.toLowerCase().includes("thinking") || ans.toLowerCase().includes("here"), "Provides casual response");
});

// 14. "who are you?" -> brief explanation of UMU
check("'who are you?' -> brief explanation of UMU", () => {
  const ans = ragEngine.synthesizeDeterministicAnswer("who are you?", []);
  assert.ok(ans.includes("UMU") || ans.includes("umu"), "Explains UMU");
  assert.ok(ans.includes("Umesh"), "Mentions Umesh");
  assert.ok(!ans.includes("Time_series-"), "Does not dump random README");
});

// 15. "what about FreshGuard?" -> retrieve FreshGuard
check("'what about FreshGuard?' -> resolves to freshguard", () => {
  const proj = resolveQueryProject("what about FreshGuard?", []);
  assert.strictEqual(proj, "freshguard");
  const ans = ragEngine.synthesizeDeterministicAnswer("what about FreshGuard?", [], false, [], proj);
  assert.ok(ans.includes("lab_project_fresh_guard"), "Cites lab_project_fresh_guard");
});

// 16. "show its code" -> resolves from conversation history and retrieves actual code
check("'show its code' -> resolves project from history and returns code block FIRST", () => {
  const history = [
    { role: "user", content: "What is FreshGuard?" },
    { role: "model", content: "FreshGuard is a shelf-life prediction system." }
  ];
  const proj = resolveQueryProject("show its code", history);
  assert.strictEqual(proj, "freshguard", "Resolved project from history must be freshguard");
  const isCode = isCodeRequest("show its code");
  assert.strictEqual(isCode, true, "Must be detected as code request");
  const ans = ragEngine.synthesizeDeterministicAnswer("show its code", [], false, history, proj);
  assert.ok(ans.startsWith("```"), "Must start immediately with code block");
  assert.ok(ans.includes("GradientBoostingRegressor"), "Contains actual FreshGuard model code");
  assert.ok(ans.includes("lab_project_fresh_guard"), "Cites lab_project_fresh_guard");
});

// 17. "what other projects?" -> lists other projects without returning a random README
check("'what other projects?' -> lists other projects cleanly", () => {
  const history = [
    { role: "user", content: "Explain FreshGuard." },
    { role: "model", content: "FreshGuard is a shelf-life prediction system." }
  ];
  const ans = ragEngine.synthesizeDeterministicAnswer("what other projects?", [], false, history);
  assert.ok(ans.includes("Teaching Assistant") || ans.includes("Teaching_assistant-rag-based-"), "Mentions RAG project");
  assert.ok(ans.includes("BiGRU") || ans.includes("sentiment_analysis"), "Mentions BiGRU");
  assert.ok(!ans.startsWith("# "), "Does not dump an unparsed raw README");
});

// 18. "give me boilerplate" -> provide code first, followed by short explanation
check("'give me boilerplate' -> provide code first, followed by short explanation", () => {
  const isCode = isCodeRequest("give me boilerplate");
  assert.strictEqual(isCode, true, "Must be detected as code request");
  const ans = ragEngine.synthesizeDeterministicAnswer("give me boilerplate", []);
  assert.ok(ans.startsWith("```"), "Must start immediately with code block");
  const codeEndIdx = ans.indexOf("```", 3);
  assert.ok(codeEndIdx > 0, "Code block must be closed");
  const explanation = ans.substring(codeEndIdx + 3).trim();
  assert.ok(explanation.length > 0, "Must include explanation afterward");
});

console.log("\n==================================================");
console.log(`📊 SUMMARY: ${passedCount}/${totalCount} ACCEPTANCE TESTS PASSED`);
console.log("==================================================\n");
