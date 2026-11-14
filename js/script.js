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

// Formata um número como dinheiro: 1500 -> "R$ 1.500,00"
function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ---- Compartilhado entre ordens.html e ordem.html ----
// Nome de cada status para mostrar na tela, e a cor da etiqueta
const STATUS_INFO = {
  aberta: { nome: "Aberta", cor: "text-bg-secondary" },
  diagnostico: { nome: "Em diagnóstico", cor: "text-bg-info" },
  aguardando_peca: { nome: "Aguardando peça", cor: "text-bg-warning" },
  execucao: { nome: "Em execução", cor: "text-bg-primary" },
  pronta: { nome: "Pronta p/ retirada", cor: "text-bg-success" },
  entregue: { nome: "Entregue", cor: "text-bg-dark border" },
  cancelada: { nome: "Cancelada", cor: "text-bg-danger" },
};

function etiquetaStatus(status) {
  const info = STATUS_INFO[status] || { nome: status, cor: "text-bg-secondary" };
  return `<span class="badge ${info.cor}">${info.nome}</span>`;
}

// Número da OS com 4 dígitos: 7 -> "#0007"
function numeroOS(numero) {
  return "#" + String(numero).padStart(4, "0");
}

// Soma os itens da OS e aplica o desconto
function calcularTotais(itens, desconto) {
  let servicos = 0;
  let pecas = 0;
  let horas = 0;

  for (const linha of itens) {
    const valor = linha.precoUnitario * linha.quantidade;
    if (linha.tipo === "servico") {
      servicos += valor;
      horas += (linha.horas || 0) * linha.quantidade;
    } else {
      pecas += valor;
    }
  }

  const subtotal = servicos + pecas;
  const valorDesconto = subtotal * (Number(desconto || 0) / 100);
  return { servicos, pecas, subtotal, valorDesconto, total: subtotal - valorDesconto, horas };
}
