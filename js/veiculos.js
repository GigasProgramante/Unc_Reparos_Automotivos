const listaVeiculos = document.getElementById("lista-veiculos");

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

// Ao abrir a página, mostra os veículos salvos
renderizarVeiculos();
