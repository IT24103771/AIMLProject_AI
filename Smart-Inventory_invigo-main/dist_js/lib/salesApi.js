const API_BASE_URL = "http://localhost:8080/api";
export const getProducts = async () => {
    const response = await fetch(`${API_BASE_URL}/products`);
    if (!response.ok)
        throw new Error("Failed to fetch products");
    return response.json();
};
export const getAvailableQuantity = async (productId) => {
    const response = await fetch(`${API_BASE_URL}/products/${productId}/available-quantity`);
    if (!response.ok)
        throw new Error("Failed to fetch available quantity");
    const data = await response.json();
    return data.availableQuantity;
};
export const getSalesHistory = async () => {
    const response = await fetch(`${API_BASE_URL}/sales`);
    if (!response.ok)
        throw new Error("Failed to fetch sales history");
    const sales = await response.json();
    return sales.map(s => ({
        ...s,
        productId: String(s.product.id),
        productName: s.product.name,
    })).sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime() || b.id - a.id);
};
export const recordPosSale = async (request) => {
    const response = await fetch(`${API_BASE_URL}/sales/pos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || "Failed to record sale");
    }
    return response.json();
};
export const voidSale = async (saleId) => {
    const response = await fetch(`${API_BASE_URL}/sales/${saleId}/void`, {
        method: "POST",
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || "Failed to void sale");
    }
    return response.json();
};
export const editSaleQuantity = async (saleId, newQuantity) => {
    const response = await fetch(`${API_BASE_URL}/sales/${saleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newQuantity }),
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || "Failed to edit sale");
    }
    return response.json();
};
