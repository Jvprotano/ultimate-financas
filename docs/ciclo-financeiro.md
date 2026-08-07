# Ciclo financeiro: regra operacional

O ciclo do FinTano é o **mês que está sendo vivido e financiado**, não o intervalo entre duas faturas e não o mês de vencimento da fatura aberta.

## Regra curta

> **Mês vivido = ciclo.**
>
> O salário recebido no fim do mês anterior financia o ciclo atual.

Exemplo: salário recebido no último dia útil de julho financia o **Ciclo Agosto**.

O ciclo só deve avançar para Setembro quando Agosto terminar e os gastos/realizados de Agosto estiverem suficientemente atualizados para fechar o mês.

## O que NÃO vira o ciclo

Nenhum destes eventos, sozinho, deve avançar o ciclo:

- a fatura do cartão fechar;
- a fatura ser paga;
- todas as contas do começo do mês já terem sido pagas;
- a próxima fatura já estar aberta;
- a próxima fatura ter vencimento no mês seguinte;
- o salário do próximo ciclo cair um pouco antes da virada do calendário.

O cartão possui seu próprio calendário. O ciclo financeiro possui o calendário do mês vivido.

## Quando começa um ciclo

Para quem recebe no último dia útil do mês:

- salário do fim de julho → financia Agosto;
- salário do fim de agosto → financia Setembro;
- salário do fim de setembro → financia Outubro.

O recebimento pode ocorrer antes do último dia civil do mês. Isso não transforma antecipadamente Agosto em Setembro: o dinheiro recebido no fim de Agosto é o dinheiro **reservado para financiar Setembro**.

Na interface, o ciclo ativo deve continuar representando o mês que ainda está sendo vivido.

## Quando fechar o ciclo

Feche o ciclo somente quando:

1. o mês civil terminou (ou você está no começo do dia 1º seguinte);
2. as contas pagas naquele mês foram registradas;
3. os custos variáveis daquele mês foram atualizados — por exemplo supermercado/vale e combustível;
4. as compras de cartão feitas naquele mês foram registradas/importadas;
5. desejos e aportes do mês estão coerentes com o que realmente ocorreu.

Para a rotina atual, a recomendação é:

> **Fechar Agosto no fim de 31/08 ou no começo de 01/09, depois de registrar o que ainda foi usado em Agosto.**

Depois do fechamento, o FinTano pode avançar o ciclo ativo para Setembro.

## Quando “fechar o cartão”

O usuário não precisa executar uma ação manual chamada “fechar cartão” no FinTano.

Quem fecha a fatura é o banco, de acordo com o `closingDay` cadastrado.

Fluxo correto:

1. durante o mês, registrar/importar compras normalmente;
2. aguardar o fechamento do banco;
3. depois do fechamento, conferir se a fatura está completa;
4. quando o pagamento/autodébito realmente ocorrer, usar **Pagar fatura** no FinTano;
5. o FinTano gira o cartão para a próxima fatura, mas **não avança o ciclo financeiro**.

Exemplo com fechamento em 29/30 e vencimento no começo do mês seguinte:

- compras feitas durante Agosto → competência Agosto;
- banco fecha a fatura por volta de 29–30/08;
- essa fatura vence no começo de Setembro;
- ela será paga com o salário recebido no fim de Agosto;
- portanto é caixa do Ciclo Setembro;
- pagar essa fatura em Setembro não transforma Setembro em Outubro.

## Quais contas entram em cada ciclo

### Contas com vencimento

Para contas pagas em débito, PIX ou boleto, use como regra o **mês do vencimento/pagamento esperado**.

Exemplos:

- energia referente ao consumo de julho, vencendo 05/08 → Ciclo Agosto;
- internet vencendo 05/08 → Ciclo Agosto;
- água vencendo 03/09 → Ciclo Setembro.

O FinTano não precisa transformar a conta de energia em competência do mês de consumo para o orçamento doméstico. Para caixa e planejamento mensal, o vencimento é a referência operacional mais simples.

### Verbas mensais sem vencimento

Supermercado/vale, combustível e outras verbas de uso contínuo pertencem ao **mês em que são usadas**.

Exemplos:

- vale destinado a compras de mercado durante Agosto → Ciclo Agosto enquanto houver consumo de Agosto;
- combustível planejado para rodar durante Agosto → Ciclo Agosto;
- não feche Agosto só porque as contas do dia 1–5 já foram pagas.

### Cartão de crédito

Cartão possui duas leituras simultâneas:

- **competência:** mês em que a compra foi feita;
- **caixa:** mês em que a fatura vence e é paga.

Exemplo:

- compra em 10/08 → realizado do Planejamento de Agosto;
- entra na fatura que fecha no fim de Agosto;
- vence em Setembro;
- sai do caixa do Ciclo Setembro.

Nunca some as duas leituras como se fossem dois gastos diferentes.

## Exemplo completo: Agosto de 2026

Situação em 07/08/2026:

- salário recebido no fim de Julho;
- contas do começo de Agosto já pagas;
- fatura anterior já paga;
- nova fatura aberta com vencimento em Setembro;
- vale/supermercado de Agosto ainda sendo consumido;
- combustível de Agosto ainda não totalmente realizado.

**Ciclo correto: Agosto.**

A nova fatura vencer em Setembro é esperado e não muda o ciclo.

Linha do tempo:

| Data aproximada | Evento | Tratamento |
| --- | --- | --- |
| 31/07 | recebe salário | dinheiro que financia Agosto |
| 01–05/08 | paga contas com vencimento em Agosto | caixa de Agosto |
| 01–05/08 | paga fatura que vence em Agosto | caixa de Agosto; compras anteriores |
| durante Agosto | usa vale/supermercado e combustível | realizado de Agosto |
| durante Agosto | faz compras no cartão | competência Agosto; fatura de Setembro |
| 29–30/08 | banco fecha a fatura | não muda o ciclo |
| último dia útil de Agosto | recebe salário | dinheiro reservado para Setembro |
| 31/08 ou 01/09 | termina de registrar Agosto e fecha o ciclo | avança para Setembro |
| 01–05/09 | paga a fatura formada em Agosto | caixa de Setembro |

## Diagnóstico do backup de produção de 07/08/2026

O backup mostra:

- `uf_active_cycle_v1.month = 2026-09`;
- cartão atual com `currentDueMonth = 2026-09`;
- realizados de Agosto já cadastrados para financiamento, energia, água, internet, celular e cabeleireiro;
- Supermercado e Combustível ainda sem realizado de Agosto.

Isso significa que o cartão já foi girado para a fatura de Setembro e, em algum momento, o ciclo ativo também foi levado para Setembro. Pela regra acima, isso está adiantado: em 07/08, enquanto Agosto ainda está sendo consumido e registrado, o ciclo ativo deve continuar em Agosto.

O PR passa a tratar “cartão em Setembro + ciclo em Agosto” como uma situação normal após o pagamento da fatura de Agosto, e não como motivo para avançar o ciclo.
