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
