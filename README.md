# UnC Reparos Automotivos

Sistema web para controlar o dia a dia de uma oficina mecânica: clientes, veículos, catálogo de serviços e peças, ordens de serviço com fluxo de status e acompanhamento de revisões preventivas.

Trabalho prático de **Desenvolvimento Web I** — Universidade do Contestado (UnC).

**Acesse o sistema:** https://gigasprogramante.github.io/Unc_Reparos_Automotivos/

## Integrantes

| Nome | GitHub |
|------|--------|
| Guilherme Vojciechovski | [@GigasProgramante](https://github.com/GigasProgramante) |
| Luís Ronei | [@LuisRoneii](https://github.com/LuisRoneii) |

---

## 1. Planejamento

### Problema

Oficinas pequenas costumam controlar as ordens de serviço em papel, caderno ou planilha. Com isso o dono:

- perde de vista quais carros estão parados e em qual etapa (esperando peça, em execução, prontos para retirada);
- não sabe com facilidade quanto faturou no mês nem quanto tempo cada reparo leva;
- monta orçamento na mão, somando serviços e peças;
- deixa de chamar o cliente de volta para a próxima revisão (troca de óleo, freios, correia), perdendo um serviço que seria garantido.

### Público-alvo

Donos, atendentes e mecânicos de oficinas mecânicas de pequeno porte, que atendem carros de passeio e utilitários e hoje não usam nenhum sistema.

### Objetivos

- Registrar clientes, veículos e o catálogo de serviços e peças da oficina.
- Abrir ordens de serviço (OS) com orçamento calculado automaticamente.
- Acompanhar cada OS pelas etapas do atendimento até a entrega.
- Mostrar no painel a situação da oficina em números.
- Mostrar quais veículos estão com revisão vencida ou próxima.

### Tecnologias

- HTML5, CSS3 e JavaScript puro (sem frameworks)
- Bootstrap 5.3 e Bootstrap Icons (via CDN)
- `localStorage` para salvar os dados no navegador
- Git, GitHub e GitHub Pages

---

## 2. Requisitos

### Funcionalidades

| Código | Funcionalidade |
|--------|----------------|
| F01 | Cadastrar, listar, editar e excluir **clientes** |
| F02 | Cadastrar, listar, editar e excluir **veículos**, sempre ligados a um cliente |
| F03 | Cadastrar, listar, editar e excluir **serviços e peças** do catálogo |
| F04 | Abrir, listar, editar e excluir **ordens de serviço** com itens do catálogo |
| F05 | Calcular o **orçamento** da OS: serviços + peças − desconto e horas de mão de obra |
| F06 | Mudar o **status da OS** respeitando o fluxo e as regras de cada etapa |
| F07 | **Pesquisar, filtrar e ordenar** todas as listagens |
| F08 | **Painel** com indicadores calculados dos dados cadastrados |
| F09 | **Revisões preventivas**: cadastrar, listar, editar e excluir revisões (cliente, veículo e data prevista), mostrar as vencidas e próximas e copiar uma mensagem de lembrete para enviar ao cliente |
| F10 | Alternar **tema claro e escuro** |
| F11 | Pedir **confirmação** antes de excluir e mostrar mensagens de sucesso e erro |

### Entidades e campos

**Cliente**

| Campo | Tipo | Obrigatório | Validação |
|-------|------|:-----------:|-----------|
| nome | texto | sim | nome e sobrenome |
| cpf | texto | sim | CPF válido e não repetido |
| telefone | texto | sim | DDD + 8 ou 9 dígitos |
| email | texto | não | formato de e-mail |
| cidade | lista | sim | uma das cidades atendidas |

**Veículo**

| Campo | Tipo | Obrigatório | Validação |
|-------|------|:-----------:|-----------|
| clienteId | referência | sim | cliente existente |
| placa | texto | sim | padrão antigo (ABC1234) ou Mercosul (ABC1D23), não repetida |
| marca | lista | sim | — |
| modelo | texto | sim | mínimo 2 caracteres |
| ano | número | sim | entre 1960 e o ano que vem |
| cor | texto | não | — |
| km | número | sim | inteiro, não pode ser menor que o último km registrado |

**Item do catálogo** (serviço ou peça)

| Campo | Tipo | Obrigatório | Validação |
|-------|------|:-----------:|-----------|
| tipo | serviço / peça | sim | — |
| nome | texto | sim | não repetido |
| preco | número | sim | maior que zero |
| horas | número | só serviço | entre 0,5 e 40 |
| intervaloKm / intervaloMeses | número | não (serviço) | intervalo de revisão recomendado, mostrado no catálogo |
| unidade | lista | só peça | un, litro, jogo, kit |
| estoque / estoqueMinimo | número | só peça | inteiro, zero ou mais |

**Ordem de serviço (OS)**

| Campo | Tipo | Obrigatório | Validação |
|-------|------|:-----------:|-----------|
| numero | número | automático | sequencial |
| veiculoId | referência | sim | veículo sem outra OS em andamento |
| kmEntrada | número | sim | maior ou igual ao km do veículo |
| problema | texto | sim | mínimo 10 caracteres |
| itens | lista | não na abertura | serviços e peças do catálogo |
| desconto | número | não | de 0% a 15% |
| status | lista | automático | segue o fluxo abaixo |
| historico | lista | automático | data e observação de cada mudança |
| formaPagamento | lista | na entrega | Pix, dinheiro, débito ou crédito |

**Revisão** (cadastrada manualmente)

| Campo | Tipo | Obrigatório | Validação |
|-------|------|:-----------:|-----------|
| clienteId | referência | sim | cliente existente |
| veiculoId | referência | sim | veículo existente e pertencente ao cliente |
| dataPrevista | data | sim | data válida, sem repetir a mesma data para o mesmo veículo |

### Relacionamentos

```
Cliente 1 ──── N Veículo 1 ──── N Ordem de serviço N ──── N Item do catálogo
```

### Regras de negócio

1. Um cliente com veículos cadastrados não pode ser excluído.
2. Um veículo com OS no histórico não pode ser excluído.
3. Um item do catálogo já usado em alguma OS não pode ser excluído.
4. Um veículo com revisão cadastrada não pode ser excluído.
5. Cada veículo pode ter **apenas uma OS em andamento** por vez.
6. O km de entrada da OS não pode ser menor que o último km do veículo; ao abrir a OS, o km do veículo é atualizado.
7. Para iniciar a execução, a OS precisa ter itens e todas as peças precisam ter estoque; o estoque é baixado nesse momento.
8. A entrega exige a forma de pagamento.
9. OS entregues ou canceladas não podem mais ser alteradas.
10. Só é possível excluir OS abertas ou canceladas.
11. O desconto máximo é de 15%.

### Fluxo de status da OS

```
Aberta → Em diagnóstico → Em execução → Pronta p/ retirada → Entregue
                 ↓               ↑
          Aguardando peça ───────┘

Aberta, Em diagnóstico e Aguardando peça → Cancelada
```

### Indicadores do painel

- OS em andamento na oficina (e quantas estão prontas para retirada)
- Faturamento do mês (OS entregues no mês)
- Ticket médio (faturamento ÷ OS entregues)
- Tempo médio de reparo (da abertura à entrega)
- Peças no estoque mínimo
- Clientes e veículos cadastrados
- Fila da oficina, com alerta para OS paradas há mais de 3 dias na mesma etapa
- Gráficos: OS por etapa, faturamento dos últimos 6 meses e serviços mais realizados

As contagens de revisões vencidas e próximas ficam na tela de Revisões.

### Funcionalidade exclusiva: revisões preventivas

As revisões são registradas manualmente, informando cliente, veículo e data prevista. A situação é calculada pela data: **vencida** quando a data já passou, **próxima** quando faltam até 30 dias e **em dia** nos demais casos.

O botão **Lembrete** de cada revisão copia uma mensagem pronta, com o primeiro nome do cliente, o veículo, a data e a situação, para colar no WhatsApp ou no e-mail.

### Telas

| Tela | Arquivo | Conteúdo |
|------|---------|----------|
| Painel | `index.html` | indicadores, fila da oficina e gráficos |
| Ordens de serviço | `ordens.html` | lista de OS, cadastro e orçamento |
| Detalhe da OS | `ordem.html` | dados da OS, itens, histórico e mudança de status |
| Clientes | `clientes.html` | lista e cadastro de clientes |
| Veículos | `veiculos.html` | cartões e cadastro de veículos |
| Catálogo | `catalogo.html` | abas de serviços e peças, cadastro e estoque |
| Revisões | `revisoes.html` | lista e cadastro de revisões, vencidas, próximas e em dia |

---

## 3. Divisão de tarefas

| Etapa | Tarefa | Responsável |
|-------|--------|-------------|
| 1 | Estrutura de pastas e Bootstrap | Guilherme |
| 1 | Planejamento e requisitos (este README) | Luís |
| 1 | Wireframes do Painel, Clientes e Veículos | Luís |
| 1 | Wireframes de Ordens de serviço, Catálogo e Revisões | Guilherme |
| 2 | Camada de dados (`localStorage`) e funções de validação | Guilherme |
| 2 | CRUD de clientes | Luís |
| 2 | Identidade visual e alternância de tema claro/escuro | Guilherme |
| 2 | CRUD do catálogo | Luís |
| 2 | CRUD de veículos | Luís |
| 2 | CRUD de ordens de serviço e orçamento | Luís |
| 3 | Fluxo de status e tela de detalhe da OS | Guilherme |
| 3 | Painel com indicadores | Luís |
| 3 | Revisões preventivas | Guilherme |
| 3 | Revisão de responsividade | Luís |
| 3 | Dados de exemplo e publicação no GitHub Pages | Guilherme |
| 3 | Documentação final (README) | Luís |

## 4. Onde cada requisito está implementado

| Requisito | Onde está |
|-----------|-----------|
| R01 — 5 ou mais telas | 7 telas: Painel, Ordens, Detalhe da OS, Clientes, Veículos, Catálogo e Revisões |
| R02 — Responsivo, HTML semântico e CSS próprio | `nav`, `main` e `footer` em todas as telas, `section` para os blocos de conteúdo; grid do Bootstrap; colunas secundárias escondidas no celular; `css/style.css` com a identidade visual |
| R03 — 5 tipos de componentes | navbar, cards, tabelas, modais, toasts, abas (catálogo), badges, barras de progresso (painel), list-group, breadcrumb e alertas |
| R04 — Bootstrap | Bootstrap 5.3 e Bootstrap Icons via CDN em todas as páginas |
| R05 — CRUD | clientes (`js/clientes.js`), veículos (`js/veiculos.js`), catálogo (`js/catalogo.js`), ordens (`js/ordens.js`) e revisões (`js/revisoes.js`) |
| R06 — 3 entidades relacionadas | Cliente → Veículo → Ordem de serviço → Item do catálogo (ligados por id) |
| R07 — Validações | atributos HTML (`required`, `minlength`, `min`, `max`) + regras em `js/validacao.js` (CPF, placa, km, desconto, OS em andamento, exclusões bloqueadas) |
| R08 — localStorage | `js/storage.js` (`listar`, `criar`, `atualizar`, `excluir`) |
| R09 — Pesquisa, 2 filtros e ordenação | em todas as listagens; ex.: Ordens tem busca por nº/placa/cliente, filtro de status, filtro de período e ordenação |
| R10 — Dashboard com 4+ indicadores | `index.html` + `js/painel.js`: 6 indicadores calculados, fila, OS por etapa, faturamento de 6 meses e serviços mais realizados |
| R11 — Processo com status | fluxo da OS em `ordem.html` + `js/ordem.js` (baixa de estoque na execução, pagamento na entrega) |
| R12 — 3 interações com JS | tema claro/escuro, orçamento calculado ao vivo, seleção de veículo filtrada pelo cliente, filtros em tempo real, cópia da mensagem de lembrete, toasts e confirmação de exclusão |
| R13 — Funcionalidade exclusiva | revisões preventivas (`revisoes.html` + `js/revisoes.js`) com situação vencida / próxima / em dia e mensagem de lembrete copiada com um clique |

## 5. Como executar

1. Clone o repositório:
   ```
   git clone https://github.com/GigasProgramante/Unc_Reparos_Automotivos.git
   ```
2. Abra o `index.html` no navegador (ou use a extensão Live Server do VS Code).

Não há back-end nem instalação. Os dados ficam salvos no navegador de quem usa (`localStorage`); para começar do zero, basta limpar os dados do site.

Ou acesse direto pelo GitHub Pages: https://gigasprogramante.github.io/Unc_Reparos_Automotivos/

## 6. Como usar

1. Cadastre os **serviços e peças** no Catálogo.
2. Cadastre um **cliente** e depois os **veículos** dele.
3. Abra uma **ordem de serviço**: escolha o cliente, o veículo, informe o km e o problema e adicione os itens. O orçamento é calculado na hora.
4. Abra a OS e avance o **status** (diagnóstico, execução, pronta, entregue). Na entrega, informe a forma de pagamento.
5. Acompanhe a oficina pelo **Painel** e cadastre as próximas **revisões** dos veículos.
