// Chaves guardadas na lista pra facilitar na hora da gente fazer o CRUD, 
// sugestão inline puxa mais fácil
const CHAVES = {
  clientes: "clientes",
  veiculos: "veiculos",
  catalogo: "catalogo",
  ordens: "ordens",
};

// Crie o Sequencial caso ele não exista no localStorage
if (localStorage.getItem("sequencial") === null){
    localStorage.setItem("sequencial", "0");
}

// Para gerar o sequencial especifico da Ordem de serviço, apenas aumenta
function gerarSequencial() {
    let sequencial = Number(localStorage.getItem("sequencial"));
    sequencial += 1;

    localStorage.setItem("sequencial", String(sequencial));
    return sequencial;
}

// Gera um id hexadecimal único baseado no milisegundo atual, não garante
// unicidade absoluta, mas é mais que o suficiente para o nosso projeto,
// visto que é executado localmente
function gerarId() {
  return Date.now().toString(16);
}

// Lê a lista completa de uma coleção (array vazio se não existir nada salvo)
function listar(chave) {
  const texto = localStorage.getItem(chave);
  return texto ? JSON.parse(texto) : [];
}

// Grava a lista completa de uma coleção
function salvar(chave, lista) {
  localStorage.setItem(chave, JSON.stringify(lista));
}

// Busca um registro pelo id (retorna undefined se não achar)
function buscar(chave, id) {
  return listar(chave).find((item) => item.id === id);
}

// Cria um registro novo, gerando o id, e retorna o objeto criado
function criar(chave, dados) {
  const lista = listar(chave);
  const item = { ...dados, id: gerarId() };
  lista.push(item);
  salvar(chave, lista);
  return item;
}

// Cria uma ordem de serviço, gerando o id e o número sequencial
// (a criação genérica, criar(), não deve ser usada para ordens)
function criarOrdem(dados) {
  const lista = listar(CHAVES.ordens);
  const ordem = { ...dados, id: gerarId(), numero: gerarSequencial() };
  lista.push(ordem);
  salvar(CHAVES.ordens, lista);
  return ordem;
}

// Atualiza os campos de um registro existente (retorna o registro ou undefined)
function atualizar(chave, id, dados) {
  const lista = listar(chave);
  const indice = lista.findIndex((item) => item.id === id);
  if (indice === -1) return undefined;
  lista[indice] = { ...lista[indice], ...dados, id };
  salvar(chave, lista);
  return lista[indice];
}

// Remove um registro pelo id (retorna true se removeu)
function excluir(chave, id) {
  const lista = listar(chave);
  const restantes = lista.filter((item) => item.id !== id);
  if (restantes.length === lista.length) return false;
  salvar(chave, restantes);
  return true;
}
