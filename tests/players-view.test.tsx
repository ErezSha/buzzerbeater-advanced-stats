import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PlayersTabContent } from "@/components/dashboard-tabs/players-tab-content";
import { dashboardViewModelFixture } from "./fixtures/dashboard-view-model";

describe("players view", () => {
  it("renders a sortable metrics table and filters inactive players", async () => {
    const user = userEvent.setup();

    render(
      <PlayersTabContent data={dashboardViewModelFixture} isLoading={false} />,
    );

    expect(screen.getByText("Alpha Guard")).toBeInTheDocument();
    expect(screen.queryByText("Beta Wing")).not.toBeInTheDocument();

    await user.click(screen.getByLabelText(/active roster/i));

    expect(screen.getByText("Beta Wing")).toBeInTheDocument();

    await user.clear(screen.getByLabelText(/min games/i));
    await user.type(screen.getByLabelText(/min games/i), "2");

    expect(screen.queryByText("Beta Wing")).not.toBeInTheDocument();
  });
});
