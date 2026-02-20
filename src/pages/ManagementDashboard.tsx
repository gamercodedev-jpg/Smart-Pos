// src/pages/ManagementDashboard.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  Legend,
  Cell,
} from "recharts";

const stockVarianceData = [
    { id: "1", item: "Angus Beef Patty", theoretical: 10.5, actual: 11.2, uom: "KG", cost: 50.00 },
    { id: "2", item: "Brioche Buns", theoretical: 150, actual: 155, uom: "EA", cost: 1.50 },
    { id: "3", item: "Cheddar Cheese", theoretical: 5.0, actual: 5.1, uom: "KG", cost: 25.00 },
    { id: "4", item: "Truffle Oil", theoretical: 0.5, actual: 0.6, uom: "L", cost: 250.00 },
    { id: "5", item: "Organic Tomatoes", theoretical: 20.0, actual: 19.5, uom: "KG", cost: 10.00 },
];

const voidLogData = [
    { id: "1", time: "10:55 AM", item: "Truffle Burger", qty: 1, reason: "Guest Complaint", manager: "Jane Doe" },
    { id: "2", time: "10:52 AM", item: "Fries", qty: 2, reason: "Cooked Incorrectly", manager: "Jane Doe" },
    { id: "3", time: "10:48 AM", item: "Coke", qty: 1, reason: "Wrong Order", manager: "John Smith" },
];

const menuEngineeringData = [
  // Stars (High Profit, High Sales)
  { name: 'Truffle Burger', sales: 120, profit: 25.50, category: 'Star' },
  { name: 'Lobster Roll', sales: 90, profit: 35.00, category: 'Star' },
  // Plow-horses (Low Profit, High Sales)
  { name: 'Classic Cheeseburger', sales: 200, profit: 12.00, category: 'Plow-horse' },
  { name: 'Fries', sales: 350, profit: 5.00, category: 'Plow-horse' },
  // Puzzles (High Profit, Low Sales)
  { name: 'Foie Gras Appetizer', sales: 30, profit: 45.00, category: 'Puzzle' },
  { name: 'Wagyu Steak', sales: 25, profit: 75.00, category: 'Puzzle' },
  // Dogs (Low Profit, Low Sales)
  { name: 'House Salad', sales: 40, profit: 8.00, category: 'Dog' },
  { name: 'Veggie Burger', sales: 35, profit: 10.50, category: 'Dog' },
];

const categoryColors: { [key: string]: string } = {
  Star: "hsl(var(--primary))",
  "Plow-horse": "hsl(var(--secondary))",
  Puzzle: "hsl(var(--muted-foreground))",
  Dog: "hsl(var(--destructive))",
};

import ReportSharerDemo from "@/components/common/ReportSharerDemo";

const ManagementDashboard = () => {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Management Overview</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* KPI Cards */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit (Live)</CardTitle>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4 text-muted-foreground"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$45,231.89</div>
            <p className="text-xs text-muted-foreground">+20.1% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cost of Sales %</CardTitle>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4 text-muted-foreground"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">28.4%</div>
            <p className="text-xs text-muted-foreground">-1.2% from last week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Labor Cost</CardTitle>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4 text-muted-foreground"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$12,234.50</div>
            <p className="text-xs text-muted-foreground">+5.2% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Variance</CardTitle>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4 text-muted-foreground"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-$1,235.12</div>
            <p className="text-xs text-muted-foreground">Variance for this period</p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Stock Variance</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Theoretical</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                  <TableHead className="text-right">Financial Loss</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockVarianceData.map((row) => {
                  const variance = row.actual - row.theoretical;
                  const loss = variance * row.cost;
                  const isNegative = variance > 0;
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.item}</TableCell>
                      <TableCell className="text-right">{`${row.theoretical.toFixed(2)} ${row.uom}`}</TableCell>
                      <TableCell className="text-right">{`${row.actual.toFixed(2)} ${row.uom}`}</TableCell>
                      <TableCell className={`text-right font-semibold ${isNegative ? 'text-destructive' : 'text-green-500'}`}>
                        {`${variance.toFixed(2)} ${row.uom}`}
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${isNegative ? 'text-destructive' : 'text-green-500'}`}>
                        {loss.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Real-Time Void Log (Last 60 Mins)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {voidLogData.map((log) => (
              <div key={log.id} className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-16 text-sm text-muted-foreground">{log.time}</div>
                <div className="flex-1">
                  <p className="font-semibold">{log.item} (x{log.qty})</p>
                  <p className="text-sm"><span className="font-medium">Reason:</span> {log.reason}</p>
                  <p className="text-sm"><span className="font-medium">Manager:</span> {log.manager}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Menu Engineering Matrix</CardTitle>
        </CardHeader>
        <CardContent className="pl-2 h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 40, bottom: 20, left: 20 }}>
              <XAxis type="number" dataKey="sales" name="Sales Volume" label={{ value: "Sales Volume", position: 'insideBottom', offset: -10 }} />
              <YAxis type="number" dataKey="profit" name="Profit Margin" unit="$" label={{ value: "Profit Margin ($)", angle: -90, position: 'insideLeft' }} />
              <ZAxis type="category" dataKey="category" name="Category" />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
              <Legend formatter={(value) => <span className="capitalize text-sm">{value}</span>} />
              <Scatter name="Menu Items" data={menuEngineeringData}>
                {menuEngineeringData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={categoryColors[entry.category]} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <ReportSharerDemo />
    </div>
  );
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-background border border-border p-2 rounded-md shadow-lg">
        <p className="font-bold text-lg">{data.name}</p>
        <p className="text-sm"><span className="font-semibold">Sales:</span> {data.sales} units</p>
        <p className="text-sm"><span className="font-semibold">Profit:</span> {data.profit.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</p>
        <p className="text-sm"><Badge style={{ backgroundColor: categoryColors[data.category] }}>{data.category}</Badge></p>
      </div>
    );
  }

  return null;
};

export default ManagementDashboard;
