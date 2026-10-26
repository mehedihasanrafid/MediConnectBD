/**
 * Admin platform overview dashboard. Displays operational totals for users, doctors,
 * appointments, platform revenue (gross, 15% commission, net doctor payout), and refund requests.
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "../../api/admin";
import { Alert, Card, Spinner } from "../../components/ui";
import type { AdminOverview } from "../../shared/types";
import { getErrorMessage } from "../../shared/utils/apiError";
import { formatMoney } from "../../shared/utils/format";

export function AdminOverviewPage() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void adminApi
      .getOverview()
      .then((res) => {
        if (!cancelled) setOverview(res);
      })
      .catch((caught) => {
        if (!cancelled) setError(getErrorMessage(caught, "Could not load platform overview."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <Spinner label="Loading platform metrics…" />;
  if (error) return <Alert kind="error">{error}</Alert>;
  if (!overview) return null;

  return (
    <div className="page">
      <header className="page-header">
        <h1>Platform overview</h1>
        <p className="muted">Real-time operational totals across MediConnect BD.</p>
      </header>

      <div className="grid">
        <Card>
          <div className="row space-between">
            <h2>Users</h2>
            <Link className="btn btn-secondary" to="/admin/users">
              Manage
            </Link>
          </div>
          <dl className="facts">
            <div>
              <dt>Total</dt>
              <dd>{overview.users.total}</dd>
            </div>
            <div>
              <dt>Active</dt>
              <dd>{overview.users.active}</dd>
            </div>
            <div>
              <dt>Pending</dt>
              <dd>{overview.users.pending}</dd>
            </div>
            <div>
              <dt>Suspended</dt>
              <dd>{overview.users.suspended}</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <div className="row space-between">
            <h2>Doctors</h2>
            <Link className="btn btn-secondary" to="/admin/applications">
              Review queue
            </Link>
          </div>
          <dl className="facts">
            <div>
              <dt>Total</dt>
              <dd>{overview.doctors.total}</dd>
            </div>
            <div>
              <dt>Approved</dt>
              <dd>{overview.doctors.approved}</dd>
            </div>
            <div>
              <dt>Pending review</dt>
              <dd>{overview.doctors.pendingReview}</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <div className="row space-between">
            <h2>Appointments</h2>
            <Link className="btn btn-secondary" to="/admin/operations">
              View all
            </Link>
          </div>
          <dl className="facts">
            <div>
              <dt>Total</dt>
              <dd>{overview.appointments.total}</dd>
            </div>
            <div>
              <dt>Confirmed</dt>
              <dd>{overview.appointments.confirmed}</dd>
            </div>
            <div>
              <dt>Completed</dt>
              <dd>{overview.appointments.completed}</dd>
            </div>
            <div>
              <dt>Cancelled</dt>
              <dd>{overview.appointments.cancelled}</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <h2>Payments & 15% Commission</h2>
          <dl className="facts">
            <div>
              <dt>Succeeded</dt>
              <dd>{overview.payments.succeeded}</dd>
            </div>
            <div>
              <dt>Gross volume</dt>
              <dd>{formatMoney(overview.payments.grossAmount)}</dd>
            </div>
            <div>
              <dt>Commission (15%)</dt>
              <dd>{formatMoney(overview.payments.commissionAmount)}</dd>
            </div>
            <div>
              <dt>Doctor net</dt>
              <dd>{formatMoney(overview.payments.netAmount)}</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <div className="row space-between">
            <h2>Refund requests</h2>
            <Link className="btn btn-secondary" to="/admin/operations">
              Process refunds
            </Link>
          </div>
          <dl className="facts">
            <div>
              <dt>Requested</dt>
              <dd>{overview.refunds.requested}</dd>
            </div>
            <div>
              <dt>Total requested</dt>
              <dd>{formatMoney(overview.refunds.totalAmount)}</dd>
            </div>
          </dl>
        </Card>
      </div>
    </div>
  );
}
