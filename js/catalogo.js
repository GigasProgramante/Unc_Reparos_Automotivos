const listaServicos = document.getElementById("lista-servicos");
const listaPecas = document.getElementById("lista-pecas");
const buscaItem = document.getElementById("busca-item");
const filtroPreco = document.getElementById("filtro-preco");
const filtroSituacao = document.getElementById("filtro-situacao");
const ordemItens = document.getElementById("ordem-itens");

// Texto do intervalo de revisão: "10.000 km ou 6 meses"
function textoRevisao(servico) {
  const partes = [];
  if (servico.intervaloKm) partes.push(Number(servico.intervaloKm).toLocaleString("pt-BR") + " km");
  if (servico.intervaloMeses) partes.push(servico.intervaloMeses + " meses");
  return partes.length > 0 ? partes.join(" ou ") : "—";
}

// Etiqueta do estoque: vermelho sem estoque, amarelo no mínimo
function etiquetaEstoque(peca) {
  if (Number(peca.estoque) === 0) return '<span class="badge text-bg-danger ms-1">Sem estoque</span>';
  if (Number(peca.estoque) <= Number(peca.estoqueMinimo)) return '<span class="badge text-bg-warning ms-1">No mínimo</span>';
  return "";
}

function botoesAcao(item) {
  return `
      <td class="text-end text-nowrap">
        <button type="button" class="btn btn-sm btn-outline-primary" data-acao="editar" data-id="${item.id}">Editar</button>
        <button type="button" class="btn btn-sm btn-outline-danger" data-acao="excluir" data-id="${item.id}">Excluir</button>
      </td>`;
}

function linhaServico(servico) {
  return `
    <tr>
      <td><strong>${escaparHtml(servico.nome)}</strong></td>
      <td>${formatarMoeda(servico.preco)}</td>
      <td>${Number(servico.horas).toLocaleString("pt-BR")} h</td>
      <td>${textoRevisao(servico)}</td>
      ${botoesAcao(servico)}
    </tr>`;
}

function linhaPeca(peca) {
  return `
    <tr>
      <td><strong>${escaparHtml(peca.nome)}</strong></td>
      <td>${formatarMoeda(peca.preco)}</td>
      <td>${escaparHtml(peca.unidade)}</td>
      <td>${peca.estoque}${etiquetaEstoque(peca)}</td>
      <td>${peca.estoqueMinimo}</td>
      ${botoesAcao(peca)}
    </tr>`;
}

// Linha que ocupa a tabela inteira quando não há nada para mostrar
function linhaVazia(colunas, icone, texto) {
  return `
    <tr>
      <td colspan="${colunas}" class="text-center text-body-secondary py-5">
        <i class="bi ${icone} fs-1"></i>
        <p class="mb-0">${texto}</p>
      </td>
    </tr>`;
}

// Aplica a pesquisa e os filtros (valem para as duas abas)
function filtrarItens(itens) {
  const busca = buscaItem.value.trim().toLowerCase();
  const faixa = filtroPreco.value;
  const situacao = filtroSituacao.value;

  return itens.filter((item) => {
    if (busca !== "" && !item.nome.toLowerCase().includes(busca)) return false;

    const preco = Number(item.preco);
    if (faixa === "ate100" && preco > 100) return false;
    if (faixa === "100a300" && (preco <= 100 || preco > 300)) return false;
    if (faixa === "acima300" && preco <= 300) return false;

    // "Com revisão" só faz sentido para serviço; "estoque baixo" só para peça
    if (situacao === "com-revisao" && !(item.tipo === "servico" && (item.intervaloKm || item.intervaloMeses))) return false;
    if (situacao === "estoque-baixo" && !(item.tipo === "peca" && Number(item.estoque) <= Number(item.estoqueMinimo))) return false;

    return true;
  });
}

// Ordena a lista conforme a opção escolhida
function ordenarItens(itens) {
  const ordem = ordemItens.value;

  if (ordem === "nome") {
    itens.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  } else if (ordem === "menor-preco") {
    itens.sort((a, b) => a.preco - b.preco);
  } else if (ordem === "maior-preco") {
    itens.sort((a, b) => b.preco - a.preco);
  }
  return itens;
}

// Mostra os itens filtrados e ordenados, cada tipo na sua aba,
// com a quantidade no título da aba
function renderizarCatalogo() {
  const todos = listar(CHAVES.catalogo);
  const itens = ordenarItens(filtrarItens(todos));
  const servicos = itens.filter((i) => i.tipo === "servico");
  const pecas = itens.filter((i) => i.tipo === "peca");
  const totalServicos = todos.filter((i) => i.tipo === "servico").length;
  const totalPecas = todos.filter((i) => i.tipo === "peca").length;

  document.getElementById("qtd-servicos").textContent = `${servicos.length}/${totalServicos}`;
  document.getElementById("qtd-pecas").textContent = `${pecas.length}/${totalPecas}`;

  let html = "";
  for (const servico of servicos) html += linhaServico(servico);
  const vazioServicos = totalServicos === 0 ? "Nenhum serviço cadastrado" : "Nenhum serviço encontrado com esses filtros";
  listaServicos.innerHTML = html || linhaVazia(5, "bi-tools", vazioServicos);

  html = "";
  for (const peca of pecas) html += linhaPeca(peca);
  const vazioPecas = totalPecas === 0 ? "Nenhuma peça cadastrada" : "Nenhuma peça encontrada com esses filtros";
  listaPecas.innerHTML = html || linhaVazia(6, "bi-box-seam", vazioPecas);
}

// Atualiza a lista sempre que a pesquisa ou um filtro mudar
for (const campo of [buscaItem, filtroPreco, filtroSituacao, ordemItens]) {
  campo.addEventListener("input", renderizarCatalogo);
}

// Formulário: mostra só os campos do tipo escolhido
const formItem = document.getElementById("form-item");
const modalItem = new bootstrap.Modal("#modalItem");

function mostrarCamposDoTipo() {
  const tipo = formItem.tipo.value;
  document.getElementById("campos-servico").classList.toggle("d-none", tipo !== "servico");
  document.getElementById("campos-peca").classList.toggle("d-none", tipo !== "peca");
}

formItem.tipo.addEventListener("change", mostrarCamposDoTipo);

const errosItem = document.getElementById("erros-item");
let idEmEdicao = null; // null = cadastrando um item novo

// Converte o valor do campo em número, ou null se estiver vazio
function numeroOuNulo(valor) {
  return String(valor).trim() === "" ? null : Number(valor);
}

// Junta os valores do formulário num objeto, só com os campos do tipo escolhido
function lerFormulario() {
  const dados = {
    tipo: formItem.tipo.value,
    nome: formItem.nome.value.trim(),
    preco: Number(formItem.preco.value),
  };

  if (dados.tipo === "servico") {
    dados.horas = numeroOuNulo(formItem.horas.value);
    dados.intervaloKm = numeroOuNulo(formItem.intervaloKm.value);
    dados.intervaloMeses = numeroOuNulo(formItem.intervaloMeses.value);
  } else {
    dados.unidade = formItem.unidade.value;
    dados.estoque = numeroOuNulo(formItem.estoque.value);
    dados.estoqueMinimo = numeroOuNulo(formItem.estoqueMinimo.value);
  }
  return dados;
}

function mostrarErros(erros) {
  errosItem.innerHTML = erros.join("<br>");
  errosItem.classList.remove("d-none");
}

// Volta o formulário ao estado inicial (chamado quando o modal fecha)
function limparFormulario() {
  formItem.reset();
  formItem.classList.remove("was-validated");
  errosItem.classList.add("d-none");
  document.getElementById("tituloModalItem").textContent = "Novo item";
  formItem.tipo.disabled = false;
  idEmEdicao = null;
  mostrarCamposDoTipo();
}

document.getElementById("modalItem").addEventListener("hidden.bs.modal", limparFormulario);

formItem.addEventListener("submit", (evento) => {
  evento.preventDefault();

  // 1º: validações do próprio HTML (required, faixas de preço, horas e estoque)
  if (!formItem.checkValidity()) {
    formItem.classList.add("was-validated");
    return;
  }

  // 2º: regras do validacao.js (nome repetido, campos obrigatórios de cada tipo)
  const dados = lerFormulario();
  const erros = validarItem(dados, idEmEdicao);
  if (erros.length > 0) {
    mostrarErros(erros);
    return;
  }

  if (idEmEdicao === null) {
    criar(CHAVES.catalogo, { ...dados, criadoEm: new Date().toISOString() });
    mostrarMensagem(`"${dados.nome}" adicionado ao catálogo.`);
  } else {
    atualizar(CHAVES.catalogo, idEmEdicao, dados);
    mostrarMensagem(`"${dados.nome}" atualizado.`);
  }

  modalItem.hide();
  renderizarCatalogo();
});

// Edição: abre o modal com os dados do item. O tipo fica travado,
// porque serviço e peça guardam campos diferentes.
function abrirEdicao(id) {
  const item = buscar(CHAVES.catalogo, id);
  if (!item) return;

  idEmEdicao = id;
  formItem.tipo.value = item.tipo;
  formItem.tipo.disabled = true;
  formItem.nome.value = item.nome;
  formItem.preco.value = item.preco;

  if (item.tipo === "servico") {
    formItem.horas.value = item.horas ?? "";
    formItem.intervaloKm.value = item.intervaloKm ?? "";
    formItem.intervaloMeses.value = item.intervaloMeses ?? "";
  } else {
    formItem.unidade.value = item.unidade;
    formItem.estoque.value = item.estoque;
    formItem.estoqueMinimo.value = item.estoqueMinimo;
  }

  mostrarCamposDoTipo();
  document.getElementById("tituloModalItem").textContent = "Editar item";
  modalItem.show();
}

// Exclusão
const modalExcluir = new bootstrap.Modal("#modalExcluir");
let idParaExcluir = null;

// Regra: item já usado em alguma OS não pode ser excluído
function pedirExclusao(id) {
  const item = buscar(CHAVES.catalogo, id);
  if (!item) return;

  const usado = listar(CHAVES.ordens).some((o) => (o.itens || []).some((i) => i.itemId === id));
  if (usado) {
    mostrarMensagem(`"${item.nome}" já foi usado em ordens de serviço e não pode ser excluído.`, "erro");
    return;
  }

  idParaExcluir = id;
  document.getElementById("nome-excluir").textContent = item.nome;
  modalExcluir.show();
}

document.getElementById("btn-confirmar-exclusao").addEventListener("click", () => {
  excluir(CHAVES.catalogo, idParaExcluir);
  modalExcluir.hide();
  mostrarMensagem("Item excluído.");
  renderizarCatalogo();
});

// Botões "Editar" e "Excluir" das duas tabelas
for (const tabela of [listaServicos, listaPecas]) {
  tabela.addEventListener("click", (evento) => {
    const botao = evento.target.closest("button[data-acao]");
    if (!botao) return;

    if (botao.dataset.acao === "editar") abrirEdicao(botao.dataset.id);
    if (botao.dataset.acao === "excluir") pedirExclusao(botao.dataset.id);
  });
}

// Ao abrir a página, mostra o catálogo salvo
renderizarCatalogo();
