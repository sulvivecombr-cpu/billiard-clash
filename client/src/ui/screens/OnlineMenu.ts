import type { MatchState } from '@pool/shared';
import { getSocket } from '../../multiplayer/SocketClient';
import { fetchMe, getToken, type AuthUser } from '../../utils/auth';
import { rankLabel } from '../../utils/labels';

export interface OnlineMenuCallbacks {
  onMatchReady: (roomCode: string, playerId: string, state: MatchState) => void;
  onBack: () => void;
}

type Tab = 'choose' | 'create' | 'join';

export function renderOnlineMenu(root: HTMLElement, defaultName: string, cb: OnlineMenuCallbacks): void {
  let tab: Tab = 'choose';
  let playerName = defaultName || 'Jogador';
  let user: AuthUser | null = null;
  let createdRoomCode: string | undefined;
  let createdPlayerId: string | undefined;
  let activeCleanup: (() => void) | null = null;

  /** The signed-in account takes over the player name (and carries the ranking). */
  function resolveName(): string {
    if (user) return user.displayName;
    const input = root.querySelector('#player-name') as HTMLInputElement | null;
    return input?.value.trim() || 'Jogador';
  }

  function draw(): void {
    if (tab === 'choose') {
      const identity = user
        ? `<div class="online-identity">
             <span class="eyebrow">Jogando como</span>
             <span class="online-identity-name">${escapeHtml(user.displayName)}</span>
             <span class="online-rank">${escapeHtml(rankLabel(user.rating))} · ${user.rating}</span>
             <span class="online-ranked-note">Partidas ranqueadas valem pontos no ranking.</span>
           </div>`
        : `<div class="field-group">
             <label class="field-label eyebrow" for="player-name">Nome do Jogador</label>
             <input class="field" type="text" id="player-name" maxlength="24" value="${escapeAttr(playerName)}" />
           </div>
           <p class="online-ranked-note">Jogue como convidado ou entre na sua conta para disputar partidas ranqueadas.</p>`;
      root.innerHTML = `
        <div class="menu-screen screen-enter">
          <button class="back-link" id="back">&larr; Menu Principal</button>
          <div class="panel menu-panel">
            <h2>JOGAR ONLINE</h2>
            ${identity}
            <div class="menu-actions">
              <button class="btn btn-primary" id="create-room">Criar Sala</button>
              <button class="btn btn-secondary" id="join-room">Entrar na Sala</button>
            </div>
          </div>
        </div>
      `;
      root.querySelector('#back')!.addEventListener('click', () => {
        activeCleanup?.();
        activeCleanup = null;
        cb.onBack();
      });
      root.querySelector('#create-room')!.addEventListener('click', () => {
        playerName = resolveName();
        tab = 'create';
        draw();
        startCreateFlow();
      });
      root.querySelector('#join-room')!.addEventListener('click', () => {
        playerName = resolveName();
        tab = 'join';
        draw();
      });
      return;
    }

    if (tab === 'create') {
      root.innerHTML = `
        <div class="menu-screen screen-enter">
          <button class="back-link" id="back">&larr; Voltar</button>
          <div class="panel menu-panel" id="create-panel">
            <h2>SALA CRIADA</h2>
            <div class="room-code-display" id="room-code">— — — —</div>
            <button class="btn btn-secondary" id="copy-code">Copiar Código da Sala</button>
            <div class="waiting-indicator" id="waiting-text">AGUARDANDO OPONENTE</div>
            <div class="error-text" id="error"></div>
          </div>
        </div>
      `;
      root.querySelector('#back')!.addEventListener('click', () => {
        activeCleanup?.();
        activeCleanup = null;
        createdRoomCode = undefined;
        createdPlayerId = undefined;
        tab = 'choose';
        draw();
      });
      return;
    }

    // join
    root.innerHTML = `
      <div class="menu-screen screen-enter">
        <button class="back-link" id="back">&larr; Voltar</button>
        <div class="panel menu-panel">
          <h2>ENTRAR NA SALA</h2>
          <div class="field-group">
            <label class="field-label eyebrow" for="room-code-input">Digite o Código da Sala</label>
            <input class="field" type="text" id="room-code-input" maxlength="8" placeholder="8B-XXXX" />
          </div>
          <button class="btn btn-primary" id="join-game-btn">Entrar no Jogo</button>
          <div class="error-text" id="join-error"></div>
        </div>
      </div>
    `;
    root.querySelector('#back')!.addEventListener('click', () => {
      tab = 'choose';
      draw();
    });
    root.querySelector('#join-game-btn')!.addEventListener('click', () => {
      const code = (root.querySelector('#room-code-input') as HTMLInputElement).value.trim().toUpperCase();
      const errorEl = root.querySelector('#join-error')!;
      errorEl.textContent = '';
      const socket = getSocket();
      socket.emit('join_room', { roomCode: code, playerName }, (res) => {
        if (!res.ok || !res.playerId || !res.state) {
          errorEl.textContent = res.error?.message ?? 'Não foi possível entrar na sala.';
          return;
        }
        cb.onMatchReady(code, res.playerId, res.state);
      });
    });
  }

  function startCreateFlow(): void {
    const socket = getSocket();

    // Guard against re-entrancy (e.g. a rapid double-click on Create Room):
    // tear down any prior create-flow listeners before registering new ones.
    activeCleanup?.();
    activeCleanup = null;
    createdRoomCode = undefined;
    createdPlayerId = undefined;

    const onRoomState = (state: MatchState & { roomCode: string }) => {
      if (state.roomCode !== createdRoomCode) return;
      if (createdPlayerId && state.players.every((p) => p.id)) {
        cleanupCreateListeners();
        cb.onMatchReady(createdRoomCode!, createdPlayerId, state);
      }
    };
    const onConnectError = () => {
      const errorEl = root.querySelector('#error');
      if (errorEl) errorEl.textContent = 'Não foi possível conectar ao servidor multijogador. Verifique sua conexão e tente novamente.';
    };

    function cleanupCreateListeners(): void {
      socket.off('room_state', onRoomState);
      socket.off('connect_error', onConnectError);
    }
    activeCleanup = cleanupCreateListeners;

    // Registered before create_room is emitted so the server's immediate
    // post-creation room_state (1 player) and the later post-join broadcast
    // (2 players) are both seen by the same persistent listener — a
    // socket.once() here would consume itself on the first event and miss
    // the second, leaving the host stuck on the waiting screen.
    socket.on('room_state', onRoomState);
    socket.on('connect_error', onConnectError);

    socket.emit('create_room', { playerName }, (res) => {
      const errorEl = root.querySelector('#error');
      if (!res.ok || !res.roomCode || !res.playerId) {
        if (errorEl) errorEl.textContent = res.error?.message ?? 'Não foi possível criar a sala. O servidor está ativo?';
        cleanupCreateListeners();
        return;
      }
      const codeEl = root.querySelector('#room-code');
      if (codeEl) codeEl.textContent = res.roomCode;
      root.querySelector('#copy-code')?.addEventListener('click', () => {
        navigator.clipboard?.writeText(res.roomCode!).catch(() => {});
      });

      createdRoomCode = res.roomCode;
      createdPlayerId = res.playerId;
    });
  }

  // Draw synchronously for guests; only signed-in players need the async lookup.
  void (async () => {
    if (getToken()) user = await fetchMe();
    draw();
  })();
}

function escapeHtml(s: string): string {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}
