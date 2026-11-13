const listaVeiculos = document.getElementById("lista-veiculos");

// Marcas aceitas no cadastro e no filtro
const MARCAS = ["Chevrolet", "Fiat", "Ford", "Honda", "Hyundai", "Jeep", "Nissan", "Renault", "Toyota", "Volkswagen", "Outra"];

// Nome do dono do veículo (o veículo guarda só o id do cliente)
function nomeDoDono(clienteId) {
  const cliente = buscar(CHAVES.clientes, clienteId);
  return cliente ? cliente.nome : "Cliente não encontrado";
}

// O veículo está na oficina se tiver alguma OS em andamento
function estaNaOficina(veiculoId) {
  return listar(CHAVES.ordens).some((o) => o.veiculoId === veiculoId && ordemEmAndamento(o));
}

// Monta o cartão de um veículo
function cartaoVeiculo(veiculo) {
  const situacao = estaNaOficina(veiculo.id)
    ? '<span class="badge text-bg-warning">Na oficina</span>'
    : '<span class="badge text-bg-success">Liberado</span>';

  return `
    <div class="col-sm-6 col-lg-4">
      <div class="card h-100">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <span class="badge text-bg-light border font-monospace fs-6">${escaparHtml(veiculo.placa)}</span>
            ${situacao}
          </div>
          <h2 class="h5 card-title">${escaparHtml(veiculo.modelo)}</h2>
          <p class="card-text small mb-1">Marca / ano: ${escaparHtml(veiculo.marca)} · ${veiculo.ano}</p>
          <p class="card-text small mb-1">Cor: ${escaparHtml(veiculo.cor || "não informada")}</p>
          <p class="card-text small mb-1">Km: ${Number(veiculo.km).toLocaleString("pt-BR")} km</p>
          <p class="card-text small mb-0">Dono: ${escaparHtml(nomeDoDono(veiculo.clienteId))}</p>
        </div>
        <div class="card-footer bg-transparent d-flex gap-2">
          <button type="button" class="btn btn-sm btn-primary" disabled title="Disponível junto com o CRUD de ordens de serviço">Nova OS</button>
          <button type="button" class="btn btn-sm btn-outline-primary" data-acao="editar" data-id="${veiculo.id}">Editar</button>
          <button type="button" class="btn btn-sm btn-outline-danger" data-acao="excluir" data-id="${veiculo.id}">Excluir</button>
        </div>
      </div>
    </div>`;
}

// Mensagem que ocupa a área dos cartões quando não há nada para mostrar
function mensagemVazia(texto) {
  return `
    <div class="col-12">
      <div class="card"><div class="card-body text-center text-body-secondary py-5">${texto}</div></div>
    </div>`;
}

// Mostra todos os veículos salvos como cartões
function renderizarVeiculos() {
  const veiculos = listar(CHAVES.veiculos);

  if (veiculos.length === 0) {
    listaVeiculos.innerHTML = mensagemVazia("Nenhum veículo cadastrado.");
    return;
  }

  let html = "";
  for (const veiculo of veiculos) {
    html += cartaoVeiculo(veiculo);
  }
  listaVeiculos.innerHTML = html;
}

// Formulário (cadastro e edição)
const formVeiculo = document.getElementById("form-veiculo");
const modalVeiculo = new bootstrap.Modal("#modalVeiculo");
const errosVeiculo = document.getElementById("erros-veiculo");
let idEmEdicao = null; // null = cadastrando um veículo novo

// Coloca as marcas no select do formulário
for (const marca of MARCAS) {
  formVeiculo.marca.innerHTML += `<option>${marca}</option>`;
}

// Preenche o select "Dono" com os clientes cadastrados.
// Sem cliente não dá para cadastrar veículo: mostra o aviso e trava o botão.
function carregarDonos() {
  const clientes = listar(CHAVES.clientes);
  clientes.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  let opcoes = '<option value="">Selecione o cliente</option>';
  for (const cliente of clientes) {
    opcoes += `<option value="${cliente.id}">${escaparHtml(cliente.nome)}</option>`;
  }
  formVeiculo.clienteId.innerHTML = opcoes;

  const semClientes = clientes.length === 0;
  document.getElementById("aviso-sem-clientes").classList.toggle("d-none", !semClientes);
  document.getElementById("btn-novo-veiculo").disabled = semClientes;
}

// Junta os valores do formulário num objeto
function lerFormulario() {
  return {
    clienteId: formVeiculo.clienteId.value,
    placa: formVeiculo.placa.value.trim().toUpperCase(),
    marca: formVeiculo.marca.value,
    modelo: formVeiculo.modelo.value.trim(),
    ano: Number(formVeiculo.ano.value),
    cor: formVeiculo.cor.value.trim(),
    km: Number(formVeiculo.km.value),
  };
}

function mostrarErros(erros) {
  errosVeiculo.innerHTML = erros.join("<br>");
  errosVeiculo.classList.remove("d-none");
}

// Volta o formulário ao estado inicial (chamado quando o modal fecha)
function limparFormulario() {
  formVeiculo.reset();
  formVeiculo.classList.remove("was-validated");
  errosVeiculo.classList.add("d-none");
  document.getElementById("tituloModalVeiculo").textContent = "Novo veículo";
  idEmEdicao = null;
}

document.getElementById("modalVeiculo").addEventListener("hidden.bs.modal", limparFormulario);

formVeiculo.addEventListener("submit", (evento) => {
  evento.preventDefault();

  // 1º: validações do próprio HTML (required, min, max, tamanho da placa)
  if (!formVeiculo.checkValidity()) {
    formVeiculo.classList.add("was-validated");
    return;
  }

  // 2º: regras do validacao.js (dono existe, placa válida e não repetida, km)
  const dados = lerFormulario();
  const erros = validarVeiculo(dados, idEmEdicao);
  if (erros.length > 0) {
    mostrarErros(erros);
    return;
  }

  if (idEmEdicao === null) {
    criar(CHAVES.veiculos, { ...dados, criadoEm: new Date().toISOString() });
    mostrarMensagem(`Veículo ${dados.placa} cadastrado.`);
  } else {
    atualizar(CHAVES.veiculos, idEmEdicao, dados);
    mostrarMensagem(`Veículo ${dados.placa} atualizado.`);
  }

  modalVeiculo.hide();
  renderizarVeiculos();
});

// Placa: só letras e números, em maiúsculas, no máximo 7 caracteres
formVeiculo.placa.addEventListener("input", () => {
  let texto = "";
  for (const caractere of formVeiculo.placa.value.toUpperCase()) {
    const ehLetra = caractere >= "A" && caractere <= "Z";
    const ehDigito = caractere >= "0" && caractere <= "9";
    if (ehLetra || ehDigito) texto += caractere;
  }
  formVeiculo.placa.value = texto.slice(0, 7);
});

// Edição: abre o modal com os dados do veículo já preenchidos
function abrirEdicao(id) {
  const veiculo = buscar(CHAVES.veiculos, id);
  if (!veiculo) return;

  idEmEdicao = id;
  formVeiculo.clienteId.value = veiculo.clienteId;
  formVeiculo.placa.value = veiculo.placa;
  formVeiculo.marca.value = veiculo.marca;
  formVeiculo.modelo.value = veiculo.modelo;
  formVeiculo.ano.value = veiculo.ano;
  formVeiculo.cor.value = veiculo.cor;
  formVeiculo.km.value = veiculo.km;
  document.getElementById("tituloModalVeiculo").textContent = "Editar veículo";
  modalVeiculo.show();
}

// Botões "Editar" e "Excluir" de cada cartão
listaVeiculos.addEventListener("click", (evento) => {
  const botao = evento.target.closest("button[data-acao]");
  if (!botao) return;

  if (botao.dataset.acao === "editar") abrirEdicao(botao.dataset.id);
});

// Ao abrir a página, carrega os donos e mostra os veículos salvos
carregarDonos();
renderizarVeiculos();
