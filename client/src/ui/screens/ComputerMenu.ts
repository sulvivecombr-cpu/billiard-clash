import type { Difficulty } from '@pool/shared';
import { DIFFICULTY_LABELS } from '../../utils/labels';

export interface ComputerMenuCallbacks {
  onStart: (playerName: string, difficulty: Difficulty) => void;
  onBack: () => void;
}

const DIFFICULTIES: { id: Difficulty; desc: string }[] = [
  { id: 'easy', desc: 'Mira solta, erros generosos.' },
  { id: 'medium', desc: 'Fundamentos sólidos, erros ocasionais.' },
  { id: 'hard', desc: 'Ângulos precisos, boa escolha de bolas.' },
  { id: 'insane', desc: 'Mira e posicionamento quase perfeitos.' },
];

export function renderComputerMenu(root: HTMLElement, defaultName: string, cb: ComputerMenuCallbacks): void {
  root.innerHTML = `
    <div class="menu-screen screen-enter">
      <button class="back-link" id="back">&larr; Menu Principal</button>
      <div class="panel menu-panel">
        <h2>ESCOLHA A DIFICULDADE</h2>
        <div class="field-group">
          <label class="field-label eyebrow" for="player-name">Nome do Jogador</label>
          <input class="field" type="text" id="player-name" maxlength="24" value="${escapeAttr(defaultName || 'Jogador')}" />
        </div>
        <div class="option-grid" id="difficulty-grid">
          ${DIFFICULTIES.map(
            (d) => `
            <button class="option-card" data-id="${d.id}">
              <div class="option-card-title">${DIFFICULTY_LABELS[d.id].toUpperCase()}</div>
              <div class="option-card-desc">${d.desc}</div>
            </button>`
          ).join('')}
        </div>
      </div>
    </div>
  `;

  root.querySelector('#back')!.addEventListener('click', cb.onBack);
  root.querySelectorAll<HTMLButtonElement>('.option-card').forEach((btn) => {
    btn.addEventListener('click', () => {
      const nameInput = root.querySelector<HTMLInputElement>('#player-name')!;
      const name = nameInput.value.trim() || 'Jogador';
      cb.onStart(name, btn.dataset.id as Difficulty);
    });
  });
}

function escapeAttr(s: string): string {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}
