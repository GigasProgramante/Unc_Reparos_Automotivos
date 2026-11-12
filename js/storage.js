const CHAVE_CLIENTES = "clientes";

// Gera um id hexadecimal único baseado no milisegundo atual, não garante 
// unicidade absoluta, mas é mais que o suficiente para o nosso projeto, 
// visto que é executado localmente
function gerarId() {
  return Date.now().toString(16);
}

// Lê a lista completa de clientes (array vazio se não existir nada salvo)
function listarClientes() {
  const texto = localStorage.getItem(CHAVE_CLIENTES);
  return texto ? JSON.parse(texto) : [];
}

// Grava a lista completa de clientes
function salvarClientes(clientes) {
  localStorage.setItem(CHAVE_CLIENTES, JSON.stringify(clientes));
}

// Busca um cliente pelo id (retorna undefined se não achar)
function buscarCliente(id) {
  return listarClientes().find((c) => c.id === id);
}

// Cria um cliente novo, gerando o id, e retorna o objeto criado
function criarCliente(dados) {
  const clientes = listarClientes();
  const cliente = { ...dados, id: gerarId() };
  clientes.push(cliente);
  salvarClientes(clientes);
  return cliente;
}

// Atualiza os campos de um cliente existente (retorna o cliente ou undefined)
function atualizarCliente(id, dados) {
  const clientes = listarClientes();
  const indice = clientes.findIndex((c) => c.id === id);
  if (indice === -1) return undefined;
  clientes[indice] = { ...clientes[indice], ...dados, id };
  salvarClientes(clientes);
  return clientes[indice];
}

// Remove um cliente pelo id (retorna true se removeu)
function excluirCliente(id) {
  const clientes = listarClientes();
  const restantes = clientes.filter((c) => c.id !== id);
  if (restantes.length === clientes.length) return false;
  salvarClientes(restantes);
  return true;
}

// Gera um id hexadecimal único baseado no milisegundo atual, não garante 
// unicidade absoluta, mas é mais que o suficiente para o nosso projeto, 
// visto que é executado localmente
function gerarId() {
  return Date.now().toString(16);
}
