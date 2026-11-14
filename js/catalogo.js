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

// Volta o formulário ao estado inicial (chamado quando o modal fecha)
function limparFormulario() {
  formItem.reset();
  mostrarCamposDoTipo();
}

document.getElementById("modalItem").addEventListener("hidden.bs.modal", limparFormulario);

// Ao abrir a página, mostra o catálogo salvo
renderizarCatalogo();
