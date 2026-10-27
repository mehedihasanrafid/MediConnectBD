import { Badge, Button, Card } from "../../../components/ui";
import { formatDhakaDate } from "../../../shared/utils/format";
import type { AdminUserItem } from "../hooks/useAdminUsers";

function statusTone(status: string): string {
  if (status === "ACTIVE") return "success";
  if (status === "PENDING") return "warning";
  return "danger";
}

interface AdminUsersTableProps {
  users: AdminUserItem[];
  busyId: string | null;
  onStatusChange: (
    userId: string,
    nextStatus: "ACTIVE" | "PENDING" | "SUSPENDED",
  ) => Promise<void>;
}

export function AdminUsersTable({
  users,
  busyId,
  onStatusChange,
}: AdminUsersTableProps) {
  return (
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
                      onClick={() => void onStatusChange(u.id, "ACTIVE")}
                    >
                      Activate
                    </Button>
                  )}
                  {u.status !== "SUSPENDED" && (
                    <Button
                      variant="danger"
                      disabled={busyId === u.id}
                      onClick={() => void onStatusChange(u.id, "SUSPENDED")}
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
  );
}
