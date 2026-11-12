// =========================================================
// clientes.js — CRUD de clientes
// Usa as funções do storage.js (listar, buscar, criar, atualizar, excluir)
// e a validação do validacao.js (validarCliente, somenteDigitos)
// =========================================================

const tabelaClientes = document.getElementById("tabela-clientes");

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

// Mostra todos os clientes salvos na tabela
function renderizarClientes() {
  const clientes = listar(CHAVES.clientes);

  if (clientes.length === 0) {
    tabelaClientes.innerHTML = `
      <tr><td colspan="6" class="text-center text-body-secondary py-5">Nenhum cliente cadastrado.</td></tr>`;
    return;
  }

  let html = "";
  for (const cliente of clientes) {
    html += linhaCliente(cliente);
  }
  tabelaClientes.innerHTML = html;
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

  criar(CHAVES.clientes, { ...dados, criadoEm: new Date().toISOString() });
  mostrarMensagem("Cliente cadastrado.");

  modalCliente.hide();
  renderizarClientes();
});

// Ao abrir a página, mostra os clientes salvos
renderizarClientes();
