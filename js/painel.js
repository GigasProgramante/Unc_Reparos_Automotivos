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

// Ao abrir a página, calcula e mostra os indicadores
renderizarIndicadores();
