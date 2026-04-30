# ============================================================
#  STEP 2 — Preprocessing & Feature Engineering
#  Project : Smart Inventory Management — Expiry Risk Prediction
#  Author  : (your name)
#
#  INPUT  : data/processed/step1_merged_clean.csv
#  OUTPUT : outputs/feature_dataset.csv      ← Step 3 reads this
#           outputs/feature_list.json        ← Step 3 reads this
#           outputs/step2_eda_charts.png
# ============================================================

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import json
import os
import warnings
warnings.filterwarnings('ignore')

from sklearn.preprocessing import LabelEncoder

# ── Paths ────────────────────────────────────────────────────
BASE_DIR      = os.path.join(os.path.dirname(__file__), '..')
PROCESSED_DIR = os.path.join(BASE_DIR, 'data', 'processed')
OUTPUTS_DIR   = os.path.join(BASE_DIR, 'outputs')
os.makedirs(OUTPUTS_DIR, exist_ok=True)

INPUT_PATH   = os.path.join(PROCESSED_DIR, 'step1_merged_clean.csv')
OUTPUT_CSV   = os.path.join(OUTPUTS_DIR,   'feature_dataset.csv')      # Step 3 expects this
OUTPUT_JSON  = os.path.join(OUTPUTS_DIR,   'feature_list.json')         # Step 3 expects this
CHART_PATH   = os.path.join(OUTPUTS_DIR,   'step2_eda_charts.png')

print("=" * 60)
print("STEP 2 — Preprocessing & Feature Engineering")
print("=" * 60)


# ============================================================
# 1.  LOAD STEP 1 OUTPUT
# ============================================================
print("\n[1/7] Loading step1_merged_clean.csv ...")

df = pd.read_csv(INPUT_PATH)
print(f"  ✅ Loaded : {df.shape[0]:,} rows × {df.shape[1]} columns")

# Print all columns so you can verify
print(f"\n  Columns in Step 1 output:")
for col in df.columns:
    print(f"    • {col}  [{df[col].dtype}]")


# ============================================================
# 2.  PARSE DATES
# ============================================================
print("\n[2/7] Parsing date columns ...")

df['transaction_date'] = pd.to_datetime(df['transaction_date'], errors='coerce')
df['expiration_date']  = pd.to_datetime(df['expiration_date'],  errors='coerce')

print(f"  ✅ transaction_date : {df['transaction_date'].dtype}")
print(f"  ✅ expiration_date  : {df['expiration_date'].dtype}")


# ============================================================
# 3.  ENCODE CATEGORICAL COLUMNS
# ============================================================
print("\n[3/7] Encoding categorical columns ...")

le_category = LabelEncoder()
le_grade    = LabelEncoder()

df['category_encoded']      = le_category.fit_transform(df['category'].astype(str))
df['quality_grade_encoded'] = le_grade.fit_transform(df['quality_grade'].astype(str))

print(f"  ✅ category_encoded      — {df['category'].nunique()} unique values")
print(f"     Mapping: {dict(zip(le_category.classes_, le_category.transform(le_category.classes_)))}")

print(f"  ✅ quality_grade_encoded — {df['quality_grade'].nunique()} unique values")
print(f"     Mapping: {dict(zip(le_grade.classes_, le_grade.transform(le_grade.classes_)))}")


# ============================================================
# 4.  FEATURE ENGINEERING
# ============================================================
print("\n[4/7] Engineering features ...")

# Feature 1 — Days to expiry (already in dataset, keep as-is)
df['days_to_expiry'] = df['days_until_expiry']
print("  ✅ days_to_expiry       = days_until_expiry")

# Feature 2 — Remaining quantity
df['remaining_qty'] = df['initial_quantity'] - df['units_sold']
df['remaining_qty'] = df['remaining_qty'].clip(lower=0)   # no negatives
print("  ✅ remaining_qty        = initial_quantity - units_sold")

# Feature 3 — Total units sold
df['total_units_sold'] = df['units_sold']
print("  ✅ total_units_sold     = units_sold")

# Feature 4 — Average daily sales
df['avg_daily_sales'] = df['daily_demand']
print("  ✅ avg_daily_sales      = daily_demand")

# Feature 5 — Sales velocity (binary: fast=1, slow=0)
# If a product sells faster than the median → fast mover → low expiry risk
median_sales = df['avg_daily_sales'].median()
df['sales_velocity'] = (df['avg_daily_sales'] > median_sales).astype(int)
print(f"  ✅ sales_velocity       = 1 if avg_daily_sales > median ({median_sales:.2f}), else 0")

# Feature 6 — Sell-through rate
# How much of the initial stock has been sold (0 to 1)
df['sell_through_rate'] = (
    df['units_sold'] / df['initial_quantity']
).replace([np.inf, -np.inf], 0).fillna(0).clip(0, 1)
print("  ✅ sell_through_rate    = units_sold / initial_quantity")

# Feature 7 — Stock pressure ratio
# How many days of stock remain relative to selling speed
# High ratio = too much stock left → high expiry risk
df['stock_pressure_ratio'] = (
    df['remaining_qty'] / (df['avg_daily_sales'] + 1)
)
print("  ✅ stock_pressure_ratio = remaining_qty / (avg_daily_sales + 1)")

# Feature 8 — Recent sales trend (demand variability from dataset)
df['recent_sales_trend'] = df['demand_variability']
print("  ✅ recent_sales_trend   = demand_variability")


# ============================================================
# 5.  CREATE TARGET VARIABLE — expiry_risk
# ============================================================
print("\n[5/7] Creating target variable ...")

# RULE:
#   If stock_pressure_ratio > days_to_expiry
#   → product will NOT sell out before it expires → High Risk (1)
#   Else → Low Risk (0)
#
# was_spoiled from the dataset is also used as a direct signal.
# We combine both: if either condition is true → High Risk

df['expire_before_sold'] = np.where(
    (df['stock_pressure_ratio'] > df['days_to_expiry']) | (df['was_spoiled'] == 1),
    1,   # High Risk
    0    # Low Risk
).astype(int)

TARGET = 'expire_before_sold'

high_risk = df[TARGET].sum()
low_risk  = len(df) - high_risk
print(f"  ✅ Target variable created : expire_before_sold")
print(f"     High Risk (1) : {high_risk:,}  ({high_risk / len(df) * 100:.1f}%)")
print(f"     Low Risk  (0) : {low_risk:,}  ({low_risk  / len(df) * 100:.1f}%)")


# ============================================================
# 6.  FINAL FEATURE LIST
# ============================================================
FEATURES = [
    'days_to_expiry',
    'remaining_qty',
    'total_units_sold',
    'avg_daily_sales',
    'sales_velocity',
    'sell_through_rate',
    'stock_pressure_ratio',
    'recent_sales_trend',
    'quality_grade_encoded',
    'category_encoded',
]

print(f"\n  Final feature list ({len(FEATURES)} features):")
for f in FEATURES:
    print(f"    • {f}")

print(f"\n  Target : {TARGET}")

# Descriptive stats
print("\n  Engineered features — descriptive stats:")
print(df[FEATURES].describe().round(2).to_string())


# ============================================================
# 7.  NULL CHECK AFTER ENGINEERING
# ============================================================
print("\n[6/7] Null check after feature engineering ...")
nulls = df[FEATURES + [TARGET]].isnull().sum()
has_nulls = nulls[nulls > 0]
if len(has_nulls) > 0:
    print(f"  ⚠️  Nulls found:")
    print(has_nulls.to_string())
    # Fill any remaining nulls with column median
    for col in has_nulls.index:
        df[col] = df[col].fillna(df[col].median())
    print("  ✅ Filled with column median")
else:
    print("  ✅ No nulls found")


# ============================================================
# 8.  EDA VISUALISATIONS
# ============================================================
print("\n[7/7] Generating EDA charts ...")
sns.set_style("whitegrid")

fig, axes = plt.subplots(3, 3, figsize=(16, 14))
fig.suptitle("Step 2 — Feature Engineering EDA", fontsize=14, fontweight='bold')

# Chart 1: Target distribution
ax = axes[0, 0]
counts = df[TARGET].value_counts().sort_index()
ax.bar(['Low Risk (0)', 'High Risk (1)'], counts.values,
       color=['#1D9E75', '#D85A30'], edgecolor='none')
ax.set_title("Target — Expiry Risk Distribution", fontsize=10)
ax.set_ylabel("Count")
for i, v in enumerate(counts.values):
    ax.text(i, v + 5, str(v), ha='center', fontsize=9, fontweight='bold')

# Charts 2–9: Feature distributions coloured by target
feature_plot_pairs = [
    ('days_to_expiry',       axes[0, 1]),
    ('remaining_qty',        axes[0, 2]),
    ('avg_daily_sales',      axes[1, 0]),
    ('sell_through_rate',    axes[1, 1]),
    ('stock_pressure_ratio', axes[1, 2]),
    ('sales_velocity',       axes[2, 0]),
    ('recent_sales_trend',   axes[2, 1]),
]

for col, ax in feature_plot_pairs:
    sns.histplot(data=df, x=col, hue=TARGET, bins=30,
                 palette={0: '#1D9E75', 1: '#D85A30'},
                 ax=ax, legend=(col == 'days_to_expiry'))
    ax.set_title(f"{col}", fontsize=10)
    ax.set_xlabel("")
    ax.tick_params(labelsize=8)

# Chart 9: Correlation heatmap
ax9 = axes[2, 2]
corr = df[FEATURES + [TARGET]].corr()
sns.heatmap(corr[[TARGET]].drop(TARGET).sort_values(TARGET),
            annot=True, fmt=".2f", cmap="RdYlGn",
            ax=ax9, cbar=False, linewidths=0.5)
ax9.set_title("Feature correlation\nwith target", fontsize=10)

plt.tight_layout()
plt.savefig(CHART_PATH, dpi=150, bbox_inches='tight')
plt.show()
print(f"  ✅ Chart saved → outputs/step2_eda_charts.png")


# ============================================================
# 9.  SAVE OUTPUTS
# ============================================================
print("\n── Saving outputs ──")

df_out = df[FEATURES + [TARGET]].copy()

# 9a — data/processed/step2_features.csv  (your processed folder)
PROCESSED_CSV = os.path.join(PROCESSED_DIR, 'step2_features.csv')
df_out.to_csv(PROCESSED_CSV, index=False)
print(f"  ✅ step2_features.csv saved    → data/processed/step2_features.csv")

# 9b — outputs/feature_dataset.csv  (Step 3 reads from here)
df_out.to_csv(OUTPUT_CSV, index=False)
print(f"  ✅ feature_dataset.csv saved   → outputs/feature_dataset.csv")

# 9c — outputs/feature_list.json  (Step 3 reads FEATURES and TARGET from here)
feature_meta = {
    "features": FEATURES,
    "target"  : TARGET
}
with open(OUTPUT_JSON, 'w') as f:
    json.dump(feature_meta, f, indent=2)
print(f"  ✅ feature_list.json saved     → outputs/feature_list.json")

print(f"\n  feature_list.json contents:")
print(json.dumps(feature_meta, indent=4))


# ============================================================
# 10.  SUMMARY
# ============================================================
print("\n" + "=" * 60)
print("STEP 2 COMPLETE — Summary")
print("=" * 60)
print(f"  Total records         : {len(df_out):,}")
print(f"  Total features        : {len(FEATURES)}")
print(f"  Target variable       : {TARGET}")
print(f"  High Risk (1)         : {df_out[TARGET].sum():,}  ({df_out[TARGET].mean()*100:.1f}%)")
print(f"  Low Risk  (0)         : {(df_out[TARGET]==0).sum():,}  ({(df_out[TARGET]==0).mean()*100:.1f}%)")
print(f"\n  Files saved:")
print(f"    📄 data/processed/step2_features.csv   ← your processed folder")
print(f"    📄 outputs/feature_dataset.csv         ← Step 3 input")
print(f"    📄 outputs/feature_list.json           ← Step 3 input")
print(f"    📊 outputs/step2_eda_charts.png        ← EDA charts")
print(f"\n  ➡️  Ready for Step 3: Model Selection & Training")
print("=" * 60)