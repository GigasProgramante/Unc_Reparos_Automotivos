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
