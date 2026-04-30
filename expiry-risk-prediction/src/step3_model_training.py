# ============================================================
#  STEP 3 — Model Selection & Training
#  Project : Smart Inventory Management — Expiry Risk Prediction
#  Author  : (your name)
#
#  ML Objective : Predict whether a product batch will expire
#                 before being fully sold (expire_before_sold)
#
#  Models       : 1) Logistic Regression  — baseline
#                 2) Random Forest        — primary model
#
#  INPUT  : outputs/feature_dataset.csv
#           outputs/feature_list.json
#  OUTPUT : outputs/logistic_regression_model.pkl
#           outputs/random_forest_model.pkl
#           outputs/X_train.csv / X_test.csv
#           outputs/y_train.csv / y_test.csv
#           outputs/feature_importance.png
#           outputs/cv_accuracy_comparison.png
#           outputs/logistic_regression_coefficients.png
#           outputs/random_forest_feature_importance.png
#           outputs/random_forest_tuning_results.png
# ============================================================

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import json, os, warnings, joblib
warnings.filterwarnings('ignore')

from sklearn.model_selection import (train_test_split, RandomizedSearchCV,
                                     cross_val_score, StratifiedKFold)
from sklearn.linear_model      import LogisticRegression
from sklearn.ensemble          import RandomForestClassifier
from sklearn.preprocessing     import StandardScaler
from sklearn.pipeline          import Pipeline

# ── Paths ────────────────────────────────────────────────────
BASE_DIR    = os.path.join(os.path.dirname(__file__), '..')
OUTPUTS_DIR = os.path.join(BASE_DIR, 'outputs')
MODELS_DIR  = os.path.join(BASE_DIR, 'models')
os.makedirs(OUTPUTS_DIR, exist_ok=True)
os.makedirs(MODELS_DIR,  exist_ok=True)

FEATURE_CSV  = os.path.join(OUTPUTS_DIR, 'feature_dataset.csv')
FEATURE_JSON = os.path.join(OUTPUTS_DIR, 'feature_list.json')

print("=" * 60)
print("  STEP 3 — Model Selection & Training")
print("=" * 60)


# ============================================================
# 3.0  LOAD FEATURES & DATA
# ============================================================
print("\n[1/6] Loading feature dataset and feature list ...")

with open(FEATURE_JSON) as f:
    meta = json.load(f)

FEATURES = meta['features']
TARGET   = meta['target']

print(f"  Features loaded  : {FEATURES}")
print(f"  Target           : {TARGET}")

df = pd.read_csv(FEATURE_CSV)
print(f"  Dataset shape    : {df.shape[0]:,} rows × {df.shape[1]} columns")

# Downcast dtypes — reduces memory during CV and grid search
X = df[FEATURES].copy()
float_cols = X.select_dtypes(include=['float64', 'float32']).columns
int_cols   = X.select_dtypes(include=['int64', 'int32', 'int16', 'int8', 'uint8']).columns
X[float_cols] = X[float_cols].astype(np.float32)
X[int_cols]   = X[int_cols].astype(np.int32)
y = df[TARGET].astype(np.int8)
del df

# CPU config — Windows-safe settings
CPU_COUNT        = os.cpu_count() or 4
RF_N_JOBS        = max(1, min(4, CPU_COUNT - 1))
GRID_SEARCH_JOBS = 1
print(f"\n  CPU cores detected        : {CPU_COUNT}")
print(f"  Random Forest workers     : {RF_N_JOBS}")
print(f"  Grid search workers       : {GRID_SEARCH_JOBS}  (Windows-safe)")


# ============================================================
# 3.1  TRAIN / TEST SPLIT  (80% / 20%)
# ============================================================
print("\n[2/6] Train / Test Split (80% / 20%) ...")

X_train, X_test, y_train, y_test = train_test_split(
    X, y,
    test_size    = 0.2,
    random_state = 42,
    stratify     = y        # keeps class balance in both splits
)

print(f"  Training set   : {X_train.shape[0]:,} rows")
print(f"  Test set       : {X_test.shape[0]:,} rows")
print(f"\n  Train target distribution:")
print(y_train.value_counts(normalize=True).round(3).to_string())
print(f"\n  Test target distribution:")
print(y_test.value_counts(normalize=True).round(3).to_string())

# Cross-validation strategy — used for both models
cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)


# ============================================================
# 3.2  MODEL 1 — LOGISTIC REGRESSION (Baseline)
# ============================================================
# - Outputs a probability score (0–1), not just a fixed label
# - Easy to interpret via feature coefficients
# - Strong baseline to compare against Random Forest
# ============================================================
print("\n[3/6] Training Model 1 — Logistic Regression ...")

lr_pipeline = Pipeline([
    ('scaler', StandardScaler()),
    ('clf',    LogisticRegression(
                   max_iter     = 1000,
                   random_state = 42,
                   class_weight = 'balanced'   # handles class imbalance
               ))
])

lr_pipeline.fit(X_train, y_train)

lr_train_acc = lr_pipeline.score(X_train, y_train)
lr_test_acc  = lr_pipeline.score(X_test,  y_test)
lr_cv        = cross_val_score(lr_pipeline, X, y, cv=cv, scoring='roc_auc')

print(f"  ✅ Logistic Regression trained")
print(f"     Train accuracy         : {lr_train_acc:.4f}")
print(f"     Test  accuracy         : {lr_test_acc:.4f}")
print(f"     5-fold CV ROC-AUC      : {lr_cv.mean():.4f} (+/- {lr_cv.std():.4f})")


# ============================================================
# 3.3  MODEL 2 — RANDOM FOREST (Primary)
# ============================================================
# - Ensemble of decision trees
# - Learns non-linear relationships and feature interactions
# - Provides feature importance scores
# ============================================================
print("\n[4/6] Training Model 2 — Random Forest ...")

# ✅ Fixed — constrained trees prevent overfitting
rf_pipeline = Pipeline([
    ('clf', RandomForestClassifier(
                random_state       = 42,
                n_jobs             = RF_N_JOBS,
                class_weight       = 'balanced_subsample',
                max_depth          = 15,    # limits how deep each tree grows
                min_samples_leaf   = 4,     # each leaf needs at least 4 samples
                min_samples_split  = 10,    # needs 10 samples to split a node
                max_features       = 'sqrt' # each tree sees sqrt(n_features)
            ))
])
rf_pipeline.fit(X_train, y_train)

rf_train_acc = rf_pipeline.score(X_train, y_train)
rf_test_acc  = rf_pipeline.score(X_test,  y_test)
rf_cv        = cross_val_score(rf_pipeline, X, y, cv=cv, scoring='roc_auc')

print(f"  ✅ Random Forest trained")
print(f"     Train accuracy         : {rf_train_acc:.4f}")
print(f"     Test  accuracy         : {rf_test_acc:.4f}")
print(f"     5-fold CV ROC-AUC      : {rf_cv.mean():.4f} (+/- {rf_cv.std():.4f})")


# ============================================================
# 3.4  HYPERPARAMETER TUNING — Random Forest
# ============================================================
# RandomizedSearchCV samples a subset of combinations instead
# of testing every possibility — faster, less memory, same quality
# ============================================================
print("\n[5/6] Hyperparameter Tuning — RandomizedSearchCV ...")
print("  This may take a few minutes on 100k rows ...")

# ✅ Updated param_grid
param_grid = {
    'clf__n_estimators'     : [100, 200, 300],
    'clf__max_depth'        : [8, 10, 15, 20],      # no None — prevents full depth
    'clf__min_samples_split': [5, 10, 15],
    'clf__min_samples_leaf' : [2, 4, 6]
}

grid_search = RandomizedSearchCV(
    estimator          = rf_pipeline,
    param_distributions = param_grid,
    n_iter             = 12,
    cv                 = cv,
    scoring            = 'roc_auc',
    n_jobs             = GRID_SEARCH_JOBS,
    pre_dispatch       = GRID_SEARCH_JOBS,
    random_state       = 42,
    error_score        = 'raise',
    verbose            = 1
)

grid_search.fit(X_train, y_train)

best_model = grid_search.best_estimator_

print(f"\n  ✅ Tuning complete")
print(f"     Configurations sampled : {grid_search.n_iter}")
print(f"     Best params            : {grid_search.best_params_}")
print(f"     Best CV ROC-AUC        : {grid_search.best_score_:.4f}")
print(f"     Best model train acc   : {best_model.score(X_train, y_train):.4f}")
print(f"     Best model test  acc   : {best_model.score(X_test,  y_test):.4f}")

# Feature importance from the best Random Forest
rf_clf      = best_model.named_steps['clf']
importances = rf_clf.feature_importances_
feat_imp    = pd.Series(importances, index=FEATURES).sort_values(ascending=False)

print(f"\n  Top 10 most important features:")
print(feat_imp.head(10).round(4).to_string())


# ============================================================
# 3.5  VISUALISATIONS
# ============================================================
print("\n[6/6] Generating charts ...")

# ── Chart 1: Feature Importance (basic) ──────────────────────
fig, ax = plt.subplots(figsize=(8, 6))
feat_imp.head(15).sort_values().plot(kind='barh', ax=ax, color='#007A5E')
ax.set_title('Random Forest Feature Importance', fontweight='bold')
ax.set_xlabel('Importance Score')
plt.tight_layout()
plt.savefig(os.path.join(OUTPUTS_DIR, 'feature_importance.png'), dpi=120, bbox_inches='tight')
plt.show()

# ── Chart 2: CV Accuracy Comparison ──────────────────────────
cv_accuracy_scores = {
    'Logistic Regression'  : cross_val_score(lr_pipeline, X, y, cv=cv, scoring='accuracy'),
    'Random Forest (Tuned)': cross_val_score(best_model,  X, y, cv=cv, scoring='accuracy')
}

cv_accuracy_df = pd.DataFrame({
    'Model'           : list(cv_accuracy_scores.keys()),
    'Mean_CV_Accuracy': [s.mean() for s in cv_accuracy_scores.values()],
    'Std_CV_Accuracy' : [s.std()  for s in cv_accuracy_scores.values()]
}).round(4)

print("\n  === Cross-Validation Accuracy Comparison ===")
print(cv_accuracy_df.to_string(index=False))

fig, ax = plt.subplots(figsize=(7, 4))
ax.bar(cv_accuracy_df['Model'],
       cv_accuracy_df['Mean_CV_Accuracy'],
       yerr=cv_accuracy_df['Std_CV_Accuracy'],
       color=['#4A90D9', '#007A5E'], capsize=6)
ax.set_ylim(0.7, 1.0)
ax.set_ylabel('Mean CV Accuracy')
ax.set_title('Cross-Validation Accuracy Comparison of Models', fontweight='bold')
for idx, row in cv_accuracy_df.iterrows():
    ax.text(idx, row['Mean_CV_Accuracy'] + 0.005,
            f"{row['Mean_CV_Accuracy']:.4f}", ha='center', fontsize=10)
plt.tight_layout()
plt.savefig(os.path.join(OUTPUTS_DIR, 'cv_accuracy_comparison.png'), dpi=120, bbox_inches='tight')
plt.show()
cv_accuracy_df.to_csv(os.path.join(OUTPUTS_DIR, 'cv_accuracy_comparison.csv'), index=False)

# ── Chart 3: Logistic Regression Coefficients ────────────────
lr_coef = pd.Series(
    lr_pipeline.named_steps['clf'].coef_[0],
    index=FEATURES
).sort_values(key=np.abs, ascending=False)

print("\n  === Top Logistic Regression Coefficients ===")
print(lr_coef.head(10).round(4).to_string())
lr_coef.rename('coefficient').to_csv(
    os.path.join(OUTPUTS_DIR, 'logistic_regression_coefficients.csv')
)

top_lr_coef = lr_coef.head(15).sort_values()
lr_colors   = ['#E53E3E' if v < 0 else '#007A5E' for v in top_lr_coef]

fig, ax = plt.subplots(figsize=(8, 6))
top_lr_coef.plot(kind='barh', ax=ax, color=lr_colors)
ax.set_title('Logistic Regression Feature Coefficients', fontweight='bold')
ax.set_xlabel('Coefficient (scaled feature space)')
ax.axvline(0, color='black', linewidth=0.8)
plt.tight_layout()
plt.savefig(os.path.join(OUTPUTS_DIR, 'logistic_regression_coefficients.png'), dpi=120, bbox_inches='tight')
plt.show()

# ── Chart 4: RF Feature Importance (detailed) ────────────────
rf_feature_importance = pd.Series(
    best_model.named_steps['clf'].feature_importances_,
    index=FEATURES
).sort_values(ascending=False)

print("\n  === Top Random Forest Feature Importance Values ===")
print(rf_feature_importance.head(10).round(4).to_string())
rf_feature_importance.rename('importance').to_csv(
    os.path.join(OUTPUTS_DIR, 'random_forest_feature_importance.csv')
)

top_rf_importance = rf_feature_importance.head(15).sort_values()
fig, ax = plt.subplots(figsize=(8, 6))
top_rf_importance.plot(kind='barh', ax=ax, color='#007A5E')
ax.set_title('Random Forest Feature Importance', fontweight='bold')
ax.set_xlabel('Importance Score')
plt.tight_layout()
plt.savefig(os.path.join(OUTPUTS_DIR, 'random_forest_feature_importance.png'), dpi=120, bbox_inches='tight')
plt.show()

# ── Chart 5: Hyperparameter Tuning Results ───────────────────
grid_results = pd.DataFrame(grid_search.cv_results_).sort_values(
    'mean_test_score', ascending=False
).copy()

grid_results['Configuration'] = (
    'n='     + grid_results['param_clf__n_estimators'].astype(str)
    + ' | depth=' + grid_results['param_clf__max_depth'].astype(str)
    + ' | split=' + grid_results['param_clf__min_samples_split'].astype(str)
    + ' | leaf='  + grid_results['param_clf__min_samples_leaf'].astype(str)
)

tuning_export = grid_results[[
    'Configuration', 'mean_test_score', 'std_test_score', 'rank_test_score',
    'param_clf__n_estimators', 'param_clf__max_depth',
    'param_clf__min_samples_split', 'param_clf__min_samples_leaf'
]].rename(columns={
    'mean_test_score'              : 'Mean_CV_ROC_AUC',
    'std_test_score'               : 'Std_CV_ROC_AUC',
    'rank_test_score'              : 'Rank',
    'param_clf__n_estimators'      : 'n_estimators',
    'param_clf__max_depth'         : 'max_depth',
    'param_clf__min_samples_split' : 'min_samples_split',
    'param_clf__min_samples_leaf'  : 'min_samples_leaf'
})
tuning_export['Mean_CV_ROC_AUC'] = tuning_export['Mean_CV_ROC_AUC'].round(4)
tuning_export['Std_CV_ROC_AUC']  = tuning_export['Std_CV_ROC_AUC'].round(4)
tuning_export.to_csv(os.path.join(OUTPUTS_DIR, 'random_forest_tuning_results.csv'), index=False)

print("\n  === Best Random Forest Tuning Results ===")
print(tuning_export.head(10).to_string(index=False))

top_tuning = tuning_export.head(10).iloc[::-1]
fig, ax = plt.subplots(figsize=(11, 6))
ax.barh(top_tuning['Configuration'], top_tuning['Mean_CV_ROC_AUC'], color='#007A5E')
ax.set_xlabel('Mean CV ROC-AUC')
ax.set_title('Random Forest Hyperparameter Tuning Results', fontweight='bold')
ax.tick_params(axis='y', labelsize=8)
for idx, score in enumerate(top_tuning['Mean_CV_ROC_AUC']):
    ax.text(score + 0.0005, idx, f"{score:.4f}", va='center', fontsize=8)
plt.tight_layout()
plt.savefig(os.path.join(OUTPUTS_DIR, 'random_forest_tuning_results.png'), dpi=120, bbox_inches='tight')
plt.show()


# ============================================================
# 3.6  SAVE MODELS & DATA SPLITS
# ============================================================
print("\n── Saving models and data splits ──")

# Save to both outputs/ (for Step 4) and models/ (your models folder)
joblib.dump(lr_pipeline, os.path.join(OUTPUTS_DIR, 'logistic_regression_model.pkl'))
joblib.dump(best_model,  os.path.join(OUTPUTS_DIR, 'random_forest_model.pkl'))
joblib.dump(lr_pipeline, os.path.join(MODELS_DIR,  'logistic_regression_model.pkl'))
joblib.dump(best_model,  os.path.join(MODELS_DIR,  'random_forest_model.pkl'))

X_train.to_csv(os.path.join(OUTPUTS_DIR, 'X_train.csv'), index=False)
X_test.to_csv( os.path.join(OUTPUTS_DIR, 'X_test.csv'),  index=False)
y_train.to_csv(os.path.join(OUTPUTS_DIR, 'y_train.csv'), index=False)
y_test.to_csv( os.path.join(OUTPUTS_DIR, 'y_test.csv'),  index=False)

print("  ✅ logistic_regression_model.pkl")
print("  ✅ random_forest_model.pkl")
print("  ✅ X_train.csv / X_test.csv / y_train.csv / y_test.csv")


# ============================================================
# SUMMARY
# ============================================================
print("\n" + "=" * 60)
print("  STEP 3 COMPLETE — Summary")
print("=" * 60)
print(f"\n  {'Model':<30} {'Train Acc':>10} {'Test Acc':>10} {'CV ROC-AUC':>12}")
print(f"  {'-'*30} {'-'*10} {'-'*10} {'-'*12}")
print(f"  {'Logistic Regression':<30} {lr_train_acc:>10.4f} {lr_test_acc:>10.4f} {lr_cv.mean():>12.4f}")
print(f"  {'Random Forest (Tuned)':<30} {best_model.score(X_train,y_train):>10.4f} {best_model.score(X_test,y_test):>10.4f} {grid_search.best_score_:>12.4f}")
print(f"\n  Best params : {grid_search.best_params_}")
print(f"\n  Files saved:")
print(f"    📦 models/logistic_regression_model.pkl")
print(f"    📦 models/random_forest_model.pkl")
print(f"    📊 outputs/cv_accuracy_comparison.png")
print(f"    📊 outputs/logistic_regression_coefficients.png")
print(f"    📊 outputs/random_forest_feature_importance.png")
print(f"    📊 outputs/random_forest_tuning_results.png")
print(f"\n  ➡️  Ready for Step 4: Model Evaluation")
print("=" * 60)