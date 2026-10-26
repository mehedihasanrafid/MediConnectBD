/**
 * Admin user management page. Filter accounts by role, status, or search term, and activate,
 * pend, or suspend accounts (self-suspension is blocked by the backend).
 */

import { useCallback, useEffect, useState } from "react";
import { adminApi } from "../../api/admin";
import { Alert, Badge, Button, Card, EmptyState, Field, Spinner } from "../../components/ui";
import { getErrorMessage } from "../../shared/utils/apiError";
import { formatDhakaDate } from "../../shared/utils/format";

interface AdminUserItem {
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

function statusTone(status: string): string {
  if (status === "ACTIVE") return "success";
  if (status === "PENDING") return "warning";
  return "danger";
}

export function AdminUsersPage() {
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
    void loadUsers();
  }, [loadUsers]);

  async function handleStatusChange(
    userId: string,
    nextStatus: "ACTIVE" | "PENDING" | "SUSPENDED",
  ) {
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
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>User accounts</h1>
        <p className="muted">Search and manage patient, doctor, and administrator accounts.</p>
      </header>

      <Card className="filters">
        <Field
          label="Search (email or name)"
          value={search}
          onChange={setSearch}
          placeholder="Search users"
        />
        <label className="field">
          <span>Role</span>
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">All roles</option>
            <option value="PATIENT">PATIENT</option>
            <option value="DOCTOR">DOCTOR</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </label>
        <label className="field">
          <span>Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="PENDING">PENDING</option>
            <option value="SUSPENDED">SUSPENDED</option>
          </select>
        </label>
      </Card>

      {error && <Alert kind="error">{error}</Alert>}
      {notice && <Alert kind="success">{notice}</Alert>}
      {loading && <Spinner label="Loading users…" />}
      {!loading && users.length === 0 && <EmptyState>No matching user accounts.</EmptyState>}

      {!loading && users.length > 0 && (
        <Card>
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Roles</th>
                <th>Joined</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    {u.firstName} {u.lastName}
                  </td>
                  <td>{u.email}</td>
                  <td>{u.roles.join(", ")}</td>
                  <td>{formatDhakaDate(u.createdAt)}</td>
                  <td>
                    <Badge tone={statusTone(u.status)}>{u.status}</Badge>
                  </td>
                  <td>
                    <div className="row">
                      {u.status !== "ACTIVE" && (
                        <Button
                          variant="secondary"
                          disabled={busyId === u.id}
                          onClick={() => void handleStatusChange(u.id, "ACTIVE")}
                        >
                          Activate
                        </Button>
                      )}
                      {u.status !== "SUSPENDED" && (
                        <Button
                          variant="danger"
                          disabled={busyId === u.id}
                          onClick={() => void handleStatusChange(u.id, "SUSPENDED")}
                        >
                          Suspend
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
