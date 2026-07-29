# Ultimate Finanças

Planejamento financeiro pessoal: orçamento do mês, patrimônio, cartões e o histórico do que realmente aconteceu — tudo em uma única tela, 100% no navegador.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)

## As seis abas

| Aba | O que faz |
| --- | --- |
| **Visão geral** | Saldo livre do mês, caixa do mês (extrato), metas por caixa (planejado × realizado no cartão), custos por categoria, alertas e comparação de cenários |
| **Planejamento** | Renda e descontos em folha, custos fixos (com rateio e forma de pagamento), modelo de orçamento, desejos, plano de aportes e reserva |
| **Patrimônio** | Ativos e passivos: posições por classe, rentabilidade anualizada, reserva, metas com prazo e dívidas (saldo, juros, prazo, amortizar × investir) |
| **Cartões** | Fatura atual e próxima, cartões com fechamento e vencimento próprios, parcelas e assinaturas automáticas, importação por colagem do Sheets |
| **Futuro** | 13º, bônus, IPVA e afins como ocorrências datadas; projeção de ativos, dívidas e patrimônio líquido, em valores nominais ou de hoje |
| **Histórico** | Realizado do mês, fechamento, evolução do patrimônio, custo médio real e correção de meses passados |

## Conceitos

- **Competência × caixa** — o orçamento mede o mês em que você *gastou*; o painel de caixa mede o mês em que o dinheiro *se move*. Um jantar de julho é desejo de julho, mas só sai da conta quando a fatura vence em agosto. São duas leituras do mesmo dinheiro — nunca uma soma.
- **Forma de pagamento** — cada custo fixo e cada desejo é "conta" ou "cartão". É o que permite ao caixa do mês descontar a fatura em vez de descontar os gastos, e comparar o que o plano previa no cartão com o que a fatura registrou.
- **Base do orçamento** — a renda que vira meta. Benefícios (VA, plano de saúde) saem porque não são dinheiro livre; previdência descontada em folha continua contando, porque é investimento seu.
- **Custo pessoal** — contas divididas com outra pessoa entram no orçamento só pela sua parte; o valor cheio fica visível para você saber o tamanho real da conta.
- **Área do orçamento no cartão** — cada compra pode ser marcada como necessidade, desejo ou investimento. Não cria gasto novo: diz de qual caixa do plano a compra saiu. O traço nas barras de meta mostra o realizado.
- **Ativos × patrimônio líquido** — ativos são investimentos + reserva + o guardado nas metas. O líquido desconta as dívidas, e é ele que mede se você está ficando mais rico. As fatias de alocação são sempre sobre os *ativos*: dividir por um líquido pequeno (ou negativo) daria porcentagens sem sentido.
- **Dívidas** — saldo devedor mantido por você (juros e seguros nunca saem de uma soma de pagamentos), com taxa, parcela e prazo. Amortizar R$ 1.000 e aportar R$ 1.000 movem o mesmo número; o app compara as duas taxas lado a lado. A parcela continua sendo o custo fixo do orçamento — a dívida não a cobra de novo.
- **Meta de poupança × meta de patrimônio** — a primeira junta dinheiro próprio num livro-razão e soma ao patrimônio; a segunda apenas *engloba* saldos que já existem (reserva, investimentos, outras metas, e dívidas com sinal negativo) e por isso não duplica nada.
- **Eventos esperados** — entradas e saídas que caem fora do mês a mês, com mês, recorrência e a fatia que você guarda. Alimentam o caixa do mês e a projeção.
- **Realizado do mês** — o que de fato foi pago em débito e boleto, item por item. Sem ele o "custo médio real" do histórico é só a média dos planos, e a meta da reserva de emergência herda o mesmo otimismo. Valor informado manda; onde não houver, vale o planejado.
- **Valores de hoje** — a projeção pode ser lida descontada da inflação. Em três ou cinco anos a diferença entre nominal e real é grande o bastante para mudar a decisão.
- **Rentabilidade anualizada** — TIR sobre as datas dos aportes, para que quem aportou ontem e quem aportou há três anos não apareçam iguais. Histórico curto demais mostra `—`.
- **Fechamento de mês** — congela o mês: custos realizados, fatura por área, ativos, dívidas e sobra em caixa. Fechou errado num mês passado? Corrija o registro em vez de refechar — refechar substituiria tudo pelos números de hoje.

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

Os testes vivem ao lado do código, em `src/lib/*.test.ts`. Cobrem o que quebra em silêncio:
TIR anualizada, prazo e juros de dívida, projeção com amortização e inflação, rateio de custos,
inclusões de meta (o caso de contar duas vezes), geração de parcelas e assinaturas, e o
calendário de fechamento dos cartões.

## Atalhos de teclado

`1`–`6` trocam de aba · `/` foca a busca da fatura · `?` lista os atalhos · `Esc` fecha o que estiver aberto.

## Estrutura

```
src/
  lib/               # cálculo puro, sem React
    scenario.ts      # orçamento do mês, normalização e migração v2→v3
    investments.ts   # ativos, alocação, TIR anualizada
    debts.ts         # saldo, juros, prazo, amortizar × investir
    goals.ts         # metas: livro-razão próprio × saldos englobados
    forecast.ts      # eventos esperados, projeção e inflação
    cashflow.ts      # o mês no extrato: entra, vence, sobra
    actuals.ts       # realizado do mês, item por item
    creditCards.ts   # faturas, parcelas, assinaturas, ciclo de cada cartão
    cardImport.ts    # leitura de planilha colada
    history.ts       # snapshots mensais e estatísticas
    backup.ts        # exportação, importação e cópias automáticas
    format.ts        # moeda, meses, datas
    shared.ts        # ids, datas, livro-razão
  hooks/             # estado por domínio
    useScenarios.ts  useCreditCards.ts  useInvestments.ts  useDebts.ts
    useHistory.ts    useForecast.ts     useActuals.ts
    useFinancas.ts   # compõe os sete e calcula o que cruza domínios
    useLocalStorage.ts  useKeyboardShortcuts.ts
  context/           # FinancasProvider + hooks de leitura
  components/        # ui.tsx é o design system; um arquivo por módulo
  types/             # modelo de dados e constantes (paleta, categorias, modelos)
```

## Persistência

Tudo vive no `localStorage` deste navegador — nenhum dado sai da máquina. Chaves em `uf_*`; as cópias automáticas semanais ficam em `ufbk_*` (fora do backup, para não crescerem sozinhas). Exporte um backup pelo menu `⋮` para guardar uma cópia, ou restaure uma das cópias automáticas por lá.

## Licença

MIT
