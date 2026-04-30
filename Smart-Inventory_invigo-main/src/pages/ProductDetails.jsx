import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Check, ArrowLeft } from "lucide-react";
import { authFetch } from "@/lib/api";

const API = "/api/products";

const DetailRow = ({ label, value }) => (
    <div className="flex border-b border-gray-100 py-4 text-sm">
        <span className="text-gray-500 w-1/3 font-semibold">{label}</span>
        <span className="text-gray-900 font-bold">{value}</span>
    </div>
);

const DetailRowIcon = ({ label, value, iconColor }) => (
    <div className="flex border-b border-gray-100 py-4 items-center gap-3 text-sm">
        <div className={`w-2 h-2 rounded-full ${iconColor}`}></div>
        <span className="text-gray-500 w-[calc(33.333%-1.25rem)] font-semibold">{label}</span>
        <span className="text-gray-900 font-bold">{value}</span>
    </div>
);

const DetailRowCheck = ({ label, value }) => (
    <div className="flex border-b border-gray-100 py-4 items-center gap-2 text-sm">
        <Check size={14} strokeWidth={4} className="text-[#007A5E]" />
        <span className="text-gray-500 w-[calc(33.333%-1.5rem)] font-semibold">{label}</span>
        <span className="text-gray-900 font-bold">{value}</span>
    </div>
);

const ProductDetails = () => {
    const { id: paramId } = useParams();
    const location = useLocation();
    const id = paramId || location.pathname.split('/').pop();
    
    const navigate = useNavigate();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                setLoading(true);
                const res = await authFetch(API);
                if (!res.ok) throw new Error("Could not fetch product");
                const data = await res.json();
                const pd = data.find((p) => String(p.productId) === String(id) || String(p.id) === String(id));

                if (pd) {
                    setProduct({
                        ...pd,
                        productId: pd.productId || pd.id || id,
                        productName: pd.productName || pd.name || "",
                        mainCategory: pd.mainCategory || pd.category || "",
                        subCategory: pd.subCategory || "None",
                        supplier: pd.supplier || "Unknown",
                        costPrice: pd.costPrice || 0,
                        sellingPrice: pd.sellingPrice || pd.price || 0,
                        imageUrl: pd.imageUrl || "",
                        reorderLevel: pd.reorderLevel || 0,
                        stock: pd.stock,
                        sold: pd.sold,
                        discount: pd.discount,
                    });
                } else {
                    setError("Product not found.");
                }
            } catch (err) {
                setError("Product details could not be loaded.");
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchProduct();
    }, [id]);

    const handleDelete = async () => {
        if (!window.confirm("Are you sure you want to delete this product?")) return;
        try {
            await authFetch(`${API}/${id}`, { method: "DELETE" });
            navigate("/staff/products");
        } catch (err) {
            alert("Delete failed. Please try again.");
        }
    };

    if (loading) {
        return <div className="p-8 font-bold text-center mt-20 text-[#0F172A]">Loading product details...</div>;
    }

    if (error || !product) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center mt-20">
                <h2 className="text-xl font-bold text-red-600 mb-4">{error}</h2>
                <button className="px-6 py-2 bg-[#0F172A]/10 rounded-xl hover:bg-[#0F172A]/20 transition-all font-bold" onClick={() => navigate("/staff/products")}>Return to Products</button>
            </div>
        );
    }

    // Determine missing data states
    const hasSalesInventory = product.stock !== undefined && product.stock !== null && product.stock !== "N/A" && product.sold !== undefined && product.sold !== null && product.sold !== "N/A";
    const hasDiscount = product.discount && product.discount !== "N/A" && product.discount !== "No active discount";

    const costPriceStr = `Rs. ${Number(product.costPrice).toFixed(2)}`;
    const sellingPriceStr = `Rs. ${Number(product.sellingPrice).toFixed(2)}`;
    const totalSalesStr = hasSalesInventory ? `Rs. ${(Number(product.sold) * Number(product.sellingPrice)).toFixed(2)}` : "";

    return (
        <div className="bg-white text-[#0F172A] min-h-[85vh] rounded-[1.5rem] p-6 lg:p-10 font-sans shadow-xl border border-gray-100">
            {/* Breadcrumbs */}
            <div className="text-gray-500 text-xs sm:text-sm mb-8 flex items-center gap-2 cursor-pointer font-bold tracking-wide uppercase">
                <span className="hover:text-[#007A5E] transition-colors" onClick={() => navigate('/staff')}>Dashboard</span> 
                <span className="text-gray-300">/</span> 
                <span className="hover:text-[#007A5E] transition-colors" onClick={() => navigate('/staff/products')}>Products</span> 
                <span className="text-gray-300">/</span> 
                <span className="text-[#007A5E]">Product Details</span>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => navigate('/staff/products')} 
                        className="p-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors text-gray-700 flex-shrink-0 shadow-sm"
                        title="Back to Products"
                    >
                        <ArrowLeft size={22} />
                    </button>
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 capitalize">{product.productName}</h1>
                        <p className="text-sm text-gray-500 font-medium mt-1">Product Details</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <button 
                        className="bg-[#007A5E] hover:bg-[#00634a] text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-sm" 
                        onClick={() => navigate(`/staff/products/edit/${id}`)}
                    >
                        Edit Product
                    </button>
                    <button 
                        className="bg-red-500 hover:bg-red-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-sm" 
                        onClick={handleDelete}
                    >
                        Delete
                    </button>
                </div>
            </div>

            {/* Content Container */}
            <div className="border border-gray-100 rounded-3xl p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 bg-gray-50">
                
                {/* Left Column (Image) */}
                <div className="lg:col-span-5 flex flex-col gap-4">
                    <div className="bg-white rounded-2xl aspect-square flex items-center justify-center p-6 lg:p-12 border border-gray-100 shadow-sm">
                        <img 
                            src={product.imageUrl || "https://via.placeholder.com/600x600?text=No+Preview"} 
                            alt={product.productName} 
                            className="max-w-full max-h-full object-contain drop-shadow-xl hover:scale-105 transition-transform duration-500" 
                            onError={(e) => { e.target.src = "https://via.placeholder.com/600x600?text=No+Preview"; }}
                        />
                    </div>
                    {/* Thumbnail */}
                    <div className="flex gap-4 mt-2">
                        <div className="w-20 h-20 bg-white rounded-xl border-2 border-[#007A5E] flex items-center justify-center p-2 cursor-pointer shadow-sm overflow-hidden">
                            <img 
                                src={product.imageUrl || "https://via.placeholder.com/600x600?text=No+Preview"} 
                                alt="thumb" 
                                className="max-w-full max-h-full object-contain" 
                                onError={(e) => { e.target.src = "https://via.placeholder.com/600x600?text=No+Preview"; }}
                            />
                        </div>
                    </div>
                </div>

                {/* Right Column (Details) */}
                <div className="lg:col-span-7 flex flex-col gap-0">
                    <DetailRow label="Product ID:" value={product.productId} />
                    <DetailRow label="Product Name:" value={product.productName} />
                    <DetailRow label="Main Category:" value={product.mainCategory} />
                    <DetailRow label="Sub Category:" value={product.subCategory} />
                    <DetailRow label="Cost Price:" value={costPriceStr} />
                    <DetailRow label="Selling Price:" value={sellingPriceStr} />

                    {/* Sales & Inventory */}
                    <h3 className="text-[#0F172A] font-black text-lg mt-8 mb-2 tracking-tight">Sales & Inventory</h3>
                    {!hasSalesInventory ? (
                        <div className="text-gray-400 text-sm py-4 border-b border-gray-100 italic font-medium">
                            Not included yet
                        </div>
                    ) : (
                        <>
                            <DetailRowIcon label="Total Sold:" value={`${product.sold} Units`} iconColor="bg-orange-500" />
                            <DetailRowIcon label="Stock Remaining:" value={`${product.stock} Units`} iconColor="bg-[#007A5E]" />
                            <DetailRowIcon label="Total Sales:" value={totalSalesStr} iconColor="bg-[#007A5E]" />
                        </>
                    )}

                    {/* Discount Details */}
                    <h3 className="text-[#0F172A] font-black text-lg mt-8 mb-2 tracking-tight">Discount Details</h3>
                    {!hasDiscount ? (
                        <div className="text-gray-400 text-sm py-4 border-b border-gray-100 italic font-medium">
                            Not included yet
                        </div>
                    ) : (
                        <>
                            <DetailRowCheck label="Current Discount:" value={product.discount} />
                            <DetailRowCheck label="Discount Price:" value={"Calculated at checkout"} />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProductDetails;
