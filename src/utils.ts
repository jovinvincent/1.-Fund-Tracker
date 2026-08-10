export function formatINR(val: number): string {
  return "₹" + val.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
