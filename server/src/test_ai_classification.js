import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import dotenv from "dotenv";
import {
  analyzeComplaintImageAndText,
  classifyWithGemini,
  classifyWithMobileNet,
  getFallbackClassification,
  getAiHealth,
  SUPPORTED_CATEGORIES
} from "./services/aiService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const ROOT_DIR = path.resolve(__dirname, "../../");

async function runTestSuite() {
  console.log("===============================================================");
  console.log("   SMART CITY AI CLASSIFICATION ENGINE TEST SUITE (10 TESTS)   ");
  console.log("===============================================================\n");

  const results = [];

  function record(testNum, testName, passed, details = {}) {
    results.push({ testNum, testName, passed, details });
    const mark = passed ? "✓ PASS" : "✗ FAIL";
    console.log(`[${mark}] Test ${testNum}: ${testName}`);
    if (details.category) console.log(`       Category: ${details.category}`);
    if (details.confidence) console.log(`       Confidence: ${details.confidence}`);
    if (details.predictionSource) console.log(`       Source: ${details.predictionSource}`);
    if (details.reason) console.log(`       Reason: ${details.reason}`);
    if (details.error) console.log(`       Error: ${details.error}`);
    console.log("");
  }

  // 1. Waste Management
  try {
    const imgPath = path.resolve(ROOT_DIR, "server/public/uploads/img-1789112385913-291082273.jpg");
    const res = await analyzeComplaintImageAndText({
      imagePath: imgPath,
      description: "Overflowing municipal waste and garbage accumulation"
    });
    const passed = res.category === "Waste Management" && res.predictionSource === "gemini_vision" && res.confidence >= 0.65;
    record(1, "Gemini classifies Waste Management image", passed, res);
  } catch (err) {
    record(1, "Gemini classifies Waste Management image", false, { error: err.message });
  }

  // 2. Roads
  try {
    const imgPath = path.resolve(ROOT_DIR, "server/public/uploads/img-1790492799867-572090913.jpg");
    const res = await analyzeComplaintImageAndText({
      imagePath: imgPath,
      description: "Severely damaged road surface with multiple deep potholes"
    });
    const passed = res.category === "Roads" && res.predictionSource === "gemini_vision" && res.confidence >= 0.65;
    record(2, "Gemini classifies Roads image", passed, res);
  } catch (err) {
    record(2, "Gemini classifies Roads image", false, { error: err.message });
  }

  // 3. Drainage
  try {
    const imgPath = path.resolve(ROOT_DIR, "server/public/uploads/img-1793169017121-88863725.jpg");
    const res = await analyzeComplaintImageAndText({
      imagePath: imgPath,
      description: "Open concrete drainage channel causing hazard on roadside"
    });
    const passed = res.category === "Drainage" && res.predictionSource === "gemini_vision" && res.confidence >= 0.65;
    record(3, "Gemini classifies Drainage image", passed, res);
  } catch (err) {
    record(3, "Gemini classifies Drainage image", false, { error: err.message });
  }

  // 4. Street Light
  try {
    const imgPath = path.resolve(ROOT_DIR, "server/public/uploads/img-1793168965022-820057764.jpg");
    const res = await analyzeComplaintImageAndText({
      imagePath: imgPath,
      description: "Street light fixture broken and damaged on pole"
    });
    const passed = res.category === "Street Light" && res.predictionSource === "gemini_vision" && res.confidence >= 0.65;
    record(4, "Gemini classifies Street Light image", passed, res);
  } catch (err) {
    record(4, "Gemini classifies Street Light image", false, { error: err.message });
  }

  // 5. Water Supply
  try {
    const imgPath = path.resolve(ROOT_DIR, "server/public/uploads/img-1793169255380-667200900.jpg");
    const res = await analyzeComplaintImageAndText({
      imagePath: imgPath,
      description: "Severe drinking water pipeline burst spraying high-pressure water"
    });
    const passed = res.category === "Water Supply" && res.predictionSource === "gemini_vision" && res.confidence >= 0.65;
    record(5, "Gemini classifies Water Supply image", passed, res);
  } catch (err) {
    record(5, "Gemini classifies Water Supply image", false, { error: err.message });
  }

  // 6. Unrelated / Unclear image
  try {
    const imgPath = path.resolve(ROOT_DIR, "ai/data/Other/other_001.jpg");
    const res = await analyzeComplaintImageAndText({
      imagePath: imgPath,
      description: "Random blurry picture taken from mobile phone"
    });
    const passed = res.category === "Other" && res.predictionSource === "gemini_vision";
    record(6, "Gemini handles unrelated or unclear image", passed, res);
  } catch (err) {
    record(6, "Gemini handles unrelated or unclear image", false, { error: err.message });
  }

  // 7. Gemini API failure triggers MobileNetV3
  try {
    const imgPath = path.resolve(ROOT_DIR, "ai/data/Street Light/street_light_001.jpg");
    // Force fail Gemini to test secondary fallback to MobileNetV3
    const res = await analyzeComplaintImageAndText({
      imagePath: imgPath,
      description: "Street light fixture on pole",
      overrideOptions: { forceFailGemini: true }
    });
    const passed = res.predictionSource === "mobilenet" && res.fallbackUsed === true && res.category === "Street Light";
    record(7, "Gemini failure triggers MobileNetV3 fallback", passed, res);
  } catch (err) {
    record(7, "Gemini failure triggers MobileNetV3 fallback", false, { error: err.message });
  }

  // 8. MobileNetV3 failure triggers heuristic classification
  try {
    const imgPath = path.resolve(ROOT_DIR, "server/public/uploads/img-1790492799867-572090913.jpg");
    // Force fail Gemini and MobileNetV3 to test final fallback to heuristics
    const res = await analyzeComplaintImageAndText({
      imagePath: imgPath,
      description: "Dangerous pothole crater in the middle of main road",
      overrideOptions: { forceFailGemini: true, forceFailMobileNet: true }
    });
    const passed = res.predictionSource === "rules" && res.fallbackUsed === true && res.category === "Roads";
    record(8, "MobileNetV3 failure triggers heuristic classification", passed, res);
  } catch (err) {
    record(8, "MobileNetV3 failure triggers heuristic classification", false, { error: err.message });
  }

  // 9. Invalid Gemini JSON triggers fallback
  try {
    const imgPath = path.resolve(ROOT_DIR, "ai/data/Drainage/drainage_001.jpg");
    // Reject Gemini result due to unattainable confidence threshold (simulating low confidence rejection)
    const res = await analyzeComplaintImageAndText({
      imagePath: imgPath,
      description: "Clogged stormwater drain with sewage overflow",
      overrideOptions: {
        geminiConfidenceThreshold: 0.999
      }
    });
    const passed = res.fallbackUsed === true && (res.predictionSource === "mobilenet" || res.predictionSource === "rules");
    record(9, "Invalid Gemini JSON / low confidence triggers fallback", passed, res);
  } catch (err) {
    record(9, "Invalid Gemini JSON / low confidence triggers fallback", false, { error: err.message });
  }

  // 10. Complaint submission still works if all AI providers fail
  try {
    // Total failure of all AI providers
    const res = await analyzeComplaintImageAndText({
      imagePath: null,
      description: "xyz completely unknown issue without keywords 123",
      overrideOptions: { forceFailGemini: true, forceFailMobileNet: true }
    });
    const passed = Boolean(res && res.category && res.priority && res.department);
    record(10, "Complaint submission resilient when all AI providers fail", passed, res);
  } catch (err) {
    record(10, "Complaint submission resilient when all AI providers fail", false, { error: err.message });
  }

  console.log("===============================================================");
  const totalPassed = results.filter((r) => r.passed).length;
  console.log(`   TEST SUMMARY: ${totalPassed} / ${results.length} PASSED`);
  console.log("===============================================================");

  if (totalPassed === results.length) {
    console.log("ALL 10 VERIFICATION REQUIREMENTS SUCCESSFULLY PASSED!");
  } else {
    console.error("SOME TESTS FAILED!");
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error("Test suite fatal error:", err);
  process.exit(1);
});
