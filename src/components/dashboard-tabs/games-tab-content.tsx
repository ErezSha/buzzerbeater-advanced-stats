import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const gameRows = [
  ["Last match", "Win", "+9", "101.8"],
  ["Previous", "Loss", "-4", "96.2"],
  ["Three back", "Win", "+13", "104.4"],
];

export function GamesTabContent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Games Preview</CardTitle>
        <CardDescription>
          Finished match details will attach box score and four-factor data.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Game</TableHead>
              <TableHead>Result</TableHead>
              <TableHead>Margin</TableHead>
              <TableHead>ORtg</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {gameRows.map((row) => (
              <TableRow key={row[0]}>
                {row.map((cell) => (
                  <TableCell key={cell}>{cell}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
