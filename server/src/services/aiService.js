import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Securely load environment variables exclusively from server/.env
const serverEnvPath = path.resolve(__dirname, "../../.env");
dotenv.config({ path: serverEnvPath });

/**
 * Supported 6 Municipal Grievance Categories (Strict Taxonomy)
 */
export const SUPPORTED_CATEGORIES = [
  "Drainage",
  "Other",
  "Roads",
  "Street Light",
  "Waste Management",
  "Water Supply"
];

/**
 * Municipal Department Routing Table
 */
export const CATEGORY_DEPARTMENTS = {
  "Drainage": "Municipal Water Supply & Sewerage Board (Drainage Wing)",
  "Other": "General Municipal Grievance Cell",
  "Roads": "Public Works Department (PWD) - Roads & Bridges",
  "Street Light": "Electrical Engineering & Public Lighting Division",
  "Waste Management": "Department of Solid Waste Management & Sanitation",
  "Water Supply": "Municipal Water Supply & Sewerage Board (Water Wing)"
};

/**
 * Default Subcategories for Each Category
 */
export const DEFAULT_SUBCATEGORIES = {
  "Drainage": "Blocked Drain",
  "Other": "General Issue",
  "Roads": "Damaged Road",
  "Street Light": "Street Light Not Working",
  "Waste Management": "Garbage Dump",
  "Water Supply": "Water Supply Issue"
};

/**
 * Valid Subcategories for Validation and Normalization
 */
export const VALID_SUBCATEGORIES = {
  "Drainage": [
    "Blocked Drain",
    "Drainage Overflow",
    "Sewage Leakage",
    "Waterlogging",
    "Choked Stormwater Drain"
  ],
  "Other": [
    "General Issue",
    "Other",
    "Vandalism",
    "Damaged Public Property",
    "Damaged Sign Board",
    "Noise Pollution",
    "Encroachment"
  ],
  "Roads": [
    "Pothole",
    "Damaged Road",
    "Broken Footpath",
    "Missing Manhole Cover",
    "Damaged Road Divider",
    "Caved-in Road"
  ],
  "Street Light": [
    "Street Light Not Working",
    "Street Light Damaged",
    "Street Light Missing",
    "Street Light Flickering",
    "Street Light Pole Damaged",
    "Multiple Street Lights Not Working"
  ],
  "Waste Management": [
    "Garbage Dump",
    "Overflowing Dustbin",
    "Illegal Waste Disposal",
    "Dead Animal Removal",
    "Biohazard Waste"
  ],
  "Water Supply": [
    "Water Leakage",
    "Pipeline Damage",
    "Water Supply Issue",
    "Contaminated Water",
    "Low Water Pressure"
  ]
};

/**
 * Default Priority Levels
 */
export const DEFAULT_PRIORITIES = {
  "Drainage": "HIGH",
  "Other": "MEDIUM",
  "Roads": "HIGH",
  "Street Light": "MEDIUM",
  "Waste Management": "HIGH",
  "Water Supply": "HIGH"
};

// Configuration Parameters (Configurable via environment with safe defaults)
const CANDIDATE_MODELS = [
  process.env.GEMINI_MODEL,
  "gemini-3.8-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-2.5-flash"
].filter(Boolean);

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";

/**
 * Returns a configured GoogleGenAI instance using process.env.GEMINI_API_KEY.
 * Never exposes or logs the API key.
 */
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    return null;
  }
  return new GoogleGenAI({ apiKey: apiKey.trim() });
}

/**
 * Scans text for life-safety hazard tokens to trigger priority escalation.
 */
export function detectHazard(text = "") {
  const hazardPattern = /\b(open manhole|missing manhole|live wire|hanging wire|electric shock|sparking|pipeline burst|burst pipe|sewer burst|flood|flooding|explosion|collapse|road collapse|deep crater|electrocution|accident)\b/i;
  return hazardPattern.test(text);
}

/**
 * Builds the structured classification prompt for Google Gemini.
 */
function buildGeminiPrompt(description = "") {
  return `You are an expert municipal civic grievance classification AI.
Analyze the provided civic complaint image and citizen description.

Supported Categories (you MUST choose EXACTLY ONE from this list):
- Drainage
- Other
- Roads
- Street Light
- Waste Management
- Water Supply

Category Definitions:
- Drainage: Blocked drains, sewage overflows, choked stormwater drains, sewage leaks, or waterlogging.
- Other: General civic issues, unclear/ambiguous issues, or images unrelated to municipal infrastructure.
- Roads: Potholes, damaged road surfaces, broken footpaths/sidewalks, missing manhole covers, or caved-in roads.
- Street Light: Broken, unlit, missing, or flickering street lights, damaged light poles.
- Waste Management: Garbage piles, overflowing dustbins, uncollected trash, illegal dumping, or litter.
- Water Supply: Drinking water pipeline bursts, fresh water pipe leaks, tap/valve leaks, or water contamination.

Citizen Description: "${description || "No description provided."}"

Classification Rules:
1. Base your classification primarily on the visual evidence in the image, combined with the citizen description.
2. If the image is blurry, corrupted, unrelated to municipal infrastructure (e.g. selfies, animals, food, abstract art, random objects), or does not contain sufficient evidence to identify a municipal issue, classify it as "Other".
3. Do NOT invent new categories. You must choose strictly one of the 6 supported categories above.
4. Select a specific, relevant subcategory.
5. Assess the priority: "LOW", "MEDIUM", "HIGH", or "CRITICAL".
6. Provide a confidence score between 0.00 and 1.00 reflecting your certainty based on visual evidence.
7. Provide a concise explanation (reason) for your classification based on the visual features seen.

Respond ONLY with valid JSON in this exact structure:
{
  "category": "Waste Management",
  "subcategory": "Garbage Dump",
  "priority": "HIGH",
  "confidence": 0.92,
  "reason": "Visible garbage accumulation and overflowing waste along a roadside."
}`;
}

/**
 * Normalizes and validates a candidate category string.
 */
function normalizeCategory(rawCategory) {
  if (!rawCategory || typeof rawCategory !== "string") return null;
  const match = SUPPORTED_CATEGORIES.find(
    (c) => c.toLowerCase() === rawCategory.trim().toLowerCase()
  );
  return match || null;
}

/**
 * 1. PRIMARY CLASSIFIER: Google Gemini API (Multimodal Vision)
 * Reads key from server/.env, analyzes actual image + text, and validates JSON & confidence.
 */
export async function classifyWithGemini({
  imagePath,
  description = "",
  requestId = null,
  timeoutMs = null,
  confidenceThreshold = null
}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    throw new Error("GEMINI_API_KEY is not configured in server/.env");
  }

  const ai = getGeminiClient();
  if (!ai) {
    throw new Error("Failed to initialize GoogleGenAI client");
  }

  const effectiveTimeout = timeoutMs || parseInt(process.env.GEMINI_TIMEOUT_MS, 10) || 12000;
  const effectiveThreshold = confidenceThreshold ?? (parseFloat(process.env.GEMINI_CONFIDENCE_THRESHOLD) || 0.65);

  const parts = [
    { text: buildGeminiPrompt(description) }
  ];

  // Attach actual uploaded image if present on disk
  if (imagePath && fs.existsSync(imagePath)) {
    try {
      const imgBuffer = fs.readFileSync(imagePath);
      if (imgBuffer.length > 0) {
        const ext = path.extname(imagePath).toLowerCase();
        const mimeType =
          ext === ".png"
            ? "image/png"
            : ext === ".webp"
              ? "image/webp"
              : "image/jpeg";

        parts.push({
          inlineData: {
            mimeType,
            data: imgBuffer.toString("base64")
          }
        });
      }
    } catch (readErr) {
      console.warn(`[AI] Could not read image for Gemini analysis: ${readErr.message}`);
    }
  }

  let response = null;
  let lastError = null;

  for (const model of CANDIDATE_MODELS) {
    let timerId = null;
    try {
      const generatePromise = ai.models.generateContent({
        model,
        contents: [
          {
            role: "user",
            parts
          }
        ],
        config: {
          responseMimeType: "application/json"
        }
      });

      const timeoutPromise = new Promise((_, reject) => {
        timerId = setTimeout(
          () => reject(new Error(`Gemini request timeout after ${effectiveTimeout}ms`)),
          effectiveTimeout
        );
      });

      response = await Promise.race([generatePromise, timeoutPromise]);
      if (response && response.text) {
        break;
      }
    } catch (err) {
      lastError = err;
    } finally {
      if (timerId) clearTimeout(timerId);
    }
  }

  if (!response || !response.text) {
    throw lastError || new Error("No valid response received from Gemini candidate models");
  }

  // Sanitize and parse JSON response
  let parsed = null;
  const rawText = response.text.trim();
  const cleanedText = rawText.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/g, "").trim();

  try {
    parsed = JSON.parse(cleanedText);
  } catch (jsonErr) {
    throw new Error(`Invalid Gemini JSON response: ${jsonErr.message}`);
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Gemini response is not a valid JSON object");
  }

  // Validate category strictly against SUPPORTED_CATEGORIES
  const validatedCat = normalizeCategory(parsed.category);
  if (!validatedCat) {
    throw new Error(`Unsupported category returned by Gemini: "${parsed.category}"`);
  }

  // Validate confidence score
  const conf = Number(parsed.confidence);
  if (isNaN(conf) || conf < 0 || conf > 1) {
    throw new Error(`Invalid confidence score returned by Gemini: ${parsed.confidence}`);
  }

  if (conf < effectiveThreshold) {
    throw new Error(`Gemini confidence (${conf.toFixed(2)}) is below threshold (${effectiveThreshold})`);
  }

  // Validate subcategory
  let subcategory = parsed.subcategory;
  const allowedSubcats = VALID_SUBCATEGORIES[validatedCat] || [];
  if (!subcategory || !allowedSubcats.some((s) => s.toLowerCase() === String(subcategory).trim().toLowerCase())) {
    subcategory = DEFAULT_SUBCATEGORIES[validatedCat] || "General Issue";
  }

  // Validate priority & hazard escalation
  let priority = String(parsed.priority || "").toUpperCase();
  if (!["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(priority)) {
    priority = DEFAULT_PRIORITIES[validatedCat] || "MEDIUM";
  }

  if (detectHazard(description)) {
    priority = "CRITICAL";
  }

  const department = CATEGORY_DEPARTMENTS[validatedCat] || "General Municipal Grievance Cell";

  return {
    category: validatedCat,
    subcategory,
    predictedCategory: validatedCat,
    predictedSubcategory: subcategory,
    priority,
    confidence: Math.round(conf * 100) / 100,
    reason: parsed.reason || `Classified as ${validatedCat} based on visual and description evidence.`,
    department,
    predictionSource: "gemini_vision",
    modelLoaded: false,
    modelVersion: null,
    fallbackUsed: false,
    fallbackReason: null,
    requestId,
    isFallback: false,
    source: "gemini",
    serviceStatus: "Gemini AI classification successful"
  };
}

/**
 * 2. SECONDARY FALLBACK: PyTorch MobileNetV3 Small Vision Model
 * Queries the Python AI microservice with skip_llm=true to prevent duplicate Gemini calls.
 */
export async function classifyWithMobileNet({
  imagePath,
  description = "",
  requestId = null,
  timeoutMs = null
}) {
  if (!imagePath || !fs.existsSync(imagePath)) {
    // MobileNetV3 is an image classifier; cannot run without an image
    return null;
  }

  const effectiveTimeout = timeoutMs || parseInt(process.env.MOBILENET_TIMEOUT_MS, 10) || 4000;

  try {
    const formData = new FormData();
    formData.append("description", description || "");
    formData.append("skip_llm", "true");
    formData.append("use_llm", "false");
    if (requestId) {
      formData.append("requestId", requestId);
    }

    const buffer = fs.readFileSync(imagePath);
    const filename = path.basename(imagePath);
    formData.append("image", new Blob([buffer]), filename);

    const headers = {
      "X-Skip-LLM": "true"
    };
    if (requestId) {
      headers["X-Request-Id"] = requestId;
    }

    const response = await fetch(`${AI_SERVICE_URL}/analyze`, {
      method: "POST",
      body: formData,
      headers,
      signal: AbortSignal.timeout(effectiveTimeout)
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (!data || typeof data !== "object") {
      return null;
    }

    // Must be from mobilenet
    const isMobileNet = data.source === "mobilenet_v3" || data.predictionSource === "mobilenet";
    if (!isMobileNet && !data.modelLoaded) {
      return null;
    }

    const rawCat = data.category || data.predictedCategory;
    const validatedCat = normalizeCategory(rawCat) || "Other";
    const conf = typeof data.confidence === "number" ? data.confidence : 0.80;

    // Discard low-confidence MobileNet results
    if (conf < 0.35) {
      return null;
    }

    let subcategory = data.subcategory || data.predictedSubcategory;
    const allowedSubcats = VALID_SUBCATEGORIES[validatedCat] || [];
    if (!subcategory || !allowedSubcats.some((s) => s.toLowerCase() === String(subcategory).trim().toLowerCase())) {
      subcategory = DEFAULT_SUBCATEGORIES[validatedCat] || "General Issue";
    }

    let priority = data.priority || DEFAULT_PRIORITIES[validatedCat] || "MEDIUM";
    if (detectHazard(description)) {
      priority = "CRITICAL";
    }

    return {
      category: validatedCat,
      subcategory,
      predictedCategory: validatedCat,
      predictedSubcategory: subcategory,
      priority,
      confidence: Math.round(conf * 100) / 100,
      reason: data.reason || `Classified by MobileNetV3 neural model with ${Math.round(conf * 100)}% confidence.`,
      department: CATEGORY_DEPARTMENTS[validatedCat] || "General Municipal Grievance Cell",
      predictionSource: "mobilenet",
      modelLoaded: true,
      modelVersion: data.modelVersion || "1.0.0",
      fallbackUsed: true,
      fallbackReason: "Gemini unavailable or low confidence; MobileNetV3 secondary fallback used",
      requestId: data.requestId || requestId,
      isFallback: true,
      source: "mobilenet_v3",
      topPredictions: data.top_predictions || [],
      serviceStatus: "MobileNetV3 secondary fallback active"
    };
  } catch (err) {
    return null;
  }
}

/**
 * 3. FINAL FALLBACK: Intelligent Rule-Based Heuristic Classification
 * Evaluates complaint description keywords and filename.
 */
export function getFallbackClassification(
  description = "",
  filename = "",
  options = {}
) {
  const text = `${description} ${filename}`.toLowerCase();
  const requestId = options.requestId || `req_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
  const fallbackReason = options.fallbackReason || "Automated keyword and heuristic classification fallback";

  let category = "Other";
  let subcategory = "General Issue";
  let priority = "MEDIUM";
  let confidence = 0.60;
  let reason = "Automated keyword and heuristic classification";

  // Category matching strictly against the 6 supported categories
  if (/street\s*light|streetlight|street\s*lamp|lamp\s*post|lighting|dark\s*street|flickering\s*light|broken\s*pole|light\s*pole|light\s*bulb|sodium\s*lamp|unlit/i.test(text)) {
    category = "Street Light";
    if (/flicker/i.test(text)) {
      subcategory = "Street Light Flickering";
      priority = "MEDIUM";
    } else if (/pole/i.test(text)) {
      subcategory = "Street Light Pole Damaged";
      priority = "HIGH";
    } else if (/missing/i.test(text)) {
      subcategory = "Street Light Missing";
      priority = "MEDIUM";
    } else if (/multiple|all|entire\s*street/i.test(text)) {
      subcategory = "Multiple Street Lights Not Working";
      priority = "HIGH";
    } else if (/damage|broken/i.test(text)) {
      subcategory = "Street Light Damaged";
      priority = "MEDIUM";
    } else {
      subcategory = "Street Light Not Working";
      priority = "MEDIUM";
    }
    confidence = 0.88;
  } else if (/waste|garbage|trash|dustbin|dump|litter|debris|filth|rubbish|compost/i.test(text)) {
    category = "Waste Management";
    if (/dump|illegal/i.test(text)) {
      subcategory = "Illegal Waste Disposal";
      priority = "HIGH";
    } else if (/overflow/i.test(text)) {
      subcategory = "Overflowing Dustbin";
      priority = "HIGH";
    } else {
      subcategory = "Garbage Dump";
      priority = "MEDIUM";
    }
    confidence = 0.88;
  } else if (/pothole|road|asphalt|tar|crater|pavement|footpath|divider|speed breaker|carriageway/i.test(text)) {
    category = "Roads";
    if (/pothole|crater/i.test(text)) {
      subcategory = "Pothole";
      priority = "HIGH";
    } else if (/footpath|sidewalk/i.test(text)) {
      subcategory = "Broken Footpath";
      priority = "MEDIUM";
    } else {
      subcategory = "Damaged Road";
      priority = "HIGH";
    }
    confidence = 0.90;
  } else if (/drain|gutter|sewage|sewer|waterlogging|blocked drain|manhole|flooding/i.test(text)) {
    category = "Drainage";
    if (/manhole|open drain|flood/i.test(text)) {
      subcategory = "Drainage Overflow";
      priority = "CRITICAL";
    } else if (/sewage|leakage/i.test(text)) {
      subcategory = "Sewage Leakage";
      priority = "HIGH";
    } else {
      subcategory = "Blocked Drain";
      priority = "HIGH";
    }
    confidence = 0.89;
  } else if (/water supply|pipeline|pipe|leak|drinking water|tap|valve|water leak/i.test(text)) {
    category = "Water Supply";
    if (/burst|pipeline damage/i.test(text)) {
      subcategory = "Pipeline Damage";
      priority = "HIGH";
    } else if (/leak/i.test(text)) {
      subcategory = "Water Leakage";
      priority = "HIGH";
    } else {
      subcategory = "Water Supply Issue";
      priority = "MEDIUM";
    }
    confidence = 0.87;
  } else {
    category = "Other";
    subcategory = "General Issue";
    priority = "MEDIUM";
    confidence = 0.55;
  }

  // Priority escalation overrides for public safety hazards
  if (detectHazard(text)) {
    priority = "CRITICAL";
    confidence = Math.max(confidence, 0.92);
    reason += " (Escalated to CRITICAL due to public safety hazard)";
  } else if (/major|severe|heavy|deep|main road|highway/i.test(text) && priority === "LOW") {
    priority = "MEDIUM";
  }

  const department = CATEGORY_DEPARTMENTS[category] || "General Municipal Grievance Cell";

  return {
    category,
    subcategory,
    predictedCategory: category,
    predictedSubcategory: subcategory,
    priority,
    confidence,
    reason,
    department,
    predictionSource: "rules",
    modelLoaded: false,
    modelVersion: null,
    fallbackUsed: true,
    fallbackReason,
    requestId,
    isFallback: true,
    source: "rules",
    serviceStatus: "Rule-based heuristic fallback active"
  };
}

/**
 * Master Classification Orchestrator
 *
 * Priority Flow:
 * 1. Google Gemini API (Primary)
 * 2. MobileNetV3 Small (Secondary Fallback)
 * 3. Rule-based Heuristic (Final Fallback)
 */
export async function analyzeComplaintImageAndText({
  imagePath,
  description = "",
  requestId = null,
  overrideOptions = {}
}) {
  const effectiveRequestId = requestId || `req_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
  const filename = imagePath ? path.basename(imagePath) : "";

  console.log("[AI] Classification started");
  console.log("[AI] Primary provider: Gemini");

  // 1. Primary: Google Gemini API
  if (!overrideOptions.forceFailGemini) {
    try {
      const geminiResult = await classifyWithGemini({
        imagePath,
        description,
        requestId: effectiveRequestId,
        timeoutMs: overrideOptions.geminiTimeoutMs,
        confidenceThreshold: overrideOptions.geminiConfidenceThreshold
      });

      if (geminiResult) {
        console.log("[AI] Gemini classification successful");
        console.log(`[AI] Category: ${geminiResult.category}`);
        console.log(`[AI] Confidence: ${geminiResult.confidence}`);
        return geminiResult;
      }
      console.warn("[AI] Gemini failed; trying MobileNetV3");
    } catch (geminiError) {
      console.warn("[AI] Gemini failed; trying MobileNetV3");
    }
  } else {
    console.warn("[AI] Gemini failed; trying MobileNetV3");
  }

  // 2. Secondary Fallback: MobileNetV3
  if (!overrideOptions.forceFailMobileNet) {
    try {
      const mobilenetResult = await classifyWithMobileNet({
        imagePath,
        description,
        requestId: effectiveRequestId,
        timeoutMs: overrideOptions.mobilenetTimeoutMs
      });

      if (mobilenetResult) {
        console.log("[AI] MobileNetV3 classification successful");
        console.log(`[AI] Category: ${mobilenetResult.category}`);
        console.log(`[AI] Confidence: ${mobilenetResult.confidence}`);
        return mobilenetResult;
      }
      console.warn("[AI] MobileNetV3 failed; trying heuristic classifier");
    } catch (mobilenetError) {
      console.warn("[AI] MobileNetV3 failed; trying heuristic classifier");
    }
  } else {
    console.warn("[AI] MobileNetV3 failed; trying heuristic classifier");
  }

  // 3. Final Fallback: Rule-based Heuristics
  const heuristicResult = getFallbackClassification(
    description,
    filename,
    {
      requestId: effectiveRequestId,
      fallbackReason: "Primary Gemini and secondary MobileNetV3 unavailable or low confidence"
    }
  );

  console.log(`[AI] Category: ${heuristicResult.category}`);
  console.log(`[AI] Confidence: ${heuristicResult.confidence}`);
  return heuristicResult;
}

/**
 * AI Health Verification Endpoint Handler
 */
export async function getAiHealth() {
  const geminiConfigured = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());
  let microserviceStatus = null;

  try {
    const response = await fetch(`${AI_SERVICE_URL}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(2500)
    });
    if (response.ok) {
      microserviceStatus = await response.json();
    }
  } catch {
    // Microservice offline
  }

  return {
    status: "online",
    primaryProvider: "Gemini API",
    primaryConfigured: geminiConfigured,
    geminiConfigured,
    visionApiConfigured: geminiConfigured,
    secondaryProvider: "MobileNetV3",
    secondaryAvailable: Boolean(microserviceStatus?.modelLoaded),
    finalFallbackProvider: "Rule-based heuristic",
    fallbackClassificationEnabled: true,
    supportedCategories: SUPPORTED_CATEGORIES,
    confidenceThreshold: parseFloat(process.env.GEMINI_CONFIDENCE_THRESHOLD) || 0.65,
    timeoutMs: parseInt(process.env.GEMINI_TIMEOUT_MS, 10) || 12000,
    microservice: microserviceStatus || {
      online: false,
      status: "offline",
      service: "Smart City Civic AI Microservice (Unreachable)"
    }
  };
}
