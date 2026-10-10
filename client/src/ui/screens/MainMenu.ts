export interface MainMenuCallbacks {
  onPlayOnline: () => void;
  onPlayComputer: () => void;
  onProfile: () => void;
  onStore: () => void;
  onHowToPlay: () => void;
  onSettings: () => void;
}

export function renderMainMenu(root: HTMLElement, cb: MainMenuCallbacks): void {
  root.innerHTML = `
    <div class="menu-screen screen-enter">
      <div class="brand-block">
        <h1 class="brand-title">Billiard <span class="accent">Clash</span></h1>
        <div class="brand-subtitle">SINUCA 8-BOLAS CLÁSSICA</div>
      </div>
      <div class="menu-actions">
        <button class="btn btn-primary" id="play-online">Jogar Online</button>
        <button class="btn btn-primary" id="play-computer">Jogar vs Computador</button>
        <button class="btn btn-secondary" id="profile">Perfil</button>
        <button class="btn btn-secondary" id="store">Loja de Fichas</button>
        <button class="btn btn-secondary" id="how-to-play">Como Jogar</button>
        <button class="btn btn-secondary" id="settings">Configurações</button>
      </div>
    </div>
  `;
  root.querySelector('#play-online')!.addEventListener('click', cb.onPlayOnline);
  root.querySelector('#play-computer')!.addEventListener('click', cb.onPlayComputer);
  root.querySelector('#profile')!.addEventListener('click', cb.onProfile);
  root.querySelector('#store')!.addEventListener('click', cb.onStore);
  root.querySelector('#how-to-play')!.addEventListener('click', cb.onHowToPlay);
  root.querySelector('#settings')!.addEventListener('click', cb.onSettings);
}
