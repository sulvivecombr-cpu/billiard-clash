import { fetchMe, type AuthUser } from '../../utils/auth';
import { createCheckout, fetchPackages, formatPrice, type TokenPackage } from '../../utils/tokens';

export interface TokenStoreCallbacks {
  onBack: () => void;
  /** Shown after returning from a completed checkout. */
  notice?: string;
}

export function renderTokenStore(root: HTMLElement, cb: TokenStoreCallbacks): void {
  let user: AuthUser | null = null;
  let packages: TokenPackage[] = [];
  let configured = true;
  let loading = true;
  let error = cb.notice ?? '';
  let busy = false;

  async function init(): Promise<void> {
    try {
      const [me, catalogue] = await Promise.all([fetchMe(), fetchPackages()]);
      user = me;
      packages = catalogue.packages;
      configured = catalogue.configured;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Não foi possível carregar a loja.';
    } finally {
      loading = false;
      draw();
    }
  }

  function draw(): void {
    root.innerHTML = `
      <div class="menu-screen screen-enter">
        <button class="back-link" id="back">&larr; Menu Principal</button>
        <div class="panel menu-panel menu-panel--wide">
          <h2>LOJA DE FICHAS</h2>
          <div class="store-balance">
            <span class="eyebrow">Seu saldo</span>
            <span class="store-balance-value">${user ? `${user.tokens} fichas` : '—'}</span>
          </div>
          ${body()}
          <div class="error-text" id="error">${error}</div>
        </div>
      </div>
    `;
    root.querySelector('#back')!.addEventListener('click', cb.onBack);

    root.querySelectorAll<HTMLButtonElement>('[data-package]').forEach((btn) => {
      btn.addEventListener('click', () => void buy(btn.dataset.package!, btn));
    });
  }

  function body(): string {
    if (loading) return `<p class="waiting-indicator">CARREGANDO</p>`;
    if (!user) {
      return `<p class="store-hint">Entre na sua conta para comprar fichas.</p>`;
    }
    return `
      ${
        configured
          ? ''
          : `<p class="store-hint store-hint--warning">Pagamentos ainda não estão configurados. Adicione as chaves do Stripe para habilitar as compras.</p>`
      }
      <div class="store-grid">
        ${packages.map(packageCard).join('')}
      </div>
      <p class="store-hint">Pagamento seguro processado pelo Stripe. As fichas são creditadas na hora.</p>
    `;
  }

  function packageCard(pkg: TokenPackage): string {
    return `
      <div class="store-card ${pkg.highlight ? 'store-card--highlight' : ''}">
        ${pkg.highlight ? '<span class="store-tag">MAIS POPULAR</span>' : ''}
        <div class="store-card-name">${escapeHtml(pkg.name)}</div>
        <div class="store-card-tokens">${pkg.totalTokens} fichas</div>
        ${pkg.bonus > 0 ? `<div class="store-card-bonus">+${pkg.bonus} de bônus</div>` : ''}
        <div class="store-card-price">${formatPrice(pkg.priceCents)}</div>
        <button class="btn btn-primary btn-small" data-package="${pkg.id}" ${busy || !configured ? 'disabled' : ''}>Comprar</button>
      </div>
    `;
  }

  async function buy(packageId: string, btn: HTMLButtonElement): Promise<void> {
    if (busy) return;
    busy = true;
    error = '';
    btn.disabled = true;
    btn.textContent = 'Abrindo…';
    try {
      const { url } = await createCheckout(packageId);
      window.location.href = url; // full redirect to Stripe Checkout
    } catch (e) {
      busy = false;
      error = e instanceof Error ? e.message : 'Não foi possível iniciar o pagamento.';
      draw();
    }
  }

  void init();
}

function escapeHtml(s: string): string {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}
