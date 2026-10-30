# SmartCity MobileNetV3 Civic Image Classifier: Complete Training & Evaluation Guide

This guide details the transfer learning, evaluation, and deployment workflow for the **SmartCity Civic Image Classification Engine** using **PyTorch** and **MobileNetV3 Small**.

---

## 1. Architecture Overview

- **Backbone**: `torchvision.models.mobilenet_v3_small` initialized with official ImageNet weights (`MobileNet_V3_Small_Weights.DEFAULT`).
- **Classification Head**: Custom linear layer (`nn.Linear(in_features=1024, out_features=num_classes)`) with `p=0.2` dropout.
- **Two-Phase Transfer Learning**:
  - **Phase 1 (Warmup)**: Backbone feature extractor is frozen. Only the new classification head is trained with `AdamW` (`lr=1e-3`) and `CosineAnnealingLR`.
  - **Phase 2 (Fine-Tuning)**: The deepest 3 convolutional blocks are unfrozen and fine-tuned with a lower learning rate (`lr=1e-4` on head, `lr=2e-5` on backbone).
- **Target Civic Categories**:
  1. `Waste Management` (Garbage dumps, overflowing bins, uncollected waste)
  2. `Roads` (Potholes, damaged road surface, broken footpaths)
  3. `Drainage` (Blocked gutters, sewage overflow, waterlogging)
  4. `Water Supply` (Pipeline leaks, burst water mains, tap/supply failures)
  5. `Other` (General issues, damaged benches, fallen signage)

---

## 2. Recommended Public Civic Datasets & Licenses

| Category | Recommended Dataset | License | Direct Source / Link |
| :--- | :--- | :--- | :--- |
| **Waste Management** | Kaggle Garbage Classification Dataset | CC-BY-SA 4.0 / Open | [Kaggle Garbage Classification](https://www.kaggle.com/datasets/asdasdasasdas/garbage-classification) |
| **Roads** | Roboflow Pothole & Road Damage Dataset | CC-BY 4.0 | [Roboflow Pothole Detection](https://universe.roboflow.com/pothole-detection/pothole-detection-system) |
| **Drainage / Water** | Urban Waterlogging & Drain Dataset | CC-BY 4.0 | [Mendeley Urban Waterlogging](https://data.mendeley.com/datasets/pwbvx94r96/1) |
| **Multi-class Civic** | Open Cities AI Urban Dataset | CDLA-Permissive | [Open Cities Dataset](https://opencitiesai.org) |

> **Dataset Limitation Note**: Public datasets often have high coverage for potholes and garbage, but lower coverage for underground water pipe bursts. When training with real images, if a specific category has fewer samples, `train.py` automatically applies inverse class-frequency weighting to prevent majority-class bias.

---

## 3. Dataset Directory Structure

Organize images into category subfolders inside `ai/data/`:

```text
ai/data/
├── Waste Management/
│   ├── garbage_001.jpg
│   └── bin_002.jpg
├── Roads/
│   ├── pothole_001.jpg
│   └── asphalt_002.jpg
├── Drainage/
│   ├── drain_overflow_001.jpg
│   └── waterlogged_002.jpg
├── Water Supply/
│   ├── pipe_leak_001.jpg
│   └── pipeline_002.jpg
└── Other/
    ├── park_bench_001.jpg
    └── sign_002.jpg
```

---

## 4. Local Quickstart (Training & Verification)

### Step 1: Install Dependencies
From `ai/` directory:
```bash
# If using virtual environment (recommended):
.\.venv\Scripts\pip install -r training/requirements.txt
```

### Step 2: Initialize Diagnostic Benchmark Data (Optional)
To verify the entire pipeline locally without waiting for multi-gigabyte downloads:
```bash
python training/prepare_sample_data.py --samples-per-class 16
```

### Step 3: Run Training
```bash
python training/train.py --data-dir ../data --output-dir ../models --epochs-phase1 5 --epochs-phase2 3 --batch-size 16
```
This produces:
- `ai/models/best_model.pth`: PyTorch `state_dict` of best validation checkpoint.
- `ai/models/model_config.json`: Architecture, class mapping, and normalization metadata.
- `ai/models/training_history.json`: Loss and accuracy curves.
- `ai/models/test_manifest.json`: Manifest of untouched test partition.

### Step 4: Run Test Evaluation
```bash
python training/evaluate.py --output-dir ../models
```
Computes and reports:
- Test Accuracy
- Macro Precision, Macro Recall, Macro F1-score
- Per-class Breakdown
- Confusion Matrix table and `ai/models/confusion_matrix.png`
- Saves `ai/models/test_evaluation_report.json`

### Step 5: Test Standalone Prediction
```bash
python training/predict.py --image path/to/test_image.jpg --topk 3
```

---

## 5. Google Colab GPU Workflow (Recommended for High Accuracy)

Training on Google Colab provides free NVIDIA T4 GPU acceleration:

1. Open [Google Colab](https://colab.research.google.com).
2. Click **File -> Upload Notebook** and select `ai/training/SmartCity_MobileNetV3_Training.ipynb`.
3. In the Colab menu, choose **Runtime -> Change runtime type -> T4 GPU**.
4. Run Cell 1 to verify CUDA is active.
5. Upload your categorized image dataset (`data.zip`) into Colab and unzip it.
6. Run the training cells. Training completes in approximately **2–4 minutes** on GPU.
7. Cell 9 automatically downloads `best_model.pth` and `model_config.json`.
8. Place both files directly into your local `smart-city/ai/models/` folder.

---

## 6. Render Free-Tier CPU Inference Optimization

Render Free Tier provides **512 MB RAM** and shared CPU. MobileNetV3 Small is designed for this constraint:
- **Model Size**: ~9.5 MB `state_dict` file.
- **Runtime RAM**: ~120 MB total memory (well below the 512 MB threshold).
- **Inference Latency**: ~30–50 ms per image on CPU.
- **Safety Principles**:
  - Model weights are loaded **once** at service startup (`ai/classifier.py`).
  - Predictions run in `torch.inference_mode()` with `model.eval()`.
  - Single-image batching (`[1, 3, 224, 224]`) avoids excessive tensor allocations.
  - Image files are processed from memory or cleaned up immediately after inference.

---

## 7. Troubleshooting Guide

| Issue | Root Cause | Solution |
| :--- | :--- | :--- |
| `FileNotFoundError: best_model.pth` | Weights not yet placed in `ai/models/` | Run local training or download Colab artifacts into `ai/models/`. The microservice automatically falls back to keyword analysis until weights exist. |
| `UnidentifiedImageError` / Corrupt upload | User uploaded invalid file | `load_and_validate_image` in `dataset.py` and `classifier.py` checks file header and converts any format to 3-channel RGB. |
| Memory error on Render | Too many worker threads or memory leak | Ensure Gunicorn / Flask uses 1 worker thread (`--workers 1 --threads 2`). Never train inside Render. |
| Low accuracy on single class | Class sample imbalance | `train.py` computes class weights automatically. Ensure at least 20–30 real images per category for reliable generalization. |
