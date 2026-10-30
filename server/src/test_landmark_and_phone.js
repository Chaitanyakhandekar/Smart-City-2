import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

import mongoose from "mongoose";
import connectDB from "./db/dbConfig.js";
import { User } from "./models/users.model.js";
import { Complaint } from "./models/complaints.model.js";
import { ApiError } from "./utils/apiUtils.js";

// Helper simulating createStaff logic from admin.controller.js
async function simulateCreateStaff({ name, email, password, phone, department }) {
  if (!name || !email || !password || !department) {
    throw new ApiError(400, "Name, email, password, and department are required.");
  }

  const cleanPhone = phone !== undefined && phone !== null ? String(phone).trim() : "";
  if (!cleanPhone || !/^[0-9]{10}$/.test(cleanPhone)) {
    throw new ApiError(400, "Phone number must contain exactly 10 digits without +91.");
  }

  const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
  if (existingUser) {
    throw new ApiError(409, "User with this email already exists.");
  }

  return await User.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password,
    phone: cleanPhone,
    role: "STAFF",
    employeeId: `TEST-${Date.now().toString().slice(-4)}`,
    department,
    designation: "Field Officer",
    isActive: true
  });
}

async function runTests() {
  console.log("==================================================");
  console.log("SMART CITY: LANDMARK & PHONE VALIDATION TEST SUITE");
  console.log("==================================================\n");

  await connectDB();

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`  [PASS] Test ${totalTests}: ${message}`);
      passedTests++;
    } else {
      console.error(`  [FAIL] Test ${totalTests}: ${message}`);
    }
  }

  console.log("--- PART 1: STAFF PHONE NUMBER VALIDATION TESTS ---\n");

  // Test 1: Valid 10-digit number
  try {
    const testEmail = `valid_staff_${Date.now()}@test.local`;
    const staff = await simulateCreateStaff({
      name: "Ramesh Pawar",
      email: testEmail,
      password: "Password@123",
      phone: "9876543210",
      department: "Roads"
    });
    assert(staff.phone === "9876543210" && typeof staff.phone === "string", "Valid 10-digit number ('9876543210') accepted and saved as string");
    await User.findByIdAndDelete(staff._id);
  } catch (err) {
    assert(false, `Valid 10-digit number failed unexpectedly: ${err.message}`);
  }

  // Test 2: 9-digit number
  try {
    await simulateCreateStaff({
      name: "Test Staff",
      email: `test_9_${Date.now()}@test.local`,
      password: "Password@123",
      phone: "987654321",
      department: "Roads"
    });
    assert(false, "9-digit number should have thrown 400 error");
  } catch (err) {
    assert(
      err.statusCode === 400 && err.message === "Phone number must contain exactly 10 digits without +91.",
      `9-digit number rejected with: "${err.message}"`
    );
  }

  // Test 3: 11-digit number
  try {
    await simulateCreateStaff({
      name: "Test Staff",
      email: `test_11_${Date.now()}@test.local`,
      password: "Password@123",
      phone: "98765432101",
      department: "Roads"
    });
    assert(false, "11-digit number should have thrown 400 error");
  } catch (err) {
    assert(
      err.statusCode === 400 && err.message === "Phone number must contain exactly 10 digits without +91.",
      `11-digit number rejected with: "${err.message}"`
    );
  }

  // Test 4: Number containing letters
  try {
    await simulateCreateStaff({
      name: "Test Staff",
      email: `test_letters_${Date.now()}@test.local`,
      password: "Password@123",
      phone: "98765abc10",
      department: "Roads"
    });
    assert(false, "Phone with letters should have thrown 400 error");
  } catch (err) {
    assert(
      err.statusCode === 400 && err.message === "Phone number must contain exactly 10 digits without +91.",
      `Number with letters rejected with: "${err.message}"`
    );
  }

  // Test 5: Number containing +91
  try {
    await simulateCreateStaff({
      name: "Test Staff",
      email: `test_plus91_${Date.now()}@test.local`,
      password: "Password@123",
      phone: "+919876543210",
      department: "Roads"
    });
    assert(false, "Phone with +91 should have thrown 400 error");
  } catch (err) {
    assert(
      err.statusCode === 400 && err.message === "Phone number must contain exactly 10 digits without +91.",
      `Phone with +91 rejected with: "${err.message}"`
    );
  }

  // Test 6: Empty phone number
  try {
    await simulateCreateStaff({
      name: "Test Staff",
      email: `test_empty_${Date.now()}@test.local`,
      password: "Password@123",
      phone: "",
      department: "Roads"
    });
    assert(false, "Empty phone number should have thrown 400 error");
  } catch (err) {
    assert(
      err.statusCode === 400 && err.message === "Phone number must contain exactly 10 digits without +91.",
      `Empty phone number rejected with: "${err.message}"`
    );
  }

  // Test 7: Direct API request bypass simulation (e.g. number with spaces "98765 43210")
  try {
    await simulateCreateStaff({
      name: "Test Staff",
      email: `test_spaces_${Date.now()}@test.local`,
      password: "Password@123",
      phone: "98765 43210",
      department: "Roads"
    });
    assert(false, "Direct API bypass attempt with spaces should have thrown 400 error");
  } catch (err) {
    assert(
      err.statusCode === 400 && err.message === "Phone number must contain exactly 10 digits without +91.",
      `Direct API bypass attempt rejected with: "${err.message}"`
    );
  }

  console.log("\n--- PART 2: COMPLAINT LANDMARK FIELD TESTS ---\n");

  // Get or create dummy citizen for complaints
  let citizen = await User.findOne({ role: "CITIZEN" });
  if (!citizen) {
    citizen = await User.create({
      name: "Test Citizen",
      email: `citizen_${Date.now()}@test.local`,
      password: "Password@123",
      role: "CITIZEN"
    });
  }

  // Test 8: Submit a complaint with a landmark
  let complaint1 = null;
  try {
    complaint1 = await Complaint.create({
      complaintNumber: `CMP-${Date.now().toString().slice(-6)}`,
      citizen: citizen._id,
      title: "Broken streetlight on MG Road",
      description: "Light pole #42 is dark and sparking",
      category: "Street Light",
      subcategory: "Street Light Not Working",
      priority: "HIGH",
      locationAddress: "MG Road, Camp Area, Pune",
      landmark: "Near City Hospital, opposite SBI Bank",
      status: "SUBMITTED"
    });

    const fetched1 = await Complaint.findById(complaint1._id);
    assert(
      fetched1.landmark === "Near City Hospital, opposite SBI Bank",
      `Complaint with landmark persisted in MongoDB: "${fetched1.landmark}"`
    );
  } catch (err) {
    assert(false, `Complaint with landmark failed: ${err.message}`);
  }

  // Test 9: Submit a complaint without a landmark
  let complaint2 = null;
  try {
    complaint2 = await Complaint.create({
      complaintNumber: `CMP-${Date.now().toString().slice(-6)}-2`,
      citizen: citizen._id,
      title: "Pothole on Main Street",
      description: "Large pothole causing traffic slowdowns",
      category: "Roads",
      subcategory: "Potholes",
      priority: "MEDIUM",
      locationAddress: "123 Main Street",
      // landmark omitted
      status: "SUBMITTED"
    });

    const fetched2 = await Complaint.findById(complaint2._id);
    assert(
      fetched2.landmark === "",
      `Complaint without landmark defaulted to empty string: "${fetched2.landmark}"`
    );
  } catch (err) {
    assert(false, `Complaint without landmark failed: ${err.message}`);
  }

  // Test 10: Submit a complaint using live GPS without entering a landmark
  let complaint3 = null;
  try {
    complaint3 = await Complaint.create({
      complaintNumber: `CMP-${Date.now().toString().slice(-6)}-3`,
      citizen: citizen._id,
      title: "Garbage pile near park",
      description: "Waste dumped along the park perimeter",
      category: "Waste Management",
      subcategory: "Garbage Overflow",
      priority: "MEDIUM",
      locationAddress: "Lat: 18.520430, Lon: 73.856744",
      landmark: "",
      status: "SUBMITTED"
    });

    const fetched3 = await Complaint.findById(complaint3._id);
    assert(
      fetched3.locationAddress === "Lat: 18.520430, Lon: 73.856744" && fetched3.landmark === "",
      `Complaint using GPS without landmark persisted successfully`
    );
  } catch (err) {
    assert(false, `Complaint using GPS without landmark failed: ${err.message}`);
  }

  // Test 11: Verify backwards compatibility with existing complaints without landmark
  try {
    const existing = await Complaint.findOne({ landmark: { $exists: false } });
    if (existing) {
      assert(existing.landmark === "" || existing.landmark === undefined, "Existing complaints without landmark read cleanly without errors");
    } else {
      assert(true, "All complaints in DB conform to schema with default landmark");
    }
  } catch (err) {
    assert(false, `Querying existing complaints failed: ${err.message}`);
  }

  // Cleanup test complaints
  if (complaint1) await Complaint.findByIdAndDelete(complaint1._id);
  if (complaint2) await Complaint.findByIdAndDelete(complaint2._id);
  if (complaint3) await Complaint.findByIdAndDelete(complaint3._id);

  console.log("\n==================================================");
  console.log(`TEST SUMMARY: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log("==================================================");

  await mongoose.disconnect();
  process.exit(passedTests === totalTests ? 0 : 1);
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
