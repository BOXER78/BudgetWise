export const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(n) || 0);

export const formatDate = (d: string | Date) =>
  new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

export const monthName = (m: number) =>
  new Date(2000, m - 1, 1).toLocaleString("en-US", { month: "long" });
