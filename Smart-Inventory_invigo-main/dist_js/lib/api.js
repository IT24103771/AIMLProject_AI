const API_BASE_URL = "http://localhost:8080/api";
// Login a user
export const loginUser = async (username, password) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Invalid credentials");
    }
    return response.json();
};
// Fetch all users
export const getUsers = async () => {
    const response = await fetch(`${API_BASE_URL}/admin/users`);
    if (!response.ok) {
        throw new Error("Failed to fetch users");
    }
    return response.json();
};
// Create a new user
export const createUser = async (userData) => {
    const response = await fetch(`${API_BASE_URL}/admin/users`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to create user");
    }
    return response.json();
};
// Update an existing user
export const updateUser = async (id, userData) => {
    const response = await fetch(`${API_BASE_URL}/admin/users/${id}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to update user");
    }
    return response.json();
};
// Delete a user (revoke access)
export const deleteUser = async (id) => {
    const response = await fetch(`${API_BASE_URL}/admin/users/${id}`, {
        method: "DELETE",
    });
    if (!response.ok) {
        throw new Error("Failed to delete user");
    }
};
/** Fetch the logged-in staff member's own profile */
export const getStaffProfile = async (id) => {
    const response = await fetch(`${API_BASE_URL}/staff/profile/${id}`);
    if (!response.ok) {
        throw new Error("Failed to fetch profile");
    }
    return response.json();
};
/** Update name and/or password for the logged-in staff member */
export const updateStaffProfile = async (id, payload) => {
    const response = await fetch(`${API_BASE_URL}/staff/profile/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to update profile");
    }
    return response.json();
};
// --- Product Management API ---
export const getProducts = async () => {
    const response = await fetch(`${API_BASE_URL}/products`);
    if (!response.ok) {
        throw new Error("Failed to fetch products");
    }
    return response.json();
};
export const createProduct = async (productData) => {
    const response = await fetch(`${API_BASE_URL}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productData),
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to create product");
    }
    return response.json();
};
export const updateProduct = async (id, productData) => {
    const response = await fetch(`${API_BASE_URL}/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productData),
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to update product");
    }
    return response.json();
};
export const deleteProduct = async (id) => {
    const response = await fetch(`${API_BASE_URL}/products/${id}`, {
        method: "DELETE",
    });
    if (!response.ok) {
        throw new Error("Failed to delete product");
    }
};
