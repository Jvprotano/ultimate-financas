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
- "Pagar Fatura" já NÃO usa `window.confirm` (é confirmação inline); o import de backup ainda usa confirm/alert.
- Botões `Adicionar`/`Remover` aparecem em vários módulos (custos, desejos, reserva). Escopar ao form certo, ex.: reserva = `form:has(button:has-text('Remover'))`; senão o `.first` pega um botão desabilitado.
- Cabeçalhos de ordenação dos cartões colidem com "Pagar Fatura" — usar `exact=True`.
- Stores globais para asserts diretos: `uf_credit_card_entries_v1`, `uf_emergency_fund_v1`, `uf_investment_holdings_v1`, `uf_investment_classes_v1`. Cenários em `uf_scenarios_v3`.
- `useLocalStorage` só grava ao mutar (lazy). Migrações (ex.: reserva por-cenário → global) ficam em memória até a 1ª escrita; a reserva tem um `useEffect` que persiste no mount. Ao semear localStorage num teste, faça `page.goto` primeiro, então `setItem`, então `reload`.
- Valores monetários usam espaço não separável (`\xa0`): normalizar com `.replace("\xa0"," ")` antes de comparar "R$ x".

## Fluxos que valem a pena

- Cartões: adicionar compra (ENTER salva, data mantida, foco volta), marcar pago antecipado (HandCoins), filtros/busca/ordenação, "Pagar Fatura", excluir com desfazer.
- Reserva (global): Adicionar/Remover com histórico; retirada limitada ao saldo; migração do saldo antigo.
- Investimentos (aba "Investimentos", global): nova posição com chips de classe + "Nova classe"; expandir posição → aportar/resgatar, marcar a mercado (input "Saldo atual"), histórico; rentabilidade = valor de mercado − aportado.
- Persistência: recarregar a página depois de cada mutação relevante; conferir que dados globais valem entre cenários.
