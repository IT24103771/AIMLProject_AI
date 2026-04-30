export const TOKEN_KEY = "invigo_token";
export const USER_KEY = "invigo_user";

export const getCurrentUser = () => {
    const userStr = localStorage.getItem(USER_KEY);
    if (!userStr) return null;

    try {
        return JSON.parse(userStr);
    } catch {
        return null;
    }
};

export const getToken = () => localStorage.getItem(TOKEN_KEY);

export const isLoggedIn = () => {
    return !!getToken() && !!getCurrentUser();
};

export const hasRole = (...roles) => {
    const user = getCurrentUser();
    if (!user?.role) return false;

    const allowed = roles.map((role) => role.trim().toUpperCase());
    return allowed.includes(user.role.trim().toUpperCase());
};

export const saveSession = (authResult) => {
    localStorage.setItem(TOKEN_KEY, authResult.token);

    localStorage.setItem(
        USER_KEY,
        JSON.stringify({
            id: authResult.id,
            username: authResult.username,
            name: authResult.name,
            role: authResult.role,
            roleName: authResult.roleName,
            status: authResult.status,
            email: authResult.email,
        })
    );
};

export const updateStoredUser = (updates) => {
    const current = getCurrentUser();
    if (!current) return;

    localStorage.setItem(USER_KEY, JSON.stringify({ ...current, ...updates }));
};

export const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
};