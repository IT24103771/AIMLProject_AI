export const MAIN_CATEGORIES = [
  "Grocery",
  "Beverages",
  "Snacks & Sweets",
  "Bakery",
  "Frozen Food",
  "Meat & Fish",
  "Vegetables",
  "Fruits",
  "Health & Personal Care",
  "Baby Care",
  "Household",
];

export const SUB_CATEGORIES = {
  Grocery: ["Rice & Grains", "Flour", "Pulses", "Spices", "Oil", "Sugar & Salt"],
  Beverages: ["Soft Drinks", "Juice", "Tea & Coffee", "Milk Drinks"],
  "Snacks & Sweets": ["Chips", "Chocolate", "Candy", "Biscuits", "Nuts"],
  Bakery: ["Bread", "Cakes", "Pastries", "Buns"],
  "Frozen Food": ["Frozen Meat", "Frozen Fish", "Frozen Vegetables", "Frozen Snacks"],
  "Meat & Fish": ["Chicken", "Beef", "Fish", "Seafood"],
  Vegetables: ["Leafy", "Root", "Fresh"],
  Fruits: ["Fresh", "Citrus", "Tropical"],
  "Health & Personal Care": ["Soap", "Shampoo", "Toothpaste", "Skincare"],
  "Baby Care": ["Baby Food", "Diapers", "Baby Products"],
  Household: ["Cleaning", "Laundry", "Kitchen Supplies"],
};



// Reusable validatation logic
export const MIN_NAME_LENGTH = 3;
export const MIN_SUPPLIER_LENGTH = 2;
export const MIN_CATEGORY_LENGTH = 2;

export const validateProduct = (form) => {
  const errors = [];

  if (!form.productName?.trim()) {
    errors.push("Product name is required.");
  } else if (form.productName.trim().length < MIN_NAME_LENGTH) {
    errors.push(`Product name must be at least ${MIN_NAME_LENGTH} characters.`);
  }

  if (!form.mainCategory?.trim()) {
    errors.push("Main category is required.");
  } else if (form.mainCategory.trim().length < MIN_CATEGORY_LENGTH) {
    errors.push(`Main category must be at least ${MIN_CATEGORY_LENGTH} characters.`);
  }

  if (!form.subCategory?.trim()) {
    errors.push("Sub category is required.");
  } else if (form.subCategory.trim().length < MIN_CATEGORY_LENGTH) {
    errors.push(`Sub category must be at least ${MIN_CATEGORY_LENGTH} characters.`);
  }

  if (!form.supplier?.trim()) {
    errors.push("Supplier is required.");
  } else if (form.supplier.trim().length < MIN_SUPPLIER_LENGTH) {
    errors.push(`Supplier must be at least ${MIN_SUPPLIER_LENGTH} characters.`);
  }

  const cost = Number(form.costPrice);
  if (form.costPrice === "" || isNaN(cost)) {
    errors.push("Cost price is required.");
  } else if (cost < 0) {
    errors.push("Cost price cannot be negative.");
  }

  const sell = Number(form.sellingPrice);
  if (form.sellingPrice === "" || isNaN(sell)) {
    errors.push("Selling price is required.");
  } else if (sell <= 0) {
    errors.push("Selling price must be greater than 0.");
  } else if (cost > sell) {
    errors.push("Cost price cannot exceed selling price.");
  }

  const reorder = Number(form.reorderLevel);
  if (form.reorderLevel === "" || isNaN(reorder)) {
    errors.push("Reorder level is required.");
  } else if (reorder < 0) {
    errors.push("Reorder level cannot be negative.");
  } else if (!Number.isInteger(reorder)) {
    errors.push("Reorder level must be a whole number.");
  }

  return errors;
};
