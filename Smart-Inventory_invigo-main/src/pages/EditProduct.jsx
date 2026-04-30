import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ArrowLeft, Save, X, Upload, ChevronDown } from "lucide-react";
import { authFetch } from "@/lib/api";
import CustomSelect from "../components/CustomSelect";
import { MAIN_CATEGORIES, SUB_CATEGORIES, validateProduct } from "../lib/product-constants";
import "../styles/Products.css";

const API = "/api/products";

const EditProduct = () => {
    const { id: paramId } = useParams();
    const location = useLocation();
    const id = paramId || location.pathname.split('/').pop();
    const navigate = useNavigate();
    const [form, setForm] = useState({
        productId: "",
        productName: "",
        mainCategory: "",
        subCategory: "",
        supplier: "",
        costPrice: "",
        sellingPrice: "",
        imageUrl: "",
        reorderLevel: "",
        riskLevel: "LOW",
    });

    const [errors, setErrors] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                setIsLoading(true);
                // Fallback to fetch all and search if specific id fetch fails or layout is such
                const res = await authFetch(`${API}`);
                if (!res.ok) throw new Error("Could not fetch product");
                const data = await res.json();
                const pd = data.find((p) => String(p.productId) === String(id) || String(p.id) === String(id));

                if (pd) {
                    setForm({
                        productId: pd.productId || pd.id || id,
                        productName: pd.productName || pd.name || "",
                        mainCategory: pd.mainCategory || pd.category || "",
                        subCategory: pd.subCategory || "",
                        supplier: pd.supplier || "",
                        costPrice: pd.costPrice ?? "",
                        sellingPrice: pd.sellingPrice ?? pd.price ?? "",
                        imageUrl: pd.imageUrl || "",
                        reorderLevel: pd.reorderLevel ?? "",
                        riskLevel: pd.riskLevel || "LOW",
                    });
                } else {
                    setErrors(["Product not found."]);
                }
            } catch (err) {
                setErrors(["Product details could not be loaded."]);
            } finally {
                setIsLoading(false);
            }
        };

        if (id) {
            fetchProduct();
        }
    }, [id]);

    const subCategoryOptions = useMemo(() => {
        return SUB_CATEGORIES[form.mainCategory] || [];
    }, [form.mainCategory]);

    const onChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => {
            const next = { ...prev, [name]: value };
            if (name === "mainCategory" && value !== prev.mainCategory) {
                next.subCategory = "";
            }
            return next;
        });
        if (errors.length > 0) setErrors([]);
    };

    const onSubmit = async (e) => {
        e.preventDefault();

        const validationErrors = validateProduct(form);
        if (!form.productId) {
            validationErrors.push("Product ID is missing.");
        }
        if (validationErrors.length > 0) {
            setErrors(validationErrors);
            return;
        }

        const payload = {
            productName: form.productName.trim(),
            mainCategory: form.mainCategory.trim(),
            subCategory: form.subCategory.trim(),
            supplier: form.supplier.trim(),
            costPrice: Number(form.costPrice),
            sellingPrice: Number(form.sellingPrice),
            imageUrl: form.imageUrl.trim(),
            reorderLevel: Number(form.reorderLevel),
            riskLevel: form.riskLevel,
        };

        try {
            setIsSubmitting(true);
            const res = await authFetch(`${API}/${id}`, {
                method: "PUT",
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                let msg = "Update failed. Please try again.";
                try {
                    const data = await res.json();
                    msg = data.message || msg;
                } catch { }
                throw new Error(msg);
            }

            navigate(`/staff/products/details/${id}`);
        } catch (err) {
            setErrors([err.message || "Update failed."]);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return <div className="products-page p-8 font-bold">Loading product details...</div>;
    }

    return (
        <div className="products-page">
            <div className="products-header flex justify-between items-center">
                <div>
                    <h1>Edit Product</h1>
                    <p>Update information for {form.productName || "Product"}</p>
                </div>
                <button
                    className="products-btn-cancel flex items-center gap-2 outline-none"
                    onClick={() => navigate(-1)}
                >
                    <ArrowLeft size={16} /> Go Back
                </button>
            </div>

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

            <div className="products-section-card">
                <div className="products-section-title">
                    <h2>Product Information</h2>
                    <span className="products-muted">
                        Modify the product details below.
                    </span>
                </div>

                <form onSubmit={onSubmit} className="products-form-2col">
                    <div className="products-field">
                        <label>Product Name *</label>
                        <input
                            name="productName"
                            placeholder="e.g. Fresh Milk 1L"
                            value={form.productName}
                            onChange={onChange}
                        />
                    </div>

                    <div className="products-field">
                        <label>Main Category *</label>
                        <CustomSelect
                            name="mainCategory"
                            value={form.mainCategory}
                            onChange={onChange}
                            placeholder="Select Main Category"
                            options={[
                                ...MAIN_CATEGORIES.map((c) => ({ value: c, label: c })),
                            ]}
                        />
                    </div>

                    <div className="products-field">
                        <label>Sub Category *</label>
                        <CustomSelect
                            name="subCategory"
                            value={form.subCategory}
                            onChange={onChange}
                            disabled={!form.mainCategory}
                            placeholder="Select Sub Category"
                            options={[
                                ...subCategoryOptions.map((c) => ({ value: c, label: c })),
                            ]}
                        />
                    </div>

                    <div className="products-field">
                        <label>Supplier *</label>
                        <input
                            name="supplier"
                            placeholder="e.g. Highland Dairy"
                            value={form.supplier}
                            onChange={onChange}
                        />
                    </div>

                    <div className="products-field">
                        <label>Cost Price (Rs) *</label>
                        <input
                            name="costPrice"
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={form.costPrice}
                            onChange={onChange}
                        />
                    </div>

                    <div className="products-field">
                        <label>Selling Price (Rs) *</label>
                        <input
                            name="sellingPrice"
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={form.sellingPrice}
                            onChange={onChange}
                        />
                    </div>

                    <div className="products-field">
                        <label>Reorder Level *</label>
                        <input
                            name="reorderLevel"
                            type="number"
                            min="0"
                            step="1"
                            placeholder="e.g. 10"
                            value={form.reorderLevel}
                            onChange={onChange}
                        />
                    </div>

                    <div className="products-field sm:col-span-2">
                        <label>Image URL / Upload</label>
                        <div className="flex items-center gap-2">
                            <input
                                className="flex-1"
                                name="imageUrl"
                                placeholder="https://... OR Choose file"
                                value={form.imageUrl}
                                onChange={onChange}
                            />
                            <button
                                type="button"
                                className="px-4 py-3 rounded-2xl bg-[#0F172A]/10 text-[#0F172A] font-bold text-sm flex items-center gap-2 outline-none"
                                onClick={() => alert("File upload modal placeholder")}
                            >
                                <Upload size={14} /> Upload
                            </button>
                        </div>
                    </div>

                    <div className="products-field sm:col-span-2">
                        <label>Risk Level (AI / Override)</label>
                        <select
                            name="riskLevel"
                            value={form.riskLevel}
                            onChange={onChange}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '1rem', border: '1px solid #E2E8F0', outline: 'none' }}
                        >
                            <option value="LOW">Low Risk</option>
                            <option value="MEDIUM">Medium Risk</option>
                            <option value="HIGH">High Risk</option>
                        </select>
                    </div>

                    <div className="products-form-actions-2col mt-4 border-t border-[#0F172A]/5 pt-6">
                        <button
                            type="submit"
                            className="products-btn-save flex items-center gap-2 outline-none"
                            disabled={isSubmitting}
                        >
                            <Save size={16} /> {isSubmitting ? "Updating..." : "Save Changes"}
                        </button>
                        <button
                            type="button"
                            className="products-btn-cancel flex items-center gap-2 outline-none"
                            onClick={() => navigate(-1)}
                        >
                            <X size={16} /> Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditProduct;
