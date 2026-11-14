const listaOrdens = document.getElementById("lista-ordens");
const formOrdem = document.getElementById("form-ordem");
const modalOrdem = new bootstrap.Modal("#modalOrdem");

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

// Mostra as OS salvas, da mais nova para a mais antiga
function renderizarOrdens() {
  const ordens = listar(CHAVES.ordens);
  ordens.sort((a, b) => b.numero - a.numero);

  let html = "";
  for (const ordem of ordens) {
    html += linhaOrdem(ordem);
  }
  listaOrdens.innerHTML = html || linhaVazia("Nenhuma ordem de serviço cadastrada");
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

// Volta o formulário ao estado inicial (chamado quando o modal fecha)
function limparFormulario() {
  formOrdem.reset();
  itensDaOrdem = [];
  prepararFormulario();
}

document.getElementById("modalOrdem").addEventListener("hidden.bs.modal", limparFormulario);

// Ao abrir a página, prepara o formulário e mostra as OS salvas
prepararFormulario();
renderizarOrdens();
