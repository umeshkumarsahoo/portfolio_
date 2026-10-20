import fs from "fs";
import path from "path";
import {
  CachedLinkRAGEngine,
  isCodeRequest,
  isPortfolioQuery,
  isSourceQuery,
  generateCodeSnippet,
  formatCodeFirstResponse,
  resolveQueryProject,
} from "../ragEngine";

// We test the smart heuristic engine, RAG retrieval, and code generators
async function testAssistantBehavior() {
  console.log("==================================================");
  console.log("🤖 TESTING ASSISTANT QUERY ROUTING & CODE POLICIES");
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

  // 1. Code Request Intent Detection
  console.log("🔍 Group 1: Code Request Intent Detection");
  assert(isCodeRequest("write a python function to reverse a string"), "Detects 'write a python function'");
  assert(isCodeRequest("how to implement binary search in typescript"), "Detects 'implement binary search'");
  assert(isCodeRequest("debounce function in javascript"), "Detects 'debounce function'");
  assert(isCodeRequest("give me code for two sum"), "Detects 'give me code'");
  assert(isCodeRequest("quicksort algorithm in python"), "Detects 'quicksort algorithm'");
  assert(!isCodeRequest("what is Umesh's CGPA?"), "Does not misclassify portfolio question as code");
  assert(!isCodeRequest("tell me about your internships"), "Does not misclassify internship question as code");
  assert(!isCodeRequest("rag code base"), "Does not misclassify 'rag code base' as code request");
  assert(!isCodeRequest("what is the codebase architecture?"), "Does not misclassify 'codebase architecture' as code request");
  assert(!isCodeRequest("show me the repo files"), "Does not misclassify 'repo files' as code request");
  assert(!isCodeRequest("What does the code do?"), "Does not misclassify 'What does the code do?' as code request");
  assert(isCodeRequest("Extract the actual RAG boilerplate code from my repository."), "Detects 'Extract actual RAG boilerplate code'");
  assert(isCodeRequest("show its code"), "Detects 'show its code'");
  assert(isCodeRequest("show the implementation"), "Detects 'show the implementation'");

  // 2. Code-First Output Generation
  console.log("\n💻 Group 2: Code-First Runnable Output Generation");
  const reverseSnippet = generateCodeSnippet("write a python function to reverse a string");
  assert(reverseSnippet !== null, "Generates reverse string snippet");
  if (reverseSnippet) {
    const formatted = formatCodeFirstResponse(reverseSnippet.code, reverseSnippet.language, reverseSnippet.explanation);
    assert(formatted.startsWith("```python"), "Starts immediately with code block", formatted.substring(0, 30));
    assert(formatted.includes("def reverse_string"), "Contains runnable function definition");
    assert(formatted.includes("```\n\n"), "Ends code block before explanation");
  }

  const binarySearchSnippet = generateCodeSnippet("how to implement binary search in typescript");
  assert(binarySearchSnippet !== null, "Generates binary search snippet");
  if (binarySearchSnippet) {
    const formatted = formatCodeFirstResponse(binarySearchSnippet.code, binarySearchSnippet.language, binarySearchSnippet.explanation);
    assert(formatted.startsWith("```typescript"), "Starts immediately with typescript code block");
    assert(formatted.includes("function binarySearch"), "Contains runnable binary search function");
    assert(formatted.includes("O(log n)"), "Includes brief complexity explanation");
  }

  const debounceSnippet = generateCodeSnippet("debounce function in javascript");
  assert(debounceSnippet !== null, "Generates debounce snippet");
  if (debounceSnippet) {
    const formatted = formatCodeFirstResponse(debounceSnippet.code, debounceSnippet.language, debounceSnippet.explanation);
    assert(formatted.startsWith("```"), "Starts immediately with code block");
    assert(formatted.includes("clearTimeout"), "Contains runnable debounce logic");
  }

  const chunkSnippet = generateCodeSnippet("write audio chunking code with whisper");
  assert(chunkSnippet !== null, "Generates audio chunking snippet");
  if (chunkSnippet) {
    assert(chunkSnippet.code.includes("whisper.load_model"), "Contains Whisper model loading code");
  }

  const cosineSnippet = generateCodeSnippet("cosine similarity vector search code");
  assert(cosineSnippet !== null, "Generates cosine similarity snippet");
  if (cosineSnippet) {
    assert(cosineSnippet.code.includes("cosine_similarity"), "Contains cosine similarity code");
  }

  // 3. Portfolio Query Intent vs General Programming
  console.log("\n📋 Group 3: Intent Classification & Context Segregation");
  assert(isPortfolioQuery("how he got 9.60"), "Detects 'how he got 9.60' as portfolio query");
  assert(isPortfolioQuery("what is Umesh's background?"), "Detects 'Umesh's background' as portfolio query");
  assert(isPortfolioQuery("tell me about his internships at Ingenious and Syllogistick"), "Detects internship query as portfolio");
  assert(isPortfolioQuery("rag code base"), "Detects 'rag code base' as portfolio query");
  assert(isPortfolioQuery("what files are in the teaching assistant repo"), "Detects repo file query as portfolio");
  assert(!isPortfolioQuery("what is a closure in javascript"), "General CS question is NOT portfolio query");
  assert(!isPortfolioQuery("what is the difference between TCP and UDP"), "TCP vs UDP is NOT portfolio query");
  assert(!isPortfolioQuery("explain let vs const"), "Let vs const is NOT portfolio query");

  // 4. Source & Documentation Query Detection
  console.log("\n🔗 Group 4: Source Query Detection");
  assert(isSourceQuery("check https://example.com/docs"), "Detects URL in query");
  assert(isSourceQuery("what does the readme say?"), "Detects 'readme' as source query");
  assert(isSourceQuery("inspect the documentation link"), "Detects 'documentation link'");
  assert(!isSourceQuery("what is your favorite food?"), "General casual query is NOT source query");

  // 5. Project Identity & Follow-Up Resolution
  console.log("\n🎯 Group 5: Project Identity & Follow-Up Resolution");
  assert(resolveQueryProject("What is FreshGuard?") === "freshguard", "Resolves 'What is FreshGuard?' -> freshguard");
  assert(resolveQueryProject("What model and metrics did FreshGuard achieve?") === "freshguard", "Resolves FreshGuard metrics -> freshguard");
  assert(resolveQueryProject("Show me the RAG project architecture.") === "rag", "Resolves RAG architecture -> rag");
  assert(resolveQueryProject("Extract the actual RAG boilerplate code from my repository.") === "rag", "Resolves RAG code extraction -> rag");
  assert(resolveQueryProject("What about DevOps and cloud?") === "devops", "Resolves DevOps and cloud -> devops");
  assert(resolveQueryProject("Time series forecasting on Nifty dataset") === "timeseries", "Resolves Time Series -> timeseries");
  assert(resolveQueryProject("BiGRU Emotion Classifier") === "emotion", "Resolves BiGRU Emotion -> emotion");
  assert(resolveQueryProject("Brief me on the tech news.") === undefined, "Does not map tech news query to a portfolio project");

  // Follow-up resolution with conversation history
  const ragHistory = [{ role: "user", content: "Extract the actual RAG boilerplate code from my repository." }];
  assert(resolveQueryProject("What does the code do?", ragHistory) === "rag", "Resolves 'What does the code do?' using RAG history -> rag");

  const freshGuardHistory = [{ role: "user", content: "What is FreshGuard?" }];
  assert(resolveQueryProject("What model did it achieve?", freshGuardHistory) === "freshguard", "Resolves follow-up using FreshGuard history -> freshguard");

  // 6. Acceptance Queries against Indexed RAG Engine
  console.log("\n🚀 Group 6: Acceptance Queries Against Actual Indexed Repositories");
  const testCacheDir = path.join(process.cwd(), ".test_accept_rag_cache");
  if (fs.existsSync(testCacheDir)) {
    fs.rmSync(testCacheDir, { recursive: true, force: true });
  }

  const engine = new CachedLinkRAGEngine({
    cacheDir: testCacheDir,
    ttlMs: 3600000,
  });

  // Index the 5 core projects
  await engine.indexDirectDocument(
    "https://github.com/umeshkumarsahoo/lab_project_fresh_guard",
    "GitHub: lab_project_fresh_guard (FreshGuard Produce Shelf-Life Predictor)",
    `Repository: lab_project_fresh_guard
Description: Supervised machine learning produce shelf-life predictor. Predicts remaining produce shelf life in days from produce quality and storage conditions.
Features & Records: 3,552 produce records from Datasets/FreshGuard_RAW_dirty.csv across 6 numeric features (Initial_Brix_Level, Storage_Temperature_C, Storage_Humidity_Percent, Initial_Damage_Score, Firmness_Score, Weight_Loss_Percent) and 3 categorical features.
Models & Metrics: Evaluated LinearRegression, Ridge, Lasso, RandomForestRegressor, and GradientBoostingRegressor. Best regressor selected by Root Mean Squared Error (RMSE) was GradientBoostingRegressor. Metrics: MAE, RMSE, and R² score. Optimal weights exported to best_regressor.pkl.
Web Server: Flask server running on port 8080 with /predict endpoint.`,
    { projectId: "freshguard", documentType: "documentation", sourceUrl: "https://github.com/umeshkumarsahoo/lab_project_fresh_guard", language: "Python" }
  );

  await engine.indexDirectDocument(
    "https://github.com/umeshkumarsahoo/Teaching_assistant-rag-based-",
    "GitHub: Teaching_assistant-rag-based- (Video RAG Teaching Assistant)",
    `Repository: Teaching_assistant-rag-based-
Description: End-to-end video-to-text Retrieval-Augmented Generation (RAG) teaching assistant that lets students search video lectures by concept and jump to exact timestamps.
Pipeline:
1. process_video.py: Uses ffmpeg to convert video to mp3.
2. create_chunks.py: Uses OpenAI Whisper large-v2 to transcribe audio and output structured JSON segments with start and end timestamps.
3. APP.PY, api.py: Dense embeddings using BGE-M3 (via Ollama) or all-MiniLM-L6-v2, cached in embeddings.joblib.
4. api.py: Cosine similarity with 0.60 threshold in Streamlit UI.`,
    { projectId: "rag", documentType: "architecture", sourceUrl: "https://github.com/umeshkumarsahoo/Teaching_assistant-rag-based-", language: "Python" }
  );

  await engine.indexDirectDocument(
    "https://github.com/umeshkumarsahoo/Teaching_assistant-rag-based-/blob/main/create_chunks.py",
    "Source: create_chunks.py (Whisper large-v2 Transcription & Chunking)",
    `import whisper
import json
import os

model = whisper.load_model("large-v2")
audios = os.listdir("audios")
for audio in audios:
    result = model.transcribe(audio=f"audios/{audio}", language='hi', task='translate')
    with open(f"jsons/{audio}.json", "w") as f:
        json.dump(result['segments'], f, indent=4)`,
    { projectId: "rag", documentType: "source_code", sourceUrl: "https://github.com/umeshkumarsahoo/Teaching_assistant-rag-based-", filePath: "create_chunks.py", language: "Python" }
  );

  await engine.indexDirectDocument(
    "https://github.com/umeshkumarsahoo/Time_series-",
    "GitHub: Time_series- (Nifty-50 Time Series Forecasting)",
    `Repository: Time_series-
Description: Time-series analysis and forecasting system on the Nifty-50 stock market dataset using ARIMA, pmdarima (AutoARIMA), and LSTM RNNs in Keras.`,
    { projectId: "timeseries", documentType: "documentation", sourceUrl: "https://github.com/umeshkumarsahoo/Time_series-", language: "Python" }
  );

  await engine.indexDirectDocument(
    "https://github.com/umeshkumarsahoo/portfolio_/devops",
    "DevOps & Cloud Infrastructure",
    `DevOps cloud infrastructure engineering using HashiCorp Terraform for IaC, Docker for microservices, GitHub Actions for CI/CD, AWS, Linux, and Nginx.`,
    { projectId: "devops", documentType: "documentation", sourceUrl: "https://github.com/umeshkumarsahoo/portfolio_", language: "HCL / Dockerfile" }
  );

  // Acceptance Query 1: "What is FreshGuard?"
  const ans1 = await engine.answerQuestion("What is FreshGuard?");
  assert(ans1.answer.toLowerCase().includes("produce") && ans1.answer.toLowerCase().includes("shelf life"), "Query 1: FreshGuard produce shelf-life definition present");
  assert(ans1.answer.includes("lab_project_fresh_guard"), "Query 1: Cites lab_project_fresh_guard");
  assert(!ans1.answer.toLowerCase().includes("nifty") && !ans1.answer.toLowerCase().includes("time series"), "Query 1: No cross-contamination with Time Series");

  // Acceptance Query 2: "What model and metrics did FreshGuard achieve?"
  const ans2 = await engine.answerQuestion("What model and metrics did FreshGuard achieve?");
  assert(ans2.answer.includes("GradientBoostingRegressor"), "Query 2: Mentions GradientBoostingRegressor");
  assert(ans2.answer.includes("RMSE") && ans2.answer.includes("MAE") && ans2.answer.includes("R²"), "Query 2: Mentions RMSE, MAE, R² metrics");
  assert(!ans2.answer.toLowerCase().includes("arima"), "Query 2: Does NOT cite ARIMA or Time Series");
  assert(ans2.answer.includes("lab_project_fresh_guard"), "Query 2: Cites lab_project_fresh_guard");

  // Acceptance Query 3: "Show me the RAG project architecture."
  const ans3 = await engine.answerQuestion("Show me the RAG project architecture.");
  assert(ans3.answer.includes("create_chunks.py") && ans3.answer.includes("Whisper"), "Query 3: Mentions Whisper and create_chunks.py");
  assert(ans3.answer.includes("Teaching_assistant-rag-based-"), "Query 3: Cites Teaching_assistant-rag-based-");

  // Acceptance Query 4: "Extract the actual RAG boilerplate code from my repository."
  const ans4 = await engine.answerQuestion("Extract the actual RAG boilerplate code from my repository.");
  assert(ans4.answer.startsWith("```python"), "Query 4: Returns code block FIRST");
  assert(ans4.answer.includes("whisper.load_model"), "Query 4: Contains actual retrieved Whisper code");
  assert(ans4.answer.includes("Teaching_assistant-rag-based-"), "Query 4: Cites Teaching_assistant-rag-based- in explanation");

  // Acceptance Query 5: "What does the code do?" (with previous RAG context)
  const ans5 = await engine.answerQuestion("What does the code do?", [
    { role: "user", content: "Extract the actual RAG boilerplate code from my repository." },
    { role: "model", content: ans4.answer }
  ]);
  assert(ans5.answer.includes("create_chunks.py") && ans5.answer.toLowerCase().includes("transcribe"), "Query 5: Follow-up resolves to create_chunks.py transcription explanation");
  assert(ans5.answer.includes("Teaching_assistant-rag-based-"), "Query 5: Follow-up cites Teaching_assistant-rag-based-");

  // Acceptance Query 6: "What about DevOps and cloud?"
  const ans6 = await engine.answerQuestion("What about DevOps and cloud?");
  assert(ans6.answer.includes("Terraform") && ans6.answer.includes("Docker") && ans6.answer.includes("GitHub Actions"), "Query 6: Explains Terraform, Docker, GitHub Actions");
  assert(ans6.answer.includes("portfolio_"), "Query 6: Cites portfolio_");

  // 7. Missing File Handling & Anti-Hallucination
  console.log("\n🛡️ Group 7: Missing File Handling & Anti-Hallucination");
  const missingAns = engine.synthesizeDeterministicAnswer("Extract sentence_extractor.py from my repository", []);
  assert(missingAns.includes("sentence_extractor.py` was not found in the repository"), "Honestly reports requested missing file");
  assert(missingAns.includes("create_chunks.py"), "Lists actual available alternative files");
  assert(!missingAns.toLowerCase().includes("zero hallucination"), "Does not claim zero hallucinations");

  // 8. Project Isolation in Retrieval Filter
  console.log("\n🔒 Group 8: Project-Specific Isolation in Retrieval");
  const fgRetrieval = engine.retrieve("What model and metrics did FreshGuard achieve?", 4, 0.15, "freshguard");
  assert(fgRetrieval.results.length > 0, "Retrieves candidate chunks for freshguard");
  const anyTimeSeries = fgRetrieval.results.some((r) => r.chunk.metadata?.projectId === "timeseries");
  assert(!anyTimeSeries, "Strict project isolation: FreshGuard query retrieves 0 Time Series chunks");

  console.log("\n==================================================");
  console.log(`📊 SUMMARY: ${passed}/${total} TESTS PASSED`);
  console.log("==================================================");

  if (passed !== total) {
    throw new Error(`Failed ${total - passed} tests.`);
  }
}

testAssistantBehavior();
