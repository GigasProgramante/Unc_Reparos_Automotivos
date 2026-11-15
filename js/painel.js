// PAINEL: indicadores, fila da oficina, OS por etapa, faturamento dos últimos 6 meses e serviços mais feitos.
// Todos os números são calculados na hora a partir dos dados salvos.

// INDICADORES
// ------------------------------------------------------------

// Data em que a OS foi entregue (fica registrada no histórico de status)
function dataEntrega(ordem) {
  const registro = (ordem.historico || []).find((h) => h.status === "entregue");
  return registro ? new Date(registro.data) : null;
}

// Valor total de uma OS (serviços + peças − desconto)
function totalDaOrdem(ordem) {
  return calcularTotais(ordem.itens || [], ordem.desconto).total;
}

// As duas datas caem no mesmo mês e ano?
function mesmoMes(data, referencia) {
  return data.getMonth() === referencia.getMonth() && data.getFullYear() === referencia.getFullYear();
}

// Soma uma lista de números
function somar(numeros) {
  return numeros.reduce((total, n) => total + n, 0);
}

// Calcula os indicadores a partir dos dados salvos
function calcularIndicadores() {
  const ordens = listar(CHAVES.ordens);
  const hoje = new Date();

  // Separa as OS por situação
  const emAndamento = ordens.filter(ordemEmAndamento);
  const entregues = ordens.filter((o) => o.status === "entregue");
  const entreguesNoMes = entregues.filter((o) => dataEntrega(o) && mesmoMes(dataEntrega(o), hoje));

  // Tempo de reparo: dias entre a abertura e a entrega
  const tempos = entregues
    .filter((o) => dataEntrega(o))
    .map((o) => (dataEntrega(o) - new Date(o.dataAbertura)) / 86400000);

  // Peças com estoque igual ou abaixo do mínimo
  const pecasNoMinimo = listar(CHAVES.catalogo)
    .filter((i) => i.tipo === "peca" && Number(i.estoque) <= Number(i.estoqueMinimo));

  // Valores que os cartões mostram
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

// Desenha os cartões de indicadores (um cartão por linha de "cartao(...)")
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


// FILA DA OFICINA E OS POR ETAPA
// ------------------------------------------------------------

// Etapas em andamento, na ordem do fluxo
const ETAPAS_ANDAMENTO = ["aberta", "diagnostico", "aguardando_peca", "execucao", "pronta"];

// Quantos dias a OS está na etapa atual (desde a última mudança de status)
function diasNaEtapa(ordem) {
  const historico = ordem.historico || [];
  const ultima = historico.length ? historico[historico.length - 1].data : ordem.dataAbertura;
  return Math.floor((new Date() - new Date(ultima)) / 86400000);
}

// Fila da oficina: OS em andamento, da mais antiga para a mais nova
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


// GRÁFICOS
// ------------------------------------------------------------

// Gráfico de colunas: faturamento (OS entregues) de cada um dos últimos 6 meses
function renderizarFaturamento() {
  const entregues = listar(CHAVES.ordens).filter((o) => o.status === "entregue" && dataEntrega(o));
  const meses = [];
  for (let i = 5; i >= 0; i--) {
    const data = new Date();
    data.setDate(1);
    data.setMonth(data.getMonth() - i);
    meses.push(data);
  }

  const valores = meses.map((mes) => somar(
    entregues.filter((o) => mesmoMes(dataEntrega(o), mes)).map(totalDaOrdem)
  ));
  const maior = Math.max(1, ...valores);

  let html = "";
  meses.forEach((mes, indice) => {
    const atual = indice === meses.length - 1;
    const nome = mes.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
    html += `
      <div class="flex-fill d-flex flex-column justify-content-end align-items-center h-100" title="${formatarMoeda(valores[indice])}">
        <span class="small ${atual ? "fw-semibold" : "text-body-secondary"}">${valores[indice] ? formatarMoeda(valores[indice]) : "—"}</span>
        <div class="w-75 rounded-top ${atual ? "bg-primary" : "bg-secondary"}" style="height: ${(valores[indice] / maior) * 80}%; min-height: 2px"></div>
        <span class="small text-body-secondary text-capitalize mt-1">${nome}</span>
      </div>`;
  });
  document.getElementById("grafico-faturamento").innerHTML = html;
}

// Os 5 serviços que mais aparecem nas OS (canceladas não contam)
function renderizarServicos() {
  const contagem = {};
  for (const ordem of listar(CHAVES.ordens)) {
    if (ordem.status === "cancelada") continue;
    for (const linha of ordem.itens || []) {
      if (linha.tipo === "servico") {
        contagem[linha.nome] = (contagem[linha.nome] || 0) + Number(linha.quantidade);
      }
    }
  }

  const ranking = Object.entries(contagem).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const area = document.getElementById("servicos-mais-feitos");
  if (ranking.length === 0) {
    area.innerHTML = '<p class="text-center text-body-secondary mb-0 py-4">Os serviços aparecem aqui conforme as OS são abertas.</p>';
    return;
  }

  const maior = ranking[0][1];
  let html = "";
  for (const [nome, quantidade] of ranking) {
    html += `
      <div class="mb-3">
        <div class="d-flex justify-content-between small mb-1">
          <span>${escaparHtml(nome)}</span><span class="fw-semibold">${quantidade}</span>
        </div>
        <div class="progress" role="progressbar" aria-label="${escaparHtml(nome)}" aria-valuenow="${quantidade}" aria-valuemin="0" aria-valuemax="${maior}" style="height: 0.6rem">
          <div class="progress-bar bg-info" style="width: ${(quantidade / maior) * 100}%"></div>
        </div>
      </div>`;
  }
  area.innerHTML = html;
}


// INÍCIO
// ------------------------------------------------------------

// Data de hoje no cabeçalho: "Sábado, 14 de novembro"
const hoje = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
document.getElementById("data-hoje").textContent = hoje.charAt(0).toUpperCase() + hoje.slice(1);

// Ao abrir a página, calcula e mostra tudo
renderizarIndicadores();
renderizarFila();
renderizarEtapas();
renderizarFaturamento();
renderizarServicos();
