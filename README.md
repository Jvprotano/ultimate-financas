# FinTano

Planejamento financeiro pessoal: orçamento do mês, patrimônio, cartões e o histórico do que realmente aconteceu — tudo em uma única aplicação, 100% no navegador.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)

## As seis abas

| Aba | O que faz |
| --- | --- |
| **Ciclo** | Hub do mês vivido: salário que financia o ciclo, caixa, fatura que vence, compras do mês, realizados e fechamento |
| **Planejar** | Renda e descontos em folha, custos fixos (com rateio e forma de pagamento), modelo de orçamento, desejos e plano de aportes |
| **Cartões** | Fatura a pagar e fatura em formação, parcelas e assinaturas automáticas, importação por colagem do Sheets |
| **Patrimônio** | Ativos e passivos: reserva por aplicações, carteira por classe, rentabilidade anualizada, metas, bens e dívidas |
| **Histórico** | Realizado do ciclo, evolução do patrimônio, custo médio real e correção de meses passados |
| **Futuro** | 13º, bônus, IPVA e afins como ocorrências datadas; projeção do dinheiro e do balanço em valores nominais ou de hoje |

## Conceitos

- **Ciclo financeiro** — o ciclo é o mês que está sendo vivido. Para quem recebe no último dia útil, o salário do fim de julho financia Agosto; fechamento/pagamento do cartão não muda o ciclo.
- **Competência × caixa** — o orçamento mede o mês em que você *gastou*; o painel de caixa mede o mês em que o dinheiro *se move*. Uma compra de agosto é gasto de agosto, mesmo que a fatura seja paga em setembro. São duas leituras do mesmo dinheiro — nunca uma soma.
- **Forma de pagamento** — cada custo fixo e cada desejo é "conta" ou "cartão". É o que permite ao caixa descontar a fatura em vez de descontar as compras novamente.
- **Base do orçamento** — a renda que vira meta. Benefícios saem porque não são dinheiro livre; previdência descontada em folha continua contando, porque é investimento seu.
- **Custo pessoal** — contas divididas entram no orçamento só pela sua parte; o valor cheio permanece visível para conferência.
- **Área do orçamento no cartão** — cada compra pode ser marcada como necessidade, desejo ou investimento. Isso classifica o realizado sem criar gasto novo.
- **Reserva: classe × finalidade** — a reserva de emergência é um ativo financeiro investido, mas sua finalidade é segurança/liquidez. Cada aplicação da reserva tem produto, instituição, classe de ativo, referência (ex. 100% CDI), liquidez, saldo e livro-razão. Ela conta no patrimônio e nos aportes realizados, mas fica fora do rebalanceamento da carteira de longo prazo.
- **Carteira de investimentos** — posições com finalidade de carteira são agrupadas por classe e usadas para acompanhar alocação e rentabilidade. Reserva e metas permanecem separadas pela finalidade.
- **Patrimônio financeiro × líquido total** — o financeiro é carteira + reserva + metas, menos dívida *sem contrapartida*. O líquido total soma também os bens e desconta tudo que você deve.
- **Bens** — casa, carro e outros ativos físicos ficam fora do rebalanceamento, mas entram no balanço. Cada bem tem valor de mercado, valorização esperada e, opcionalmente, aluguel equivalente.
- **Dívida garantida × sem contrapartida** — financiamento ligado a um bem não é a mesma coisa que rotativo ou empréstimo sem garantia. A garantida possui o bem do outro lado do balanço.
- **A parcela não é toda despesa** — em um financiamento, só o juro é despesa; amortização aumenta seu equity no bem.
- **Meta de poupança × meta de patrimônio** — a primeira guarda dinheiro próprio em livro-razão; a segunda pode apenas englobar saldos existentes sem duplicá-los.
- **Investimento planejado × realizado** — o plano diz quanto deveria ser investido; o fechamento soma o que realmente foi aportado em folha, reserva, posições e metas, líquido de retiradas. Marcação a mercado não é aporte.
- **Eventos esperados** — entradas e saídas fora do mês a mês, com mês, recorrência e a fatia que você guarda. Alimentam caixa e projeção.
- **Realizado do mês** — o que de fato foi pago/usado no ciclo. Onde não houver realizado informado, o plano funciona como fallback.
- **Valores de hoje** — a projeção pode ser lida descontada da inflação.
- **Rentabilidade anualizada** — TIR sobre as datas dos aportes e o valor de mercado atual; histórico curto demais mostra `—`.
- **Fechamento do ciclo** — registra o mês vivido e avança para o próximo. Pagar uma fatura não fecha o ciclo automaticamente.

Veja também [`docs/ciclo-financeiro.md`](docs/ciclo-financeiro.md) para a regra temporal completa de salário, vencimentos, cartão e fechamento.

## Como rodar

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # tsc -b && vite build
npm run lint
npm test           # vitest run — cobre src/lib (cálculo puro)
npm run test:watch
npm run preview
```

Os testes vivem ao lado do código, em `src/lib/*.test.ts`. Eles cobrem os principais cálculos puros: ciclo/faturas, investimentos realizados, posições da reserva, TIR anualizada, dívidas, bens, metas, projeção, rateio de custos e migrações.

## Atalhos de teclado

`1`–`6` trocam de aba · `/` foca a busca da fatura · `?` lista os atalhos · `Esc` fecha o que estiver aberto.

## Estrutura

```
src/
  lib/               # cálculo puro, sem React
    scenario.ts      # orçamento do mês, normalização e migração v2→v3
    investments.ts   # carteira, reserva por posições, TIR e balanço
    investmentActuals.ts # aportes líquidos realizados no ciclo
    assets.ts        # bens: equity, valorização, ser dono × alugar
    debts.ts         # saldo, juros, prazo, amortizar × investir, garantia
    goals.ts         # metas: livro-razão próprio × saldos englobados
    forecast.ts      # eventos esperados, projeção e inflação
    cashflow.ts      # o mês no extrato: entra, vence, sobra
    actuals.ts       # realizado do mês, item por item
    creditCards.ts   # faturas, parcelas, assinaturas, ciclo de cada cartão
    cardCycleAccounting.ts # competência do cartão × caixa da fatura
    cardImport.ts    # leitura de planilha colada
    history.ts       # snapshots mensais e estatísticas
    backup.ts        # exportação, importação e cópias automáticas
    format.ts        # moeda, meses, datas
    shared.ts        # ids, datas, livro-razão
  hooks/             # estado por domínio
    useScenarios.ts  useCreditCards.ts  useInvestments.ts  useDebts.ts
    useAssets.ts     useHistory.ts      useForecast.ts     useActuals.ts
    useFinancas.ts   # compõe os domínios e calcula o que cruza entre eles
    useLocalStorage.ts  useKeyboardShortcuts.ts
  context/           # FinancasProvider + hooks de leitura
  components/        # ui.tsx é o design system; um arquivo por módulo
  types/             # modelo de dados e constantes
```

## Persistência e compatibilidade

Tudo vive no `localStorage` deste navegador — nenhum dado sai da máquina. As chaves continuam em `uf_*` mesmo após o rename para FinTano para não perder dados existentes; as cópias automáticas semanais ficam em `ufbk_*`.

Backups novos são identificados como `fintano` e usam o nome `fintano-backup-AAAA-MM-DD.json`. Backups antigos do Ultimate Finanças continuam importáveis. A migração da reserva antiga cria uma posição de reserva com o mesmo saldo/livro-razão sem duplicar patrimônio.

## Licença

MIT
