import { render, screen, within } from "@testing-library/react";
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

    const alphaRow = screen.getByText("Alpha Guard").closest("tr");
    const betaRow = screen.getByText("Beta Wing").closest("tr");

    expect(alphaRow).not.toBeNull();
    expect(betaRow).not.toBeNull();

    expect(within(alphaRow as HTMLElement).getByText("42")).toHaveClass(
      "font-bold",
      "text-primary",
    );
    expect(within(alphaRow as HTMLElement).getByText("Alpha Guard")).toHaveClass(
      "text-primary",
    );
    expect(within(betaRow as HTMLElement).getByText("20%")).toHaveClass(
      "font-bold",
      "text-primary",
    );
    expect(within(betaRow as HTMLElement).getByText("Beta Wing")).toHaveClass(
      "text-primary",
    );
    expect(screen.queryByText("Top")).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText(/min games/i));
    await user.type(screen.getByLabelText(/min games/i), "2");

    expect(screen.queryByText("Beta Wing")).not.toBeInTheDocument();
  });
});
