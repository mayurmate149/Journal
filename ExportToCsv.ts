export function exportTradesToCSV(trades: any[], fileName = "trades.csv") {
  if (!trades || trades.length === 0) return;

  // Extract headers dynamically
  const headers = Object.keys(trades[0]);

  // Convert trades to CSV string
  const csvRows = [
    headers.join(","), // header row
    ...trades.map(trade =>
      headers
        .map(field => {
          let val = (trade as any)[field];
          if (val === null || val === undefined) val = "";
          if (typeof val === "string") {
            val = val.replace(/"/g, '""'); // escape quotes
            if (val.includes(",") || val.includes("\n")) val = `"${val}"`;
          }
          return val;
        })
        .join(",")
    ),
  ];

  const csvString = csvRows.join("\n");

  // Trigger download
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.setAttribute("download", fileName);
  link.click();
}
