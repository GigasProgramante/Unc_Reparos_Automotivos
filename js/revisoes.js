// Tela de revisões preventivas (F10).
// Não é uma coleção salva: tudo é calculado aqui a partir dos dados do storage.js.

const listaRevisoes = document.getElementById("lista-revisoes");
const buscaRevisao = document.getElementById("busca");
const filtroSituacao = document.getElementById("filtro-situacao");

// ---- Cálculo (a partir de listar() e buscar() do storage.js; nada é gravado) ----

const DIA_MS = 24 * 60 * 60 * 1000;
const AVISO_DIAS = 30; // "próxima": faltam até 30 dias...
const AVISO_KM = 1000; // ...ou até 1.000 km


// Data em que a OS foi entregue (cai na abertura se o histórico não tiver a etapa)
function dataEntrega(ordem) {
  const registro = (ordem.historico || []).find((r) => r.status === "entregue");
  return new Date(registro ? registro.data : ordem.dataAbertura);
}

// Serviço do catálogo que gera revisão: tem intervalo de km e/ou de meses
function intervaloDoServico(itemId) {
  const item = buscar(CHAVES.catalogo, itemId);
  if (!item || item.tipo !== "servico") return null;
  const km = Number(item.intervaloKm) || 0;
  const meses = Number(item.intervaloMeses) || 0;
  if (km === 0 && meses === 0) return null;
  return { nome: item.nome, km, meses };
}

// Km de hoje estimado pela média de km por dia entre as leituras de odômetro
// (km de entrada de cada OS). Com menos de 2 leituras usa o km salvo do veículo.
function estimarKmHoje(veiculo, ordensDoVeiculo, hoje) {
  const leituras = ordensDoVeiculo
    .filter((o) => o.status !== "cancelada")
    .map((o) => ({ data: new Date(o.dataAbertura), km: Number(o.kmEntrada) }))
    .sort((a, b) => a.data - b.data);

  const kmSalvo = Number(veiculo.km);
  if (leituras.length < 2) return kmSalvo;

  const primeira = leituras[0];
  const ultima = leituras[leituras.length - 1];
  const dias = (ultima.data - primeira.data) / DIA_MS;
  if (dias <= 0) return kmSalvo;

  const kmPorDia = Math.max(0, (ultima.km - primeira.km) / dias);
  const diasDesdeUltima = Math.max(0, (hoje - ultima.data) / DIA_MS);
  return Math.max(kmSalvo, Math.round(ultima.km + kmPorDia * diasDesdeUltima));
}

const PESO_SITUACAO = { vencida: 0, proxima: 1, "em-dia": 2 };

// Situação de um serviço periódico. O que vencer primeiro (data ou km) define.
function avaliarServico(intervalo, ordem, kmHoje, hoje) {
  const feito = dataEntrega(ordem);
  let situacao = "em-dia";
  let dataLimite = null;
  let kmLimite = null;

  if (intervalo.meses > 0) {
    dataLimite = new Date(feito);
    dataLimite.setMonth(dataLimite.getMonth() + intervalo.meses);
    const diasRestantes = Math.ceil((dataLimite - hoje) / DIA_MS);
    if (diasRestantes <= 0) situacao = "vencida";
    else if (diasRestantes <= AVISO_DIAS) situacao = "proxima";
  }

  if (intervalo.km > 0) {
    kmLimite = Number(ordem.kmEntrada) + intervalo.km;
    const kmRestantes = kmLimite - kmHoje;
    if (kmRestantes <= 0) situacao = "vencida";
    else if (kmRestantes <= AVISO_KM && situacao === "em-dia") situacao = "proxima";
  }

  return { servico: intervalo.nome, feitoEm: feito, kmFeito: Number(ordem.kmEntrada), dataLimite, kmLimite, situacao };
}

// Camada de dados da tela: devolve uma revisão por veículo que tenha OS entregue
// com serviço periódico. Se a OS tiver vários, vale o mais urgente.
function calcularRevisoes(hoje = new Date()) {
  const ordens = listar(CHAVES.ordens);
  const revisoes = [];

  for (const veiculo of listar(CHAVES.veiculos)) {
    const ordensDoVeiculo = ordens.filter((o) => o.veiculoId === veiculo.id);

    // Última OS entregue que tenha algum serviço periódico
    const entregues = ordensDoVeiculo
      .filter((o) => o.status === "entregue")
      .sort((a, b) => dataEntrega(b) - dataEntrega(a));
    const ordem = entregues.find((o) => (o.itens || []).some((l) => intervaloDoServico(l.itemId)));
    if (!ordem) continue;

    const kmHoje = estimarKmHoje(veiculo, ordensDoVeiculo, hoje);
    const avaliacoes = (ordem.itens || [])
      .map((linha) => intervaloDoServico(linha.itemId))
      .filter(Boolean)
      .map((intervalo) => avaliarServico(intervalo, ordem, kmHoje, hoje));

    // Mais urgente primeiro: pior situação e, no empate, a data limite mais próxima
    avaliacoes.sort((a, b) =>
      PESO_SITUACAO[a.situacao] - PESO_SITUACAO[b.situacao] ||
      (a.dataLimite ?? Infinity) - (b.dataLimite ?? Infinity));

    const cliente = buscar(CHAVES.clientes, veiculo.clienteId);
    revisoes.push({
      veiculo,
      clienteNome: cliente ? cliente.nome : "Cliente não encontrado",
      ordemId: ordem.id,
      kmHoje,
      ...avaliacoes[0],
    });
  }

  return revisoes;
}

// ---- Tela ----

const ETIQUETAS = {
  vencida: '<span class="badge text-bg-danger">Vencida</span>',
  proxima: '<span class="badge text-bg-warning">Próxima</span>',
  "em-dia": '<span class="badge text-bg-success">Em dia</span>',
};

function textoProximaRevisao(revisao) {
  const partes = [];
  if (revisao.dataLimite) partes.push(revisao.dataLimite.toLocaleDateString("pt-BR"));
  if (revisao.kmLimite !== null) partes.push(revisao.kmLimite.toLocaleString("pt-BR") + " km");
  return partes.join(" ou ");
}

function linhaRevisao(revisao) {
  const v = revisao.veiculo;
  return `
    <tr>
      <td>${escaparHtml(revisao.clienteNome)}</td>
      <td>${escaparHtml(v.modelo)} <span class="badge text-bg-light border font-monospace">${escaparHtml(v.placa)}</span></td>
      <td>${escaparHtml(revisao.servico)}<div class="small text-body-secondary">${revisao.feitoEm.toLocaleDateString("pt-BR")} · ${revisao.kmFeito.toLocaleString("pt-BR")} km</div></td>
      <td>${textoProximaRevisao(revisao)}<div class="small text-body-secondary">Km estimado hoje: ${revisao.kmHoje.toLocaleString("pt-BR")}</div></td>
      <td>${ETIQUETAS[revisao.situacao]}</td>
      <td class="text-end"><a class="btn btn-sm btn-outline-primary" href="ordem.html?id=${encodeURIComponent(revisao.ordemId)}">Ver OS</a></td>
    </tr>`;
}

function linhaVazia(texto) {
  return `
    <tr>
      <td colspan="6" class="text-center text-body-secondary py-5">
        <i class="bi bi-calendar-check fs-1"></i>
        <p class="mb-0">${texto}</p>
      </td>
    </tr>`;
}

// Aplica a pesquisa (cliente, placa ou modelo) e o filtro de situação
function filtrarRevisoes(revisoes) {
  const busca = buscaRevisao.value.trim().toLowerCase();
  const situacao = filtroSituacao.value;

  return revisoes.filter((r) => {
    if (situacao !== "" && r.situacao !== situacao) return false;
    if (busca === "") return true;
    return r.clienteNome.toLowerCase().includes(busca) ||
      r.veiculo.placa.toLowerCase().includes(busca) ||
      r.veiculo.modelo.toLowerCase().includes(busca);
  });
}

function renderizarRevisoes() {
  const todas = calcularRevisoes();

  // Os contadores mostram o total geral, sem depender dos filtros
  document.getElementById("total-vencidas").textContent = todas.filter((r) => r.situacao === "vencida").length;
  document.getElementById("total-proximas").textContent = todas.filter((r) => r.situacao === "proxima").length;

  // Mais urgentes primeiro
  const revisoes = filtrarRevisoes(todas).sort((a, b) => PESO_SITUACAO[a.situacao] - PESO_SITUACAO[b.situacao]);

  if (revisoes.length === 0) {
    listaRevisoes.innerHTML = linhaVazia(
      todas.length === 0 ? "Nenhuma revisão prevista" : "Nenhuma revisão encontrada com esses filtros.");
    return;
  }

  listaRevisoes.innerHTML = revisoes.map(linhaRevisao).join("");
}

for (const campo of [buscaRevisao, filtroSituacao]) {
  campo.addEventListener("input", renderizarRevisoes);
}

// O Enter na busca não deve recarregar a página
buscaRevisao.form.addEventListener("submit", (evento) => evento.preventDefault());

renderizarRevisoes();
