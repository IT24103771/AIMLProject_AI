const API_BASE_URL = "http://localhost:8080/api";

export const authHeaders = (extra = {}) => {
    const token = localStorage.getItem("invigo_token");

    const headers = {
        "Content-Type": "application/json",
        ...extra,
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    return headers;
};

export const authFetch = async (url, options = {}) => {
    const response = await fetch(url, {
        ...options,
        headers: authHeaders(options.headers || {}),
    });

    if (response.status === 401 || response.status === 403) {
        localStorage.removeItem("invigo_token");
        localStorage.removeItem("invigo_user");
    }

    return response;
};

// LOGIN
export const loginUser = async (username, password) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.message || "Invalid credentials");
    }

    return data;
};

// USERS
export const getUsers = async () => {
    const response = await authFetch(`${API_BASE_URL}/admin/users`);
    const data = await response.json().catch(() => []);

    if (!response.ok) {
        throw new Error(data.message || "Failed to fetch users");
    }

    return data;
};

export const createUser = async (userData) => {
    const response = await authFetch(`${API_BASE_URL}/admin/users`, {
        method: "POST",
        body: JSON.stringify(userData),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.message || "Failed to create user");
    }

    return data;
};

export const updateUser = async (id, userData) => {
    const response = await authFetch(`${API_BASE_URL}/admin/users/${id}`, {
        method: "PUT",
        body: JSON.stringify(userData),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.message || "Failed to update user");
    }

    return data;
};

export const deleteUser = async (id) => {
    const response = await authFetch(`${API_BASE_URL}/admin/users/${id}`, {
        method: "DELETE",
    });

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Failed to delete user");
    }
};

export const unlockUser = async (id) => {
    const response = await authFetch(`${API_BASE_URL}/admin/users/${id}/unlock`, {
        method: "PUT",
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.message || "Failed to unlock user");
    }

    return data;
};

// STAFF PROFILE
export const getStaffProfile = async (id) => {
    const response = await authFetch(`${API_BASE_URL}/staff/profile/${id}`);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.message || "Failed to fetch profile");
    }

    return data;
};

export const updateStaffProfile = async (id, payload) => {
    const response = await authFetch(`${API_BASE_URL}/staff/profile/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.message || "Failed to update profile");
    }

    return data;
};

// FORGOT PASSWORD / OTP
export const forgotPassword = async (email) => {
    const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.message || "Failed to send OTP");
    }

    return data;
};

export const verifyOtp = async (email, otp) => {
    const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.message || "OTP verification failed");
    }

    return data;
};

export const resetPassword = async (email, otp, newPassword) => {
    const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.message || "Password reset failed");
    }

    return data;
};