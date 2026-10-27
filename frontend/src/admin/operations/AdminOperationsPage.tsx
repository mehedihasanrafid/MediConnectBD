/**
 * Admin operations console for monitoring all appointments, payments (with 15% commission),
 * and processing refund requests.
 */

import { Alert, Button, Spinner } from "../../components/ui";
import { AdminAppointmentsTable } from "./components/AdminAppointmentsTable";
import { AdminPaymentsTable } from "./components/AdminPaymentsTable";
import { AdminRefundsTable } from "./components/AdminRefundsTable";
import { useAdminOperations } from "./hooks/useAdminOperations";

export function AdminOperationsPage() {
  const {
    tab,
    setTab,
    appointments,
    payments,
    refunds,
    loading,
    busyId,
    error,
    notice,
    handleAdminCancelAppointment,
    handleSubmitRefund,
  } = useAdminOperations();

  return (
    <div className="page">
      <header className="page-header">
        <p className="eyebrow">Platform Operations</p>
        <h1>Bookings, payments & refunds</h1>
        <p className="muted">
          Inspect platform transactions, commission splits, and process refund requests.
        </p>
      </header>

      <div className="row">
        <Button
          variant={tab === "APPOINTMENTS" ? "primary" : "secondary"}
          onClick={() => setTab("APPOINTMENTS")}
        >
          Appointments ({appointments.length})
        </Button>
        <Button
          variant={tab === "PAYMENTS" ? "primary" : "secondary"}
          onClick={() => setTab("PAYMENTS")}
        >
          Payments ({payments.length})
        </Button>
        <Button
          variant={tab === "REFUNDS" ? "primary" : "secondary"}
          onClick={() => setTab("REFUNDS")}
        >
          Refunds ({refunds.length})
        </Button>
      </div>

      {error && <Alert kind="error">{error}</Alert>}
      {notice && <Alert kind="success">{notice}</Alert>}
      {loading && <Spinner label="Loading operational records…" />}

      {!loading && tab === "APPOINTMENTS" && (
        <AdminAppointmentsTable
          appointments={appointments}
          busyId={busyId}
          onCancelAppointment={handleAdminCancelAppointment}
        />
      )}

      {!loading && tab === "PAYMENTS" && <AdminPaymentsTable payments={payments} />}

      {!loading && tab === "REFUNDS" && (
        <AdminRefundsTable
          refunds={refunds}
          busyId={busyId}
          onSubmitRefund={handleSubmitRefund}
        />
      )}
    </div>
  );
}
