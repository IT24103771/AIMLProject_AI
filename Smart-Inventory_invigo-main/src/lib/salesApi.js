const API_BASE_URL = "http://localhost:8080/api";

const authHeaders = (extra = {}) => {
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

const authFetch = async (url, options = {}) => {
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

const parseError = async (response, fallbackMessage) => {
  try {
    const data = await response.json();
    return data.message || data.error || fallbackMessage;
  } catch {
    try {
      const text = await response.text();
      return text || fallbackMessage;
    } catch {
      return fallbackMessage;
    }
  }
};

// ─── Product & Inventory Helpers ────────────────────────────────────────────

export const getProducts = async () => {
  const response = await authFetch(`${API_BASE_URL}/products`);
  if (!response.ok) {
    throw new Error(await parseError(response, "Failed to fetch products"));
  }
  return response.json();
};

export const getBatchesByProduct = async (productId) => {
  const response = await authFetch(`${API_BASE_URL}/inventory/by-product/${productId}`);
  if (!response.ok) {
    throw new Error(await parseError(response, "Failed to fetch available batches"));
  }
  return response.json();
};

export const getAvailableQuantity = async (productId) => {
    const batches = await getBatchesByProduct(productId);
    return batches.reduce((sum, b) => sum + b.quantity, 0);
};

export const getDiscountLookup = async (productId, batchId) => {
  const response = await authFetch(
    `${API_BASE_URL}/discounts/lookup?productId=${productId}&batchId=${batchId}`
  );

  if (!response.ok) {
    return { discountPercent: 0, note: "" };
  }

  return response.json();
};

// ─── Legacy Single-Sale Endpoints (backward compat) ─────────────────────────

export const getSales = async () => {
  const response = await authFetch(`${API_BASE_URL}/sales`);
  if (!response.ok) {
    throw new Error(await parseError(response, "Failed to fetch sales history"));
  }
  return response.json();
};

export const createSale = async (payload) => {
  const response = await authFetch(`${API_BASE_URL}/sales`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "Could not save sale."));
  }

  return response.json();
};

export const updateSale = async (saleId, payload) => {
  const response = await authFetch(`${API_BASE_URL}/sales/${saleId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "Could not update sale."));
  }

  return response.json();
};

export const deleteSale = async (saleId) => {
  const response = await authFetch(`${API_BASE_URL}/sales/${saleId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "Could not delete sale."));
  }

  try { return await response.json(); } catch { return { success: true }; }
};

// ─── Bill-Based Endpoints ───────────────────────────────────────────────────

export const createBill = async (payload) => {
  const response = await authFetch(`${API_BASE_URL}/bills`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "Could not create bill."));
  }

  return response.json();
};

export const getBills = async (statusFilter) => {
  const params = statusFilter ? `?status=${statusFilter}` : "";
  const response = await authFetch(`${API_BASE_URL}/bills${params}`);
  if (!response.ok) {
    throw new Error(await parseError(response, "Failed to fetch bills"));
  }
  return response.json();
};

export const getBill = async (billId) => {
  const response = await authFetch(`${API_BASE_URL}/bills/${billId}`);
  if (!response.ok) {
    throw new Error(await parseError(response, "Failed to fetch bill"));
  }
  return response.json();
};

export const updateDraft = async (billId, payload) => {
  const response = await authFetch(`${API_BASE_URL}/bills/${billId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "Could not update draft."));
  }

  return response.json();
};

export const finalizeBill = async (billId) => {
  const response = await authFetch(`${API_BASE_URL}/bills/${billId}/finalize`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "Could not finalize bill."));
  }

  return response.json();
};

export const voidBill = async (billId, reason) => {
  const response = await authFetch(`${API_BASE_URL}/bills/${billId}/void`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "Could not void bill."));
  }

  return response.json();
};

export const deleteDraft = async (billId) => {
  const response = await authFetch(`${API_BASE_URL}/bills/${billId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "Could not delete draft."));
  }

  try { return await response.json(); } catch { return { success: true }; }
};

export const getReceipt = async (billId) => {
  const response = await authFetch(`${API_BASE_URL}/bills/${billId}/receipt`);
  if (!response.ok) {
    throw new Error(await parseError(response, "Failed to fetch receipt"));
  }
  return response.json();
};

export const getReceiptPdf = async (billId) => {
  const response = await authFetch(`${API_BASE_URL}/bills/${billId}/receipt/pdf`, {
    headers: { Accept: "application/pdf" },
  });
  if (!response.ok) {
    throw new Error(await parseError(response, "Failed to generate receipt PDF"));
  }
  return response.blob();
};

export const checkDuplicate = async (productId, saleDate, quantity, customerName) => {
  try {
    const params = new URLSearchParams({ productId, saleDate, quantity });
    if (customerName) params.append("customerName", customerName);
    const response = await authFetch(`${API_BASE_URL}/bills/check-duplicate?${params}`);
    if (!response.ok) return false;
    const data = await response.json();
    return data.isDuplicate;
  } catch {
    return false;
  }
};

// ─── Invigo Aliases ──────────────────────────────────────────────────────────

export const recordPosSale = async (request) => {
    const payload = {
        ...request,
        finalize: !request.asDraft,
        lines: request.items.map(i => ({ 
            productId: i.productId ? parseInt(String(i.productId)) : null, 
            batchId: i.batchId ? parseInt(String(i.batchId)) : null, 
            quantity: i.quantity 
        }))
    };
    return createBill(payload);
};

export const voidSale = async (billId, voidedBy, voidReason) => {
    return voidBill(billId, voidReason);
};

export const editSaleQuantity = async (saleId, newQuantity, editedBy, editReason) => {
    // Note: The target backend doesn't support editing a single sale line directly via ID 
    // for finalized bills. This is a legacy function in Invigo.
    // In our new system, we use updateBill for drafts.
    throw new Error("Direct line editing is disabled. Please update the full bill instead.");
};

export const updateBill = async (billGroupId, request) => {
    const payload = {
        ...request,
        lines: request.items.map(i => ({ 
            productId: i.productId ? parseInt(String(i.productId)) : null, 
            batchId: i.batchId ? parseInt(String(i.batchId)) : null, 
            quantity: i.quantity 
        }))
    };
    return updateDraft(billGroupId, payload);
};

export const finalizeDraft = async (billGroupId, finalizedBy) => {
    return finalizeBill(billGroupId);
};

export const getSalesHistory = async () => {
    // Fetch all finalized bills and flatten them into line items for the Invigo UI
    const bills = await getBills("FINALIZED");
    const lines = [];
    bills.forEach(bill => {
        bill.lines.forEach(line => {
            lines.push({
                ...line,
                saleGroupId: String(bill.id),
                billNumber: bill.billNumber,
                status: bill.status,
                saleDate: bill.saleDate,
                recordedBy: bill.createdBy,
                notes: bill.notes,
                customerName: bill.customerName,
                customerEmail: bill.customerEmail,
                lastEditedBy: null, // Target doesn't track this yet
                lineTotal: line.totalAmount
            });
        });
    });
    // Also fetch drafts to show in history
    const drafts = await getBills("DRAFT");
    drafts.forEach(bill => {
        bill.lines.forEach(line => {
            lines.push({
                ...line,
                saleGroupId: String(bill.id),
                billNumber: bill.billNumber,
                status: bill.status,
                saleDate: bill.saleDate,
                recordedBy: bill.createdBy,
                notes: bill.notes,
                customerName: bill.customerName,
                customerEmail: bill.customerEmail,
                lineTotal: line.totalAmount
            });
        });
    });
    return lines.sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime() || b.id - a.id);
};