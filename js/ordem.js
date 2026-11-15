// Página de detalhes da OS (ordem.html?id=...): só preenche os dados na tela.
// Usa storage.js (dados) e script.js (formatação e helpers de OS).

const idOrdem = new URLSearchParams(location.search).get("id");
let ordem = buscar(CHAVES.ordens, idOrdem);

// Etapas do fluxo principal, na ordem em que aparecem
const ETAPAS = ["aberta", "diagnostico", "execucao", "pronta", "entregue"];

function texto(id, valor) {
  document.getElementById(id).textContent = valor;
}

function preencherCabecalho() {
  const numero = numeroOS(ordem.numero);
  document.title = `OS ${numero} - UnC Reparos Automotivos`;
  texto("os-numero", numero);
  document.querySelector(".breadcrumb-item.active").textContent = `OS ${numero}`;
  texto("os-data-abertura", new Date(ordem.dataAbertura).toLocaleDateString("pt-BR"));

  const status = document.getElementById("os-status");
  const info = STATUS_INFO[ordem.status] || { nome: ordem.status, cor: "text-bg-secondary" };
  status.className = `badge fs-6 ${info.cor}`;
  status.textContent = info.nome;
}

function preencherEtapas() {
  let atual = ETAPAS.indexOf(ordem.status);
  if (ordem.status === "aguardando_peca") atual = ETAPAS.indexOf("diagnostico");
  if (ordem.status === "cancelada") atual = -1;

  document.getElementById("os-etapas").innerHTML = ETAPAS.map((etapa, i) => {
    const nome = STATUS_INFO[etapa].nome;
    if (atual === -1 || i > atual) {
      return `<li class="flex-fill"><i class="bi bi-${i + 1}-circle fs-3 text-body-secondary"></i><div class="small text-body-secondary">${nome}</div></li>`;
    }
    if (i < atual || ordem.status === "entregue") {
      return `<li class="flex-fill"><i class="bi bi-check-circle-fill fs-3 text-success"></i><div class="small">${nome}</div></li>`;
    }
    return `<li class="flex-fill"><i class="bi bi-${i + 1}-circle-fill fs-3 text-primary"></i><div class="small fw-semibold">${nome}</div></li>`;
  }).join("");
}

function preencherDados() {
  const veiculo = buscar(CHAVES.veiculos, ordem.veiculoId);
  const cliente = veiculo ? buscar(CHAVES.clientes, veiculo.clienteId) : null;

  texto("os-cliente-nome", cliente ? cliente.nome : "Cliente removido");
  texto("os-cliente-contato", cliente ? [cliente.telefone, cliente.email].filter(Boolean).join(" · ") : "—");
  texto("os-veiculo-modelo", veiculo ? [veiculo.marca, veiculo.modelo].filter(Boolean).join(" ") + (veiculo.ano ? ` · ${veiculo.ano}` : "") : "Veículo removido");
  texto("os-veiculo-placa", veiculo ? `Placa ${veiculo.placa}` + (veiculo.cor ? ` · ${veiculo.cor}` : "") : "—");
  texto("os-km", `${Number(ordem.kmEntrada).toLocaleString("pt-BR")} km`);

  texto("os-problema", ordem.problema);
}

function preencherItens(totais) {
  const itens = ordem.itens || [];
  if (itens.length > 0) {
    document.getElementById("os-itens").innerHTML = itens.map((linha) => `
      <tr>
        <td>
          ${escaparHtml(linha.nome)}
          <div class="small text-body-secondary d-md-none">${linha.tipo === "servico" ? "serviço" : "peça"} · ${formatarMoeda(linha.precoUnitario)} cada</div>
        </td>
        <td class="d-none d-md-table-cell"><span class="badge ${linha.tipo === "servico" ? "text-bg-info" : "text-bg-secondary"}">${linha.tipo === "servico" ? "serviço" : "peça"}</span></td>
        <td class="text-end">${linha.quantidade}</td>
        <td class="text-end d-none d-md-table-cell">${formatarMoeda(linha.precoUnitario)}</td>
        <td class="text-end text-nowrap">${formatarMoeda(linha.precoUnitario * linha.quantidade)}</td>
        <td class="d-none d-md-table-cell"></td>
      </tr>`).join("");
  }

  texto("os-total-servicos", formatarMoeda(totais.servicos));
  texto("os-total-pecas", formatarMoeda(totais.pecas));
  texto("os-desconto-pct", Number(ordem.desconto || 0));
  texto("os-desconto-valor", "− " + formatarMoeda(totais.valorDesconto));
  texto("os-total", formatarMoeda(totais.total));
  texto("os-horas", `${totais.horas.toLocaleString("pt-BR")} h`);
}

function preencherHistorico() {
  const historico = ordem.historico && ordem.historico.length
    ? ordem.historico
    : [{ status: ordem.status, data: ordem.dataAbertura }];

  // Mais recente primeiro
  document.getElementById("os-historico").innerHTML = [...historico].reverse().map((registro, i) => {
    const nome = (STATUS_INFO[registro.status] || { nome: registro.status }).nome;
    const data = new Date(registro.data);
    const quando = data.toLocaleDateString("pt-BR") + " " + data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    return `
      <li class="list-group-item d-flex gap-3">
        <i class="bi bi-circle-fill small mt-1 ${i === 0 ? "text-primary" : "text-body-secondary"}"></i>
        <div>
          <div class="fw-semibold">${nome}</div>
          <div class="small text-body-secondary">${quando}${registro.observacao ? " · " + escaparHtml(registro.observacao) : ""}</div>
        </div>
      </li>`;
  }).join("");
}

// ---- Atualizar status ----
const formStatus = document.getElementById("form-status");
const errosStatus = document.getElementById("erros-status");
const grupoPagamento = document.getElementById("grupo-pagamento");
const selectNovoStatus = document.getElementById("novo-status");

// Oferece só as transições permitidas a partir do status atual
function prepararFormStatus() {
  const permitidos = STATUS_ORDEM[ordem.status] || [];
  formStatus.reset();
  errosStatus.classList.add("d-none");
  grupoPagamento.classList.add("d-none");

  selectNovoStatus.innerHTML = '<option value="">Selecione</option>' +
    permitidos.map((s) => `<option value="${s}">${STATUS_INFO[s].nome}</option>`).join("");

  const finalizada = permitidos.length === 0;
  for (const campo of formStatus.elements) campo.disabled = finalizada;
  if (finalizada) {
    errosStatus.className = "alert alert-secondary";
    errosStatus.textContent = "Esta OS foi finalizada e não pode mais ser alterada.";
  }
}

function mostrarErrosStatus(erros) {
  errosStatus.className = "alert alert-danger";
  errosStatus.innerHTML = erros.map(escaparHtml).join("<br>");
}

// A forma de pagamento só aparece na entrega
selectNovoStatus.addEventListener("change", () => {
  grupoPagamento.classList.toggle("d-none", selectNovoStatus.value !== "entregue");
});

formStatus.addEventListener("submit", (evento) => {
  evento.preventDefault();
  const novoStatus = selectNovoStatus.value;
  if (!novoStatus) {
    mostrarErrosStatus(["Escolha o próximo status."]);
    return;
  }

  const formaPagamento = document.getElementById("forma-pagamento").value;
  const erros = validarMudancaStatus(idOrdem, novoStatus, { formaPagamento });
  if (erros.length > 0) {
    mostrarErrosStatus(erros);
    return;
  }

  // Iniciar a execução baixa o estoque das peças (regra 7)
  if (novoStatus === "execucao") {
    for (const linha of ordem.itens || []) {
      const item = buscar(CHAVES.catalogo, linha.itemId);
      if (item && item.tipo === "peca") {
        atualizar(CHAVES.catalogo, item.id, { estoque: Number(item.estoque) - Number(linha.quantidade) });
      }
    }
  }

  const observacao = document.getElementById("observacao").value.trim();
  const registro = { status: novoStatus, data: new Date().toISOString() };
  if (observacao) registro.observacao = observacao;

  const mudancas = { status: novoStatus, historico: [...(ordem.historico || []), registro] };
  if (novoStatus === "entregue") mudancas.formaPagamento = formaPagamento;
  atualizar(CHAVES.ordens, idOrdem, mudancas);

  mostrarMensagem(`Status atualizado para "${STATUS_INFO[novoStatus].nome}".`);
  renderizar();
});

function renderizar() {
  ordem = buscar(CHAVES.ordens, idOrdem);
  const totais = calcularTotais(ordem.itens || [], ordem.desconto);
  preencherCabecalho();
  preencherEtapas();
  preencherDados();
  preencherItens(totais);
  preencherHistorico();
  prepararFormStatus();
}

if (!ordem) {
  location.replace("ordens.html"); // id ausente ou inexistente
} else {
  renderizar();
}
