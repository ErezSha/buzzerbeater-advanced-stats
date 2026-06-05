import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GamesTabContent } from "@/components/dashboard-tabs/games-tab-content";
import { dashboardViewModelFixture } from "./fixtures/dashboard-view-model";

describe("games view", () => {
  it("renders finished games, a detail panel, and scheduled box score messaging", async () => {
    const user = userEvent.setup();

    render(<GamesTabContent data={dashboardViewModelFixture} isLoading={false} />);

    expect(screen.getAllByText("City Hoops").length).toBeGreaterThan(0);
    expect(screen.getByText("Box score not available yet")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /may 1, 2026/i }));

    expect(screen.getAllByText("Town Five").length).toBeGreaterThan(0);
    expect(screen.getAllByText("107.3").length).toBeGreaterThan(0);
  });
});
