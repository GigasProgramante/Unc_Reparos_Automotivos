// Tela de VEÍCULOS: listagem em cartões com filtros, formulário de cadastro/edição e exclusão.

// ELEMENTOS DA PÁGINA
// ------------------------------------------------------------

const listaVeiculos = document.getElementById("lista-veiculos");
const buscaVeiculo = document.getElementById("busca-veiculo");
const filtroMarca = document.getElementById("filtro-marca");
const filtroSituacao = document.getElementById("filtro-situacao");
const ordemVeiculos = document.getElementById("ordem-veiculos");
const contadorVeiculos = document.getElementById("contador-veiculos");

// Marcas aceitas no cadastro e no filtro (para incluir uma marca, adicione na lista)
const MARCAS = ["Chevrolet", "Fiat", "Ford", "Honda", "Hyundai", "Jeep", "Nissan", "Renault", "Toyota", "Volkswagen", "Outra"];


// LISTAGEM (cartões)
// ------------------------------------------------------------

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

// Aplica a pesquisa e os filtros na lista de veículos
function filtrarVeiculos(veiculos) {
  // Lê o que o usuário digitou e escolheu nos filtros
  const busca = buscaVeiculo.value.trim().toLowerCase();
  const marca = filtroMarca.value;
  const situacao = filtroSituacao.value;

  return veiculos.filter((veiculo) => {
    // Pesquisa: placa, modelo ou nome do dono
    if (busca !== "") {
      const achou = veiculo.placa.toLowerCase().includes(busca) ||
        veiculo.modelo.toLowerCase().includes(busca) ||
        nomeDoDono(veiculo.clienteId).toLowerCase().includes(busca);
      if (!achou) return false;
    }

    // Filtro de marca
    if (marca !== "" && veiculo.marca !== marca) return false;

    // Filtro de situação (na oficina ou liberado)
    const naOficina = estaNaOficina(veiculo.id);
    if (situacao === "na-oficina" && !naOficina) return false;
    if (situacao === "liberados" && naOficina) return false;

    return true;
  });
}

// Ordena a lista conforme a opção escolhida
function ordenarVeiculos(veiculos) {
  const ordem = ordemVeiculos.value;

  if (ordem === "placa") {
    veiculos.sort((a, b) => a.placa.localeCompare(b.placa));
  } else if (ordem === "mais-novos") {
    veiculos.sort((a, b) => b.ano - a.ano);
  } else if (ordem === "maior-km") {
    veiculos.sort((a, b) => b.km - a.km);
  }
  return veiculos;
}

// Mostra os veículos como cartões, já filtrados e ordenados
function renderizarVeiculos() {
  const todos = listar(CHAVES.veiculos);
  const veiculos = ordenarVeiculos(filtrarVeiculos(todos));

  contadorVeiculos.textContent = `${veiculos.length} de ${todos.length} veículos`;

  if (veiculos.length === 0) {
    const texto = todos.length === 0
      ? "Nenhum veículo cadastrado."
      : "Nenhum veículo encontrado com esses filtros.";
    listaVeiculos.innerHTML = mensagemVazia(texto);
    return;
  }

  let html = "";
  for (const veiculo of veiculos) {
    html += cartaoVeiculo(veiculo);
  }
  listaVeiculos.innerHTML = html;
}

// Coloca as marcas no filtro
for (const marca of MARCAS) {
  filtroMarca.innerHTML += `<option>${marca}</option>`;
}

// Atualiza a lista sempre que a pesquisa ou um filtro mudar
for (const campo of [buscaVeiculo, filtroMarca, filtroSituacao, ordemVeiculos]) {
  campo.addEventListener("input", renderizarVeiculos);
}


// FORMULÁRIO (cadastro e edição)
// ------------------------------------------------------------

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

// Mostra as mensagens de erro na caixa vermelha do formulário
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

// Ao fechar o modal, o formulário volta ao estado inicial
document.getElementById("modalVeiculo").addEventListener("hidden.bs.modal", limparFormulario);

// Botão Salvar: valida os dados e cria ou atualiza o veículo
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

  // 3º: salva (cria um novo ou atualiza o que está em edição)
  if (idEmEdicao === null) {
    criar(CHAVES.veiculos, { ...dados, criadoEm: new Date().toISOString() });
    mostrarMensagem(`Veículo ${dados.placa} cadastrado.`);
  } else {
    atualizar(CHAVES.veiculos, idEmEdicao, dados);
    mostrarMensagem(`Veículo ${dados.placa} atualizado.`);
  }

  // Fecha o formulário e atualiza os cartões
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


// EXCLUSÃO
// ------------------------------------------------------------

const modalExcluir = new bootstrap.Modal("#modalExcluir");
let idParaExcluir = null;

// Regra: veículo com OS no histórico não pode ser excluído
function pedirExclusao(id) {
  const veiculo = buscar(CHAVES.veiculos, id);
  if (!veiculo) return;

  const ordens = listar(CHAVES.ordens).filter((o) => o.veiculoId === id).length;
  if (ordens > 0) {
    mostrarMensagem(`O veículo ${veiculo.placa} tem ${ordens} OS no histórico e não pode ser excluído.`, "erro");
    return;
  }

  const revisoes = listar(CHAVES.revisoes).filter((r) => r.veiculoId === id).length;
  if (revisoes > 0) {
    mostrarMensagem(`O veículo ${veiculo.placa} tem ${revisoes} revisão(ões) cadastrada(s) e não pode ser excluído.`, "erro");
    return;
  }

  idParaExcluir = id;
  document.getElementById("nome-excluir").textContent = `${veiculo.modelo} (${veiculo.placa})`;
  modalExcluir.show();
}

// Confirmou no modal: exclui, avisa e atualiza os cartões
document.getElementById("btn-confirmar-exclusao").addEventListener("click", () => {
  excluir(CHAVES.veiculos, idParaExcluir);
  modalExcluir.hide();
  mostrarMensagem("Veículo excluído.");
  renderizarVeiculos();
});

// Botões "Editar" e "Excluir" de cada cartão
listaVeiculos.addEventListener("click", (evento) => {
  const botao = evento.target.closest("button[data-acao]");
  if (!botao) return;

  if (botao.dataset.acao === "editar") abrirEdicao(botao.dataset.id);
  if (botao.dataset.acao === "excluir") pedirExclusao(botao.dataset.id);
});


// INÍCIO
// ------------------------------------------------------------

// Ao abrir a página, carrega os donos e mostra os veículos salvos
carregarDonos();
renderizarVeiculos();
