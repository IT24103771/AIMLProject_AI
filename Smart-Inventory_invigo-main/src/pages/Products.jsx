import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, ChevronDown, Package, PlusCircle, Pencil, Trash2 } from "lucide-react";
import { authFetch } from "@/lib/api";
import CustomSelect from "../components/CustomSelect";
import { MAIN_CATEGORIES } from "../lib/product-constants";
import "../styles/Products.css";

const API = "/api/products";

const Products = () => {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [sortOption, setSortOption] = useState("A-Z Name");

  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const loadProducts = async () => {
    try {
      setLoading(true);
      const res = await authFetch(API);
      if (!res.ok) throw new Error("Failed to load products");
      const data = await res.json();
      setProducts(
        (Array.isArray(data) ? data : []).map((p) => ({
          ...p,
          productId: p.productId ?? p.id,
          productName: p.productName ?? p.name,
          mainCategory: p.mainCategory ?? p.category,
          sellingPrice: p.sellingPrice ?? p.price ?? 0,
          salesCount: p.salesCount || 0, // Fallback for sorting if available in API
          riskLevel: p.riskLevel || "LOW",
          riskAction: p.riskAction || "No action needed"
        }))
      );
    } catch (err) {
      setErrors(["Failed to load products"]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const suppliersList = useMemo(() => {
    const list = new Set(products.map((p) => p.supplier).filter(Boolean));
    return Array.from(list).sort();
  }, [products]);

  const filteredAndSorted = useMemo(() => {
    let result = products.filter((p) => {
      const matchSearch = (p.productName || "")
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchCategory = selectedCategory
        ? p.mainCategory === selectedCategory
        : true;
      const matchSupplier = selectedSupplier
        ? p.supplier === selectedSupplier
        : true;
      return matchSearch && matchCategory && matchSupplier;
    });

    if (sortOption === "A-Z Name") {
      result.sort((a, b) =>
        (a.productName || "").localeCompare(b.productName || "")
      );
    } else if (sortOption === "Best selling") {
      result.sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0));
    } else if (sortOption === "Low Selling") {
      result.sort((a, b) => (a.salesCount || 0) - (b.salesCount || 0));
    }

    return result;
  }, [products, search, selectedCategory, selectedSupplier, sortOption]);

  const handleCardClick = (productId) => {
    navigate(`/staff/products/details/${productId}`);
  };

  const handleDelete = async (e, productId) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    try {
      const res = await authFetch(`${API}/${productId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setProducts(products.filter((p) => p.productId !== productId && p.id !== productId));
    } catch (err) {
      alert("Delete failed. Please try again.");
    }
  };

  return (
    <div className="products-page">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="products-header flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="flex items-center gap-3">
            <Package className="text-[#007A5E]" size={36} /> Products
          </h1>
          <p>Browse your product catalog</p>
        </div>
        <button
          className="products-btn-add flex items-center gap-2"
          onClick={() => navigate("/staff/products/add")}
        >
          <PlusCircle size={20} /> Add Product
        </button>
      </div>

      {/* ── Error Banner ───────────────────────────────── */}
      {errors.length > 0 && (
        <div className="products-banner">
          {errors.length === 1 ? (
            errors[0]
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {errors.map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── Toolbar ────────────────────────────────────── */}
      <div className="products-toolbar">
        <div className="flex-1 relative flex items-center">
          <Search size={18} className="absolute left-4 text-[#0F172A]/30" />
          <input
            className="products-search pl-11 w-full"
            placeholder="All Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex-1 w-full sm:w-auto">
          <CustomSelect
            name="selectedCategory"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            placeholder="Main Category (All)"
            options={[
              { value: "", label: "Main Category (All)" },
              ...MAIN_CATEGORIES.map((c) => ({ value: c, label: c })),
            ]}
          />
        </div>

        <div className="flex-1 w-full sm:w-auto">
          <CustomSelect
            name="selectedSupplier"
            value={selectedSupplier}
            onChange={(e) => setSelectedSupplier(e.target.value)}
            placeholder="Suppliers (All)"
            options={[
              { value: "", label: "Suppliers (All)" },
              ...suppliersList.map((s) => ({ value: s, label: s })),
            ]}
          />
        </div>

        <div className="flex-1 w-full sm:w-auto">
          <CustomSelect
            name="sortOption"
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            placeholder="Sort: A-Z Name"
            options={[
              { value: "A-Z Name", label: "Sort: A-Z Name" },
              { value: "Best selling", label: "Sort: Best Selling" },
              { value: "Low Selling", label: "Sort: Low Selling" },
            ]}
          />
        </div>
      </div>

      {/* ── Product Grid ───────────────────────────────── */}
      {loading ? (
        <div className="products-skeleton">Loading products…</div>
      ) : filteredAndSorted.length === 0 ? (
        <div className="products-empty">
          {products.length === 0
            ? 'No products yet. Click "+ Add Product" to get started.'
            : "No products match your search or filters."}
        </div>
      ) : (
        <div className="products-grid">
          {filteredAndSorted.map((p) => (
            <div
              className="product-card clickable hover:cursor-pointer"
              key={p.productId}
              onClick={() => handleCardClick(p.productId)}
            >
              <img
                className="product-card-img"
                src={
                  p.imageUrl ||
                  "https://via.placeholder.com/300x200?text=No+Image"
                }
                alt={p.productName || "Product"}
                onError={(e) => {
                  e.target.src =
                    "https://via.placeholder.com/300x200?text=No+Image";
                }}
              />
              <div className="product-card-body">
                <div className="product-card-name">{p.productName}</div>
                <div className="product-card-category">
                  {p.mainCategory}
                  {p.subCategory ? ` • ${p.subCategory}` : ""}
                </div>

                <div className="flex justify-between items-center mt-2">
                  <div className="product-card-price">Rs {p.sellingPrice}</div>
                  
                  <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider
                    ${p.riskLevel === 'HIGH' ? 'bg-red-100 text-red-600' : 
                      p.riskLevel === 'MEDIUM' ? 'bg-orange-100 text-orange-600' : 
                      'bg-emerald-100 text-emerald-600'}`}>
                    Risk: {p.riskLevel}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Products;