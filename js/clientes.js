// =========================================================
// clientes.js — CRUD de clientes
// Usa as funções do storage.js (listar, buscar, criar, atualizar, excluir)
// e a validação do validacao.js (validarCliente, somenteDigitos)
// =========================================================

const tabelaClientes = document.getElementById("tabela-clientes");
const buscaCliente = document.getElementById("busca-cliente");
const filtroCidade = document.getElementById("filtro-cidade");
const filtroSituacao = document.getElementById("filtro-situacao");
const ordemClientes = document.getElementById("ordem-clientes");
const contadorClientes = document.getElementById("contador-clientes");

// Deixa o CPF no formato 000.000.000-00 para mostrar na tela
function formatarCpf(cpf) {
  const d = somenteDigitos(cpf);
  if (d.length !== 11) return cpf;
  return d.slice(0, 3) + "." + d.slice(3, 6) + "." + d.slice(6, 9) + "-" + d.slice(9);
}

// Quantos veículos o cliente tem cadastrados
function contarVeiculos(clienteId) {
  return listar(CHAVES.veiculos).filter((v) => v.clienteId === clienteId).length;
}

// Monta a linha da tabela de um cliente
function linhaCliente(cliente) {
  return `
    <tr>
      <td>
        <strong>${escaparHtml(cliente.nome)}</strong>
        <div class="small text-body-secondary">${escaparHtml(cliente.email || "sem e-mail")}</div>
      </td>
      <td>${formatarCpf(cliente.cpf)}</td>
      <td>${escaparHtml(cliente.telefone)}</td>
      <td>${escaparHtml(cliente.cidade)}</td>
      <td>${contarVeiculos(cliente.id)}</td>
      <td class="text-end text-nowrap">
        <button type="button" class="btn btn-sm btn-outline-primary" data-acao="editar" data-id="${cliente.id}">Editar</button>
        <button type="button" class="btn btn-sm btn-outline-danger" data-acao="excluir" data-id="${cliente.id}">Excluir</button>
      </td>
    </tr>`;
}

// Aplica a pesquisa e os filtros na lista de clientes
function filtrarClientes(clientes) {
  const busca = buscaCliente.value.trim().toLowerCase();
  const buscaDigitos = somenteDigitos(busca);
  const cidade = filtroCidade.value;
  const situacao = filtroSituacao.value;

  return clientes.filter((cliente) => {
    // Pesquisa: pelo nome ou pelos números do CPF / telefone
    if (busca !== "") {
      const achouNome = cliente.nome.toLowerCase().includes(busca);
      const achouNumero = buscaDigitos !== "" &&
        (cliente.cpf.includes(buscaDigitos) || somenteDigitos(cliente.telefone).includes(buscaDigitos));
      if (!achouNome && !achouNumero) return false;
    }

    if (cidade !== "" && cliente.cidade !== cidade) return false;

    const veiculos = contarVeiculos(cliente.id);
    if (situacao === "com-veiculos" && veiculos === 0) return false;
    if (situacao === "sem-veiculos" && veiculos > 0) return false;

    return true;
  });
}

// Ordena a lista conforme a opção escolhida
function ordenarClientes(clientes) {
  const ordem = ordemClientes.value;

  if (ordem === "nome-az") {
    clientes.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  } else if (ordem === "nome-za") {
    clientes.sort((a, b) => b.nome.localeCompare(a.nome, "pt-BR"));
  } else if (ordem === "recentes") {
    clientes.sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
  }
  return clientes;
}

// Mostra os clientes na tabela, já filtrados e ordenados
function renderizarClientes() {
  const todos = listar(CHAVES.clientes);
  const clientes = ordenarClientes(filtrarClientes(todos));

  contadorClientes.textContent = `${clientes.length} de ${todos.length} clientes`;

  if (clientes.length === 0) {
    const mensagem = todos.length === 0
      ? "Nenhum cliente cadastrado."
      : "Nenhum cliente encontrado com esses filtros.";
    tabelaClientes.innerHTML = `
      <tr><td colspan="6" class="text-center text-body-secondary py-5">${mensagem}</td></tr>`;
    return;
  }

  let html = "";
  for (const cliente of clientes) {
    html += linhaCliente(cliente);
  }
  tabelaClientes.innerHTML = html;
}

// Atualiza a lista sempre que a pesquisa ou um filtro mudar
for (const campo of [buscaCliente, filtroCidade, filtroSituacao, ordemClientes]) {
  campo.addEventListener("input", renderizarClientes);
}

// ---------- Formulário (cadastro e edição) ----------
const formCliente = document.getElementById("form-cliente");
const modalCliente = new bootstrap.Modal("#modalCliente");
const errosCliente = document.getElementById("erros-cliente");
let idEmEdicao = null; // null = cadastrando um cliente novo

// Junta os valores do formulário num objeto
function lerFormulario() {
  return {
    nome: formCliente.nome.value.trim(),
    cpf: somenteDigitos(formCliente.cpf.value),
    telefone: formCliente.telefone.value.trim(),
    email: formCliente.email.value.trim(),
    cidade: formCliente.cidade.value,
  };
}

function mostrarErros(erros) {
  errosCliente.innerHTML = erros.join("<br>");
  errosCliente.classList.remove("d-none");
}

// Volta o formulário ao estado inicial (chamado quando o modal fecha)
function limparFormulario() {
  formCliente.reset();
  formCliente.classList.remove("was-validated");
  errosCliente.classList.add("d-none");
  document.getElementById("tituloModalCliente").textContent = "Novo cliente";
  idEmEdicao = null;
}

document.getElementById("modalCliente").addEventListener("hidden.bs.modal", limparFormulario);

formCliente.addEventListener("submit", (evento) => {
  evento.preventDefault();

  // 1º: validações do próprio HTML (required, type="email"...)
  if (!formCliente.checkValidity()) {
    formCliente.classList.add("was-validated");
    return;
  }

  // 2º: regras do validacao.js (nome e sobrenome, CPF, telefone)
  const dados = lerFormulario();
  const erros = validarCliente(dados, idEmEdicao);
  if (erros.length > 0) {
    mostrarErros(erros);
    return;
  }

  if (idEmEdicao === null) {
    criar(CHAVES.clientes, { ...dados, criadoEm: new Date().toISOString() });
    mostrarMensagem("Cliente cadastrado.");
  } else {
    atualizar(CHAVES.clientes, idEmEdicao, dados);
    mostrarMensagem("Cliente atualizado.");
  }

  modalCliente.hide();
  renderizarClientes();
});

// ---------- Máscaras: formatam o campo enquanto o usuário digita ----------
formCliente.cpf.addEventListener("input", () => {
  const d = somenteDigitos(formCliente.cpf.value).slice(0, 11);
  let texto = d;
  if (d.length > 9) texto = d.slice(0, 3) + "." + d.slice(3, 6) + "." + d.slice(6, 9) + "-" + d.slice(9);
  else if (d.length > 6) texto = d.slice(0, 3) + "." + d.slice(3, 6) + "." + d.slice(6);
  else if (d.length > 3) texto = d.slice(0, 3) + "." + d.slice(3);
  formCliente.cpf.value = texto;
});

formCliente.telefone.addEventListener("input", () => {
  const d = somenteDigitos(formCliente.telefone.value).slice(0, 11);
  let texto = d;
  if (d.length > 10) texto = "(" + d.slice(0, 2) + ") " + d.slice(2, 7) + "-" + d.slice(7);
  else if (d.length > 6) texto = "(" + d.slice(0, 2) + ") " + d.slice(2, 6) + "-" + d.slice(6);
  else if (d.length > 2) texto = "(" + d.slice(0, 2) + ") " + d.slice(2);
  formCliente.telefone.value = texto;
});

// ---------- Edição ----------
// Abre o modal com os dados do cliente já preenchidos
function abrirEdicao(id) {
  const cliente = buscar(CHAVES.clientes, id);
  if (!cliente) return;

  idEmEdicao = id;
  formCliente.nome.value = cliente.nome;
  formCliente.cpf.value = formatarCpf(cliente.cpf);
  formCliente.telefone.value = cliente.telefone;
  formCliente.email.value = cliente.email;
  formCliente.cidade.value = cliente.cidade;
  document.getElementById("tituloModalCliente").textContent = "Editar cliente";
  modalCliente.show();
}

// ---------- Exclusão ----------
const modalExcluir = new bootstrap.Modal("#modalExcluir");
let idParaExcluir = null;

// Regra: cliente com veículos não pode ser excluído
function pedirExclusao(id) {
  const cliente = buscar(CHAVES.clientes, id);
  if (!cliente) return;

  const veiculos = contarVeiculos(id);
  if (veiculos > 0) {
    mostrarMensagem(`${cliente.nome} tem ${veiculos} veículo(s) cadastrado(s). Exclua os veículos antes.`, "erro");
    return;
  }

  idParaExcluir = id;
  document.getElementById("nome-excluir").textContent = cliente.nome;
  modalExcluir.show();
}

document.getElementById("btn-confirmar-exclusao").addEventListener("click", () => {
  excluir(CHAVES.clientes, idParaExcluir);
  modalExcluir.hide();
  mostrarMensagem("Cliente excluído.");
  renderizarClientes();
});

// Botões "Editar" e "Excluir" de cada linha da tabela
tabelaClientes.addEventListener("click", (evento) => {
  const botao = evento.target.closest("button[data-acao]");
  if (!botao) return;

  if (botao.dataset.acao === "editar") abrirEdicao(botao.dataset.id);
  if (botao.dataset.acao === "excluir") pedirExclusao(botao.dataset.id);
});

// Ao abrir a página, mostra os clientes salvos
renderizarClientes();
