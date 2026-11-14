// Troca de tema (escuro/claro). Para adicionar um tema novo:
//   1. crie o bloco [data-theme="nome"] no css/style.css
//   2. registre-o aqui em TEMAS (bs = "light" ou "dark", base do Bootstrap)
// Carregue este arquivo no <head>, para aplicar o tema antes da página aparecer.
// O botão <button id="btn-tema"> fica no HTML da navbar; este script cuida do clique, do ícone e do texto.

const TEMAS = {
  escuro: { bs: "dark", nome: "Escuro", icone: "bi-moon-stars" },
  claro: { bs: "light", nome: "Claro", icone: "bi-sun" },
};
const TEMA_PADRAO = "escuro";
const CHAVE_TEMA = "tema";

function lerTemaSalvo() {
  try {
    const salvo = localStorage.getItem(CHAVE_TEMA);
    if (TEMAS[salvo]) return salvo;
  } catch (e) {
    // localStorage indisponível (modo privado, etc.): segue sem salvar
  }
  // Primeira visita: respeita a preferência do sistema
  if (window.matchMedia?.("(prefers-color-scheme: light)").matches && TEMAS.claro) return "claro";
  return TEMA_PADRAO;
}

function aplicarTema(id) {
  if (!TEMAS[id]) id = TEMA_PADRAO;
  const html = document.documentElement;
  html.setAttribute("data-theme", id);
  html.setAttribute("data-bs-theme", TEMAS[id].bs);
  atualizarBotaoTema(id);
  return id;
}

function definirTema(id) {
  id = aplicarTema(id);
  try {
    localStorage.setItem(CHAVE_TEMA, id);
  } catch (e) {
    // sem persistência: o tema vale só nesta página
  }
}

// Passa para o próximo tema da lista (escuro -> claro -> ... -> escuro)
function alternarTema() {
  const ids = Object.keys(TEMAS);
  const atual = document.documentElement.getAttribute("data-theme");
  definirTema(ids[(ids.indexOf(atual) + 1) % ids.length]);
}

function atualizarBotaoTema(id) {
  const botao = document.getElementById("btn-tema");
  if (!botao) return;
  const ids = Object.keys(TEMAS);
  const proximo = TEMAS[ids[(ids.indexOf(id) + 1) % ids.length]];
  botao.innerHTML = `<i class="bi ${proximo.icone}"></i> <span class="d-lg-none">Tema ${proximo.nome.toLowerCase()}</span>`;
  botao.title = `Mudar para o tema ${proximo.nome.toLowerCase()}`;
  botao.setAttribute("aria-label", botao.title);
}

// O botão (#btn-tema) já está no HTML da navbar; aqui só ligamos o clique
function ligarBotaoTema() {
  const botao = document.getElementById("btn-tema");
  if (!botao) return;
  botao.addEventListener("click", alternarTema);
  atualizarBotaoTema(document.documentElement.getAttribute("data-theme"));
}

// Aplica já (script no <head>) e liga o botão quando o HTML estiver pronto
aplicarTema(lerTemaSalvo());
document.addEventListener("DOMContentLoaded", ligarBotaoTema);

// Sincroniza se o tema for trocado em outra aba
window.addEventListener("storage", (e) => {
  if (e.key === CHAVE_TEMA && TEMAS[e.newValue]) aplicarTema(e.newValue);
});
