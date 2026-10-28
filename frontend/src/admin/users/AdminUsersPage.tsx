/**
 * Admin user management page. Filter accounts by role, status, or search term, and activate,
 * pend, or suspend accounts (self-suspension is blocked by the backend).
 */

import { Alert } from "../../components/ui";
import { Card } from "../../shared/ui/Card";
import { EmptyState } from "../../shared/ui/EmptyState";
import { FormField, Input, Select } from "../../shared/ui/Form";
import { Page, PageHeader } from "../../shared/ui/Page";
import { Spinner } from "../../shared/ui/Spinner";
import styles from "./AdminUsersPage.module.css";
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
    <Page>
      <PageHeader
        eyebrow="Platform Operations"
        title="User accounts"
        description="Search and manage patient, doctor, and administrator accounts."
      />

      <Card>
        <div className={styles.filterGrid}>
          <FormField label="Search (email or name)">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users"
            />
          </FormField>
          <FormField label="Role">
            <Select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="">All roles</option>
              <option value="PATIENT">PATIENT</option>
              <option value="DOCTOR">DOCTOR</option>
              <option value="ADMIN">ADMIN</option>
            </Select>
          </FormField>
          <FormField label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="PENDING">PENDING</option>
              <option value="SUSPENDED">SUSPENDED</option>
            </Select>
          </FormField>
        </div>
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
    </Page>
  );
}
