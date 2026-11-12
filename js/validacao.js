// Funções de validação
// Dependem do storage.js
// Cada validarção retorna um array de mensagens de erro (vazio = dados válidos).
// Aqui ficam só as regras que o HTML não cobre. Campo obrigatório, formato de
// e-mail e cidade da lista são validados pelos atributos do formulário.

// Devolve só os dígitos do texto: "(47) 99999-9999" vira "47999999999"
function somenteDigitos(texto) {
  const original = String(texto ?? "");
  let digitos = "";

  for (const caractere of original) {
    if (caractere >= "0" && caractere <= "9") {
      digitos += caractere;
    }
  }

  return digitos;
}

// Nome e sobrenome: pelo menos duas palavras, cada uma com 2 ou mais letras
function nomeValido(nome) {
  const palavras = String(nome ?? "").trim().split(" ");
  let quantidade = 0;

  for (const palavra of palavras) {
    if (palavra === "") continue; // ignora espaços duplicados
    if (palavra.length < 2) return false;
    quantidade++;
  }

  return quantidade >= 2;
}

// CPF: 11 dígitos, não pode ter todos iguais e os dois últimos
// (dígitos verificadores) precisam bater com o cálculo
function cpfValido(cpf) {
  const digitos = somenteDigitos(cpf);

  if (digitos.length !== 11) return false;

  // Rejeita 00000000000, 11111111111, etc.
  let todosIguais = true;
  for (const d of digitos) {
    if (d !== digitos[0]) todosIguais = false;
  }
  if (todosIguais) return false;

  // Confere o 1º dígito verificador (posição 9) e depois o 2º (posição 10).
  // Cada dígito anterior é multiplicado por um peso que vai diminuindo.
  for (const posicao of [9, 10]) {
    let soma = 0;
    let peso = posicao + 1;
    for (let i = 0; i < posicao; i++) {
      soma += Number(digitos[i]) * peso;
      peso--;
    }
    const resto = (soma * 10) % 11;
    const digitoCorreto = resto === 10 ? 0 : resto;
    if (digitoCorreto !== Number(digitos[posicao])) return false;
  }

  return true;
}

// Telefone: DDD (2 dígitos) + 8 ou 9 dígitos = 10 ou 11 dígitos no total
function telefoneValido(telefone) {
  const tamanho = somenteDigitos(telefone).length;
  return tamanho === 10 || tamanho === 11;
}

// Valida os dados de um cliente.
// idAtual: informe ao editar, para o CPF do próprio cliente não contar como repetido.
function validarCliente(dados, idAtual = null) {
  const erros = [];

  if (!nomeValido(dados.nome)) {
    erros.push("Informe nome e sobrenome.");
  }

  if (!cpfValido(dados.cpf)) {
    erros.push("CPF inválido.");
  } else {
    const cpf = somenteDigitos(dados.cpf);
    const repetido = listar(CHAVES.clientes).some(
      (c) => c.id !== idAtual && somenteDigitos(c.cpf) === cpf
    );
    if (repetido) erros.push("Já existe um cliente com este CPF.");
  }

  if (!telefoneValido(dados.telefone)) {
    erros.push("Telefone inválido. Use DDD + 8 ou 9 dígitos.");
  }

  return erros;
}

// Placa: 7 caracteres, nos dois padrões aceitos
// antigo:  ABC1234  (3 letras + 4 dígitos)
// Mercosul: ABC1D23 (3 letras + dígito + letra + 2 dígitos)
// Só o 5º caractere muda entre os padrões: no antigo é dígito, no Mercosul é letra.
function placaValida(placa) {
  const p = String(placa ?? "").trim().toUpperCase();

  if (p.length !== 7) return false;

  for (let i = 0; i < 7; i++) {
    const ehLetra = p[i] >= "A" && p[i] <= "Z";
    const ehDigito = p[i] >= "0" && p[i] <= "9";

    if (i < 3 && !ehLetra) return false; // posições 1 a 3: letras
    if (i === 3 && !ehDigito) return false; // posição 4: dígito
    if (i === 4 && !ehLetra && !ehDigito) return false; // posição 5: letra ou dígito
    if (i > 4 && !ehDigito) return false; // posições 6 e 7: dígitos
  }

  return true;
}

// Valida os dados de um veículo.
// idAtual: informe ao editar, para a placa do próprio veículo não contar como
// repetida e para comparar o km com o que já estava salvo.
function validarVeiculo(dados, idAtual = null) {
  const erros = [];

  if (!buscar(CHAVES.clientes, dados.clienteId)) {
    erros.push("Selecione um cliente existente.");
  }

  if (!placaValida(dados.placa)) {
    erros.push("Placa inválida. Use o padrão ABC1234 ou ABC1D23.");
  } else {
    const placa = String(dados.placa).trim().toUpperCase();
    const repetida = listar(CHAVES.veiculos).some(
      (v) => v.id !== idAtual && String(v.placa).toUpperCase() === placa
    );
    if (repetida) erros.push("Já existe um veículo com esta placa.");
  }

  // Ao editar, o km não pode ser menor que o último km registrado
  if (idAtual !== null) {
    const atual = buscar(CHAVES.veiculos, idAtual);
    if (atual && Number(dados.km) < Number(atual.km)) {
      erros.push("O km não pode ser menor que o último registrado (" + atual.km + ").");
    }
  }

  return erros;
}

// Campo não preenchido (os campos vazios do formulário chegam como "")
function estaVazio(valor) {
  return valor === undefined || valor === null || String(valor).trim() === "";
}

// Valida os dados de um item do catálogo (serviço ou peça).
// idAtual: informe ao editar, para o nome do próprio item não contar como repetido.
// Faixas de valores (preço, horas, estoque) já são validadas pelo HTML. Aqui ficam
// os campos que só são obrigatórios conforme o tipo, e o nome não repetido.
function validarItem(dados, idAtual = null) {
  const erros = [];

  const nome = String(dados.nome ?? "").trim().toLowerCase();
  const repetido = listar(CHAVES.catalogo).some(
    (i) => i.id !== idAtual && String(i.nome).trim().toLowerCase() === nome
  );
  if (repetido) erros.push("Já existe um item com este nome.");

  if (dados.tipo === "servico") {
    if (estaVazio(dados.horas)) {
      erros.push("Informe as horas de mão de obra do serviço.");
    }
  } else if (dados.tipo === "peca") {
    if (estaVazio(dados.unidade)) erros.push("Informe a unidade da peça.");
    if (estaVazio(dados.estoque)) erros.push("Informe o estoque da peça.");
    if (estaVazio(dados.estoqueMinimo)) erros.push("Informe o estoque mínimo da peça.");
  }
 
  return erros;
}

// Status da OS e as transições permitidas (fluxo do README)
const STATUS_ORDEM = {
  aberta: ["diagnostico", "cancelada"],
  diagnostico: ["execucao", "aguardando_peca", "cancelada"],
  aguardando_peca: ["execucao", "cancelada"],
  execucao: ["pronta"],
  pronta: ["entregue"],
  entregue: [],
  cancelada: [],
};

// OS em andamento = ainda não foi entregue nem cancelada
function ordemEmAndamento(ordem) {
  return ordem.status !== "entregue" && ordem.status !== "cancelada";
}

// Valida os dados de uma OS (abertura ou edição).
// idAtual: informe ao editar, para a própria OS não contar como "outra OS em andamento"
// e para comparar o km com o que já estava salvo.
// Campo obrigatório e faixa do desconto (0 a 15) são validados pelo HTML; aqui ficam
// as regras que dependem dos dados salvos.
function validarOrdem(dados, idAtual = null) {
  const erros = [];
  const veiculo = buscar(CHAVES.veiculos, dados.veiculoId);
  const atual = idAtual !== null ? buscar(CHAVES.ordens, idAtual) : undefined;

  // OS entregue ou cancelada não pode mais ser alterada
  if (atual && !ordemEmAndamento(atual)) {
    erros.push("OS entregue ou cancelada não pode ser alterada.");
  }

  if (!veiculo) {
    erros.push("Selecione um veículo existente.");
  } else {
    // Só uma OS em andamento por veículo
    const ocupado = listar(CHAVES.ordens).some(
      (o) => o.id !== idAtual && o.veiculoId === veiculo.id && ordemEmAndamento(o)
    );
    if (ocupado) erros.push("Este veículo já tem uma OS em andamento.");

    // O km de entrada não pode ser menor que o último km do veículo.
    // Ao editar sem mexer no veículo nem no km, não há o que conferir
    // (o km do veículo já foi atualizado na abertura).
    const mudouKm = !atual || atual.veiculoId !== veiculo.id || Number(atual.kmEntrada) !== Number(dados.kmEntrada);
    if (mudouKm && Number(dados.kmEntrada) < Number(veiculo.km)) {
      erros.push("O km de entrada não pode ser menor que o último registrado (" + veiculo.km + ").");
    }
  }

  // Pega espaços só digitados, que o minlength do HTML deixaria passar
  if (String(dados.problema ?? "").trim().length < 10) {
    erros.push("Descreva o problema com pelo menos 10 caracteres.");
  }

  const desconto = Number(dados.desconto || 0);
  if (desconto < 0 || desconto > 15) {
    erros.push("O desconto deve ficar entre 0% e 15%.");
  }

  return erros;
}

// Valida a mudança de status de uma OS já salva.
// dados: campos extras da etapa, como formaPagamento na entrega.
// Considera itens = [{ itemId, quantidade }].
function validarMudancaStatus(idOrdem, novoStatus, dados = {}) {
  const erros = [];
  const ordem = buscar(CHAVES.ordens, idOrdem);

  if (!ordem) {
    erros.push("OS não encontrada.");
    return erros;
  }

  const permitidos = STATUS_ORDEM[ordem.status] || [];
  if (!permitidos.includes(novoStatus)) {
    erros.push("Não é possível mudar a OS de \"" + ordem.status + "\" para \"" + novoStatus + "\".");
    return erros; // as demais regras dependem de a transição ser válida
  }

  // Iniciar a execução: precisa ter itens e estoque para todas as peças
  if (novoStatus === "execucao") {
    const itens = ordem.itens || [];
    if (itens.length === 0) {
      erros.push("Adicione itens à OS antes de iniciar a execução.");
    }
    for (const linha of itens) {
      const item = buscar(CHAVES.catalogo, linha.itemId);
      if (item && item.tipo === "peca" && Number(item.estoque) < Number(linha.quantidade)) {
        erros.push("Estoque insuficiente de \"" + item.nome + "\" (disponível: " + item.estoque + ").");
      }
    }
  }

  // A entrega exige a forma de pagamento
  if (novoStatus === "entregue") {
    const formas = ["pix", "dinheiro", "debito", "credito"];
    if (!formas.includes(dados.formaPagamento)) {
      erros.push("Informe a forma de pagamento.");
    }
  }

  return erros;
}

// Valida a exclusão de uma OS: só abertas ou canceladas podem ser excluídas
function validarExclusaoOrdem(idOrdem) {
  const erros = [];
  const ordem = buscar(CHAVES.ordens, idOrdem);

  if (!ordem) {
    erros.push("OS não encontrada.");
  } else if (ordem.status !== "aberta" && ordem.status !== "cancelada") {
    erros.push("Só é possível excluir OS abertas ou canceladas.");
  }

  return erros;
}
