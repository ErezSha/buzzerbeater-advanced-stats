import { render, screen, waitFor } from "@testing-library/react";
import { AppShell } from "@/components/app-shell";

describe("dashboard error states", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows a specific authorization error from the dashboard API", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);

      if (url.includes("/api/credentials")) {
        return Promise.resolve({
          json: async () => ({ configured: true, source: "env" }),
        } as Response);
      }

      return Promise.resolve({
        json: async () => ({
          ok: false,
          error: {
            code: "NotAuthorized",
            message: "BBAPI rejected the configured login or security code.",
            retryable: false,
          },
        }),
      } as Response);
    });

    render(<AppShell />);

    await waitFor(() => {
      expect(screen.getByText("NotAuthorized")).toBeInTheDocument();
    });

    expect(
      screen.getByText("BBAPI rejected the configured login or security code."),
    ).toBeInTheDocument();
  });
});
