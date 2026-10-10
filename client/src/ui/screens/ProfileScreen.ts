import { fetchMe, login, logout, register, updateProfile, type AuthUser } from '../../utils/auth';

type Mode = 'login' | 'register';

export function renderProfile(root: HTMLElement, onBack: () => void): void {
  let mode: Mode = 'login';
  let user: AuthUser | null = null;
  let loading = true;
  let error = '';
  let busy = false;

  async function init(): Promise<void> {
    user = await fetchMe();
    loading = false;
    draw();
  }

  function draw(): void {
    const body = loading ? `<p class="waiting-indicator">CARREGANDO</p>` : user ? profileView(user) : authView();
    root.innerHTML = `
      <div class="menu-screen screen-enter">
        <button class="back-link" id="back">&larr; Menu Principal</button>
        <div class="panel menu-panel">
          <h2>PERFIL</h2>
          ${body}
          <div class="error-text" id="error">${error}</div>
        </div>
      </div>
    `;
    root.querySelector('#back')!.addEventListener('click', onBack);

    if (!loading && !user) {
      root.querySelector('#tab-login')!.addEventListener('click', () => {
        mode = 'login';
        error = '';
        draw();
      });
      root.querySelector('#tab-register')!.addEventListener('click', () => {
        mode = 'register';
        error = '';
        draw();
      });

      const submit = async () => {
        if (busy) return;
        const email = (root.querySelector('#email') as HTMLInputElement).value.trim();
        const password = (root.querySelector('#password') as HTMLInputElement).value;
        error = '';
        busy = true;
        try {
          if (mode === 'register') {
            const displayName = (root.querySelector('#display-name') as HTMLInputElement).value.trim();
            user = await register(email, password, displayName);
          } else {
            user = await login(email, password);
          }
        } catch (e) {
          error = e instanceof Error ? e.message : 'Não foi possível concluir a operação.';
        } finally {
          busy = false;
          draw();
        }
      };
      root.querySelector('#auth-form')!.addEventListener('submit', (e) => {
        e.preventDefault();
        void submit();
      });
    }

    if (!loading && user) {
      root.querySelector('#save-name')!.addEventListener('click', async () => {
        if (busy) return;
        const displayName = (root.querySelector('#display-name') as HTMLInputElement).value.trim();
        error = '';
        busy = true;
        try {
          user = await updateProfile(displayName);
        } catch (e) {
          error = e instanceof Error ? e.message : 'Não foi possível salvar o perfil.';
        } finally {
          busy = false;
          draw();
        }
      });
      root.querySelector('#logout')!.addEventListener('click', () => {
        logout();
        user = null;
        mode = 'login';
        error = '';
        draw();
      });
    }
  }

  function authView(): string {
    return `
      <div class="profile-tabs">
        <button class="btn ${mode === 'login' ? 'btn-primary' : 'btn-secondary'} btn-small" id="tab-login">Entrar</button>
        <button class="btn ${mode === 'register' ? 'btn-primary' : 'btn-secondary'} btn-small" id="tab-register">Criar Conta</button>
      </div>
      <form id="auth-form" class="profile-form">
        ${
          mode === 'register'
            ? `<div class="field-group">
                 <label class="field-label eyebrow" for="display-name">Nome de Exibição</label>
                 <input class="field" type="text" id="display-name" maxlength="24" autocomplete="nickname" />
               </div>`
            : ''
        }
        <div class="field-group">
          <label class="field-label eyebrow" for="email">E-mail</label>
          <input class="field" type="text" id="email" autocomplete="email" />
        </div>
        <div class="field-group">
          <label class="field-label eyebrow" for="password">Senha</label>
          <input class="field" type="password" id="password" autocomplete="${mode === 'register' ? 'new-password' : 'current-password'}" />
        </div>
        <button class="btn btn-primary" type="submit" id="auth-submit">${mode === 'register' ? 'Criar Conta' : 'Entrar'}</button>
      </form>
    `;
  }

  function profileView(u: AuthUser): string {
    const since = new Date(u.createdAt).toLocaleDateString('pt-BR');
    return `
      <div class="profile-summary">
        <div class="eyebrow">Conectado como</div>
        <div class="profile-name">${escapeHtml(u.displayName)}</div>
        <div class="profile-email">${escapeHtml(u.email)}</div>
        <div class="profile-since">Membro desde ${since}</div>
      </div>
      <div class="field-group">
        <label class="field-label eyebrow" for="display-name">Nome de Exibição</label>
        <input class="field" type="text" id="display-name" maxlength="24" value="${escapeAttr(u.displayName)}" />
      </div>
      <div class="menu-actions">
        <button class="btn btn-primary" id="save-name">Salvar</button>
        <button class="btn btn-ghost" id="logout">Sair</button>
      </div>
    `;
  }

  void init();
}

function escapeHtml(s: string): string {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}
