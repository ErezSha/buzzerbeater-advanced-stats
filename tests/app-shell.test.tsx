import { render, screen } from "@testing-library/react";
import Home from "@/app/page";
import { dashboardViewModelFixture } from "./fixtures/dashboard-view-model";

describe("home page scaffold", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the dashboard shell without BBAPI credentials", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      json: async () => ({
        ok: true,
        data: dashboardViewModelFixture,
        refreshedAt: dashboardViewModelFixture.refreshedAt,
        cacheStatus: {
          source: "fresh-cache",
          refreshedAt: dashboardViewModelFixture.refreshedAt,
        },
      }),
    } as Response);

    render(<Home />);

    expect(
      screen.getByRole("heading", { name: /buzzerbeater advanced stats/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /overview/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /players/i })).toBeInTheDocument();
    expect(await screen.findByText("Test Club")).toBeInTheDocument();
  });
});
