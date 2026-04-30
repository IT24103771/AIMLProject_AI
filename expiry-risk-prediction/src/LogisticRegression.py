# ============================================================
#  MODEL 1 — LOGISTIC REGRESSION (FULL REPORT VERSION)
#  Project : Smart Inventory Management — Expiry Risk Prediction
# ============================================================

import pandas as pd
import numpy as np
import os
import json
import joblib

from sklearn.model_selection import train_test_split, StratifiedKFold, cross_validate
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

from sklearn.metrics import (
    accuracy_score, precision_score, recall_score,
    f1_score, roc_auc_score, confusion_matrix
)

# ============================================================
# 1. MODEL SUITABILITY (LECTURER REQUIREMENT)
# ============================================================
"""
MODEL SUITABILITY:

Logistic Regression is suitable for this dataset because:
- It is a supervised classification problem (Expiry Risk: 0 or 1)
- Works well with linearly separable or moderately complex data
- Produces interpretable coefficients (important for business decisions)
- Outputs probability scores (useful for risk prediction systems)
- Serves as a strong baseline model before advanced models like Random Forest
"""


# ============================================================
# PATHS
# ============================================================

BASE_DIR = os.path.join(os.path.dirname(__file__), '..')
OUTPUTS_DIR = os.path.join(BASE_DIR, 'outputs')

DATA_PATH = os.path.join(OUTPUTS_DIR, 'feature_dataset.csv')
META_PATH = os.path.join(OUTPUTS_DIR, 'feature_list.json')

print("=" * 70)
print("MODEL 1 — LOGISTIC REGRESSION (FULL VERSION)")
print("=" * 70)


# ============================================================
# 2. LOAD DATA
# ============================================================

df = pd.read_csv(DATA_PATH)

with open(META_PATH, 'r') as f:
    meta = json.load(f)

FEATURES = meta['features']
TARGET = meta['target']

X = df[FEATURES]
y = df[TARGET]

print(f"Dataset: {X.shape[0]} rows × {X.shape[1]} features")


# ============================================================
# 3. TRAIN-TEST SPLIT (VALIDATION METHOD)
# ============================================================

X_train, X_test, y_train, y_test = train_test_split(
    X, y,
    test_size=0.2,
    random_state=42,
    stratify=y
)

print("\nValidation Method: Train-Test Split (80/20 Stratified)")


# ============================================================
# 4. MODEL PIPELINE
# ============================================================

log_reg = Pipeline([
    ("scaler", StandardScaler()),
    ("model", LogisticRegression(
        max_iter=1000,
        class_weight="balanced",
        solver="lbfgs"
    ))
])


# ============================================================
# 5. CROSS-VALIDATION (K-FOLD)
# ============================================================

cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

cv_results = cross_validate(
    log_reg,
    X,
    y,
    cv=cv,
    scoring=["accuracy", "precision", "recall", "f1", "roc_auc"]
)

print("\n5-Fold Cross Validation Results:")
print(f"Accuracy : {cv_results['test_accuracy'].mean():.4f}")
print(f"Precision: {cv_results['test_precision'].mean():.4f}")
print(f"Recall   : {cv_results['test_recall'].mean():.4f}")
print(f"F1 Score : {cv_results['test_f1'].mean():.4f}")
print(f"AUC      : {cv_results['test_roc_auc'].mean():.4f}")


# ============================================================
# 6. TRAIN MODEL
# ============================================================

log_reg.fit(X_train, y_train)


# ============================================================
# 7. PREDICTIONS
# ============================================================

y_pred = log_reg.predict(X_test)
y_prob = log_reg.predict_proba(X_test)[:, 1]


# ============================================================
# 8. EVALUATION METRICS (REQUIRED BY LECTURER)
# ============================================================

accuracy  = accuracy_score(y_test, y_pred)
precision = precision_score(y_test, y_pred)
recall    = recall_score(y_test, y_pred)
f1        = f1_score(y_test, y_pred)
auc       = roc_auc_score(y_test, y_prob)
cm        = confusion_matrix(y_test, y_pred)

print("\n================ FINAL TEST METRICS ================")
print(f"Accuracy  : {accuracy:.4f}")
print(f"Precision : {precision:.4f}")
print(f"Recall    : {recall:.4f}")
print(f"F1 Score  : {f1:.4f}")
print(f"AUC Score : {auc:.4f}")

print("\nConfusion Matrix:")
print(cm)


# ============================================================
# 9. MODEL INTERPRETATION (WHY IT WORKS)
# ============================================================
"""
OBSERVATIONS:

- High recall means model correctly detects most high-risk expiry items
- Precision shows how many predicted risks are actually correct
- AUC shows probability ranking quality
- Logistic Regression is stable but may underperform non-linear models
"""


# ============================================================
# 10. SAVE MODEL
# ============================================================

MODEL_PATH = os.path.join(OUTPUTS_DIR, "logistic_regression_model.pkl")
joblib.dump(log_reg, MODEL_PATH)

print("\nModel saved at:", MODEL_PATH)


# ============================================================
# 11. FINAL CONCLUSION (LECTURER REQUIREMENT)
# ============================================================
"""
FINAL CONCLUSION:

- Logistic Regression is used as a baseline model
- It provides interpretable and stable predictions
- However, it assumes linear relationships between features
- Performance will be compared with Random Forest in Step 3
- Final model selection will be based on F1-score and AUC
"""

print("\nMODEL 1 TRAINING COMPLETE ✔")