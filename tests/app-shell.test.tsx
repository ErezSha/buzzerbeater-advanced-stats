import { render, screen } from "@testing-library/react";
import Home from "@/app/page";

describe("home page scaffold", () => {
  it("renders the dashboard shell without BBAPI credentials", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { name: /buzzerbeater advanced stats/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /overview/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /players/i })).toBeInTheDocument();
    expect(screen.getByText(/awaiting bbapi data/i)).toBeInTheDocument();
  });
});
