/**
 * Admin user management page. Filter accounts by role, status, or search term, and activate,
 * pend, or suspend accounts (self-suspension is blocked by the backend).
 */

import { Alert, Card, EmptyState, Field, Spinner } from "../../components/ui";
import { AdminUsersTable } from "./components/AdminUsersTable";
import { useAdminUsers } from "./hooks/useAdminUsers";

export function AdminUsersPage() {
  const {
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
  } = useAdminUsers();

  return (
    <div className="page">
      <header className="page-header">
        <p className="eyebrow">Platform Operations</p>
        <h1>User accounts</h1>
        <p className="muted">
          Search and manage patient, doctor, and administrator accounts.
        </p>
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
        <AdminUsersTable
          users={users}
          busyId={busyId}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}
