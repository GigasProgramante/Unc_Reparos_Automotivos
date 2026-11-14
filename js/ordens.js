const listaOrdens = document.getElementById("lista-ordens");
const formOrdem = document.getElementById("form-ordem");
const modalOrdem = new bootstrap.Modal("#modalOrdem");
const buscaOrdem = document.getElementById("busca-ordem");
const filtroStatus = document.getElementById("filtro-status");
const filtroPeriodo = document.getElementById("filtro-periodo");
const ordemLista = document.getElementById("ordem-lista");
const contadorOrdens = document.getElementById("contador-ordens");

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

// Monta a linha da tabela de uma OS
function linhaOrdem(ordem) {
  const veiculo = buscar(CHAVES.veiculos, ordem.veiculoId);
  const cliente = veiculo ? buscar(CHAVES.clientes, veiculo.clienteId) : null;
  const total = calcularTotais(ordem.itens || [], ordem.desconto).total;
  const data = new Date(ordem.dataAbertura).toLocaleDateString("pt-BR");

  return `
    <tr>
      <td><a class="fw-semibold font-monospace" href="ordem.html?id=${ordem.id}">${numeroOS(ordem.numero)}</a><div class="small text-body-secondary">${data}</div></td>
      <td>${escaparHtml(cliente ? cliente.nome : "—")}</td>
      <td>
        <span class="badge text-bg-light border font-monospace">${escaparHtml(veiculo ? veiculo.placa : "???")}</span>
        <span class="small">${escaparHtml(veiculo ? veiculo.modelo : "Veículo removido")}</span>
      </td>
      <td>${etiquetaStatus(ordem.status)}</td>
      <td>${formatarMoeda(total)}</td>
      <td class="text-end text-nowrap">
        <a class="btn btn-sm btn-outline-secondary" href="ordem.html?id=${ordem.id}">Ver</a>
        <button type="button" class="btn btn-sm btn-outline-primary" data-acao="editar" data-id="${ordem.id}"${ordemEmAndamento(ordem) ? "" : " disabled"}>Editar</button>
        <button type="button" class="btn btn-sm btn-outline-danger" data-acao="excluir" data-id="${ordem.id}">Excluir</button>
      </td>
    </tr>`;
}

function linhaVazia(texto) {
  return `
    <tr>
      <td colspan="6" class="text-center text-body-secondary py-5">
        <i class="bi bi-clipboard-check fs-1"></i>
        <p class="mb-0">${texto}</p>
      </td>
    </tr>`;
}

// Aplica a pesquisa e os filtros na lista de OS
function filtrarOrdens(ordens) {
  const busca = buscaOrdem.value.trim().toLowerCase().replace("#", "");
  const status = filtroStatus.value;
  const periodo = filtroPeriodo.value;
  const agora = new Date();

  return ordens.filter((ordem) => {
    // Pesquisa: número da OS, placa ou nome do cliente
    if (busca !== "") {
      const veiculo = buscar(CHAVES.veiculos, ordem.veiculoId);
      const cliente = veiculo ? buscar(CHAVES.clientes, veiculo.clienteId) : null;
      const achou = String(ordem.numero) === String(Number(busca)) ||
        (veiculo && veiculo.placa.toLowerCase().includes(busca)) ||
        (cliente && cliente.nome.toLowerCase().includes(busca));
      if (!achou) return false;
    }

    if (status === "andamento" && !ordemEmAndamento(ordem)) return false;
    if (status !== "" && status !== "andamento" && ordem.status !== status) return false;

    const abertura = new Date(ordem.dataAbertura);
    if (periodo === "mes" && (abertura.getMonth() !== agora.getMonth() || abertura.getFullYear() !== agora.getFullYear())) return false;
    if (periodo === "30" && (agora - abertura) / 86400000 > 30) return false;

    return true;
  });
}

// Ordena a lista conforme a opção escolhida
function ordenarOrdens(ordens) {
  const ordem = ordemLista.value;
  const total = (os) => calcularTotais(os.itens || [], os.desconto).total;

  if (ordem === "recentes") ordens.sort((a, b) => b.numero - a.numero);
  else if (ordem === "antigas") ordens.sort((a, b) => a.numero - b.numero);
  else if (ordem === "maior-valor") ordens.sort((a, b) => total(b) - total(a));
  else if (ordem === "menor-valor") ordens.sort((a, b) => total(a) - total(b));
  return ordens;
}

// Mostra as OS filtradas e ordenadas
function renderizarOrdens() {
  const todas = listar(CHAVES.ordens);
  const ordens = ordenarOrdens(filtrarOrdens(todas));

  contadorOrdens.textContent = `${ordens.length} de ${todas.length} ordens de serviço`;

  let html = "";
  for (const ordem of ordens) {
    html += linhaOrdem(ordem);
  }
  const vazio = todas.length === 0
    ? "Nenhuma ordem de serviço cadastrada"
    : "Nenhuma OS encontrada com esses filtros";
  listaOrdens.innerHTML = html || linhaVazia(vazio);
}

// Coloca os status no filtro
for (const [chave, info] of Object.entries(STATUS_INFO)) {
  filtroStatus.innerHTML += `<option value="${chave}">${info.nome}</option>`;
}

// Atualiza a lista sempre que a pesquisa ou um filtro mudar
for (const campo of [buscaOrdem, filtroStatus, filtroPeriodo, ordemLista]) {
  campo.addEventListener("input", renderizarOrdens);
}

// Formulário: cliente -> veículo, itens e orçamento
let itensDaOrdem = []; // itens que estão no formulário agora

// Preenche o select de clientes (só quem tem veículo cadastrado)
function carregarClientes() {
  const veiculos = listar(CHAVES.veiculos);
  const clientes = listar(CHAVES.clientes)
    .filter((c) => veiculos.some((v) => v.clienteId === c.id))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  let opcoes = '<option value="">Selecione um cliente</option>';
  for (const cliente of clientes) {
    opcoes += `<option value="${cliente.id}">${escaparHtml(cliente.nome)}</option>`;
  }
  formOrdem.cliente.innerHTML = opcoes;
}

// Quando o cliente muda, mostra só os veículos dele
function carregarVeiculosDoCliente() {
  const clienteId = formOrdem.cliente.value;
  const veiculos = listar(CHAVES.veiculos).filter((v) => v.clienteId === clienteId);

  let opcoes = '<option value="">Selecione um veículo</option>';
  for (const veiculo of veiculos) {
    opcoes += `<option value="${veiculo.id}">${escaparHtml(veiculo.placa)} · ${escaparHtml(veiculo.modelo)}</option>`;
  }
  formOrdem.veiculo.innerHTML = opcoes;
  formOrdem.veiculo.disabled = clienteId === "";
}

// Quando o veículo muda, sugere o km atual dele
function sugerirKm() {
  const veiculo = buscar(CHAVES.veiculos, formOrdem.veiculo.value);
  formOrdem.km.value = veiculo ? veiculo.km : "";
}

formOrdem.cliente.addEventListener("change", () => {
  carregarVeiculosDoCliente();
  sugerirKm();
});
formOrdem.veiculo.addEventListener("change", sugerirKm);

// Preenche o select de itens com o catálogo, separado em serviços e peças
function carregarCatalogo() {
  const itens = listar(CHAVES.catalogo).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  let servicos = "";
  let pecas = "";
  for (const item of itens) {
    const extra = item.tipo === "peca" ? ` · estoque ${item.estoque}` : ` · ${item.horas} h`;
    const opcao = `<option value="${item.id}">${escaparHtml(item.nome)} — ${formatarMoeda(item.preco)}${extra}</option>`;
    if (item.tipo === "servico") servicos += opcao;
    else pecas += opcao;
  }
  document.getElementById("item-catalogo").innerHTML =
    '<option value="">Selecione um serviço ou peça</option>' +
    `<optgroup label="Serviços">${servicos}</optgroup><optgroup label="Peças">${pecas}</optgroup>`;
}

// Adiciona um item à OS (se já estiver na lista, soma a quantidade)
function adicionarItem() {
  const item = buscar(CHAVES.catalogo, document.getElementById("item-catalogo").value);
  const quantidade = Number(document.getElementById("item-quantidade").value);
  if (!item) {
    mostrarMensagem("Escolha um serviço ou peça para adicionar.", "erro");
    return;
  }
  if (!Number.isInteger(quantidade) || quantidade < 1) {
    mostrarMensagem("A quantidade deve ser um número inteiro maior que zero.", "erro");
    return;
  }

  const existente = itensDaOrdem.find((linha) => linha.itemId === item.id);
  if (existente) {
    existente.quantidade += quantidade;
  } else {
    // Guarda nome e preço do momento: se o catálogo mudar depois, a OS não muda
    itensDaOrdem.push({
      itemId: item.id,
      nome: item.nome,
      tipo: item.tipo,
      quantidade,
      precoUnitario: Number(item.preco),
      horas: item.tipo === "servico" ? Number(item.horas) : 0,
    });
  }

  document.getElementById("item-catalogo").value = "";
  document.getElementById("item-quantidade").value = 1;
  renderizarItens();
}

document.getElementById("btn-adicionar-item").addEventListener("click", adicionarItem);

// Mostra os itens adicionados e atualiza o orçamento
function renderizarItens() {
  const tabela = document.getElementById("itens-ordem");
  if (itensDaOrdem.length === 0) {
    tabela.innerHTML = '<tr><td colspan="4" class="text-body-secondary small">Nenhum item ainda. Os itens podem ser incluídos depois do diagnóstico.</td></tr>';
  } else {
    let html = "";
    itensDaOrdem.forEach((linha, indice) => {
      html += `
        <tr>
          <td>${escaparHtml(linha.nome)} <span class="badge ${linha.tipo === "servico" ? "text-bg-info" : "text-bg-secondary"}">${linha.tipo === "servico" ? "serviço" : "peça"}</span></td>
          <td class="text-end">${linha.quantidade}</td>
          <td class="text-end">${formatarMoeda(linha.precoUnitario * linha.quantidade)}</td>
          <td class="text-end"><button type="button" class="btn btn-sm btn-outline-danger" data-remover="${indice}" aria-label="Remover item">Remover</button></td>
        </tr>`;
    });
    tabela.innerHTML = html;
  }
  renderizarOrcamento();
}

// Botão "Remover" de cada item
document.getElementById("itens-ordem").addEventListener("click", (evento) => {
  const botao = evento.target.closest("button[data-remover]");
  if (!botao) return;
  itensDaOrdem.splice(Number(botao.dataset.remover), 1);
  renderizarItens();
});

// Orçamento atualizado a cada item adicionado ou desconto alterado
function renderizarOrcamento() {
  const t = calcularTotais(itensDaOrdem, formOrdem.desconto.value);
  document.getElementById("orcamento").innerHTML = `
    <div class="d-flex justify-content-between"><span>Serviços</span><span>${formatarMoeda(t.servicos)}</span></div>
    <div class="d-flex justify-content-between"><span>Peças</span><span>${formatarMoeda(t.pecas)}</span></div>
    <div class="d-flex justify-content-between"><span>Desconto (${Number(formOrdem.desconto.value || 0)}%)</span><span>− ${formatarMoeda(t.valorDesconto)}</span></div>
    <div class="d-flex justify-content-between fs-5 fw-semibold border-top mt-2 pt-2"><span>Total</span><span>${formatarMoeda(t.total)}</span></div>
    <div class="small text-body-secondary mt-1">Mão de obra estimada: ${t.horas.toLocaleString("pt-BR")} h</div>`;
}

formOrdem.desconto.addEventListener("input", renderizarOrcamento);

// Prepara o formulário toda vez que o modal abre como "nova OS"
function prepararFormulario() {
  carregarClientes();
  carregarVeiculosDoCliente();
  carregarCatalogo();
  renderizarItens();
}

// Abertura e edição
const errosOrdem = document.getElementById("erros-ordem");
let idEmEdicao = null; // null = abrindo uma OS nova

function mostrarErros(erros) {
  errosOrdem.innerHTML = erros.join("<br>");
  errosOrdem.classList.remove("d-none");
}

// Volta o formulário ao estado inicial (chamado quando o modal fecha)
function limparFormulario() {
  formOrdem.reset();
  formOrdem.classList.remove("was-validated");
  errosOrdem.classList.add("d-none");
  document.getElementById("tituloModalOrdem").textContent = "Nova ordem de serviço";
  document.getElementById("btn-salvar-ordem").textContent = "Abrir OS";
  formOrdem.cliente.disabled = false;
  formOrdem.km.disabled = false;
  itensDaOrdem = [];
  idEmEdicao = null;
  prepararFormulario();
}

document.getElementById("modalOrdem").addEventListener("hidden.bs.modal", limparFormulario);

// Junta os valores do formulário num objeto
function lerFormulario() {
  return {
    veiculoId: formOrdem.veiculo.value,
    kmEntrada: Number(formOrdem.km.value),
    problema: formOrdem.problema.value.trim(),
    desconto: Number(formOrdem.desconto.value || 0),
    itens: itensDaOrdem,
  };
}

formOrdem.addEventListener("submit", (evento) => {
  evento.preventDefault();

  // 1º: validações do próprio HTML (obrigatórios, km, problema, desconto 0 a 15)
  if (!formOrdem.checkValidity()) {
    formOrdem.classList.add("was-validated");
    return;
  }

  // 2º: regras do validacao.js (veículo livre, km, OS já finalizada)
  const dados = lerFormulario();
  const erros = validarOrdem(dados, idEmEdicao);
  if (erros.length > 0) {
    mostrarErros(erros);
    return;
  }

  if (idEmEdicao === null) {
    const agora = new Date().toISOString();
    const nova = criarOrdem({
      ...dados,
      status: "aberta",
      dataAbertura: agora,
      historico: [{ status: "aberta", data: agora }],
    });
    // A OS atualiza o km do veículo (o odômetro só aumenta)
    atualizar(CHAVES.veiculos, dados.veiculoId, { km: dados.kmEntrada });
    mostrarMensagem(`OS ${numeroOS(nova.numero)} aberta.`);
  } else {
    // Na edição mudam só o problema, os itens e o desconto
    atualizar(CHAVES.ordens, idEmEdicao, {
      problema: dados.problema,
      desconto: dados.desconto,
      itens: dados.itens,
    });
    mostrarMensagem("Ordem de serviço atualizada.");
  }

  modalOrdem.hide();
  renderizarOrdens();
});

// Edição: abre o modal com os dados da OS. Cliente, veículo e km ficam travados.
function abrirEdicao(id) {
  const ordem = buscar(CHAVES.ordens, id);
  if (!ordem) return;
  const veiculo = buscar(CHAVES.veiculos, ordem.veiculoId);

  idEmEdicao = id;
  if (veiculo) {
    formOrdem.cliente.value = veiculo.clienteId;
    carregarVeiculosDoCliente();
    formOrdem.veiculo.value = veiculo.id;
  }
  formOrdem.cliente.disabled = true;
  formOrdem.veiculo.disabled = true;
  formOrdem.km.value = ordem.kmEntrada;
  formOrdem.km.disabled = true;
  formOrdem.problema.value = ordem.problema;
  formOrdem.desconto.value = ordem.desconto;
  itensDaOrdem = (ordem.itens || []).map((linha) => ({ ...linha }));
  renderizarItens();

  document.getElementById("tituloModalOrdem").textContent = `Editar OS ${numeroOS(ordem.numero)}`;
  document.getElementById("btn-salvar-ordem").textContent = "Salvar alterações";
  modalOrdem.show();
}

// Exclusão
const modalExcluir = new bootstrap.Modal("#modalExcluir");
let idParaExcluir = null;

// Regra (validacao.js): só OS abertas ou canceladas podem ser excluídas
function pedirExclusao(id) {
  const erros = validarExclusaoOrdem(id);
  if (erros.length > 0) {
    mostrarMensagem(erros[0], "erro");
    return;
  }

  const ordem = buscar(CHAVES.ordens, id);
  idParaExcluir = id;
  document.getElementById("numero-excluir").textContent = numeroOS(ordem.numero);
  modalExcluir.show();
}

document.getElementById("btn-confirmar-exclusao").addEventListener("click", () => {
  excluir(CHAVES.ordens, idParaExcluir);
  modalExcluir.hide();
  mostrarMensagem("Ordem de serviço excluída.");
  renderizarOrdens();
});

// Botões "Editar" e "Excluir" de cada OS
listaOrdens.addEventListener("click", (evento) => {
  const botao = evento.target.closest("button[data-acao]");
  if (!botao) return;

  if (botao.dataset.acao === "editar") abrirEdicao(botao.dataset.id);
  if (botao.dataset.acao === "excluir") pedirExclusao(botao.dataset.id);
});

// Ao abrir a página, prepara o formulário e mostra as OS salvas
prepararFormulario();
renderizarOrdens();
