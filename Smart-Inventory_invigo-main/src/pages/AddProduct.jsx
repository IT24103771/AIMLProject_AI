import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Save, X, Upload, Pencil, ChevronDown, ClipboardList, PackageSearch } from "lucide-react";
import { authFetch } from "@/lib/api";
import CustomSelect from "../components/CustomSelect";
import { MAIN_CATEGORIES, SUB_CATEGORIES, validateProduct } from "../lib/product-constants";
import "../styles/Products.css";

const API = "/api/products";

const AddProduct = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [form, setForm] = useState({
        productName: "",
        mainCategory: "",
        subCategory: "",
        supplier: "",
        costPrice: "",
        sellingPrice: "",
        imageUrl: "",
        reorderLevel: "",
    });

    const [errors, setErrors] = useState([]);
    const [products, setProducts] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingProductId, setEditingProductId] = useState(null);

    const handleEditClick = (item) => {
        setEditingProductId(item.productId || item.id);
        setForm({
            productName: item.productName || item.name || "",
            mainCategory: item.mainCategory || item.category || "",
            subCategory: item.subCategory || "",
            supplier: item.supplier || "",
            costPrice: item.costPrice ?? "",
            sellingPrice: item.sellingPrice ?? item.price ?? "",
            imageUrl: item.imageUrl || "",
            reorderLevel: item.reorderLevel ?? "",
        });
        window.scrollTo({ top: 0, behavior: "smooth" });
    };
    useEffect(() => {
        if (location.state?.editProduct) {
            handleEditClick(location.state.editProduct);
            // Optional: clear state so refresh doesn't keep triggering edit? 
            // window.history.replaceState({}, document.title) does it but it's fine for now.
        }
    }, [location.state]);

    const fetchProducts = async () => {
        try {
            const res = await authFetch(API);
            if (res.ok) {
                const data = await res.json();
                setProducts(data);
            }
        } catch (err) {
            console.error("Failed to load products", err);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

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

    const cancelEdit = () => {
        setEditingProductId(null);
        setForm({
            productName: "",
            mainCategory: "",
            subCategory: "",
            supplier: "",
            costPrice: "",
            sellingPrice: "",
            imageUrl: "",
            reorderLevel: "",
        });
        setErrors([]);
    };

    const onSubmit = async (e) => {
        e.preventDefault();

        const validationErrors = validateProduct(form);
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
        };

        try {
            setIsSubmitting(true);
            const url = editingProductId ? `${API}/${editingProductId}` : API;
            const method = editingProductId ? "PUT" : "POST";
            
            const res = await authFetch(url, {
                method: method,
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                let msg = "Save failed. Please try again.";
                try {
                    const data = await res.json();
                    msg = data.message || msg;
                } catch { }
                throw new Error(msg);
            }

            await fetchProducts();
            cancelEdit();
        } catch (err) {
            setErrors([err.message || "Save failed. Please try again."]);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="products-page">
            <div className="products-header flex justify-between items-center">
                <div>
                    <h1>{editingProductId ? "Edit Product" : "Add Product"}</h1>
                    <p>{editingProductId ? `Updating details for ${form.productName}` : "Register a new product in the system"}</p>
                </div>
                <button
                    className="products-btn-cancel flex items-center gap-2"
                    onClick={() => navigate("/staff/products")}
                >
                    <ArrowLeft size={16} /> Back to Products
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
                <div className="products-section-title flex justify-between items-start">
                    <div>
                        <h2 className="flex items-center gap-2"><ClipboardList className="text-[#007A5E]" size={20} /> Product Information</h2>
                        <span className="products-muted">
                            Ensure all details are correct before saving
                        </span>
                    </div>
                    {editingProductId && (
                        <span className="bg-[#007A5E]/10 text-[#007A5E] px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest">
                            Editing Mode
                        </span>
                    )}
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

                    <div className="products-form-actions-2col mt-4 border-t border-[#0F172A]/5 pt-6">
                        <button
                            type="submit"
                            className="products-btn-save flex items-center gap-2 outline-none"
                            disabled={isSubmitting}
                        >
                            <Save size={16} /> {isSubmitting ? "Saving..." : (editingProductId ? "Update Product" : "Save Product")}
                        </button>
                        <button
                            type="button"
                            className="products-btn-cancel flex items-center gap-2 outline-none"
                            onClick={editingProductId ? cancelEdit : () => navigate("/staff/products")}
                        >
                            <X size={16} /> Cancel
                        </button>
                    </div>
                </form>
            </div>

            {products.length > 0 && (
                <div className="mt-12 animate-fade-in">
                    <h2 className="text-xl font-black mb-4 flex items-center gap-2 text-[#0F172A]">
                        <PackageSearch className="text-[#007A5E]" size={22} /> All Products
                    </h2>
                    <div className="bg-white/90 backdrop-blur-xl border border-white/40 rounded-2xl overflow-hidden shadow-sm">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[#0F172A]/5 text-[#0F172A] text-sm uppercase tracking-widest font-black">
                                    <th className="p-4 border-b border-[#0F172A]/5 text-center w-16">
                                        Image
                                    </th>
                                    <th className="p-4 border-b border-[#0F172A]/5">
                                        Product ID & Name
                                    </th>
                                    <th className="p-4 border-b border-[#0F172A]/5">Category</th>
                                    <th className="p-4 border-b border-[#0F172A]/5">Prices</th>
                                    <th className="p-4 border-b border-[#0F172A]/5">Stock</th>
                                    <th className="p-4 border-b border-[#0F172A]/5 text-right">
                                        Action
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.map((item, idx) => (
                                    <tr key={idx} className={`transition-colors ${editingProductId === (item.productId || item.id) ? 'bg-[#007A5E]/10' : 'hover:bg-[#007A5E]/5'}`}>
                                        <td className="p-4 border-b border-[#0F172A]/5 flex justify-center">
                                            <div className="w-12 h-12 bg-white rounded-xl shadow-sm overflow-hidden flex items-center justify-center">
                                                <img
                                                    src={
                                                        item.imageUrl ||
                                                        "https://via.placeholder.com/150?text=No+Img"
                                                    }
                                                    alt={item.productName || item.name}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        e.target.src =
                                                            "https://via.placeholder.com/150?text=x";
                                                    }}
                                                />
                                            </div>
                                        </td>
                                        <td className="p-4 border-b border-[#0F172A]/5">
                                            <div className="font-bold text-[#007A5E] text-sm tracking-wider mb-1">
                                                {item.productId || item.id}
                                            </div>
                                            <div className="font-black text-[#0F172A]">
                                                {item.productName || item.name}
                                            </div>
                                        </td>
                                        <td className="p-4 border-b border-[#0F172A]/5">
                                            <div className="text-base font-bold text-[#0F172A]/80">
                                                {item.mainCategory || item.category}
                                            </div>
                                            <div className="text-sm font-bold text-[#0F172A]/40 uppercase tracking-wide">
                                                {item.subCategory}
                                            </div>
                                        </td>
                                        <td className="p-4 border-b border-[#0F172A]/5">
                                            <div className="text-base">
                                                <span className="text-[#0F172A]/40 font-black text-xs uppercase">
                                                    Cost:
                                                </span>{" "}
                                                <span className="font-bold">Rs {item.costPrice ?? 0}</span>
                                            </div>
                                            <div className="text-base text-[#007A5E]">
                                                <span className="opacity-60 font-black text-xs uppercase">
                                                    Sell:
                                                </span>{" "}
                                                <span className="font-bold">
                                                    Rs {item.sellingPrice ?? item.price ?? 0}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4 border-b border-[#0F172A]/5">
                                            <div className="text-base">
                                                <span className="text-[#0F172A]/60 font-bold">{item.stock ?? 0}</span>/
                                                <span className="text-[#0F172A]/40 text-sm">Stock</span>
                                            </div>
                                        </td>
                                        <td className="p-4 border-b border-[#0F172A]/5 text-right">
                                            <button
                                                onClick={() => handleEditClick(item)}
                                                className="px-4 py-2 rounded-xl bg-[#0F172A]/5 text-[#0F172A] hover:bg-[#007A5E] hover:text-white font-bold text-sm transition-all flex items-center gap-2 ml-auto outline-none"
                                            >
                                                <Pencil size={14} /> Edit
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AddProduct;
