import { apiRequest } from './session';

export interface TokenPackage {
  id: string;
  name: string;
  tokens: number;
  bonus: number;
  totalTokens: number;
  priceCents: number;
  highlight?: boolean;
}

export interface PackagesResponse {
  /** False until the Stripe keys are configured — the store shows a notice. */
  configured: boolean;
  packages: TokenPackage[];
}

export function fetchPackages(): Promise<PackagesResponse> {
  return apiRequest<PackagesResponse>('/api/tokens/packages');
}

/** Opens a Stripe Checkout session and returns its redirect URL. */
export function createCheckout(packageId: string): Promise<{ url: string }> {
  return apiRequest<{ url: string }>('/api/tokens/checkout', {
    method: 'POST',
    body: JSON.stringify({ packageId }),
  });
}

/** Confirms a purchase after returning from Stripe Checkout. */
export function confirmCheckout(sessionId: string): Promise<{ credited: number; tokens: number }> {
  return apiRequest<{ credited: number; tokens: number }>('/api/tokens/confirm', {
    method: 'POST',
    body: JSON.stringify({ sessionId }),
  });
}

/** Formats BRL cents as "R$ 12,00". */
export function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
