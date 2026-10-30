import axios from "axios";
import fs from "fs";
import path from "path";
import FormData from "form-data";
import dotenv from "dotenv";

dotenv.config({ path: "./.env" });

const API = "http://localhost:3000/api/v1";

let passedCount = 0;
let failedCount = 0;

function assert(condition, testName, details = "") {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passedCount++;
  } else {
    console.error(`  ❌ FAIL: ${testName} ${details ? `(${details})` : ""}`);
    failedCount++;
  }
}

async function runTestSuite() {
  console.log("\n=======================================================");
  console.log("   SMARTCITY AI IMAGE AUTHENTICITY TEST SUITE");
  console.log("=======================================================\n");

  // 1. Authenticate users
  console.log("--- 1. Authenticating Roles ---");
  const citizenLogin = await axios.post(`${API}/auth/login`, {
    email: "citizen@smartcity.local",
    password: "Citizen@123",
  });
  const citizenToken = citizenLogin.data.data.token;
  const citizenId = citizenLogin.data.data.user._id;

  const adminLogin = await axios.post(`${API}/auth/login`, {
    email: "admin@smartcity.local",
    password: "Admin@123",
  });
  const adminToken = adminLogin.data.data.token;

  const staffLogin = await axios.post(`${API}/auth/login`, {
    email: "staff@smartcity.local",
    password: "Staff@123",
  });
  const staffToken = staffLogin.data.data.token;

  assert(citizenToken && adminToken && staffToken, "All 3 roles authenticated successfully");

  // 2. Setup a test complaint with an actual image
  console.log("\n--- 2. Setting up Test Grievance Record ---");

  // Ensure a test image exists
  const testImgPath = "public/uploads/test-authenticity-sample.jpg";
  if (!fs.existsSync(testImgPath)) {
    // Copy existing image
    const sourceImg = "public/uploads/img-1789112365758-486359012.jpg";
    if (fs.existsSync(sourceImg)) {
      fs.copyFileSync(sourceImg, testImgPath);
    }
  }

  const form = new FormData();
  form.append("title", "Authenticity Verification Test Road Hazard");
  form.append("description", "Road damage test for verifying Gemini authenticity check.");
  form.append("locationAddress", "Ward 12, Shivaji Nagar Road");
  form.append("category", "Roads");
  form.append("priority", "HIGH");
  if (fs.existsSync(testImgPath)) {
    form.append("image", fs.createReadStream(testImgPath), "test-authenticity-sample.jpg");
  }

  const createRes = await axios.post(`${API}/complaints`, form, {
    headers: { ...form.getHeaders(), Authorization: `Bearer ${citizenToken}` },
  });
  const complaint = createRes.data.data.complaint;
  console.log(`Created Test Complaint: #${complaint.complaintNumber} (ID: ${complaint._id})`);

  // 3. Test Invalid Target Validation
  console.log("\n--- 3. Testing Target Validation ---");
  try {
    await axios.post(
      `${API}/complaints/${complaint._id}/image-authenticity-test`,
      { target: "invalid_target" },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    assert(false, "Invalid target should reject with 400 Bad Request");
  } catch (err) {
    assert(err.response?.status === 400, "Invalid target rejects with 400 Bad Request");
  }

  // 4. Test Staff Unauthorized Access
  console.log("\n--- 4. Testing Staff Access Control ---");
  try {
    await axios.post(
      `${API}/complaints/${complaint._id}/image-authenticity-test`,
      { target: "original" },
      { headers: { Authorization: `Bearer ${staffToken}` } }
    );
    assert(false, "Staff should be forbidden from testing images");
  } catch (err) {
    assert(err.response?.status === 403, "Staff access blocked with 403 Forbidden");
  }

  // 5. Test Citizen attempting to test original image (Policy Restriction)
  console.log("\n--- 5. Testing Citizen Policy Restrictions ---");
  try {
    await axios.post(
      `${API}/complaints/${complaint._id}/image-authenticity-test`,
      { target: "original" },
      { headers: { Authorization: `Bearer ${citizenToken}` } }
    );
    assert(false, "Citizen testing original image should be blocked");
  } catch (err) {
    assert(
      err.response?.status === 403,
      "Citizen testing original image blocked with 403 Forbidden (Original review is Admin-only)"
    );
  }

  // 6. Test Citizen attempting to test resolution before resolution image is uploaded
  console.log("\n--- 6. Testing Missing Resolution Image Handling ---");
  try {
    await axios.post(
      `${API}/complaints/${complaint._id}/image-authenticity-test`,
      { target: "resolution" },
      { headers: { Authorization: `Bearer ${citizenToken}` } }
    );
    assert(false, "Testing missing resolution image should return 400");
  } catch (err) {
    assert(
      err.response?.status === 400,
      "Missing resolution image returns 400 Bad Request with descriptive message"
    );
  }

  // 7. Test Authorized Admin testing original image (Controlled Gemini call)
  console.log("\n--- 7. Testing Admin Testing Original Image (Real Gemini Execution) ---");
  try {
    const adminTestRes = await axios.post(
      `${API}/complaints/${complaint._id}/image-authenticity-test`,
      { target: "original" },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    assert(adminTestRes.status === 200, "Admin original image test returned HTTP 200 OK");

    const data = adminTestRes.data.data.testResult;
    assert(
      ["LIKELY_AI_GENERATED", "LIKELY_PHOTOGRAPHIC", "INCONCLUSIVE"].includes(data.assessment),
      `Assessment is valid enum: ${data.assessment}`
    );
    assert(
      typeof data.confidence === "number" && data.confidence >= 0 && data.confidence <= 100,
      `Confidence is 0-100 number: ${data.confidence}%`
    );
    assert(
      Array.isArray(data.reasoning) && data.reasoning.length > 0,
      `Reasoning contains visual observations: ${data.reasoning.length} items`
    );
    assert(
      typeof data.limitations === "string" && data.limitations.length > 10,
      "Explicit limitation notice included"
    );
    assert(data.imageTarget === "original", "Target identified as original");
  } catch (err) {
    console.error("Gemini call error:", err.response?.data || err.message);
    assert(false, "Admin original image test failed", err.message);
  }

  // 8. Test Resolution Upload & Citizen Testing Resolution Image
  console.log("\n--- 8. Testing Resolution Flow & Citizen Verification ---");

  // Admin assigns logged-in staff
  const staffUser = staffLogin.data.data.user;

  await axios.post(
    `${API}/admin/complaints/${complaint._id}/assign`,
    { staffId: staffUser._id, remarks: "Field inspection" },
    { headers: { Authorization: `Bearer ${adminToken}` } }
  );

  // Staff starts work
  const startForm = new FormData();
  startForm.append("remarks", "Crew on site");
  await axios.patch(`${API}/staff/tasks/${complaint._id}/start`, startForm, {
    headers: { ...startForm.getHeaders(), Authorization: `Bearer ${staffToken}` },
  });

  // Staff resolves with resolution photo
  const resolveForm = new FormData();
  resolveForm.append("remarks", "Road surface patched and cured.");
  if (fs.existsSync(testImgPath)) {
    resolveForm.append("image", fs.createReadStream(testImgPath), "resolved-proof.jpg");
  }
  await axios.patch(`${API}/staff/tasks/${complaint._id}/resolve`, resolveForm, {
    headers: { ...resolveForm.getHeaders(), Authorization: `Bearer ${staffToken}` },
  });

  // Now Citizen tests resolution image
  try {
    const citizenTestRes = await axios.post(
      `${API}/complaints/${complaint._id}/image-authenticity-test`,
      { target: "resolution" },
      { headers: { Authorization: `Bearer ${citizenToken}` } }
    );

    assert(citizenTestRes.status === 200, "Citizen resolution image test returned HTTP 200 OK");
    const resData = citizenTestRes.data.data.testResult;
    assert(
      ["LIKELY_AI_GENERATED", "LIKELY_PHOTOGRAPHIC", "INCONCLUSIVE"].includes(resData.assessment),
      `Citizen resolution assessment valid: ${resData.assessment}`
    );
    assert(resData.imageTarget === "resolution", "Target correctly tagged as resolution");
  } catch (err) {
    assert(false, "Citizen resolution test failed", err.response?.data?.message || err.message);
  }

  // 9. Test Citizen attempting to test ANOTHER citizen's complaint
  console.log("\n--- 9. Testing Ownership Security (Cross-Citizen Prevention) ---");
  // Register a secondary citizen
  const uniqueNum = Date.now().toString().slice(-6);
  const secondCitizenRes = await axios.post(`${API}/auth/register`, {
    name: "Secondary Citizen",
    email: `citizen_${uniqueNum}@smartcity.local`,
    phone: "9876543210",
    password: "Citizen@123",
  });
  const secondToken = secondCitizenRes.data.data.token;

  try {
    await axios.post(
      `${API}/complaints/${complaint._id}/image-authenticity-test`,
      { target: "resolution" },
      { headers: { Authorization: `Bearer ${secondToken}` } }
    );
    assert(false, "Unowned citizen complaint test should be rejected");
  } catch (err) {
    assert(
      err.response?.status === 403,
      "Unauthorized citizen blocked from testing other citizen's complaint (403 Forbidden)"
    );
  }

  // 10. Test Audit History Retrieval via getComplaintById
  console.log("\n--- 10. Testing Audit Trail in getComplaintById ---");
  const detailRes = await axios.get(`${API}/complaints/${complaint._id}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const detailData = detailRes.data.data;
  assert(
    Array.isArray(detailData.authenticityTests) && detailData.authenticityTests.length >= 2,
    `Authenticity tests saved to audit trail: ${detailData.authenticityTests?.length} records found`
  );

  console.log("\n=======================================================");
  console.log(`   TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("=======================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error("Test Suite crashed:", err);
  process.exit(1);
});
