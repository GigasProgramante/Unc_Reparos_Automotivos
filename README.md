# UnC Reparos Automotivos

Sistema web para controlar o dia a dia de uma oficina mecânica: clientes, veículos, catálogo de serviços e peças, ordens de serviço com fluxo de status e acompanhamento de revisões preventivas.

Trabalho prático de **Desenvolvimento Web I** — Universidade do Contestado (UnC).

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
- Avisar quais clientes estão com revisão vencida ou próxima e gerar a mensagem de lembrete.

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
| F05 | Calcular o **orçamento** da OS: serviços + peças − desconto, horas de mão de obra e previsão de entrega |
| F06 | Mudar o **status da OS** respeitando o fluxo e as regras de cada etapa |
| F07 | Ver as OS em **lista** ou em **quadro** por etapa |
| F08 | **Pesquisar, filtrar e ordenar** todas as listagens |
| F09 | **Painel** com indicadores calculados dos dados cadastrados |
| F10 | **Revisões preventivas**: prever a próxima revisão de cada veículo e gerar o lembrete para o cliente |
| F11 | Alternar **tema claro e escuro** |
| F12 | Pedir **confirmação** antes de excluir e mostrar mensagens de sucesso e erro |

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
| intervaloKm / intervaloMeses | número | não (serviço) | define se o serviço entra nas revisões |
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

### Relacionamentos

```
Cliente 1 ──── N Veículo 1 ──── N Ordem de serviço N ──── N Item do catálogo
```

### Regras de negócio

1. Um cliente com veículos cadastrados não pode ser excluído.
2. Um veículo com OS no histórico não pode ser excluído.
3. Um item do catálogo já usado em alguma OS não pode ser excluído.
4. Cada veículo pode ter **apenas uma OS em andamento** por vez.
5. O km de entrada da OS não pode ser menor que o último km do veículo; ao abrir a OS, o km do veículo é atualizado.
6. Para iniciar a execução, a OS precisa ter itens e todas as peças precisam ter estoque; o estoque é baixado nesse momento.
7. A entrega exige a forma de pagamento.
8. OS entregues ou canceladas não podem mais ser alteradas.
9. Só é possível excluir OS abertas ou canceladas.
10. O desconto máximo é de 15%.

### Fluxo de status da OS

```
Aberta → Em diagnóstico → Em execução → Pronta p/ retirada → Entregue
                 ↓               ↑
          Aguardando peça ───────┘

Aberta, Em diagnóstico e Aguardando peça → Cancelada
```

### Indicadores do painel

- OS em andamento na oficina (e quantas estão prontas para retirada)
- Faturamento do mês (OS entregues)
- Ticket médio
- Tempo médio de reparo (da abertura à entrega)
- Revisões vencidas e próximas
- Peças no estoque mínimo
- Gráficos: OS por etapa, faturamento dos últimos 6 meses e serviços mais realizados

### Funcionalidade exclusiva: revisões preventivas

Para cada veículo, o sistema procura a última OS entregue com um serviço periódico (ex.: troca de óleo a cada 10.000 km ou 6 meses). A quilometragem de hoje é estimada pela média de km rodados por dia, calculada com as leituras de odômetro das OS anteriores. A revisão fica **próxima** quando faltam até 30 dias ou 1.000 km e **vencida** quando o limite passou, o que vier primeiro. A tela gera a mensagem pronta para enviar ao cliente pelo WhatsApp.

### Telas

| Tela | Arquivo | Conteúdo |
|------|---------|----------|
| Painel | `index.html` | indicadores, fila da oficina e gráficos |
| Ordens de serviço | `ordens.html` | lista e quadro de OS, cadastro, detalhes e mudança de status |
| Clientes | `clientes.html` | lista e cadastro de clientes |
| Veículos | `veiculos.html` | cartões e cadastro de veículos |
| Catálogo | `catalogo.html` | abas de serviços e peças, cadastro e estoque |
| Revisões | `revisoes.html` | revisões vencidas, próximas e em dia, com lembrete |

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
| 2 | CRUD do catálogo | Guilherme |
| 2 | CRUD de veículos | Luís |
| 2 | CRUD de ordens de serviço e orçamento | Guilherme |
| 3 | Fluxo de status e quadro de OS | Guilherme |
| 3 | Painel com indicadores | Luís |
| 3 | Revisões preventivas | Guilherme |
| 3 | Responsividade, dados de exemplo, GitHub Pages e documentação final | Luís |

## Como executar

1. Clone o repositório:
   ```
   git clone https://github.com/GigasProgramante/Unc_Reparos_Automotivos.git
   ```
2. Abra o `index.html` no navegador (ou use a extensão Live Server do VS Code).

Não há back-end nem instalação.
