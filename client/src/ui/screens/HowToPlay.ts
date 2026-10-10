export function renderHowToPlay(root: HTMLElement, onBack: () => void): void {
  root.innerHTML = `
    <div class="menu-screen screen-enter">
      <button class="back-link" id="back">&larr; Menu Principal</button>
      <div class="panel menu-panel menu-panel--wide">
        <h2>COMO JOGAR</h2>
        <div class="how-to-content">
          <h3>Controles</h3>
          <div class="control-list">
            <span class="keycap">Mover o Mouse</span><span class="control-desc">Mirar</span>
            <span class="keycap">Clique Esquerdo</span><span class="control-desc">Dar a tacada</span>
            <span class="keycap">W</span><span class="control-desc">Aumentar a força da tacada</span>
            <span class="keycap">S</span><span class="control-desc">Diminuir a força da tacada</span>
            <span class="keycap">Roda do Mouse</span><span class="control-desc">Ajustar a força da tacada</span>
            <span class="keycap">ESC</span><span class="control-desc">Menu de pausa</span>
          </div>

          <h3>Objetivo</h3>
          <p>Encaçape todas as bolas do seu grupo (lisas 1–7 ou listradas 9–15) e depois encaçape legalmente a bola 8 para vencer.</p>

          <h3>Tacada inicial e mesa aberta</h3>
          <p>A mesa fica "aberta" até que um jogador encaçape legalmente uma bola após a tacada inicial — o grupo que ele encaçapar primeiro passa a ser o seu grupo pelo resto da partida.</p>

          <h3>Faltas</h3>
          <p>Encaçapar a bola branca, acertar primeiro o grupo errado, não tocar em nenhuma bola ou não mandar nenhuma bola para a tabela após o contato resultam em falta. Uma falta dá bola na mão ao adversário — ele pode posicionar a bola branca em qualquer lugar antes da próxima tacada.</p>

          <h3>A bola 8</h3>
          <p>Encaçapar a bola 8 antes de limpar o seu grupo é derrota imediata. Encaçapá-la legalmente e ao mesmo tempo encaçapar a bola branca também é derrota. Encaçape-a de forma limpa após limpar o seu grupo para vencer.</p>

          <h3>Referência de regras</h3>
          <p>Este jogo segue as regras de 8-Bolas da WPA (World Pool-Billiard Association) como referência principal.</p>
        </div>
      </div>
    </div>
  `;
  root.querySelector('#back')!.addEventListener('click', onBack);
}
