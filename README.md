# Ultimate Finanças

Planejamento financeiro pessoal: orçamento do mês, patrimônio, cartões e o histórico do que realmente aconteceu — tudo em uma única tela, 100% no navegador.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)

## As cinco abas

| Aba | O que faz |
| --- | --- |
| **Visão geral** | Saldo livre do mês, metas por caixa (planejado × realizado no cartão), custos por categoria, alertas e comparação de cenários |
| **Planejamento** | Renda e descontos em folha, custos fixos (com rateio), modelo de orçamento, desejos, plano de aportes e reserva |
| **Investimentos** | Patrimônio: posições por classe de ativo, rentabilidade anualizada, reserva de emergência e metas com prazo |
| **Cartões** | Fatura atual e próxima, parcelas e assinaturas geradas automaticamente, importação por colagem do Sheets, limite pessoal |
| **Histórico** | Fechamento de mês: evolução do patrimônio, custo médio real e comparação entre meses |

## Conceitos

- **Base do orçamento** — a renda que vira meta. Benefícios (VA, plano de saúde) saem porque não são dinheiro livre; previdência descontada em folha continua contando, porque é investimento seu.
- **Custo pessoal** — contas divididas com outra pessoa entram no orçamento só pela sua parte; o valor cheio fica visível para você saber o tamanho real da conta.
- **Área do orçamento no cartão** — cada compra pode ser marcada como necessidade, desejo ou investimento. É o que liga a fatura ao plano: o traço nas barras de meta mostra o que já saiu de fato.
- **Patrimônio** — investimentos + reserva de emergência + metas. É a base da alocação e do gráfico de evolução.
- **Rentabilidade anualizada** — TIR sobre as datas dos aportes, para que quem aportou ontem e quem aportou há três anos não apareçam iguais. Histórico curto demais mostra `—`.
- **Fechamento de mês** — congela os números de hoje como resultado do mês. Sem isso o app só conhece o plano, nunca o realizado.

## Como rodar

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # tsc -b && vite build
npm run lint
npm run preview
```

## Atalhos de teclado

`1`–`5` trocam de aba · `/` foca a busca da fatura · `?` lista os atalhos · `Esc` fecha o que estiver aberto.

## Estrutura

```
src/
  lib/               # cálculo puro, sem React
    scenario.ts      # orçamento do mês, normalização e migração v2→v3
    investments.ts   # patrimônio, alocação, TIR anualizada, metas
    creditCards.ts   # faturas, parcelas, assinaturas
    cardImport.ts    # leitura de planilha colada
    history.ts       # snapshots mensais e estatísticas
    backup.ts        # exportação, importação e cópias automáticas
    format.ts        # moeda, meses, datas
    shared.ts        # ids, datas, livro-razão
  hooks/             # estado por domínio
    useScenarios.ts  useCreditCards.ts  useInvestments.ts  useHistory.ts
    useFinancas.ts   # compõe os quatro e calcula o que cruza domínios
    useLocalStorage.ts  useKeyboardShortcuts.ts
  context/           # FinancasProvider + hooks de leitura
  components/        # ui.tsx é o design system; um arquivo por módulo
  types/             # modelo de dados e constantes (paleta, categorias, modelos)
```

## Persistência

Tudo vive no `localStorage` deste navegador — nenhum dado sai da máquina. Chaves em `uf_*`; as cópias automáticas semanais ficam em `ufbk_*` (fora do backup, para não crescerem sozinhas). Exporte um backup pelo menu `⋮` para guardar uma cópia, ou restaure uma das cópias automáticas por lá.

## Licença

MIT
