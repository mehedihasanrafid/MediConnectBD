import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  ToastContainer,
  ToastProvider,
  useToast,
  type ToastItem,
} from "../ui";

describe("Global Toast System (Step 13)", () => {
  it("renders an accessible, visible live region with dismissible toasts", () => {
    const sampleToasts: ToastItem[] = [
      {
        id: "toast-1",
        message: "Appointment rescheduled to 10:30 AM.",
        kind: "success",
        duration: 5000,
      },
      {
        id: "toast-2",
        message: "Could not process cancellation request.",
        kind: "error",
        duration: 5000,
      },
      {
        id: "toast-3",
        message: "Review submitted.",
        kind: "info",
        duration: 5000,
      },
    ];

    const dismissMock = vi.fn();
    const html = renderToString(
      <ToastContainer toasts={sampleToasts} onDismiss={dismissMock} />,
    );

    // Live region container attributes
    expect(html).toContain('class="toast-container"');
    expect(html).toContain('role="region"');
    expect(html).toContain('aria-label="Notifications"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('aria-atomic="false"');

    // Success toast
    expect(html).toContain("Appointment rescheduled to 10:30 AM.");
    expect(html).toContain('role="status"');
    expect(html).toContain('class="toast toast-success"');
    expect(html).toContain('data-testid="toast-success"');

    // Error toast
    expect(html).toContain("Could not process cancellation request.");
    expect(html).toContain('role="alert"');
    expect(html).toContain('class="toast toast-error"');
    expect(html).toContain('data-testid="toast-error"');

    // Info toast
    expect(html).toContain("Review submitted.");
    expect(html).toContain('class="toast toast-info"');

    // Dismiss buttons
    expect(html).toContain('aria-label="Dismiss notification"');
    expect(html).toContain('class="toast-close-btn"');
  });

  it("returns null when no toasts are active", () => {
    const html = renderToString(<ToastContainer toasts={[]} onDismiss={vi.fn()} />);
    expect(html).toBe("");
  });

  it("provides safe fallback defaults when useToast is used outside a provider", () => {
    let capturedHookResult: ReturnType<typeof useToast> | null = null;

    function TestComponent() {
      capturedHookResult = useToast();
      return <div>Fallback Test</div>;
    }

    const html = renderToString(<TestComponent />);
    expect(html).toContain("Fallback Test");

    const hook = capturedHookResult as unknown as ReturnType<typeof useToast>;
    expect(hook).toBeDefined();
    expect(hook.toasts).toEqual([]);
    expect(typeof hook.showToast).toBe("function");
    expect(typeof hook.dismissToast).toBe("function");
    expect(typeof hook.success).toBe("function");
    expect(typeof hook.error).toBe("function");
    expect(typeof hook.info).toBe("function");

    // Safe execution without provider does not throw
    expect(() => hook.showToast("Safe no-op")).not.toThrow();
    expect(() => hook.dismissToast("id-123")).not.toThrow();
  });

  it("renders child hierarchy within ToastProvider", () => {
    const html = renderToString(
      <ToastProvider>
        <main>
          <h1>Patient Portal</h1>
        </main>
      </ToastProvider>,
    );

    expect(html).toContain("Patient Portal");
  });

  it("formats and renders patient appointment action toast messages accurately", () => {
    const rescheduleMessage = "Appointment rescheduled to 28 Oct 2026, 03:00 PM.";
    const cancelRefundMessage = "Appointment cancelled. A refund of ৳1,000 has been requested.";
    const reviewMessage = "Thank you! Your review has been published.";

    const html = renderToString(
      <ToastContainer
        toasts={[
          { id: "1", message: rescheduleMessage, kind: "success" },
          { id: "2", message: cancelRefundMessage, kind: "success" },
          { id: "3", message: reviewMessage, kind: "success" },
        ]}
        onDismiss={vi.fn()}
      />,
    );

    expect(html).toContain(rescheduleMessage);
    expect(html).toContain(cancelRefundMessage);
    expect(html).toContain(reviewMessage);
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('aria-label="Dismiss notification"');
  });
});
