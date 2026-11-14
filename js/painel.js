// Data em que a OS foi entregue (fica registrada no histórico de status)
function dataEntrega(ordem) {
  const registro = (ordem.historico || []).find((h) => h.status === "entregue");
  return registro ? new Date(registro.data) : null;
}

function totalDaOrdem(ordem) {
  return calcularTotais(ordem.itens || [], ordem.desconto).total;
}

function mesmoMes(data, referencia) {
  return data.getMonth() === referencia.getMonth() && data.getFullYear() === referencia.getFullYear();
}

function somar(numeros) {
  return numeros.reduce((total, n) => total + n, 0);
}

// Calcula os indicadores a partir dos dados salvos
function calcularIndicadores() {
  const ordens = listar(CHAVES.ordens);
  const hoje = new Date();

  const emAndamento = ordens.filter(ordemEmAndamento);
  const entregues = ordens.filter((o) => o.status === "entregue");
  const entreguesNoMes = entregues.filter((o) => dataEntrega(o) && mesmoMes(dataEntrega(o), hoje));

  // Tempo de reparo: dias entre a abertura e a entrega
  const tempos = entregues
    .filter((o) => dataEntrega(o))
    .map((o) => (dataEntrega(o) - new Date(o.dataAbertura)) / 86400000);

  const pecasNoMinimo = listar(CHAVES.catalogo)
    .filter((i) => i.tipo === "peca" && Number(i.estoque) <= Number(i.estoqueMinimo));

  return {
    naOficina: emAndamento.length,
    prontas: emAndamento.filter((o) => o.status === "pronta").length,
    faturamentoMes: somar(entreguesNoMes.map(totalDaOrdem)),
    entreguesNoMes: entreguesNoMes.length,
    ticketMedio: entregues.length ? somar(entregues.map(totalDaOrdem)) / entregues.length : 0,
    entregues: entregues.length,
    tempoMedio: tempos.length ? somar(tempos) / tempos.length : null,
    pecasNoMinimo,
    clientes: listar(CHAVES.clientes).length,
    veiculos: listar(CHAVES.veiculos).length,
  };
}

// Monta um cartão de indicador. "alerta" deixa a borda amarela.
function cartao(icone, rotulo, valor, detalhe, alerta = false) {
  return `
    <div class="col-6 col-lg-4">
      <div class="card h-100 ${alerta ? "border-warning" : ""}">
        <div class="card-body">
          <p class="text-body-secondary small text-uppercase mb-1"><i class="bi ${icone}"></i> ${rotulo}</p>
          <p class="fs-3 fw-bold mb-0">${valor}</p>
          <p class="small text-body-secondary mb-0">${detalhe}</p>
        </div>
      </div>
    </div>`;
}

function renderizarIndicadores() {
  const i = calcularIndicadores();
  const tempo = i.tempoMedio === null
    ? "—"
    : i.tempoMedio.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " dias";
  const pecas = i.pecasNoMinimo.length
    ? i.pecasNoMinimo.slice(0, 2).map((p) => escaparHtml(p.nome)).join(", ")
    : "estoque em ordem";

  document.getElementById("indicadores").innerHTML =
    cartao("bi-car-front", "Na oficina agora", i.naOficina, `${i.prontas} pronta(s) para retirada`) +
    cartao("bi-cash-coin", "Faturamento do mês", formatarMoeda(i.faturamentoMes), `${i.entreguesNoMes} OS entregue(s) no mês`) +
    cartao("bi-receipt", "Ticket médio", formatarMoeda(i.ticketMedio), `média de ${i.entregues} OS entregue(s)`) +
    cartao("bi-stopwatch", "Tempo médio de reparo", tempo, "da abertura à entrega") +
    cartao("bi-box-seam", "Peças no estoque mínimo", i.pecasNoMinimo.length, pecas, i.pecasNoMinimo.length > 0) +
    cartao("bi-people", "Clientes", i.clientes, `${i.veiculos} veículo(s) cadastrado(s)`);
}

// Fila da oficina: OS em andamento, da mais antiga para a mais nova
const ETAPAS_ANDAMENTO = ["aberta", "diagnostico", "aguardando_peca", "execucao", "pronta"];

// Quantos dias a OS está na etapa atual (desde a última mudança de status)
function diasNaEtapa(ordem) {
  const historico = ordem.historico || [];
  const ultima = historico.length ? historico[historico.length - 1].data : ordem.dataAbertura;
  return Math.floor((new Date() - new Date(ultima)) / 86400000);
}

function renderizarFila() {
  const ordens = listar(CHAVES.ordens)
    .filter(ordemEmAndamento)
    .sort((a, b) => new Date(a.dataAbertura) - new Date(b.dataAbertura));
  const lista = document.getElementById("fila-oficina");

  if (ordens.length === 0) {
    lista.innerHTML = '<li class="list-group-item text-center text-body-secondary py-4">Nenhuma OS em andamento.</li>';
    return;
  }

  let html = "";
  for (const ordem of ordens) {
    const veiculo = buscar(CHAVES.veiculos, ordem.veiculoId);
    const cliente = veiculo ? buscar(CHAVES.clientes, veiculo.clienteId) : null;
    const dias = diasNaEtapa(ordem);
    // Alerta: parada há mais de 3 dias na mesma etapa (menos quando já está pronta)
    const parada = dias > 3 && ordem.status !== "pronta";
    const textoDias = dias === 0 ? "hoje nesta etapa" : `${dias} dia(s) nesta etapa`;

    html += `
      <li class="list-group-item d-flex justify-content-between align-items-center gap-2">
        <div>
          <a href="ordem.html?id=${ordem.id}" class="fw-semibold font-monospace">${numeroOS(ordem.numero)}</a>
          <span class="badge text-bg-light border font-monospace ms-1">${escaparHtml(veiculo ? veiculo.placa : "???")}</span>
          <div class="small text-body-secondary">${escaparHtml(veiculo ? veiculo.modelo : "")} · ${escaparHtml(cliente ? cliente.nome : "")}</div>
        </div>
        <div class="text-end">
          ${etiquetaStatus(ordem.status)}
          <div class="small ${parada ? "text-danger fw-semibold" : "text-body-secondary"}">${textoDias}</div>
        </div>
      </li>`;
  }
  lista.innerHTML = html;
}

// Barras com a quantidade de OS em cada etapa
function renderizarEtapas() {
  const ordens = listar(CHAVES.ordens);
  const contagem = ETAPAS_ANDAMENTO.map((status) => ({
    status,
    quantidade: ordens.filter((o) => o.status === status).length,
  }));
  const maior = Math.max(1, ...contagem.map((c) => c.quantidade));

  let html = "";
  for (const { status, quantidade } of contagem) {
    html += `
      <div class="mb-3">
        <div class="d-flex justify-content-between small mb-1">
          <span>${STATUS_INFO[status].nome}</span><span class="fw-semibold">${quantidade}</span>
        </div>
        <div class="progress" role="progressbar" aria-label="${STATUS_INFO[status].nome}" aria-valuenow="${quantidade}" aria-valuemin="0" aria-valuemax="${maior}" style="height: 0.6rem">
          <div class="progress-bar" style="width: ${(quantidade / maior) * 100}%"></div>
        </div>
      </div>`;
  }
  document.getElementById("os-por-etapa").innerHTML = html;
}

// Ao abrir a página, calcula e mostra tudo
renderizarIndicadores();
renderizarFila();
renderizarEtapas();
