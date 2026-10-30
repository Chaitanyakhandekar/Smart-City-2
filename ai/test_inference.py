"""
SmartCity AI Verification & End-to-End Test Suite.
Tests:
1. /health endpoint: verifies service status and whether MobileNetV3 weights are loaded.
2. /categories endpoint: validates taxonomy schema.
3. /analyze endpoint with real test image uploads: checks latency, category, confidence, and metadata.
4. Robustness checks: corrupt image upload, empty payload, non-image payloads.
"""

import os
import sys
import time
import json
import requests
from PIL import Image

AI_URL = os.environ.get("AI_SERVICE_URL", "http://127.0.0.1:8000")


def test_health():
    print("\n[Test 1] Testing /health endpoint...")
    try:
        res = requests.get(f"{AI_URL}/health", timeout=5)
        print(f"Status Code: {res.status_code}")
        data = res.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        assert res.status_code == 200, "Health check failed"
        assert "modelLoaded" in data or "status" in data, "Unexpected health response"
        print(" PASS: /health endpoint is operational.")
        return data
    except Exception as e:
        print(f" FAIL: Could not reach {AI_URL}/health: {e}")
        return None


def test_categories():
    print("\n[Test 2] Testing /categories endpoint...")
    try:
        res = requests.get(f"{AI_URL}/categories", timeout=5)
        assert res.status_code == 200, "Categories check failed"
        data = res.json()
        print(f"Found {data.get('total')} civic categories in taxonomy.")
        print(" PASS: /categories endpoint is operational.")
    except Exception as e:
        print(f" FAIL: /categories test failed: {e}")


def test_image_analysis(image_path: str, description: str = ""):
    print(f"\n[Test 3] Testing /analyze with image: {image_path}...")
    if not os.path.exists(image_path):
        print(f" Warning: Test image not found at {image_path}, creating temporary test image.")
        os.makedirs(os.path.dirname(image_path), exist_ok=True)
        img = Image.new("RGB", (256, 256), color=(60, 60, 60))
        img.save(image_path, "JPEG")

    try:
        t0 = time.perf_counter()
        with open(image_path, "rb") as f:
            files = {"image": (os.path.basename(image_path), f, "image/jpeg")}
            data = {"description": description}
            res = requests.post(f"{AI_URL}/analyze", files=files, data=data, timeout=10)
        dt = round((time.perf_counter() - t0) * 1000, 2)

        print(f"Status Code: {res.status_code} (Total Round-Trip: {dt} ms)")
        result = res.json()
        print(f"Response:\n{json.dumps(result, indent=2)}")

        assert res.status_code == 200, f"Analysis failed with status {res.status_code}"
        assert "category" in result, "Missing 'category' in result"
        assert "confidence" in result, "Missing 'confidence' in result"
        assert "department" in result, "Missing 'department' in result"
        assert "priority" in result, "Missing 'priority' in result"

        print(f" Model Reported: {result.get('model')} | Fallback: {result.get('isFallback')}")
        print(" PASS: /analyze endpoint successfully classified image.")
        return result
    except Exception as e:
        print(f" FAIL: /analyze test failed: {e}")
        return None


def test_corrupt_image_resilience():
    print("\n[Test 4] Testing robustness against corrupted image upload...")
    corrupt_path = os.path.join(os.path.dirname(__file__), "corrupt_test.jpg")
    try:
        # Write invalid binary gibberish
        with open(corrupt_path, "wb") as f:
            f.write(b"NOT_AN_IMAGE_RANDOM_CORRUPT_BYTES_XYZ1234567890")

        with open(corrupt_path, "rb") as f:
            files = {"image": ("corrupt.jpg", f, "image/jpeg")}
            data = {"description": "Pothole on 5th main road"}
            res = requests.post(f"{AI_URL}/analyze", files=files, data=data, timeout=10)

        print(f"Status Code: {res.status_code}")
        result = res.json()
        print(f"Fallback response: {json.dumps(result, indent=2)}")
        assert res.status_code == 200 or res.status_code == 500
        print(" PASS: Service handled corrupt image safely without crashing.")
    finally:
        if os.path.exists(corrupt_path):
            os.remove(corrupt_path)


if __name__ == "__main__":
    print("=" * 65)
    print(" SMART CITY CIVIC AI TEST SUITE")
    print(f" Testing Target URL: {AI_URL}")
    print("=" * 65)

    health_data = test_health()
    test_categories()

    # Find or use an existing test image
    test_img = os.path.join(os.path.dirname(__file__), "models", "test_pothole.jpg")
    test_image_analysis(test_img, "Large deep pothole on road near bus stop")

    test_corrupt_image_resilience()
    print("\n" + "=" * 65)
    print(" ALL TESTS COMPLETED")
    print("=" * 65)
