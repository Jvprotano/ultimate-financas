---
name: verify
description: Como buildar, rodar e verificar o Ultimate Finanças de ponta a ponta
---

# Verificar o Ultimate Finanças

App React 19 + Vite + Tailwind 4, 100% client-side (estado em localStorage, sem backend).

## Build e execução

```bash
npm run build     # tsc -b && vite build (typecheck incluso)
npm run dev       # dev server em http://localhost:5173 (rodar em background)
```

## Dirigir a UI

Playwright **Python** (global, `C:\...\Python312\Scripts\playwright.exe`, Chromium já baixado) funciona headless; a extensão claude-in-chrome nem sempre está conectada.

Receita que funciona:
- `page.goto("http://localhost:5173/")`, `localStorage.clear()` + reload para estado isolado.
- Abas do app: `get_by_role("button", name="Cartões")` no header. Cuidado: o seletor de cenário chama-se "Atual" e colide com a sub-aba "Atual" do módulo de cartões — escopar com `get_by_role("main")`.
- Nas tabelas, as células são `<input>` controlados: `has_text`/`inner_text` NÃO enxergam o valor — iterar `div.divide-y > div.grid` e comparar `input_value()`.
- Botões de ação por linha são `opacity-0 group-hover` — dar `hover()` na linha antes de clicar; localizar pelo `title`.
- "Pagar Fatura" usa `window.confirm` — registrar `page.on("dialog", lambda d: d.accept())` antes.
- Dados de cartão em `localStorage['uf_credit_card_entries_v1']` — bom para asserts diretos.

## Fluxos que valem a pena

- Cartões: adicionar compra (ENTER salva, data mantida, foco volta), marcar pago antecipado (HandCoins), filtros, "Pagar Fatura" (vira ciclo, gera parcelas/assinaturas), importar planilha.
- Persistência: recarregar a página depois de cada mutação relevante.
