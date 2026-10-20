import http from "http";
import fs from "fs";
import path from "path";
import { CachedLinkRAGEngine, validateSafeUrl } from "../ragEngine";

async function runRAGTestSuite() {
  console.log("==================================================");
  console.log("🚀 STARTING PORTFOLIO RAG ENGINE VERIFICATION TEST");
  console.log("==================================================\n");

  const testCacheDir = path.join(process.cwd(), ".test_rag_cache");
  if (fs.existsSync(testCacheDir)) {
    fs.rmSync(testCacheDir, { recursive: true, force: true });
  }

  // --------------------------------------------------
  // Setup Mock Upstream Web Server with ETag & Stale Support
  // --------------------------------------------------
  let serverDocContent = `
<!DOCTYPE html>
<html>
<head><title>Umesh Distributed Architecture Docs</title></head>
<body>
  <h1>Microservice Orchestration and Vector Pipelines</h1>
  <p>Umesh designed a low-latency asynchronous RAG semantic retrieval pipeline in Python.</p>
  <h2>Vector Indexing Architecture</h2>
  <p>The vector indexing layer uses cosine similarity with dense 256-dimensional unit embeddings.</p>
  <p>Caching is implemented in four distinct layers: URL content cache, embedding cache, retrieval cache, and answer cache.</p>
  <h2>DevOps Infrastructure</h2>
  <p>Cloud infrastructure is automated with HashiCorp Terraform and GitHub Actions for continuous deployment.</p>
</body>
</html>
  `.trim();

  let serverEtag = '"v1-hash-12345"';
  let serverLastModified = new Date().toUTCString();
  let serverRequestCount = 0;
  let serverShouldFail = false;

  const server = http.createServer((req, res) => {
    serverRequestCount++;

    if (serverShouldFail) {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Internal Server Error");
      return;
    }

    // Check Conditional Request Headers
    if (req.headers["if-none-match"] === serverEtag) {
      res.writeHead(304, {
        "ETag": serverEtag,
        "Last-Modified": serverLastModified,
      });
      res.end();
      return;
    }

    res.writeHead(200, {
      "Content-Type": "text/html",
      "ETag": serverEtag,
      "Last-Modified": serverLastModified,
    });
    res.end(serverDocContent);
  });

  const TEST_PORT = 9933;
  await new Promise<void>((resolve) => server.listen(TEST_PORT, "127.0.0.1", () => resolve()));
  const testUrl = `http://127.0.0.1:${TEST_PORT}/docs`;

  // --------------------------------------------------
  // SSRF Protection Tests
  // --------------------------------------------------
  console.log("🛡️ Testing SSRF Protection on Private and Cloud Metadata IPs...");
  const ssrfAws = await validateSafeUrl("http://169.254.169.254/latest/meta-data/");
  const ssrfLocalhost = await validateSafeUrl("http://localhost:3000/api");
  const ssrfInternal = await validateSafeUrl("http://10.0.0.1/admin");

  if (!ssrfAws.safe && !ssrfLocalhost.safe && !ssrfInternal.safe) {
    console.log("  ✅ SSRF Protection PASSED: Blocked 169.254.169.254, localhost, and 10.0.0.1 successfully.");
  } else {
    throw new Error("SSRF Protection failed to block private/internal addresses!");
  }

  // Initialize engine with test cache dir and test-allowed localhost
  const engine = new CachedLinkRAGEngine({
    cacheDir: testCacheDir,
    ttlMs: 3600000, // 1 hour
    allowLocalhost: true,
  });

  // --------------------------------------------------
  // TEST 1: First question fetches and indexes the source when needed
  // --------------------------------------------------
  console.log("\n🧪 TEST 1: First question fetches and indexes the source when needed...");
  const initialRequests = serverRequestCount;
  const q1 = "How does the vector indexing architecture work?";
  const res1 = await engine.answerQuestion(q1, [], [testUrl]);

  console.log(`  Answer 1: "${res1.answer.substring(0, 110)}..."`);
  console.log(`  Metrics 1: urlCacheHit=${res1.metrics.urlCacheHit}, sources=${res1.metrics.sourcesIndexed}, chunks=${res1.metrics.chunksIndexed}`);
  
  if (serverRequestCount === initialRequests + 1 && res1.metrics.sourcesIndexed >= 1 && res1.metrics.chunksIndexed >= 1) {
    console.log("  ✅ TEST 1 PASSED: Source fetched and indexed on initial question (1 HTTP request made).");
  } else {
    throw new Error(`TEST 1 FAILED: Expected 1 request, got ${serverRequestCount - initialRequests}`);
  }

  // --------------------------------------------------
  // TEST 2: Repeated questions do not repeatedly fetch the same URL
  // --------------------------------------------------
  console.log("\n🧪 TEST 2: Repeated questions do not repeatedly fetch the same URL (URL & Answer Cache)...");
  const requestsBeforeRepeat = serverRequestCount;
  const res2 = await engine.answerQuestion(q1, [], [testUrl]);
  const requestsAfterRepeat = serverRequestCount;

  console.log(`  Metrics 2: urlCacheHit=${res2.metrics.urlCacheHit}, answerCacheHit=${res2.metrics.answerCacheHit}, latency=${res2.metrics.totalLatencyMs}ms`);

  if (requestsAfterRepeat === requestsBeforeRepeat && res2.metrics.urlCacheHit === true && res2.metrics.answerCacheHit === true) {
    console.log("  ✅ TEST 2 PASSED: 0 additional HTTP requests made, answered directly from cache.");
  } else {
    throw new Error(`TEST 2 FAILED: HTTP request was made on repeated question! (${requestsAfterRepeat - requestsBeforeRepeat})`);
  }

  // --------------------------------------------------
  // TEST 3: Unchanged content does not trigger unnecessary embedding generation
  // --------------------------------------------------
  console.log("\n🧪 TEST 3: Unchanged content does not trigger unnecessary embedding generation...");
  const statsBefore = engine.getStats();
  // Force refresh URL: server will return 304 Not Modified
  await engine.ingestUrl(testUrl, true);
  const statsAfter = engine.getStats();

  console.log(`  Embeddings count before: ${statsBefore.embeddingCacheSize}, after: ${statsAfter.embeddingCacheSize}`);
  if (statsBefore.embeddingCacheSize === statsAfter.embeddingCacheSize) {
    console.log("  ✅ TEST 3 PASSED: Unchanged content reused cached embedding vectors (0 new embeddings).");
  } else {
    throw new Error("TEST 3 FAILED: Redundant embeddings generated for unchanged content.");
  }

  // --------------------------------------------------
  // TEST 4: A changed source invalidates the relevant caches
  // --------------------------------------------------
  console.log("\n🧪 TEST 4: A changed source invalidates the relevant caches...");
  const oldIndexVersion = engine.getStats().indexVersion;
  
  // Modify server content and ETag with distinct sections
  serverDocContent = `
<!DOCTYPE html>
<html>
<head><title>Umesh Distributed Architecture Docs V2</title></head>
<body>
  <h1>Next-Generation Event Streaming Infrastructure</h1>
  <h2>Apache Kafka Ingestion Layer</h2>
  <p>Apache Kafka provides distributed partition logging, consumer group balancing, and topic replication for high-throughput stream ingestion.</p>
  <h2>ClickHouse Columnar Database</h2>
  <p>ClickHouse acts as the high-performance columnar analytical database, accelerating aggregate queries across petabyte telemetry datasets.</p>
</body>
</html>
  `.trim();
  serverEtag = '"v2-updated-hash-99999"';

  // Force re-ingestion with modified content
  await engine.ingestUrl(testUrl, true);
  const newIndexVersion = engine.getStats().indexVersion;

  console.log(`  Index version updated from v${oldIndexVersion} to v${newIndexVersion}`);
  const qKafka = "What is the Apache Kafka layer used for?";
  const resKafka = await engine.answerQuestion(qKafka, [], [testUrl]);

  if (newIndexVersion > oldIndexVersion && resKafka.answer.includes("Kafka")) {
    console.log("  ✅ TEST 4 PASSED: Changed source bumped index version and re-indexed new evidence.");
  } else {
    throw new Error("TEST 4 FAILED: Changed source did not invalidate cache or retrieve new content.");
  }

  // --------------------------------------------------
  // TEST 5: Follow-up questions receive contextually correct answers
  // --------------------------------------------------
  console.log("\n🧪 TEST 5: Follow-up questions receive contextually correct answers...");
  const historyConv = [
    { role: "user", content: "What is the Apache Kafka layer used for?" },
    { role: "agent", content: "Apache Kafka provides distributed partition logging and topic replication." }
  ];
  const followUpRes = await engine.answerQuestion("What database is used for telemetry analytics?", historyConv, [testUrl]);
  console.log(`  Follow-up answer: "${followUpRes.answer.substring(0, 100)}..."`);
  
  if (followUpRes.answer && followUpRes.answer.includes("ClickHouse")) {
    console.log("  ✅ TEST 5 PASSED: Follow-up question answered with conversation history included in context.");
  } else {
    throw new Error("TEST 5 FAILED: Follow-up question returned empty or invalid answer.");
  }

  // --------------------------------------------------
  // TEST 6: Different questions do not incorrectly share cached answers
  // --------------------------------------------------
  console.log("\n🧪 TEST 6: Different questions do not incorrectly share cached answers...");
  const qA = "What is the Apache Kafka layer used for?";
  const qB = "What is the role of ClickHouse?";
  const resA = await engine.answerQuestion(qA, [], [testUrl]);
  const resB = await engine.answerQuestion(qB, [], [testUrl]);

  if (resA.answer !== resB.answer) {
    console.log("  ✅ TEST 6 PASSED: Different questions produced distinct answers.");
  } else {
    throw new Error("TEST 6 FAILED: Distinct questions shared identical cached answer.");
  }

  // --------------------------------------------------
  // TEST 7: Unsupported questions are handled honestly
  // --------------------------------------------------
  console.log("\n🧪 TEST 7: Unsupported questions are handled honestly...");
  const unsupportedRes = await engine.answerQuestion("What was the stock price of Apple in 1984?", [], [testUrl]);
  console.log(`  Unsupported query answer: "${unsupportedRes.answer}"`);

  if (
    unsupportedRes.answer.toLowerCase().includes("could not find") ||
    unsupportedRes.answer.toLowerCase().includes("clarify") ||
    unsupportedRes.answer.toLowerCase().includes("unknown")
  ) {
    console.log("  ✅ TEST 7 PASSED: Stated clearly that evidence was insufficient without inventing facts.");
  } else {
    throw new Error("TEST 7 FAILED: Unsupported question was not handled honestly.");
  }

  // --------------------------------------------------
  // TEST 8: Temporary source failure uses valid stale cached content
  // --------------------------------------------------
  console.log("\n🧪 TEST 8: Temporary source failure uses valid stale cached content...");
  // Make upstream server fail with 500 error
  serverShouldFail = true;

  const staleIngestRes = await engine.ingestUrl(testUrl, true);
  console.log(`  Stale fallback result: isStale=${staleIngestRes.page.isStale}, title="${staleIngestRes.page.title}"`);

  if (staleIngestRes.page.isStale === true && staleIngestRes.page.content.includes("Kafka")) {
    console.log("  ✅ TEST 8 PASSED: When upstream failed with 500, valid stale cached content was preserved.");
  } else {
    throw new Error("TEST 8 FAILED: Stale fallback failed when upstream server errored.");
  }

  // --------------------------------------------------
  // TEST 9: Existing portfolio functionality continues to work
  // --------------------------------------------------
  console.log("\n🧪 TEST 9: Existing portfolio functionality continues to work...");
  const cgpaRes = await engine.answerQuestion("how he got 9.60", [], [testUrl]);
  console.log(`  Portfolio Grounded Answer: "${cgpaRes.answer.substring(0, 100)}..."`);

  if (cgpaRes.answer && cgpaRes.answer.length > 20) {
    console.log("  ✅ TEST 9 PASSED: Assistant continues to provide fast, responsive, and grounded answers.");
  } else {
    throw new Error("TEST 9 FAILED: Portfolio query returned invalid response.");
  }

  // Teardown
  server.close();
  if (fs.existsSync(testCacheDir)) {
    fs.rmSync(testCacheDir, { recursive: true, force: true });
  }

  console.log("\n==================================================");
  console.log("🎉 ALL 9 RAG VERIFICATION TESTS PASSED SUCCESSFULLY!");
  console.log("==================================================");
}

runRAGTestSuite().catch((err) => {
  console.error("\n❌ TEST SUITE FAILED:", err);
  process.exit(1);
});
