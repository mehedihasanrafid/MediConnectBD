import { useCallback, useEffect, useState } from "react";

import { adminApi } from "../../../api/admin";
import { getErrorMessage } from "../../../shared/utils/apiError";

export interface AdminUserItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: "ACTIVE" | "PENDING" | "SUSPENDED";
  roles: string[];
  createdAt: string;
}

interface AdminUsersResponse {
  items: AdminUserItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Custom hook managing admin user search, role/status filters, and account status transitions.
 */
export function useAdminUsers() {
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "30" });
      if (search.trim()) params.set("search", search.trim());
      if (role) params.set("role", role);
      if (status) params.set("status", status);
      const res = await adminApi.listUsers<AdminUsersResponse>(params.toString());
      setUsers(res.items);
    } catch (caught) {
      setError(getErrorMessage(caught, "Could not load user accounts."));
    } finally {
      setLoading(false);
    }
  }, [search, role, status]);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ limit: "30" });
    if (search.trim()) params.set("search", search.trim());
    if (role) params.set("role", role);
    if (status) params.set("status", status);

    void adminApi
      .listUsers<AdminUsersResponse>(params.toString())
      .then((res) => {
        if (!cancelled) setUsers(res.items);
      })
      .catch((caught) => {
        if (!cancelled) setError(getErrorMessage(caught, "Could not load user accounts."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [search, role, status]);

  const handleStatusChange = useCallback(
    async (userId: string, nextStatus: "ACTIVE" | "PENDING" | "SUSPENDED") => {
      setBusyId(userId);
      setError(null);
      setNotice(null);
      try {
        await adminApi.updateUserStatus(userId, nextStatus);
        setNotice(`Account status updated to ${nextStatus}.`);
        await loadUsers();
      } catch (caught) {
        setError(getErrorMessage(caught, "Could not update user status."));
      } finally {
        setBusyId(null);
      }
    },
    [loadUsers],
  );

  return {
    users,
    search,
    setSearch,
    role,
    setRole,
    status,
    setStatus,
    loading,
    busyId,
    error,
    notice,
    handleStatusChange,
  };
}
