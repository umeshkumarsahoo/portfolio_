import {
  isCodeRequest,
  isPortfolioQuery,
  isSourceQuery,
  generateCodeSnippet,
  formatCodeFirstResponse,
} from "../ragEngine";

// We test the smart heuristic engine and code generators directly
function testAssistantBehavior() {
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

  console.log("\n==================================================");
  console.log(`📊 SUMMARY: ${passed}/${total} TESTS PASSED`);
  console.log("==================================================");

  if (passed !== total) {
    throw new Error(`Failed ${total - passed} tests.`);
  }
}

testAssistantBehavior();
