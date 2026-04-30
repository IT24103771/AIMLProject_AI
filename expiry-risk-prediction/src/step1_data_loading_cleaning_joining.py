# ============================================================
#  STEP 1 — Data Understanding, Cleaning & Joining
#  Project : Smart Inventory Management — Expiry Risk Prediction
#  Author  : (your name)
# ============================================================

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import os

# ── Paths ────────────────────────────────────────────────────
RAW_DIR       = os.path.join(os.path.dirname(__file__), '..', 'data', 'raw')
PROCESSED_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'processed')
OUTPUTS_DIR   = os.path.join(os.path.dirname(__file__), '..', 'outputs')   # FIX 4 added

os.makedirs(PROCESSED_DIR, exist_ok=True)
os.makedirs(OUTPUTS_DIR,   exist_ok=True)

GROCERY_PATH    = os.path.join(RAW_DIR, 'grocery_chain_data.csv')
PERISHABLE_PATH = os.path.join(RAW_DIR, 'perishable_goods_management.csv')


# ============================================================
# 1.  LOAD BOTH DATASETS
# ============================================================
print("=" * 60)
print("STEP 1 — Data Loading, Cleaning & Joining")
print("=" * 60)

print("\n[1/7] Loading datasets...")

grocery_df    = pd.read_csv(GROCERY_PATH)
perishable_df = pd.read_csv(PERISHABLE_PATH)

print(f"  ✅ Grocery dataset    : {grocery_df.shape[0]:,} rows × {grocery_df.shape[1]} columns")
print(f"  ✅ Perishable dataset : {perishable_df.shape[0]:,} rows × {perishable_df.shape[1]} columns")

# ── FIX 3 — Print actual column names right after loading ───
# Run once and confirm these match the hardcoded names below.
# If any column name differs, update the code to match your CSV.
print("\n  Actual grocery columns    :", list(grocery_df.columns))
print("  Actual perishable columns :", list(perishable_df.columns))


# ============================================================
# 2.  EXPLORE STRUCTURE
# ============================================================
print("\n[2/7] Dataset Structure Overview")

print("\n── Grocery Columns ──")
print(grocery_df.dtypes.to_string())

print("\n── Perishable Columns ──")
print(perishable_df.dtypes.to_string())

print("\n── Grocery Sample (3 rows) ──")
print(grocery_df.head(3).to_string())

print("\n── Perishable Sample (3 rows) ──")
print(perishable_df.head(3).to_string())


# ============================================================
# 3.  HANDLE MISSING VALUES
# ============================================================
print("\n[3/7] Missing Values Check")

print("\nGrocery nulls:")
g_nulls = grocery_df.isnull().sum()
print(g_nulls[g_nulls > 0].to_string() if g_nulls.sum() > 0 else "  ✅ No nulls")

print("\nPerishable nulls:")
p_nulls = perishable_df.isnull().sum()
print(p_nulls[p_nulls > 0].to_string() if p_nulls.sum() > 0 else "  ✅ No nulls")

# FIX 1 — Dynamic count instead of hardcoded 25
missing_store = grocery_df['store_name'].isnull().sum()
grocery_df['store_name'] = grocery_df['store_name'].fillna('Unknown')
print(f"\n  ✅ Filled {missing_store} missing store_name values with 'Unknown'")


# ============================================================
# 4.  FIX DATE FORMATS
# ============================================================
print("\n[4/7] Fixing Date Columns...")

grocery_df['transaction_date']    = pd.to_datetime(grocery_df['transaction_date'],    errors='coerce')
perishable_df['transaction_date'] = pd.to_datetime(perishable_df['transaction_date'], errors='coerce')
perishable_df['expiration_date']  = pd.to_datetime(perishable_df['expiration_date'],  errors='coerce')

before = len(perishable_df)
perishable_df = perishable_df.dropna(subset=['expiration_date', 'transaction_date'])
print(f"  ✅ Dropped {before - len(perishable_df)} rows with invalid dates")
print(f"  ✅ Dates converted — grocery: {grocery_df['transaction_date'].dtype}, "
      f"perishable: {perishable_df['expiration_date'].dtype}")


# ============================================================
# 5.  REMOVE DUPLICATES
# ============================================================
print("\n[5/7] Removing Duplicates...")

g_before = len(grocery_df)
p_before = len(perishable_df)

grocery_df    = grocery_df.drop_duplicates()
perishable_df = perishable_df.drop_duplicates()

print(f"  Grocery    : {g_before - len(grocery_df)} duplicates removed  → {len(grocery_df):,} rows remain")
print(f"  Perishable : {p_before - len(perishable_df)} duplicates removed → {len(perishable_df):,} rows remain")


# ============================================================
# 6.  AGGREGATE GROCERY → SALES VELOCITY PER PRODUCT
# ============================================================
# The grocery dataset has one row per TRANSACTION.
# We need one row per PRODUCT: how fast each product sells.
# This sales velocity is the key feature added to perishable data.

print("\n[6/7] Computing Sales Velocity from Grocery Data...")

sales_velocity = (
    grocery_df
    .groupby('product_name', as_index=False)
    .agg(
        avg_qty_sold_per_txn = ('quantity',         'mean'),
        total_qty_sold       = ('quantity',         'sum'),
        avg_discount         = ('discount_amount',  'mean'),
        num_transactions     = ('transaction_date', 'count'),
    )
)

# Normalise product name for join (lowercase + stripped)
# This prevents mismatches due to casing e.g. "Milk" vs "milk"
sales_velocity['product_name_lower'] = (
    sales_velocity['product_name'].str.lower().str.strip()
)
perishable_df['product_name_lower'] = (
    perishable_df['product_name'].str.lower().str.strip()
)

print(f"  ✅ Aggregated {len(sales_velocity):,} unique products from grocery data")


# ============================================================
# 7.  JOIN BOTH DATASETS
# ============================================================
print("\n[7/7] Joining Datasets on product_name...")

merged_df = pd.merge(
    perishable_df,
    sales_velocity[['product_name_lower',
                    'avg_qty_sold_per_txn',
                    'total_qty_sold',
                    'avg_discount',
                    'num_transactions']],
    on  = 'product_name_lower',
    how = 'left'   # keep ALL perishable rows; NaN if product not in grocery
)

# Products not found in grocery → fill velocity columns with 0
merged_df['avg_qty_sold_per_txn'] = merged_df['avg_qty_sold_per_txn'].fillna(0)
merged_df['total_qty_sold']       = merged_df['total_qty_sold'].fillna(0)
merged_df['avg_discount']         = merged_df['avg_discount'].fillna(0)
merged_df['num_transactions']     = merged_df['num_transactions'].fillna(0)

# Drop helper column — no longer needed after join
merged_df = merged_df.drop(columns=['product_name_lower'])

matched = (merged_df['num_transactions'] > 0).sum()
print(f"  Merged shape              : {merged_df.shape[0]:,} rows × {merged_df.shape[1]} columns")
print(f"  Products matched          : {matched:,} rows ({matched / len(merged_df) * 100:.1f}%)")
print(f"  Products with 0 sales     : {len(merged_df) - matched:,} rows (filled with 0)")


# ============================================================
# 8.  DROP ROWS WHERE CRITICAL COLUMNS ARE NULL
# ============================================================
critical_cols = ['expiration_date', 'units_sold', 'days_until_expiry', 'initial_quantity']
before = len(merged_df)
merged_df = merged_df.dropna(subset=critical_cols)
print(f"\n  ✅ Dropped {before - len(merged_df)} rows with nulls in critical columns")
print(f"  ✅ Final merged dataset   : {merged_df.shape[0]:,} rows × {merged_df.shape[1]} columns")


# ============================================================
# 9.  EDA CHARTS  →  outputs/step1_eda_charts.png
# ============================================================
print("\n── Generating EDA Charts ──")

fig, axes = plt.subplots(2, 2, figsize=(14, 10))
fig.suptitle("Step 1 — EDA: Sales & Perishable Data Overview",
             fontsize=14, fontweight='bold')

# Chart 1: Product count by category
ax1 = axes[0, 0]
merged_df['category'].value_counts().plot(kind='bar', ax=ax1, color='#378ADD', edgecolor='none')
ax1.set_title("Products by Category", fontsize=11)
ax1.set_xlabel("Category")
ax1.set_ylabel("Count")
ax1.tick_params(axis='x', rotation=45, labelsize=8)

# Chart 2: Days until expiry distribution
ax2 = axes[0, 1]
merged_df['days_until_expiry'].hist(bins=30, ax=ax2, color='#1D9E75', edgecolor='white', linewidth=0.5)
ax2.set_title("Distribution of Days Until Expiry", fontsize=11)
ax2.set_xlabel("Days until expiry")
ax2.set_ylabel("Number of products")

# Chart 3: Units sold distribution
ax3 = axes[1, 0]
merged_df['units_sold'].hist(bins=30, ax=ax3, color='#7F77DD', edgecolor='white', linewidth=0.5)
ax3.set_title("Distribution of Units Sold", fontsize=11)
ax3.set_xlabel("Units sold")
ax3.set_ylabel("Number of products")

# Chart 4: Spoiled vs not spoiled
ax4 = axes[1, 1]
spoiled_counts = merged_df['was_spoiled'].value_counts()
ax4.bar(['Not Spoiled (0)', 'Spoiled (1)'], spoiled_counts.values,
        color=['#1D9E75', '#D85A30'], edgecolor='none')
ax4.set_title("Spoiled vs Not Spoiled", fontsize=11)
ax4.set_ylabel("Count")
for i, v in enumerate(spoiled_counts.values):
    ax4.text(i, v + 10, str(v), ha='center', fontsize=10, fontweight='bold')

plt.tight_layout()
chart_path = os.path.join(OUTPUTS_DIR, 'step1_eda_charts.png')
plt.savefig(chart_path, dpi=150, bbox_inches='tight')
plt.show()
print(f"  ✅ Chart saved → outputs/step1_eda_charts.png")


# ============================================================
# 10.  SUMMARY
# ============================================================
print("\n" + "=" * 60)
print("STEP 1 COMPLETE — Dataset Summary")
print("=" * 60)
print(f"  Total records         : {len(merged_df):,}")
print(f"  Total features        : {merged_df.shape[1]}")
print(f"  Date range            : {merged_df['transaction_date'].min().date()} "
      f"→ {merged_df['transaction_date'].max().date()}")
print(f"  Unique products       : {merged_df['product_name'].nunique()}")
print(f"  Unique categories     : {merged_df['category'].nunique()}")
print(f"  Spoiled records       : {merged_df['was_spoiled'].sum():,} "
      f"({merged_df['was_spoiled'].mean() * 100:.1f}%)")
print(f"  Avg days until expiry : {merged_df['days_until_expiry'].mean():.1f}")

print("\n  Key columns going into Step 2:")
key_cols = [
    'product_name', 'category', 'expiration_date', 'transaction_date',
    'days_until_expiry', 'initial_quantity', 'units_sold', 'units_wasted',
    'daily_demand', 'was_spoiled', 'avg_qty_sold_per_txn',
    'shelf_life_days', 'storage_temp', 'spoilage_risk'
]
for col in key_cols:
    status = "✅" if col in merged_df.columns else "⚠️  NOT FOUND — check column name"
    print(f"    {status} {col}")


# ============================================================
# 11.  SAVE CLEANED MERGED DATASET
# ============================================================
# FIX 2 — consistent filename used across all steps
output_path = os.path.join(PROCESSED_DIR, 'step1_merged_clean.csv')
merged_df.to_csv(output_path, index=False)
print(f"\n  💾 Saved to: data/processed/step1_merged_clean.csv")
print("\n  ➡️  Ready for Step 2: Preprocessing & Feature Engineering")
print("=" * 60)