// Página de detalhes da OS (ordem.html?id=...): só preenche os dados na tela.
// Usa storage.js (dados) e script.js (formatação e helpers de OS).

const idOrdem = new URLSearchParams(location.search).get("id");
const ordem = buscar(CHAVES.ordens, idOrdem);

// Etapas do fluxo principal, na ordem em que aparecem
const ETAPAS = ["aberta", "diagnostico", "execucao", "pronta", "entregue"];

function texto(id, valor) {
  document.getElementById(id).textContent = valor;
}

// Previsão de entrega: data de abertura + 1 dia útil a cada 8 horas de mão de obra
function calcularPrevisao(dataAbertura, horas) {
  if (!horas) return null;
  const data = new Date(dataAbertura);
  let dias = Math.ceil(horas / 8);
  while (dias > 0) {
    data.setDate(data.getDate() + 1);
    if (data.getDay() !== 0 && data.getDay() !== 6) dias--;
  }
  return data;
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

function preencherDados(totais) {
  const veiculo = buscar(CHAVES.veiculos, ordem.veiculoId);
  const cliente = veiculo ? buscar(CHAVES.clientes, veiculo.clienteId) : null;

  texto("os-cliente-nome", cliente ? cliente.nome : "Cliente removido");
  texto("os-cliente-contato", cliente ? [cliente.telefone, cliente.email].filter(Boolean).join(" · ") : "—");
  texto("os-veiculo-modelo", veiculo ? [veiculo.marca, veiculo.modelo].filter(Boolean).join(" ") + (veiculo.ano ? ` · ${veiculo.ano}` : "") : "Veículo removido");
  texto("os-veiculo-placa", veiculo ? `Placa ${veiculo.placa}` + (veiculo.cor ? ` · ${veiculo.cor}` : "") : "—");
  texto("os-km", `${Number(ordem.kmEntrada).toLocaleString("pt-BR")} km`);

  const previsao = calcularPrevisao(ordem.dataAbertura, totais.horas);
  texto("os-previsao", previsao ? previsao.toLocaleDateString("pt-BR") : "— (sem itens)");
  texto("os-problema", ordem.problema);
}

function preencherItens(totais) {
  const itens = ordem.itens || [];
  if (itens.length > 0) {
    document.getElementById("os-itens").innerHTML = itens.map((linha) => `
      <tr>
        <td>${escaparHtml(linha.nome)}</td>
        <td><span class="badge ${linha.tipo === "servico" ? "text-bg-info" : "text-bg-secondary"}">${linha.tipo === "servico" ? "serviço" : "peça"}</span></td>
        <td class="text-end">${linha.quantidade}</td>
        <td class="text-end">${formatarMoeda(linha.precoUnitario)}</td>
        <td class="text-end">${formatarMoeda(linha.precoUnitario * linha.quantidade)}</td>
        <td></td>
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

if (!ordem) {
  location.replace("ordens.html"); // id ausente ou inexistente
} else {
  const totais = calcularTotais(ordem.itens || [], ordem.desconto);
  preencherCabecalho();
  preencherEtapas();
  preencherDados(totais);
  preencherItens(totais);
  preencherHistorico();
}
