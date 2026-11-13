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

// Mostra uma mensagem rápida no canto da tela (toast do Bootstrap)
// tipo: "sucesso" (verde) ou "erro" (vermelho)
function mostrarMensagem(texto, tipo = "sucesso") {
  let area = document.getElementById("area-mensagens");
  if (!area) {
    area = document.createElement("div");
    area.id = "area-mensagens";
    area.className = "toast-container position-fixed bottom-0 end-0 p-3";
    document.body.appendChild(area);
  }

  const cor = tipo === "erro" ? "text-bg-danger" : "text-bg-success";
  const toast = document.createElement("div");
  toast.className = "toast align-items-center border-0 " + cor;
  toast.setAttribute("role", "status");
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${escaparHtml(texto)}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Fechar"></button>
    </div>`;
  area.appendChild(toast);

  toast.addEventListener("hidden.bs.toast", () => toast.remove());
  new bootstrap.Toast(toast, { delay: 4000 }).show();
}
