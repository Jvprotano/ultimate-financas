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
| **Investimentos** | Patrimônio: posições por classe de ativo, rentabilidade anualizada, reserva de emergência e metas com prazo |
| **Cartões** | Fatura atual e próxima, parcelas e assinaturas geradas automaticamente, importação por colagem do Sheets, limite pessoal |
| **Futuro** | 13º, bônus, IPVA e afins como ocorrências datadas; projeção do patrimônio e veredito das metas com prazo |
| **Histórico** | Fechamento de mês: evolução do patrimônio, custo médio real, fatura média e comparação entre meses |

## Conceitos

- **Competência × caixa** — o orçamento mede o mês em que você *gastou*; o painel de caixa mede o mês em que o dinheiro *se move*. Um jantar de julho é desejo de julho, mas só sai da conta quando a fatura vence em agosto. São duas leituras do mesmo dinheiro — nunca uma soma.
- **Forma de pagamento** — cada custo fixo e cada desejo é "conta" ou "cartão". É o que permite ao caixa do mês descontar a fatura em vez de descontar os gastos, e comparar o que o plano previa no cartão com o que a fatura registrou.
- **Base do orçamento** — a renda que vira meta. Benefícios (VA, plano de saúde) saem porque não são dinheiro livre; previdência descontada em folha continua contando, porque é investimento seu.
- **Custo pessoal** — contas divididas com outra pessoa entram no orçamento só pela sua parte; o valor cheio fica visível para você saber o tamanho real da conta.
- **Área do orçamento no cartão** — cada compra pode ser marcada como necessidade, desejo ou investimento. Não cria gasto novo: diz de qual caixa do plano a compra saiu. O traço nas barras de meta mostra o realizado.
- **Patrimônio** — investimentos + reserva de emergência + o dinheiro guardado dentro das metas.
- **Meta de poupança × meta de patrimônio** — a primeira junta dinheiro próprio num livro-razão e soma ao patrimônio; a segunda apenas *engloba* saldos que já existem (reserva, investimentos, outras metas) e por isso não duplica nada.
- **Eventos esperados** — entradas e saídas que caem fora do mês a mês, com mês, recorrência e a fatia que você guarda. Alimentam o caixa do mês e a projeção.
- **Rentabilidade anualizada** — TIR sobre as datas dos aportes, para que quem aportou ontem e quem aportou há três anos não apareçam iguais. Histórico curto demais mostra `—`.
- **Fechamento de mês** — congela os números de hoje como resultado do mês: plano, realizado na fatura por área e sobra em caixa. Sem isso o app só conhece o plano, nunca o realizado.

## Como rodar

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # tsc -b && vite build
npm run lint
npm run preview
```

## Atalhos de teclado

`1`–`6` trocam de aba · `/` foca a busca da fatura · `?` lista os atalhos · `Esc` fecha o que estiver aberto.

## Estrutura

```
src/
  lib/               # cálculo puro, sem React
    scenario.ts      # orçamento do mês, normalização e migração v2→v3
    investments.ts   # patrimônio, alocação, TIR anualizada
    goals.ts         # metas: livro-razão próprio × saldos englobados
    forecast.ts      # eventos esperados e projeção de patrimônio
    cashflow.ts      # o mês no extrato: entra, vence, sobra
    creditCards.ts   # faturas, parcelas, assinaturas
    cardImport.ts    # leitura de planilha colada
    history.ts       # snapshots mensais e estatísticas
    backup.ts        # exportação, importação e cópias automáticas
    format.ts        # moeda, meses, datas
    shared.ts        # ids, datas, livro-razão
  hooks/             # estado por domínio
    useScenarios.ts  useCreditCards.ts  useInvestments.ts
    useHistory.ts    useForecast.ts
    useFinancas.ts   # compõe os cinco e calcula o que cruza domínios
    useLocalStorage.ts  useKeyboardShortcuts.ts
  context/           # FinancasProvider + hooks de leitura
  components/        # ui.tsx é o design system; um arquivo por módulo
  types/             # modelo de dados e constantes (paleta, categorias, modelos)
```

## Persistência

Tudo vive no `localStorage` deste navegador — nenhum dado sai da máquina. Chaves em `uf_*`; as cópias automáticas semanais ficam em `ufbk_*` (fora do backup, para não crescerem sozinhas). Exporte um backup pelo menu `⋮` para guardar uma cópia, ou restaure uma das cópias automáticas por lá.

## Licença

MIT
