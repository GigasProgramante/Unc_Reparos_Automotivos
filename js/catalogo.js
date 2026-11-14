const listaServicos = document.getElementById("lista-servicos");
const listaPecas = document.getElementById("lista-pecas");

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

// Mostra os serviços e as peças salvos, cada um na sua aba
function renderizarCatalogo() {
  const itens = listar(CHAVES.catalogo);
  const servicos = itens.filter((i) => i.tipo === "servico");
  const pecas = itens.filter((i) => i.tipo === "peca");

  let html = "";
  for (const servico of servicos) html += linhaServico(servico);
  listaServicos.innerHTML = html || linhaVazia(5, "bi-tools", "Nenhum serviço cadastrado");

  html = "";
  for (const peca of pecas) html += linhaPeca(peca);
  listaPecas.innerHTML = html || linhaVazia(6, "bi-box-seam", "Nenhuma peça cadastrada");
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

// Botões "Editar" e "Excluir" das duas tabelas
for (const tabela of [listaServicos, listaPecas]) {
  tabela.addEventListener("click", (evento) => {
    const botao = evento.target.closest("button[data-acao]");
    if (!botao) return;

    if (botao.dataset.acao === "editar") abrirEdicao(botao.dataset.id);
  });
}

// Ao abrir a página, mostra o catálogo salvo
renderizarCatalogo();
