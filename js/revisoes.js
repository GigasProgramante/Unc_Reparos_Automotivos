// Tela de revisões preventivas (F10).
// A revisão é cadastrada manualmente: cliente, veículo e data prevista.
// A situação (vencida, próxima, em dia) é calculada aqui só para exibir, pela data.

const DIA_MS = 24 * 60 * 60 * 1000;
const AVISO_DIAS = 30; // "próxima": faltam até 30 dias

const listaRevisoes = document.getElementById("lista-revisoes");
const buscaRevisao = document.getElementById("busca");
const filtroSituacao = document.getElementById("filtro-situacao");

// ---- Exibição ----

// Ordem das situações na lista: vencidas primeiro
const PESO_SITUACAO = { vencida: 0, proxima: 1, "em-dia": 2 };

// Etiqueta colorida de cada situação
const ETIQUETAS = {
  vencida: '<span class="badge text-bg-danger">Vencida</span>',
  proxima: '<span class="badge text-bg-warning">Próxima</span>',
  "em-dia": '<span class="badge text-bg-success">Em dia</span>',
};

// "2026-11-20" (valor do input date) vira uma data local, sem erro de fuso
function lerData(texto) {
  const [ano, mes, dia] = String(texto).split("-").map(Number);
  return new Date(ano, mes - 1, dia);
}

function formatarData(texto) {
  return lerData(texto).toLocaleDateString("pt-BR");
}

// Vencida: a data já passou. Próxima: faltam até 30 dias (inclui hoje).
function situacaoDaRevisao(revisao, hoje = new Date()) {
  const hoje0 = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const dias = Math.round((lerData(revisao.dataPrevista) - hoje0) / DIA_MS);
  if (dias < 0) return "vencida";
  if (dias <= AVISO_DIAS) return "proxima";
  return "em-dia";
}

// Junta a revisão com os dados do cliente e do veículo (ela guarda só os ids)
function detalharRevisao(revisao) {
  const cliente = buscar(CHAVES.clientes, revisao.clienteId);
  const veiculo = buscar(CHAVES.veiculos, revisao.veiculoId);
  return {
    ...revisao,
    clienteNome: cliente ? cliente.nome : "Cliente não encontrado",
    modelo: veiculo ? veiculo.modelo : "Veículo não encontrado",
    placa: veiculo ? veiculo.placa : "",
    situacao: situacaoDaRevisao(revisao),
  };
}

// Monta a linha da tabela de uma revisão (já detalhada)
function linhaRevisao(r) {
  const placa = r.placa
    ? ` <span class="badge text-bg-light border font-monospace">${escaparHtml(r.placa)}</span>`
    : "";
  return `
    <tr>
      <td class="d-none d-md-table-cell">${escaparHtml(r.clienteNome)}</td>
      <td>
        ${escaparHtml(r.modelo)}${placa}
        <div class="small text-body-secondary d-md-none">${escaparHtml(r.clienteNome)}</div>
      </td>
      <td>${formatarData(r.dataPrevista)}</td>
      <td>${ETIQUETAS[r.situacao]}</td>
      <td class="text-end text-nowrap">
        <button type="button" class="btn btn-sm btn-outline-success" data-acao="lembrete" data-id="${r.id}" aria-label="Copiar lembrete"><i class="bi bi-clipboard"></i><span class="d-none d-md-inline"> Lembrete</span></button>
        <button type="button" class="btn btn-sm btn-outline-primary" data-acao="editar" data-id="${r.id}" aria-label="Editar"><i class="bi bi-pencil"></i><span class="d-none d-md-inline"> Editar</span></button>
        <button type="button" class="btn btn-sm btn-outline-danger" data-acao="excluir" data-id="${r.id}" aria-label="Excluir"><i class="bi bi-trash"></i><span class="d-none d-md-inline"> Excluir</span></button>
      </td>
    </tr>`;
}

// Linha que ocupa a tabela inteira quando não há nada para mostrar
function linhaVazia(texto) {
  return `
    <tr>
      <td colspan="5" class="text-center text-body-secondary py-5">
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
      r.placa.toLowerCase().includes(busca) ||
      r.modelo.toLowerCase().includes(busca);
  });
}

function renderizarRevisoes() {
  const todas = listar(CHAVES.revisoes).map(detalharRevisao);

  // Os contadores mostram o total geral, sem depender dos filtros
  document.getElementById("total-vencidas").textContent = todas.filter((r) => r.situacao === "vencida").length;
  document.getElementById("total-proximas").textContent = todas.filter((r) => r.situacao === "proxima").length;

  // Data mais antiga primeiro: as vencidas aparecem no topo
  const revisoes = filtrarRevisoes(todas).sort((a, b) =>
    PESO_SITUACAO[a.situacao] - PESO_SITUACAO[b.situacao] || a.dataPrevista.localeCompare(b.dataPrevista));

  if (revisoes.length === 0) {
    listaRevisoes.innerHTML = linhaVazia(
      todas.length === 0 ? "Nenhuma revisão prevista" : "Nenhuma revisão encontrada com esses filtros.");
    return;
  }

  listaRevisoes.innerHTML = revisoes.map(linhaRevisao).join("");
}

// Atualiza a lista sempre que a busca ou o filtro mudar
for (const campo of [buscaRevisao, filtroSituacao]) {
  campo.addEventListener("input", renderizarRevisoes);
}

// O Enter na busca não deve recarregar a página
buscaRevisao.form.addEventListener("submit", (evento) => evento.preventDefault());

// ---- Formulário (cadastro e edição) ----

const formRevisao = document.getElementById("form-revisao");
const modalRevisao = new bootstrap.Modal("#modalRevisao");
const errosRevisao = document.getElementById("erros-revisao");
let idEmEdicao = null; // null = cadastrando uma revisão nova

// Preenche o select de clientes
function carregarClientes() {
  const clientes = listar(CHAVES.clientes);
  clientes.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  let opcoes = '<option value="">Selecione o cliente</option>';
  for (const cliente of clientes) {
    opcoes += `<option value="${cliente.id}">${escaparHtml(cliente.nome)}</option>`;
  }
  formRevisao.clienteId.innerHTML = opcoes;

  // Sem veículo cadastrado não há o que agendar: mostra o aviso e trava o botão
  const semVeiculos = listar(CHAVES.veiculos).length === 0;
  document.getElementById("aviso-sem-veiculos").classList.toggle("d-none", !semVeiculos);
  document.getElementById("btn-nova-revisao").disabled = semVeiculos;
}

// Preenche o select de veículos: só os do cliente escolhido
function carregarVeiculos(clienteId) {
  const veiculos = listar(CHAVES.veiculos).filter((v) => v.clienteId === clienteId);

  let opcoes = '<option value="">Selecione o veículo</option>';
  for (const v of veiculos) {
    opcoes += `<option value="${v.id}">${escaparHtml(v.modelo)} (${escaparHtml(v.placa)})</option>`;
  }
  formRevisao.veiculoId.innerHTML = opcoes;
  formRevisao.veiculoId.disabled = clienteId === "";
  if (clienteId !== "" && veiculos.length === 0) {
    formRevisao.veiculoId.innerHTML = '<option value="">Este cliente não tem veículos</option>';
  }
}

// Ao trocar o cliente, recarrega os veículos dele
formRevisao.clienteId.addEventListener("change", () => carregarVeiculos(formRevisao.clienteId.value));

// Junta os valores do formulário num objeto
function lerFormulario() {
  return {
    clienteId: formRevisao.clienteId.value,
    veiculoId: formRevisao.veiculoId.value,
    dataPrevista: formRevisao.dataPrevista.value,
  };
}

// Mostra as mensagens de erro na caixa vermelha do formulário
function mostrarErros(erros) {
  errosRevisao.innerHTML = erros.join("<br>");
  errosRevisao.classList.remove("d-none");
}

// Volta o formulário ao estado inicial (chamado quando o modal fecha)
function limparFormulario() {
  formRevisao.reset();
  formRevisao.classList.remove("was-validated");
  errosRevisao.classList.add("d-none");
  document.getElementById("tituloModalRevisao").textContent = "Nova revisão";
  carregarVeiculos("");
  idEmEdicao = null;
}

// Ao fechar o modal, o formulário volta ao estado inicial
document.getElementById("modalRevisao").addEventListener("hidden.bs.modal", limparFormulario);

// Botão Salvar: valida os dados e cria ou atualiza a revisão
formRevisao.addEventListener("submit", (evento) => {
  evento.preventDefault();

  // 1º: validações do próprio HTML (campos obrigatórios)
  if (!formRevisao.checkValidity()) {
    formRevisao.classList.add("was-validated");
    return;
  }

  // 2º: regras do validacao.js (cliente e veículo existem, veículo é do cliente, data)
  const dados = lerFormulario();
  const erros = validarRevisao(dados, idEmEdicao);
  if (erros.length > 0) {
    mostrarErros(erros);
    return;
  }

  // 3º: salva (cria uma nova ou atualiza a que está em edição)
  if (idEmEdicao === null) {
    criar(CHAVES.revisoes, { ...dados, criadoEm: new Date().toISOString() });
    mostrarMensagem("Revisão cadastrada.");
  } else {
    atualizar(CHAVES.revisoes, idEmEdicao, dados);
    mostrarMensagem("Revisão atualizada.");
  }

  // Fecha o formulário e atualiza a tabela
  modalRevisao.hide();
  renderizarRevisoes();
});

// Edição: abre o modal com os dados da revisão já preenchidos
function abrirEdicao(id) {
  const revisao = buscar(CHAVES.revisoes, id);
  if (!revisao) return;

  idEmEdicao = id;
  formRevisao.clienteId.value = revisao.clienteId;
  carregarVeiculos(revisao.clienteId);
  formRevisao.veiculoId.value = revisao.veiculoId;
  formRevisao.dataPrevista.value = revisao.dataPrevista;
  document.getElementById("tituloModalRevisao").textContent = "Editar revisão";
  modalRevisao.show();
}

// ---- Lembrete para o cliente ----

// Monta o texto do lembrete a partir de uma revisão já detalhada.
// Para mudar o texto da mensagem, edite só esta função.
function montarLembrete(r) {
  const primeiroNome = r.clienteNome.split(" ")[0];
  const veiculo = r.placa ? `${r.modelo} (placa ${r.placa})` : r.modelo;
  const data = formatarData(r.dataPrevista);
  const situacao = r.situacao === "vencida"
    ? `A revisão do seu ${veiculo} estava prevista para ${data} e já está vencida.`
    : `A revisão do seu ${veiculo} está prevista para ${data}.`;

  return `Olá, ${primeiroNome}! Tudo bem?\n\n${situacao}\n` +
    "Que tal agendar um horário para mantê-lo sempre em dia e seguro?\n\n" +
    "UnC Reparos Automotivos";
}

// Copia o texto; se o navegador bloquear a API (ex.: página sem https), usa um textarea temporário
async function copiarTexto(texto) {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = texto;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
}

// Copia o lembrete da revisão para a área de transferência e avisa o usuário
async function copiarLembrete(id) {
  const revisao = buscar(CHAVES.revisoes, id);
  if (!revisao) return;

  const ok = await copiarTexto(montarLembrete(detalharRevisao(revisao)));
  mostrarMensagem(ok ? "Lembrete copiado. É só colar na conversa." : "Não foi possível copiar o lembrete.");
}

// ---- Exclusão ----

const modalExcluir = new bootstrap.Modal("#modalExcluir");
let idParaExcluir = null;

function pedirExclusao(id) {
  const revisao = buscar(CHAVES.revisoes, id);
  if (!revisao) return;

  const r = detalharRevisao(revisao);
  idParaExcluir = id;
  document.getElementById("nome-excluir").textContent =
    `Revisão de ${r.modelo}${r.placa ? " (" + r.placa + ")" : ""} em ${formatarData(r.dataPrevista)}`;
  modalExcluir.show();
}

// Confirmou no modal: exclui, avisa e atualiza a tabela
document.getElementById("btn-confirmar-exclusao").addEventListener("click", () => {
  excluir(CHAVES.revisoes, idParaExcluir);
  modalExcluir.hide();
  mostrarMensagem("Revisão excluída.");
  renderizarRevisoes();
});

// Botões "Lembrete", "Editar" e "Excluir" de cada linha
listaRevisoes.addEventListener("click", (evento) => {
  const botao = evento.target.closest("button[data-acao]");
  if (!botao) return;

  if (botao.dataset.acao === "lembrete") copiarLembrete(botao.dataset.id);
  if (botao.dataset.acao === "editar") abrirEdicao(botao.dataset.id);
  if (botao.dataset.acao === "excluir") pedirExclusao(botao.dataset.id);
});

// ---- Início ----
// Ao abrir a página, carrega os clientes e mostra as revisões salvas
carregarClientes();
carregarVeiculos("");
renderizarRevisoes();
