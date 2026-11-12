// =========================================================
// script.js — funções comuns a todas as páginas
// =========================================================

// Troca os caracteres especiais do HTML para mostrar texto digitado
// pelo usuário com segurança dentro do innerHTML
function escaparHtml(texto) {
  return String(texto ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
