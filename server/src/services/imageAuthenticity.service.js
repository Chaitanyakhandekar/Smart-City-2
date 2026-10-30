import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const CANDIDATE_MODELS = [
  process.env.GEMINI_MODEL,
  "gemini-3.8-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
].filter(Boolean);

const DETECTION_PROMPT = `
You are an expert civic imagery analysis assistant assisting municipal administration and citizens in evaluating photographic evidence.
Examine this image for visual clues that indicate whether it appears to be an authentic photograph captured in the real world or an AI-generated / synthetically created or heavily manipulated image.

Analyze the image carefully for:
1. Texture consistency and edge coherence (e.g., asphalt, concrete, foliage, water, rubbish textures, AI smoothing, repetitive patterns, unnatural blending).
2. Boundary geometry and spatial plausibility (e.g., melting boundaries, impossible structural physics, unnatural intersections, warped perspective).
3. Lighting, shadows, and reflections (e.g., mismatched light sources, inconsistent shadow angles, missing contact shadows, contradictory reflections).
4. Structural details and text (e.g., deformed objects, distorted equipment, nonsensical lettering on signs or vehicles).
5. Generative artifacts (e.g., characteristic diffusion noise, hyper-smoothed plastic appearance, digital synthesis artifacts).

Important guidelines:
- Real-world photographs frequently exhibit camera blur, optical distortion, sensor noise, heavy compression artifacts, or phone post-processing filters. Do not classify an image as AI-generated solely because it is low resolution or compressed.
- Conversely, modern generative models can produce high-detail, seemingly mundane scenes.
- If the image displays consistent real-world optics, natural entropy, plausible lighting, and absence of synthesis artifacts, assess as LIKELY_PHOTOGRAPHIC.
- If the image contains noticeable generative synthesis artifacts, anatomically or physically implausible geometry, or characteristic AI blending, assess as LIKELY_AI_GENERATED.
- If the evidence is ambiguous, heavily compressed, contradictory, or insufficient to reach a reasonable estimate, assess as INCONCLUSIVE.
- Never assert absolute certainty or claim forensic proof. This is an AI-based visual estimate only.

Respond ONLY with a valid JSON object matching this exact schema:
{
  "assessment": "LIKELY_AI_GENERATED | LIKELY_PHOTOGRAPHIC | INCONCLUSIVE",
  "confidence": 85,
  "reasoning": [
    "Concise observation 1 supported by specific visual details in the image",
    "Concise observation 2 supported by specific visual details in the image"
  ],
  "limitations": "AI-generated image detection is an estimate based on visual clues. It cannot prove whether an image is genuine or AI-generated. Review the evidence and other complaint details before making a decision."
}
`;

const VALID_ASSESSMENTS = new Set([
  "LIKELY_AI_GENERATED",
  "LIKELY_PHOTOGRAPHIC",
  "INCONCLUSIVE",
]);

const DEFAULT_LIMITATIONS =
  "AI-generated image detection is an estimate based on visual clues. It cannot prove whether an image is genuine or AI-generated. Review the evidence and other complaint details before making a decision.";

/**
 * Normalizes and validates the raw Gemini JSON output into a secure, typed structure.
 */
function normalizeDetectionResult(rawResult, modelUsed) {
  let assessment = "INCONCLUSIVE";
  if (
    rawResult &&
    typeof rawResult.assessment === "string" &&
    VALID_ASSESSMENTS.has(rawResult.assessment.trim().toUpperCase())
  ) {
    assessment = rawResult.assessment.trim().toUpperCase();
  }

  let confidence = 0;
  if (typeof rawResult?.confidence === "number" && !isNaN(rawResult.confidence)) {
    confidence = Math.min(100, Math.max(0, Math.round(rawResult.confidence)));
  }

  let reasoning = [];
  if (Array.isArray(rawResult?.reasoning)) {
    reasoning = rawResult.reasoning
      .filter((r) => typeof r === "string" && r.trim().length > 0)
      .map((r) => r.trim());
  }

  if (reasoning.length === 0) {
    reasoning = [
      assessment === "INCONCLUSIVE"
        ? "Visual features were ambiguous or insufficient for a conclusive visual estimate."
        : `Visual evidence suggests the image is ${assessment.toLowerCase().replace(/_/g, " ")}.`,
    ];
  }

  const limitations =
    typeof rawResult?.limitations === "string" && rawResult.limitations.trim().length > 0
      ? rawResult.limitations.trim()
      : DEFAULT_LIMITATIONS;

  return {
    assessment,
    confidence,
    reasoning,
    limitations,
    model: modelUsed,
    testedAt: new Date().toISOString(),
  };
}

/**
 * On-demand AI Image Authenticity Analyzer using Google Gemini API.
 * Strict manual trigger only: invoked exclusively when an authorized user clicks the test button.
 *
 * @param {Object} options
 * @param {string} options.imagePath - Absolute or relative local path to image file
 * @param {string} [options.imageUrl] - Relative or public image URL (for logging/metadata)
 * @param {Object} [options.metadata] - Optional contextual metadata (complaintId, target)
 * @returns {Promise<Object>} Normalized analysis result
 */
export async function analyzeImageAuthenticity({ imagePath, imageUrl, metadata = {} }) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      "Gemini API key is not configured on the server. Please set GEMINI_API_KEY in server environment."
    );
  }

  if (!imagePath || !fs.existsSync(imagePath)) {
    throw new Error("Target image file could not be found on the server filesystem.");
  }

  const stat = fs.statSync(imagePath);
  const MAX_SIZE_BYTES = 12 * 1024 * 1024; // 12 MB
  if (stat.size > MAX_SIZE_BYTES) {
    throw new Error("Image file exceeds the maximum allowed analysis limit (12MB).");
  }

  // Determine MIME type from extension
  const ext = path.extname(imagePath).toLowerCase();
  const mimeMap = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
  };
  const mimeType = mimeMap[ext] || "image/jpeg";

  const imageBuffer = fs.readFileSync(imagePath);
  const base64Data = imageBuffer.toString("base64");

  const parts = [
    { text: DETECTION_PROMPT },
    {
      inlineData: {
        mimeType,
        data: base64Data,
      },
    },
  ];

  let response = null;
  let lastError = null;
  let usedModel = CANDIDATE_MODELS[0] || "gemini-3.8-flash";

  // Try candidate models in order of configured preference
  for (const model of CANDIDATE_MODELS) {
    try {
      usedModel = model;
      // AbortSignal timeout for 30s per model attempt
      response = await ai.models.generateContent({
        model,
        contents: [
          {
            role: "user",
            parts,
          },
        ],
        config: {
          responseMimeType: "application/json",
          temperature: 0.2, // Lower temperature for more consistent analytical observations
        },
      });

      if (response && response.text) {
        break;
      }
    } catch (err) {
      lastError = err;
      console.warn(`[ImageAuthenticityService] Model ${model} failed: ${err.message}. Trying next candidate...`);
    }
  }

  if (!response || !response.text) {
    const errorMsg = lastError?.message || "No response received from Gemini API.";
    console.error("[ImageAuthenticityService Error]", errorMsg);

    // Provide friendly error description
    if (/quota|rate/i.test(errorMsg)) {
      throw new Error("Gemini API rate limit or quota exceeded. Please wait a moment and try again.");
    }
    if (/timeout/i.test(errorMsg)) {
      throw new Error("The image analysis request timed out. Please try again.");
    }
    throw new Error(`AI authenticity analysis could not be completed: ${errorMsg}`);
  }

  let parsedJson = null;
  try {
    parsedJson = JSON.parse(response.text);
  } catch (jsonErr) {
    // Attempt to extract JSON substring if wrapped in markdown code fence
    const match = response.text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        parsedJson = JSON.parse(match[0]);
      } catch (innerErr) {
        console.error("[ImageAuthenticityService] Failed to parse JSON from response text:", response.text);
      }
    }
  }

  if (!parsedJson) {
    return normalizeDetectionResult(
      {
        assessment: "INCONCLUSIVE",
        confidence: 0,
        reasoning: ["Model output could not be parsed into the required structured schema."],
      },
      usedModel
    );
  }

  return normalizeDetectionResult(parsedJson, usedModel);
}

export default {
  analyzeImageAuthenticity,
};
