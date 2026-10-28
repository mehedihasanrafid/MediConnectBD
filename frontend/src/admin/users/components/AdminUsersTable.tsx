import { Badge, type BadgeTone } from "../../../shared/ui/Badge";
import { Button } from "../../../shared/ui/Button";
import { Card } from "../../../shared/ui/Card";
import { Cluster } from "../../../shared/ui/Layout";
import { Table } from "../../../shared/ui/Table";
import { formatDhakaDate } from "../../../shared/utils/format";
import type { AdminUserItem } from "../hooks/useAdminUsers";

function statusTone(status: string): BadgeTone {
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
      <Table>
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
                <Cluster gap={2}>
                  {u.status !== "ACTIVE" && (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={busyId === u.id}
                      onClick={() => void onStatusChange(u.id, "ACTIVE")}
                    >
                      Activate
                    </Button>
                  )}
                  {u.status !== "SUSPENDED" && (
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={busyId === u.id}
                      onClick={() => void onStatusChange(u.id, "SUSPENDED")}
                    >
                      Suspend
                    </Button>
                  )}
                </Cluster>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Card>
  );
}
