/**
 * Admin operations console for monitoring all appointments, payments (with 10% commission),
 * and processing refund requests.
 */

import { Alert } from "../../shared/ui/Alert";
import { Button } from "../../shared/ui/Button";
import { Cluster } from "../../shared/ui/Layout";
import { Page, PageHeader } from "../../shared/ui/Page";
import { Spinner } from "../../shared/ui/Spinner";
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
    <Page>
      <PageHeader
        eyebrow="Platform Operations"
        title="Bookings, payments & refunds"
        description="Inspect platform transactions, commission splits, and process refund requests."
      />

      <Cluster gap={2}>
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
      </Cluster>

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
    </Page>
  );
}
