"""
Evaluation and Metrics Computation for SmartCity MobileNetV3.
Evaluates on untouched test samples and computes:
- Overall Accuracy
- Macro Precision, Macro Recall, Macro F1-score
- Per-class Precision, Recall, F1-score, and sample support
- Confusion Matrix (both formatted console display and JSON output)
- Optional matplotlib visualization export
All metrics are strictly computed from actual predictions without fabrication.
"""

import os
import sys
import json
import argparse
from typing import Dict, List, Optional

import numpy as np
import torch
import torch.nn as nn
from sklearn.metrics import (
    accuracy_score,
    precision_recall_fscore_support,
    confusion_matrix,
    classification_report,
)

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from model import build_mobilenet_v3_small, get_device
from dataset import CivicComplaintDataset, get_inference_transforms


def format_confusion_matrix(cm: np.ndarray, classes: List[str]) -> str:
    """Formats confusion matrix as an aligned ASCII string table."""
    max_len = max(len(c) for c in classes)
    header = " " * (max_len + 4) + " ".join(f"{c[:8]:>8}" for c in classes)
    lines = [header, "-" * len(header)]
    for i, row in enumerate(cm):
        row_str = f"{classes[i]:<{max_len}} | " + " ".join(f"{val:>8d}" for val in row)
        lines.append(row_str)
    return "\n".join(lines)


def plot_and_save_visualizations(
    cm: np.ndarray,
    classes: List[str],
    history_file: Optional[str],
    output_dir: str
) -> None:
    """Attempts to generate confusion matrix and training curve PNG plots."""
    try:
        import matplotlib.pyplot as plt
        os.makedirs(output_dir, exist_ok=True)

        # 1. Confusion Matrix Plot
        fig, ax = plt.subplots(figsize=(8, 6))
        cax = ax.matshow(cm, cmap="Blues")
        fig.colorbar(cax)

        ax.set_xticks(range(len(classes)))
        ax.set_yticks(range(len(classes)))
        ax.set_xticklabels(classes, rotation=45, ha="left")
        ax.set_yticklabels(classes)

        for i in range(len(classes)):
            for j in range(len(classes)):
                val = cm[i, j]
                ax.text(j, i, str(val), ha="center", va="center",
                        color="white" if val > cm.max() / 2 else "black")

        ax.set_xlabel("Predicted Label")
        ax.set_ylabel("True Label")
        ax.set_title("MobileNetV3 Test Confusion Matrix", pad=20)
        plt.tight_layout()
        cm_path = os.path.join(output_dir, "confusion_matrix.png")
        plt.savefig(cm_path, dpi=200)
        plt.close()
        print(f" Saved confusion matrix plot: {cm_path}")

        # 2. Training Curve Plot (if history file exists)
        if history_file and os.path.exists(history_file):
            with open(history_file, "r") as f:
                history = json.load(f)

            epochs = range(1, len(history["train_loss"]) + 1)
            fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))

            # Loss plot
            ax1.plot(epochs, history["train_loss"], "b-o", label="Train Loss")
            ax1.plot(epochs, history["val_loss"], "r--s", label="Val Loss")
            ax1.set_xlabel("Epoch")
            ax1.set_ylabel("Loss")
            ax1.set_title("Training & Validation Loss")
            ax1.legend()
            ax1.grid(True, alpha=0.3)

            # Accuracy plot
            ax2.plot(epochs, [a * 100 for a in history["train_acc"]], "b-o", label="Train Acc")
            ax2.plot(epochs, [a * 100 for a in history["val_acc"]], "r--s", label="Val Acc")
            ax2.set_xlabel("Epoch")
            ax2.set_ylabel("Accuracy (%)")
            ax2.set_title("Training & Validation Accuracy")
            ax2.legend()
            ax2.grid(True, alpha=0.3)

            plt.tight_layout()
            curve_path = os.path.join(output_dir, "training_curves.png")
            plt.savefig(curve_path, dpi=200)
            plt.close()
            print(f" Saved training curve plot: {curve_path}")

    except Exception as e:
        print(f"[Plotting Warning] Could not generate plots: {e}")


def run_evaluation(
    model_weights_path: str,
    config_path: str,
    test_manifest_path: str,
    output_dir: str
) -> Dict:
    """
    Evaluates the trained model on test data and computes full metrics suite.
    """
    if not os.path.exists(model_weights_path):
        raise FileNotFoundError(f"Model weights not found at: {model_weights_path}")
    if not os.path.exists(config_path):
        raise FileNotFoundError(f"Config file not found at: {config_path}")
    if not os.path.exists(test_manifest_path):
        raise FileNotFoundError(f"Test manifest not found at: {test_manifest_path}")

    with open(config_path, "r") as f:
        config = json.load(f)

    with open(test_manifest_path, "r") as f:
        manifest = json.load(f)

    test_samples = manifest["test_samples"]
    class_names = config["classes"]
    num_classes = len(class_names)

    if not test_samples:
        raise ValueError("Test set is empty. Cannot perform evaluation.")

    device = get_device()
    print("=" * 70)
    print(" Smart City MobileNetV3 Test Set Evaluation")
    print(f" Target Device: {device}")
    print(f" Model Weights: {model_weights_path}")
    print(f" Test Samples: {len(test_samples)} across {num_classes} categories")
    print("=" * 70)

    # Reconstruct model and load weights
    model = build_mobilenet_v3_small(num_classes=num_classes, pretrained=False)
    state_dict = torch.load(model_weights_path, map_location=device)
    model.load_state_dict(state_dict)
    model = model.to(device)
    model.eval()

    # Create test DataLoader
    test_dataset = CivicComplaintDataset(test_samples, transform=get_inference_transforms())
    test_loader = torch.utils.data.DataLoader(
        test_dataset, batch_size=16, shuffle=False, num_workers=0
    )

    y_true = []
    y_pred = []
    y_probs = []

    softmax = nn.Softmax(dim=1)

    with torch.no_grad():
        for images, targets in test_loader:
            images = images.to(device)
            outputs = model(images)
            probs = softmax(outputs)

            _, preds = torch.max(outputs, 1)

            y_true.extend(targets.cpu().numpy().tolist())
            y_pred.extend(preds.cpu().numpy().tolist())
            y_probs.extend(probs.cpu().numpy().tolist())

    y_true = np.array(y_true)
    y_pred = np.array(y_pred)

    # 1. Overall Accuracy
    acc = float(accuracy_score(y_true, y_pred))

    # 2. Macro Metrics
    p_macro, r_macro, f1_macro, _ = precision_recall_fscore_support(
        y_true, y_pred, average="macro", zero_division=0
    )

    # 3. Weighted Metrics
    p_weight, r_weight, f1_weight, _ = precision_recall_fscore_support(
        y_true, y_pred, average="weighted", zero_division=0
    )

    # 4. Per-Class Metrics
    p_per, r_per, f1_per, support = precision_recall_fscore_support(
        y_true, y_pred, average=None, labels=list(range(num_classes)), zero_division=0
    )

    per_class_metrics = {}
    for idx, cname in enumerate(class_names):
        per_class_metrics[cname] = {
            "precision": round(float(p_per[idx]), 4),
            "recall": round(float(r_per[idx]), 4),
            "f1_score": round(float(f1_per[idx]), 4),
            "support": int(support[idx])
        }

    # 5. Confusion Matrix
    cm = confusion_matrix(y_true, y_pred, labels=list(range(num_classes)))

    # Display results
    print("\n" + "=" * 70)
    print(f" Test Accuracy:       {acc * 100:.2f}%")
    print(f" Macro Precision:     {p_macro * 100:.2f}%")
    print(f" Macro Recall:        {r_macro * 100:.2f}%")
    print(f" Macro F1-Score:      {f1_macro * 100:.2f}%")
    print("-" * 70)
    print(" Per-Class Breakdown:")
    for cname, vals in per_class_metrics.items():
        print(f"   {cname:<24} P: {vals['precision']*100:>5.1f}% | R: {vals['recall']*100:>5.1f}% | "
              f"F1: {vals['f1_score']*100:>5.1f}% (N={vals['support']})")
    print("-" * 70)
    print(" Confusion Matrix (Rows: True, Cols: Predicted):")
    print(format_confusion_matrix(cm, class_names))
    print("=" * 70)

    # Compile report dictionary
    report = {
        "model_name": config.get("model_name", "MobileNetV3-Small-Civic"),
        "architecture": config.get("architecture", "mobilenet_v3_small"),
        "test_samples_count": len(test_samples),
        "overall_accuracy": round(acc, 4),
        "macro_metrics": {
            "precision": round(float(p_macro), 4),
            "recall": round(float(r_macro), 4),
            "f1_score": round(float(f1_macro), 4)
        },
        "weighted_metrics": {
            "precision": round(float(p_weight), 4),
            "recall": round(float(r_weight), 4),
            "f1_score": round(float(f1_weight), 4)
        },
        "per_class_metrics": per_class_metrics,
        "confusion_matrix": cm.tolist(),
        "classes": class_names
    }

    report_path = os.path.join(output_dir, "test_evaluation_report.json")
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)
    print(f"\n Full evaluation report saved to: {report_path}")

    # Plot graphs if matplotlib is available
    history_file = os.path.join(os.path.dirname(config_path), "training_history.json")
    plot_and_save_visualizations(cm, class_names, history_file, output_dir)

    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate fine-tuned MobileNetV3 on test partition")
    parser.add_argument("--weights", type=str, default=os.path.join(os.path.dirname(__file__), "..", "models", "best_model.pth"))
    parser.add_argument("--config", type=str, default=os.path.join(os.path.dirname(__file__), "..", "models", "model_config.json"))
    parser.add_argument("--manifest", type=str, default=os.path.join(os.path.dirname(__file__), "..", "models", "test_manifest.json"))
    parser.add_argument("--output-dir", type=str, default=os.path.join(os.path.dirname(__file__), "..", "models"))

    args = parser.parse_args()
    run_evaluation(
        model_weights_path=os.path.abspath(args.weights),
        config_path=os.path.abspath(args.config),
        test_manifest_path=os.path.abspath(args.manifest),
        output_dir=os.path.abspath(args.output_dir)
    )
