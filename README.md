# Ultimate Financas

Plataforma web de planejamento salarial e de investimentos. Organize seu orcamento, controle custos e defina a alocacao ideal dos seus investimentos — tudo em uma unica tela.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)

## Funcionalidades

- **Salario liquido** — input com formatacao em R$ brasileiro
- **Descontos na fonte** — previdencia privada, plano de saude, VA, VT, seguro de vida
- **Custos mensais** — 9 categorias com exemplos e sugestoes rapidas (moradia, contas, alimentacao, transporte, saude, educacao, lazer, dividas, outros)
- **Modelos de orcamento** — 50/30/20, 60/20/20, 70/20/10, 40/30/30 ou personalizado
- **Videos explicativos** — cada modelo tem um link para video no YouTube explicando a regra
- **Diversificacao de investimentos** — renda fixa, acoes, FIIs, cripto + adicionar novas classes de ativos
- **Alocacao calculada** — mostra exatamente quanto investir em cada classe
- **Reserva de emergencia** — calculo automatico para 3, 6 e 12 meses
- **Dashboard com graficos** — pizza para orcamento e diversificacao, barras para custos por categoria
- **Alertas inteligentes** — aviso quando custos excedem o disponivel, taxa de economia
- **Persistencia local** — todos os dados salvos no localStorage do navegador (zero backend)
- **Dark mode** — tema escuro por padrao, otimizado para uso prolongado

## Tech Stack

| Tecnologia | Uso |
|---|---|
| **React 19** | UI reativa com hooks |
| **TypeScript** | Tipagem estatica |
| **Vite 8** | Build e dev server |
| **Tailwind CSS 4** | Estilizacao utility-first |
| **Recharts** | Graficos interativos |
| **Lucide React** | Icones |

## Como rodar

```bash
# Instalar dependencias
npm install

# Rodar em desenvolvimento
npm run dev

# Build de producao
npm run build

# Preview do build
npm run preview
```

## Estrutura do projeto

```
src/
  components/       # Componentes React
    BudgetModelSelector.tsx
    Card.tsx
    Charts.tsx
    CostManager.tsx
    CurrencyInput.tsx
    DeductionsManager.tsx
    DiversificationSelector.tsx
    EmergencyFund.tsx
    Summary.tsx
  hooks/             # Custom hooks
    useFinancas.ts   # Logica de negocios central
    useLocalStorage.ts
  types/             # Tipos e constantes
    index.ts
    constants.ts
  utils.ts           # Formatacao (moeda, porcentagem)
  App.tsx            # Layout principal
  main.tsx           # Entry point
```

## Privacidade

Nenhum dado e enviado para servidores externos. Todas as informacoes financeiras sao armazenadas exclusivamente no `localStorage` do seu navegador.

## Licenca

MIT
