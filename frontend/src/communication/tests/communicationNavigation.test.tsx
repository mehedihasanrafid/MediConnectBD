import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { CommunicationNavItem } from "../components/CommunicationNavItem";
import { CommunicationFeatures } from "../components/CommunicationFeatures";

describe("communication navigation and feature availability", () => {
  it("marks the messages sidebar item active on the communication route", () => {
    const html = renderToString(<MemoryRouter initialEntries={["/communication"]}>
      <CommunicationNavItem onNavigate={vi.fn()} itemClassName="item" activeClassName="active"
        iconClassName="icon" labelClassName="label" />
    </MemoryRouter>);
    expect(html).toContain('aria-current="page"');
    expect(html).toContain("Consultation Messages");
  });
  it("links patient file management to the existing report workflow", () => {
    const html = renderToString(<MemoryRouter><CommunicationFeatures doctor={false} /></MemoryRouter>);
    expect(html).toContain('href="/reports"');
    expect(html).toContain("files cannot be attached to messages");
    expect(html).toContain("accept before entering the call");
    expect(html).not.toContain('type="file"');
  });
  it("directs doctors to assigned appointment records", () => {
    const html = renderToString(<MemoryRouter><CommunicationFeatures doctor /></MemoryRouter>);
    expect(html).toContain('href="/doctor/appointments"');
    expect(html).not.toContain('href="/reports"');
  });
});
