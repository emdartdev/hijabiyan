export function formatBDT(amountBdt: number) {
  try {
    return new Intl.NumberFormat("bn-BD", {
      style: "currency",
      currency: "BDT",
      maximumFractionDigits: 0,
    }).format(amountBdt);
  } catch {
    return `${amountBdt} টাকা`;
  }
}
