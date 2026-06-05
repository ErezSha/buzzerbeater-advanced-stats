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

const playerRows = [
  ["Wing scorer", "SG", "18.4", "58.1%", "24.0%"],
  ["Glass cleaner", "PF", "10.9", "61.3%", "16.2%"],
  ["Lead guard", "PG", "13.2", "54.7%", "21.5%"],
];

export function PlayersTabContent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Players Preview</CardTitle>
        <CardDescription>
          The real table will use TanStack Table with BBAPI-derived metrics.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role</TableHead>
              <TableHead>Pos</TableHead>
              <TableHead>PTS</TableHead>
              <TableHead>TS%</TableHead>
              <TableHead>USG%</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {playerRows.map((row) => (
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
