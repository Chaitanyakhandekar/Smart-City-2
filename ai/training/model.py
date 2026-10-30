"""
MobileNetV3 Small Model Architecture for SmartCity Civic Image Classification.
Implements transfer learning initialization from official ImageNet weights,
custom civic complaint classification head, and multi-phase fine-tuning utilities.
"""

from typing import Optional, Tuple
import torch
import torch.nn as nn
from torchvision.models import mobilenet_v3_small, MobileNet_V3_Small_Weights


def get_device() -> torch.device:
    """
    Automatically selects CUDA GPU if available, otherwise falls back to CPU.
    """
    if torch.cuda.is_available():
        return torch.device("cuda")
    return torch.device("cpu")


def build_mobilenet_v3_small(
    num_classes: int,
    pretrained: bool = True,
    dropout: float = 0.2
) -> nn.Module:
    """
    Builds a MobileNetV3 Small network adapted for civic complaint classification.
    
    Args:
        num_classes: Number of target civic categories.
        pretrained: If True, initializes backbone with official ImageNet weights.
        dropout: Classifier dropout probability (default: 0.2).
        
    Returns:
        PyTorch nn.Module with replaced classification head.
    """
    weights = MobileNet_V3_Small_Weights.DEFAULT if pretrained else None
    model = mobilenet_v3_small(weights=weights)

    # In MobileNetV3 Small, classifier is:
    # (0): Linear(in_features=576, out_features=1024, bias=True)
    # (1): Hardswish()
    # (2): Dropout(p=0.2, inplace=True)
    # (3): Linear(in_features=1024, out_features=1000, bias=True)
    in_features = model.classifier[3].in_features

    # Replace dropout with configurable rate and output linear layer
    model.classifier[2] = nn.Dropout(p=dropout, inplace=True)
    model.classifier[3] = nn.Linear(in_features=in_features, out_features=num_classes)

    return model


def freeze_backbone(model: nn.Module) -> None:
    """
    Freezes all feature extraction layers (backbone), keeping only the
    final classifier head trainable. Used for Phase 1 transfer learning.
    """
    for param in model.features.parameters():
        param.requires_grad = False
    for param in model.classifier.parameters():
        param.requires_grad = True


def unfreeze_backbone(model: nn.Module, last_n_blocks: Optional[int] = None) -> None:
    """
    Unfreezes backbone layers for Phase 2 fine-tuning.
    
    Args:
        model: MobileNetV3 model instance.
        last_n_blocks: If specified, only unfreezes the last N feature blocks.
                       If None, unfreezes the entire backbone.
    """
    if last_n_blocks is None:
        for param in model.parameters():
            param.requires_grad = True
    else:
        # First freeze all features
        for param in model.features.parameters():
            param.requires_grad = False
        
        # Unfreeze the last N children of features
        children = list(model.features.children())
        for child in children[-last_n_blocks:]:
            for param in child.parameters():
                param.requires_grad = True
                
        # Always ensure classifier head is trainable
        for param in model.classifier.parameters():
            param.requires_grad = True


def get_model_parameter_stats(model: nn.Module) -> Tuple[int, int]:
    """
    Returns (total_params, trainable_params).
    """
    total = sum(p.numel() for p in model.parameters())
    trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
    return total, trainable
