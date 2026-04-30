# ============================================================
#  STEP 5 — Prediction Interpretation & Business Mapping
#  Project : Smart Inventory Management — Expiry Risk Prediction
#  Author  : (your name)
#
#  "Rules do not replace ML; they consume ML output."
#   The ML model predicts probability → business rules then
#   translate that probability into a store action.
#
#  INPUT  : outputs/random_forest_model.pkl
#           outputs/logistic_regression_model.pkl
#           outputs/X_test.csv  /  y_test.csv
#           outputs/feature_list.json
#           data/processed/merged_clean.csv   (product names)
#
#  OUTPUT : outputs/step5_prediction_table.csv
#           outputs/step5_business_action_summary.csv
#           outputs/step5_prediction_distribution.png
#           outputs/step5_feature_importance_explanation.png
#           outputs/step5_business_actions_breakdown.png
#           outputs/step5_sample_narratives.txt
# ============================================================

import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns
import json, os, joblib, warnings
warnings.filterwarnings('ignore')

from sklearn.model_selection import train_test_split

# ── Paths ────────────────────────────────────────────────────
BASE_DIR      = os.path.join(os.path.dirname(__file__), '..')
OUTPUTS_DIR   = os.path.join(BASE_DIR, 'outputs')
PROCESSED_DIR = os.path.join(BASE_DIR, 'data', 'processed')
os.makedirs(OUTPUTS_DIR, exist_ok=True)

print("=" * 60)
print("  STEP 5 — Prediction Interpretation & Business Mapping")
print("=" * 60)
print("""
  HOW THE SYSTEM WORKS (end to end):
  ─────────────────────────────────────────────────────────
  1. ML model (Random Forest) receives inventory features
  2. Returns a PROBABILITY score  e.g. 0.82
  3. Business rules CONSUME that score:
       > 0.70  →  🔴  ALERT   — Discount now + notify manager
       0.40–0.70  →  🟡  WATCH   — Flag for review, reduce reorder
       < 0.40  →  🟢  SAFE    — Continue normal operations

  KEY VIVA POINT:
  "Rules do not replace ML; they consume ML output."
  The rules only activate after ML has scored every product.
  ML provides the probability — rules decide the response.
  ─────────────────────────────────────────────────────────
""")


# ============================================================
# 1.  LOAD EVERYTHING
# ============================================================
print("[1/6] Loading models, data & feature list ...")

with open(os.path.join(OUTPUTS_DIR, 'feature_list.json')) as f:
    meta     = json.load(f)
FEATURES     = meta['features']
TARGET       = meta['target']

rf_model = joblib.load(os.path.join(OUTPUTS_DIR, 'random_forest_model.pkl'))
lr_model = joblib.load(os.path.join(OUTPUTS_DIR, 'logistic_regression_model.pkl'))

# Load feature dataset and rebuild the same test split (random_state=42 → identical)
df_feat = pd.read_csv(os.path.join(OUTPUTS_DIR, 'feature_dataset.csv'))
X       = df_feat[FEATURES].copy().astype(np.float32)
y       = df_feat[TARGET].astype(np.int8)

_, X_test, _, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)
test_indices = X_test.index.tolist()

# Load merged_clean to get product_name, category, expiration_date etc.
merged_df = pd.read_csv(
    os.path.join(PROCESSED_DIR, 'merged_clean.csv'),
    parse_dates=['transaction_date', 'expiration_date']
)

# Align merged_df to test indices
merged_test = merged_df.iloc[test_indices].reset_index(drop=True)
X_test      = X_test.reset_index(drop=True)
y_test      = y_test.reset_index(drop=True)

print(f"  ✅ RF model    loaded")
print(f"  ✅ LR model    loaded")
print(f"  ✅ Test set    : {X_test.shape[0]:,} rows")


# ============================================================
# 2.  GENERATE PREDICTIONS & PROBABILITIES
# ============================================================
print("\n[2/6] Generating predictions & probabilities ...")

# predict()       → binary label  (0 or 1)
# predict_proba() → probability score (0.0 – 1.0)
rf_pred = rf_model.predict(X_test)
rf_prob = rf_model.predict_proba(X_test)[:, 1]   # probability of class 1 (High Risk)

lr_pred = lr_model.predict(X_test)
lr_prob = lr_model.predict_proba(X_test)[:, 1]

print(f"  ✅ RF predictions  : {(rf_pred==1).sum():,} High Risk  |  {(rf_pred==0).sum():,} Low Risk")
print(f"  ✅ LR predictions  : {(lr_pred==1).sum():,} High Risk  |  {(lr_pred==0).sum():,} Low Risk")
print(f"\n  RF probability stats:")
print(f"    min  = {rf_prob.min():.3f}")
print(f"    max  = {rf_prob.max():.3f}")
print(f"    mean = {rf_prob.mean():.3f}")
print(f"    Examples: {rf_prob[:5].round(3).tolist()}")


# ============================================================
# 3.  BUSINESS ACTION MAPPING
# ============================================================
# Rules consume ML output — applied AFTER model scoring.
# ─────────────────────────────────────────────────────────────
#  RF Probability  │  Risk Tier     │  Store Action
#  ────────────────┼────────────────┼────────────────────────────
#  > 0.70          │  🔴 CRITICAL   │  Trigger discount alert
#                  │                │  Notify store manager
#                  │                │  Move product to front shelf
#  0.40 – 0.70     │  🟡 WATCH      │  Flag for daily review
#                  │                │  Reduce next reorder qty
#  < 0.40          │  🟢 SAFE       │  No action needed
#                  │                │  Continue normal operations
# ─────────────────────────────────────────────────────────────
print("\n[3/6] Applying Business Action Mapping ...")

def map_action(prob):
    if prob >= 0.70:
        return 'ALERT — Discount + Notify Manager'
    elif prob >= 0.40:
        return 'WATCH — Flag for Review'
    else:
        return 'SAFE  — No Action Needed'

def map_tier(prob):
    if prob >= 0.70:
        return '🔴 CRITICAL'
    elif prob >= 0.40:
        return '🟡 WATCH'
    else:
        return '🟢 SAFE'

def map_tier_label(prob):
    if prob >= 0.70:
        return 'CRITICAL'
    elif prob >= 0.40:
        return 'WATCH'
    else:
        return 'SAFE'


# ── Build prediction result table ────────────────────────────
result_df = pd.DataFrame({
    'product_name'      : merged_test['product_name'],
    'category'          : merged_test['category'],
    'expiration_date'   : merged_test['expiration_date'].dt.date,
    'days_to_expiry'    : X_test['days_to_expiry'].round(0).astype(int),
    'initial_stock'     : merged_test['initial_quantity'].round(0).astype(int),
    'avg_daily_sales'   : X_test['avg_daily_sales'].round(2),
    'rf_probability'    : rf_prob.round(4),
    'lr_probability'    : lr_prob.round(4),
    'rf_risk_label'     : rf_pred,               # 0 or 1 — raw model output
    'actual_label'      : y_test.values,         # ground truth
    'risk_tier'         : [map_tier_label(p) for p in rf_prob],
    'business_action'   : [map_action(p) for p in rf_prob],
})

print(f"  ✅ Business actions mapped:")
tier_counts = result_df['risk_tier'].value_counts()
for tier, count in tier_counts.items():
    pct = count / len(result_df) * 100
    print(f"     {tier:<12} : {count:>6,} products  ({pct:.1f}%)")


# ============================================================
# 4.  SAMPLE NARRATIVES  (for assignment report / viva)
# ============================================================
print("\n[4/6] Generating Sample Narratives ...")

# Pick 3 CRITICAL, 2 WATCH, 2 SAFE samples
critical_samples = result_df[result_df['risk_tier'] == 'CRITICAL'].head(3)
watch_samples    = result_df[result_df['risk_tier'] == 'WATCH'].head(2)
safe_samples     = result_df[result_df['risk_tier'] == 'SAFE'].head(2)

narratives = []
narratives.append("=" * 65)
narratives.append("STEP 5 — SAMPLE PREDICTION NARRATIVES")
narratives.append("=" * 65)
narratives.append("")
narratives.append("HOW TO READ:")
narratives.append("  The ML model outputs a probability score (0–1).")
narratives.append("  Business rules then map that score to a store action.")
narratives.append("  'Rules do not replace ML; they consume ML output.'")
narratives.append("")

for idx, row in critical_samples.iterrows():
    narratives.append(f"🔴 CRITICAL ALERT — {row['product_name']} [{row['category']}]")
    narratives.append(f"   ML Probability   : {row['rf_probability']:.2f}  "
                      f"({row['rf_probability']*100:.0f}% likely to expire before selling)")
    narratives.append(f"   Days to Expiry   : {row['days_to_expiry']} days")
    narratives.append(f"   Stock on Hand    : {row['initial_stock']} units")
    narratives.append(f"   Avg Daily Sales  : {row['avg_daily_sales']:.1f} units/day")
    days_to_sell = row['initial_stock'] / max(row['avg_daily_sales'], 0.01)
    narratives.append(f"   Days to Sell Out : {days_to_sell:.0f} days  "
                      f"(expires in {row['days_to_expiry']} days → will NOT sell out in time)")
    narratives.append(f"   Business Action  : {row['business_action']}")
    narratives.append(f"   WHY FLAGGED      : "
                      f"stock will last ~{days_to_sell:.0f} days "
                      f"but expires in {row['days_to_expiry']} days")
    narratives.append("")

for idx, row in watch_samples.iterrows():
    narratives.append(f"🟡 WATCH — {row['product_name']} [{row['category']}]")
    narratives.append(f"   ML Probability   : {row['rf_probability']:.2f}  "
                      f"(moderate expiry risk)")
    narratives.append(f"   Days to Expiry   : {row['days_to_expiry']} days")
    narratives.append(f"   Business Action  : {row['business_action']}")
    narratives.append("")

for idx, row in safe_samples.iterrows():
    narratives.append(f"🟢 SAFE — {row['product_name']} [{row['category']}]")
    narratives.append(f"   ML Probability   : {row['rf_probability']:.2f}  "
                      f"(low expiry risk)")
    narratives.append(f"   Days to Expiry   : {row['days_to_expiry']} days")
    narratives.append(f"   Business Action  : {row['business_action']}")
    narratives.append("")

narratives.append("=" * 65)
narratives.append("KEY VIVA EXPLANATION:")
narratives.append("=" * 65)
narratives.append("""
Each prediction above comes from the Random Forest model which:
  1. Takes 21 inventory features (days_to_expiry, avg_daily_sales,
     spoilage_sensitivity, handling_score, shelf_life_days, etc.)
  2. Passes them through 100 trained decision trees
  3. Each tree votes → averaged into a probability (0–1)
  4. The probability tells us HOW LIKELY this product is to expire
     before being sold — not just a yes/no binary guess

Business rules then ACT on that probability:
  > 0.70 → ALERT  → Trigger discount + notify manager
  0.40–0.70 → WATCH  → Flag for daily review
  < 0.40 → SAFE   → No action needed

This is smarter than just checking expiry dates because:
  • A product with 5 days left but high daily sales = SAFE
  • A product with 30 days left but nearly zero sales = CRITICAL
""")

narrative_text = "\n".join(narratives)
print(narrative_text)

narrative_path = os.path.join(OUTPUTS_DIR, 'step5_sample_narratives.txt')
with open(narrative_path, 'w', encoding='utf-8') as f:
    f.write(narrative_text)
print(f"\n  💾 Narratives saved → step5_sample_narratives.txt")


# ============================================================
# 5.  VISUALISATIONS
# ============================================================
print("\n[5/6] Generating Charts ...")
sns.set_style("whitegrid")
COLORS = {'CRITICAL': '#D85A30', 'WATCH': '#F0A500', 'SAFE': '#1D9E75'}


# ── Chart 1: Probability Distribution by Tier ────────────────
fig, axes = plt.subplots(1, 2, figsize=(14, 5))
fig.suptitle("Step 5 — Prediction Probability Distribution", fontsize=13, fontweight='bold')

# Left: RF probability histogram coloured by tier
ax = axes[0]
for tier, color in COLORS.items():
    subset = result_df[result_df['risk_tier'] == tier]['rf_probability']
    ax.hist(subset, bins=25, color=color, alpha=0.75,
            label=f"{tier}  (n={len(subset):,})", edgecolor='none')
ax.axvline(0.40, color='orange', linestyle='--', linewidth=1.2, label='Watch threshold (0.40)')
ax.axvline(0.70, color='red',    linestyle='--', linewidth=1.2, label='Alert threshold (0.70)')
ax.set_xlabel('RF Probability Score (0 = Safe, 1 = High Risk)', fontsize=10)
ax.set_ylabel('Number of Products', fontsize=10)
ax.set_title('RF Probability Distribution by Risk Tier', fontsize=11)
ax.legend(fontsize=9)

# Right: LR vs RF probability scatter
ax2 = axes[1]
tier_color_map = result_df['risk_tier'].map(COLORS)
ax2.scatter(lr_prob, rf_prob, c=tier_color_map, alpha=0.3, s=4)
ax2.axhline(0.70, color='red',    linestyle='--', linewidth=0.8)
ax2.axhline(0.40, color='orange', linestyle='--', linewidth=0.8)
ax2.axvline(0.70, color='red',    linestyle='--', linewidth=0.8)
ax2.axvline(0.40, color='orange', linestyle='--', linewidth=0.8)
ax2.set_xlabel('Logistic Regression Probability', fontsize=10)
ax2.set_ylabel('Random Forest Probability',       fontsize=10)
ax2.set_title('LR vs RF Probability Comparison', fontsize=11)

from matplotlib.patches import Patch
legend_patches = [Patch(color=c, label=t) for t, c in COLORS.items()]
ax2.legend(handles=legend_patches, fontsize=9)

plt.tight_layout()
plt.savefig(os.path.join(OUTPUTS_DIR, 'step5_prediction_distribution.png'),
            dpi=150, bbox_inches='tight')
plt.close()
print("  ✅ step5_prediction_distribution.png")


# ── Chart 2: Business Actions Breakdown ──────────────────────
fig, axes = plt.subplots(1, 2, figsize=(13, 5))
fig.suptitle("Step 5 — Business Action Mapping Results", fontsize=13, fontweight='bold')

# Left: Pie chart
ax = axes[0]
tier_order  = ['CRITICAL', 'WATCH', 'SAFE']
tier_vals   = [tier_counts.get(t, 0) for t in tier_order]
tier_colors = [COLORS[t] for t in tier_order]
wedges, texts, autotexts = ax.pie(
    tier_vals,
    labels     = tier_order,
    colors     = tier_colors,
    autopct    = '%1.1f%%',
    startangle = 90,
    wedgeprops = dict(edgecolor='white', linewidth=2)
)
for at in autotexts:
    at.set_fontsize(11)
    at.set_fontweight('bold')
ax.set_title('Products by Risk Tier', fontsize=11)

# Right: Action counts by category
ax2 = axes[1]
cat_tier = result_df.groupby(['category', 'risk_tier']).size().unstack(fill_value=0)
# Ensure all tier columns present
for t in tier_order:
    if t not in cat_tier.columns:
        cat_tier[t] = 0
cat_tier = cat_tier[tier_order]
cat_tier.plot(
    kind='barh', ax=ax2, stacked=True,
    color=[COLORS[t] for t in tier_order],
    edgecolor='none'
)
ax2.set_title('Risk Tier Breakdown by Category', fontsize=11)
ax2.set_xlabel('Number of Products')
ax2.set_ylabel('')
ax2.legend(title='Risk Tier', fontsize=9, loc='lower right')
ax2.tick_params(axis='y', labelsize=9)

plt.tight_layout()
plt.savefig(os.path.join(OUTPUTS_DIR, 'step5_business_actions_breakdown.png'),
            dpi=150, bbox_inches='tight')
plt.close()
print("  ✅ step5_business_actions_breakdown.png")


# ── Chart 3: Feature Importance Explanation ──────────────────
# Shows WHICH features most influenced the predictions
# This is the explainability chart for the assignment report
rf_clf      = rf_model.named_steps['clf']
importances = rf_clf.feature_importances_
feat_imp    = pd.Series(importances, index=FEATURES).sort_values()

# Colour the top 5 features distinctly
n_features  = len(feat_imp)
bar_colors  = ['#C0C0C0'] * n_features
top5_idx    = list(range(n_features - 5, n_features))
for i in top5_idx:
    bar_colors[i] = '#007A5E'

fig, ax = plt.subplots(figsize=(9, 7))
bars = ax.barh(feat_imp.index.tolist(), feat_imp.values.tolist(),
               color=bar_colors, edgecolor='none')
ax.set_title('Feature Importance — Why the Model Flags Products\n'
             '(Random Forest: which features drive expiry risk predictions)',
             fontsize=11, fontweight='bold')
ax.set_xlabel('Importance Score', fontsize=10)

# Annotate top 5 with value
for i in top5_idx:
    val = feat_imp.values[i]
    ax.text(val + 0.001, i, f'{val:.3f}', va='center', fontsize=8, color='#007A5E')

# Add a vertical reference line at mean importance
mean_imp = importances.mean()
ax.axvline(mean_imp, color='red', linestyle='--', linewidth=0.8,
           label=f'Mean importance ({mean_imp:.3f})')
ax.legend(fontsize=9)
plt.tight_layout()
plt.savefig(os.path.join(OUTPUTS_DIR, 'step5_feature_importance_explanation.png'),
            dpi=150, bbox_inches='tight')
plt.close()
print("  ✅ step5_feature_importance_explanation.png")


# ── Chart 4: Probability → Action Decision Flow ──────────────
fig, ax = plt.subplots(figsize=(10, 4))
ax.axis('off')
fig.suptitle("Business Action Decision Flow (Post-ML Rules)",
             fontsize=13, fontweight='bold', y=1.02)

# Draw probability axis
ax.axhline(0.5, color='lightgrey', linewidth=20, solid_capstyle='round')

# Colour zones
ax.barh(0.5, 0.40, left=0.00, height=0.18, color='#1D9E75', alpha=0.85)
ax.barh(0.5, 0.30, left=0.40, height=0.18, color='#F0A500', alpha=0.85)
ax.barh(0.5, 0.30, left=0.70, height=0.18, color='#D85A30', alpha=0.85)

# Labels inside bars
ax.text(0.20, 0.50, '🟢  SAFE\n< 0.40\nNo Action',
        ha='center', va='center', fontsize=10, fontweight='bold', color='white')
ax.text(0.55, 0.50, '🟡  WATCH\n0.40 – 0.70\nFlag for Review',
        ha='center', va='center', fontsize=10, fontweight='bold', color='white')
ax.text(0.85, 0.50, '🔴  CRITICAL\n> 0.70\nDiscount + Alert',
        ha='center', va='center', fontsize=10, fontweight='bold', color='white')

# Threshold lines
ax.axvline(0.40, color='white', linewidth=2, linestyle='--')
ax.axvline(0.70, color='white', linewidth=2, linestyle='--')

ax.set_xlim(0, 1)
ax.set_ylim(0.3, 0.7)
ax.set_xlabel('ML Probability Score  (0.0 = definitely safe → 1.0 = definitely expires)',
              fontsize=10)

plt.tight_layout()
plt.savefig(os.path.join(OUTPUTS_DIR, 'step5_decision_flow.png'),
            dpi=150, bbox_inches='tight')
plt.close()
print("  ✅ step5_decision_flow.png")


# ============================================================
# 6.  SAVE PREDICTION TABLE + BUSINESS ACTION SUMMARY
# ============================================================
print("\n[6/6] Saving outputs ...")

# Full prediction table (sample 500 rows for readability)
pred_table_path = os.path.join(OUTPUTS_DIR, 'step5_prediction_table.csv')
result_df.head(500).to_csv(pred_table_path, index=False)
print(f"  💾 step5_prediction_table.csv  (500 sample rows)")

# Business action summary by category
action_summary = (
    result_df.groupby(['category', 'risk_tier'])
    .agg(
        product_count   = ('product_name', 'count'),
        avg_probability = ('rf_probability', 'mean'),
        avg_days_expiry = ('days_to_expiry', 'mean'),
        avg_stock       = ('initial_stock', 'mean'),
    )
    .round(2)
    .reset_index()
    .sort_values(['category', 'risk_tier'])
)
action_summary_path = os.path.join(OUTPUTS_DIR, 'step5_business_action_summary.csv')
action_summary.to_csv(action_summary_path, index=False)
print(f"  💾 step5_business_action_summary.csv")


# ============================================================
# SUMMARY
# ============================================================
print("\n" + "=" * 60)
print("  STEP 5 COMPLETE — Prediction & Business Mapping")
print("=" * 60)

total      = len(result_df)
n_critical = tier_counts.get('CRITICAL', 0)
n_watch    = tier_counts.get('WATCH', 0)
n_safe     = tier_counts.get('SAFE', 0)

print(f"""
  Test set size     : {total:,} products
  ─────────────────────────────────────────────────────────
  🔴 CRITICAL (> 0.70) : {n_critical:>6,}  ({n_critical/total*100:.1f}%)
     → Trigger discount alert + notify store manager
     → Move product to high-visibility shelf position

  🟡 WATCH (0.40–0.70) : {n_watch:>6,}  ({n_watch/total*100:.1f}%)
     → Flag for daily review
     → Reduce next reorder quantity

  🟢 SAFE  (< 0.40)    : {n_safe:>6,}  ({n_safe/total*100:.1f}%)
     → No action needed
     → Continue normal operations
  ─────────────────────────────────────────────────────────

  Output files:
    📊 outputs/step5_prediction_distribution.png
    📊 outputs/step5_business_actions_breakdown.png
    📊 outputs/step5_feature_importance_explanation.png
    📊 outputs/step5_decision_flow.png
    📄 outputs/step5_prediction_table.csv
    📄 outputs/step5_business_action_summary.csv
    📄 outputs/step5_sample_narratives.txt

  KEY VIVA POINTS:
  ─────────────────────────────────────────────────────────
  ✅ "Rules do not replace ML; they consume ML output."
  ✅ ML gives probability → rules give action
  ✅ predict_proba() is more useful than predict() alone
     because it tells us HOW LIKELY, not just yes/no
  ✅ A product with 5 days left + high sales = SAFE
     A product with 30 days left + near-zero sales = CRITICAL
     → Expiry date alone is not enough. ML is needed.
  ─────────────────────────────────────────────────────────

  ➡️  Ready for Step 6: Deployment & Flask API
""")