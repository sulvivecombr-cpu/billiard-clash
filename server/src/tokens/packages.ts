/** A purchasable token bundle. Prices are in BRL cents. */
export interface TokenPackage {
  id: string;
  /** pt-BR display name. */
  name: string;
  /** Base tokens included. */
  tokens: number;
  /** Extra tokens granted on top of the base amount. */
  bonus: number;
  priceCents: number;
  /** Marks the recommended package in the store UI. */
  highlight?: boolean;
}

export const TOKEN_PACKAGES: TokenPackage[] = [
  { id: 'inicial', name: 'Pacote Inicial', tokens: 500, bonus: 0, priceCents: 1000 },
  { id: 'plus', name: 'Pacote Plus', tokens: 1200, bonus: 300, priceCents: 2000, highlight: true },
  { id: 'pro', name: 'Pacote Pro', tokens: 3000, bonus: 1000, priceCents: 4500 },
  { id: 'elite', name: 'Pacote Elite', tokens: 8000, bonus: 3000, priceCents: 10000 },
];

export function findPackage(id: string): TokenPackage | undefined {
  return TOKEN_PACKAGES.find((pkg) => pkg.id === id);
}

/** Total tokens a package credits (base + bonus). */
export function totalTokens(pkg: TokenPackage): number {
  return pkg.tokens + pkg.bonus;
}
