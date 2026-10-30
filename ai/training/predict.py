"""
Standalone CLI Prediction and Inference Engine for SmartCity Civic Images.
Loads trained MobileNetV3 weights and runs fast CPU/GPU inference.
"""

import os
import sys
import json
import time
import argparse
from typing import Dict, List, Optional, Tuple, Any

import torch
import torch.nn as nn
from PIL import Image

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from model import build_mobilenet_v3_small, get_device
from dataset import get_inference_transforms, load_and_validate_image


class CivicImagePredictor:
    """
    Production inference engine for civic complaint images.
    Loads weights once and executes fast predictions with full error validation.
    """

    def __init__(
        self,
        weights_path: str,
        config_path: str,
        device: Optional[torch.device] = None
    ):
        self.device = device or get_device()
        self.weights_path = weights_path
        self.config_path = config_path

        if not os.path.exists(weights_path):
            raise FileNotFoundError(f"Weights file not found: {weights_path}")
        if not os.path.exists(config_path):
            raise FileNotFoundError(f"Config file not found: {config_path}")

        with open(config_path, "r") as f:
            self.config = json.load(f)

        self.class_names: List[str] = self.config["classes"]
        self.num_classes: int = len(self.class_names)
        self.image_size: int = self.config.get("image_size", 224)

        # Build model and load weights
        self.model = build_mobilenet_v3_small(num_classes=self.num_classes, pretrained=False)
        state_dict = torch.load(weights_path, map_location=self.device)
        self.model.load_state_dict(state_dict)
        self.model = self.model.to(self.device)
        self.model.eval()

        self.transform = get_inference_transforms(self.image_size)
        self.softmax = nn.Softmax(dim=1)

    @torch.inference_mode()
    def predict_image(self, image_input: Any, top_k: int = 3) -> Dict[str, Any]:
        """
        Runs inference on an image path, PIL Image, or file bytes.
        
        Returns:
            Dict containing:
              - predicted_category: str
              - confidence: float (0.0 to 1.0)
              - top_predictions: List[Dict(category, confidence)]
              - inference_time_ms: float
              - model_name: str
        """
        t0 = time.perf_counter()

        # Handle various input formats
        if isinstance(image_input, str):
            img = load_and_validate_image(image_input)
            if img is None:
                raise ValueError(f"Unable to load or decode image from path: {image_input}")
        elif isinstance(image_input, Image.Image):
            img = image_input.convert("RGB")
        else:
            raise TypeError("Unsupported image input type. Expected path string or PIL.Image.")

        # Transform and add batch dimension [1, 3, 224, 224]
        tensor = self.transform(img).unsqueeze(0).to(self.device)

        # Forward pass
        logits = self.model(tensor)
        probs = self.softmax(logits)[0]

        top_k = min(top_k, self.num_classes)
        top_probs, top_indices = torch.topk(probs, k=top_k)

        top_predictions = []
        for prob, idx in zip(top_probs.cpu().numpy(), top_indices.cpu().numpy()):
            top_predictions.append({
                "category": self.class_names[idx],
                "confidence": round(float(prob), 4)
            })

        dt_ms = round((time.perf_counter() - t0) * 1000, 2)

        return {
            "predicted_category": top_predictions[0]["category"],
            "confidence": top_predictions[0]["confidence"],
            "top_predictions": top_predictions,
            "inference_time_ms": dt_ms,
            "model_name": self.config.get("model_name", "MobileNetV3-Small-Civic"),
            "device": str(self.device)
        }


def main():
    parser = argparse.ArgumentParser(description="Predict civic complaint category using MobileNetV3")
    parser.add_argument("--image", type=str, required=True, help="Path to image file")
    parser.add_argument("--weights", type=str, default=os.path.join(os.path.dirname(__file__), "..", "models", "best_model.pth"))
    parser.add_argument("--config", type=str, default=os.path.join(os.path.dirname(__file__), "..", "models", "model_config.json"))
    parser.add_argument("--topk", type=int, default=3, help="Number of top predictions to display")

    args = parser.parse_args()

    predictor = CivicImagePredictor(
        weights_path=os.path.abspath(args.weights),
        config_path=os.path.abspath(args.config)
    )

    result = predictor.predict_image(args.image, top_k=args.topk)

    print("\n" + "=" * 60)
    print(" Smart City MobileNetV3 Prediction Result")
    print("=" * 60)
    print(f" Image:       {args.image}")
    print(f" Predicted:   {result['predicted_category']}")
    print(f" Confidence:  {result['confidence']*100:.2f}%")
    print(f" Latency:     {result['inference_time_ms']} ms ({result['device']})")
    print("-" * 60)
    print(" Top Predictions:")
    for i, p in enumerate(result["top_predictions"], 1):
        print(f"   {i}. {p['category']:<24} {p['confidence']*100:>6.2f}%")
    print("=" * 60)


if __name__ == "__main__":
    main()
