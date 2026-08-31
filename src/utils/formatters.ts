export function formatIndianNumber(n: number): string {
  const sign = n < 0 ? '-' : '';
  const s = Math.floor(Math.abs(n)).toString();
  if (s.length <= 3) return sign + s;
  const lastThree = s.slice(-3);
  const rest = s.slice(0, -3);
  const grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return sign + grouped + ',' + lastThree;
}

export function formatIndianCurrency(amount: number): string {
  if (amount >= 10_000_000) {
    const val = (amount / 10_000_000).toFixed(2).replace(/\.?0+$/, '');
    return `₹${val} Cr`;
  }
  if (amount >= 100_000) {
    const val = (amount / 100_000).toFixed(2).replace(/\.?0+$/, '');
    return `₹${val} L`;
  }
  if (amount >= 1_000) {
    const val = (amount / 1_000).toFixed(1).replace(/\.0$/, '');
    return `₹${val} K`;
  }
  return `₹${Math.round(amount)}`;
}

export function formatQuantity(quantity: number, uom: string): string {
  return `${formatIndianNumber(quantity)} ${uom}`;
}

export function formatRupees(amount: number): string {
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(amount);
  const whole = Math.floor(abs);
  const decimal = (abs - whole).toFixed(2).slice(2);
  return `${sign}₹${formatIndianNumber(whole)}.${decimal}`;
}
