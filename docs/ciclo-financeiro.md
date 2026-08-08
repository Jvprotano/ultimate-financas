# Ciclo financeiro: regra operacional

O ciclo do FinTano representa a **competência do mês que está sendo vivido**. O calendário do cartão é separado: uma compra de Agosto pode formar uma fatura que vence em Setembro sem transformar o ciclo ativo em Setembro.

## Regra curta

> **Mês vivido = competência do ciclo. O ciclo só avança na ação de fechamento.**
>
> O salário recebido no fim do mês anterior financia o ciclo atual.

Exemplo: salário recebido no último dia útil de julho financia o **Ciclo Agosto**.

Agosto pode continuar ativo até o usuário terminar a revisão do mês, inclusive no começo de Setembro. O vencimento da fatura aberta, sozinho, nunca deve alterar o ciclo.

## Dois relógios do cartão

Cartão possui duas leituras que não devem ser misturadas:

- **gasto por competência:** compras/parcelas atribuídas ao mês que está sendo fechado;
- **fatura a pagar:** o valor ainda devido no vencimento da fatura.

Uma compra antecipadamente paga continua sendo gasto da competência, mas deixa de compor a fatura ainda devida. Por isso os dois números podem ser diferentes sem haver erro.

No backup de produção analisado em Agosto de 2026:

- gasto pessoal atribuído ao cartão: **R$ 2.690,36**;
- ainda devido na fatura: **R$ 2.511,64**;
- diferença já paga antecipadamente: **R$ 178,72**.

Assim, o Histórico deve chamar R$ 2.690,36 de **gasto no cartão**, e não de “fatura”.

## O que NÃO vira o ciclo

Nenhum destes eventos, sozinho, deve avançar o ciclo:

- o banco fechar a fatura;
- a fatura vencer;
- a fatura ser paga pela aba Cartões;
- todas as contas do começo do mês terem sido pagas;
- a próxima fatura já estar aberta;
- a próxima fatura ter vencimento no mês seguinte;
- o salário do próximo ciclo cair antes da virada do calendário.

O ciclo avança apenas quando o usuário confirma **Fechar ciclo**.

## Quando começa um ciclo

Para quem recebe no último dia útil do mês:

- salário do fim de julho → financia Agosto;
- salário do fim de agosto → financia Setembro;
- salário do fim de setembro → financia Outubro.

O recebimento pode ocorrer antes do último dia civil. Isso não muda antecipadamente a competência: o dinheiro recebido no fim de Agosto fica reservado para financiar Setembro.

## Quando fechar o ciclo

A rotina operacional recomendada é ligar o fechamento do ciclo à revisão final do mês e, quando fizer sentido, ao pagamento da fatura formada por ele.

Antes de fechar:

1. aguarde o banco fechar a fatura do fim do mês;
2. confira/importa os lançamentos do cartão;
3. atualize custos variáveis como supermercado/vale e combustível;
4. confira os aportes efetivamente realizados;
5. abra **Revisar fechamento** na aba Ciclo.

A revisão mostra:

- custos efetivos do ciclo;
- gasto no cartão por competência;
- valor ainda devido da fatura formada pelo ciclo;
- investimentos realizados;
- todos os custos sem realizado informado.

Para cada custo não preenchido, o FinTano informa que usará o valor planejado. Ao confirmar, esses valores são persistidos como realizado do mês, para que o histórico não dependa de um fallback invisível.

No final da revisão existem duas ações:

- **Fechar apenas o ciclo** — congela o histórico e avança o ciclo, sem mexer no cartão;
- **Fechar ciclo + pagar fatura** — congela o mesmo histórico, marca a fatura formada pelo ciclo como paga, gira o cartão para a próxima e avança o ciclo.

Para a rotina atual, a segunda opção tende a ser o fluxo normal.

## Fechar ciclo e pagar fatura não mistura competência e caixa

Exemplo de Agosto:

- compras/parcelas atribuídas a Agosto = competência Agosto;
- elas formam a fatura que vence em Setembro;
- essa fatura é caixa de Setembro, financiada pelo salário recebido no fim de Agosto;
- no fim de Agosto ou começo de Setembro, o usuário pode escolher **Fechar Agosto + pagar a fatura de Setembro** na mesma operação.

A ação conjunta é operacional. Contabilmente, o FinTano continua sabendo que:

- o gasto pertence a Agosto;
- o pagamento da fatura pertence ao caixa de Setembro.

Depois da ação conjunta, o ciclo ativo passa a Setembro e a fatura paga de Setembro continua registrada como saída do caixa de Setembro.

## A ordem das ações não pode mudar o Histórico

O resultado de Agosto deve ser idêntico nestes dois fluxos:

### Fluxo A — fechamento conjunto

1. banco fecha a fatura de Setembro;
2. usuário abre a revisão de Agosto;
3. escolhe **Fechar ciclo + pagar fatura**.

### Fluxo B — pagamento antecipado

1. banco fecha a fatura de Setembro;
2. usuário marca essa fatura como paga na aba Cartões;
3. depois abre a revisão e fecha Agosto.

Para garantir isso, cada lançamento passa a preservar explicitamente seu **mês de competência** e, no pagamento, o FinTano salva um snapshot da composição da fatura antes de girar `current → next`.

Assim, pagar antes não apaga nem desloca o gasto de Agosto.

## Quando “fechar o cartão”

Não existe uma ação manual para fechar a fatura. Quem fecha é o banco, conforme o `closingDay` cadastrado.

Fluxo:

1. durante o mês, registrar/importar compras normalmente;
2. aguardar o fechamento bancário;
3. conferir se a fatura está completa;
4. pagar pela aba Cartões ou pela revisão de fechamento do ciclo;
5. o pagamento gira a fatura, mas o ciclo só avança se a ação escolhida também for **Fechar ciclo**.

Com cartões que fecham em 29/30 e vencem no começo do mês seguinte:

- durante Agosto → competência Agosto;
- 29–30/08 → banco fecha a fatura de Setembro;
- fim de Agosto → salário de Setembro entra;
- fim de Agosto / começo de Setembro → revisão final de Agosto;
- opção normal: fechar Agosto + pagar a fatura de Setembro;
- resultado: ciclo passa a Setembro, cartão passa à fatura de Outubro e o caixa de Setembro sabe que sua fatura já foi paga.

## Quais contas entram em cada ciclo

### Contas com vencimento

Para contas pagas em débito, PIX ou boleto, use como regra o **mês do vencimento/pagamento esperado**.

Exemplos:

- energia referente ao consumo de julho, vencendo 05/08 → Ciclo Agosto;
- internet vencendo 05/08 → Ciclo Agosto;
- água vencendo 03/09 → Ciclo Setembro.

Para caixa e planejamento doméstico, o vencimento é a referência operacional mais simples.

### Verbas mensais sem vencimento

Supermercado/vale, combustível e outras verbas de uso contínuo pertencem ao **mês em que são usadas**.

Exemplos:

- vale destinado a compras durante Agosto → competência Agosto;
- combustível usado durante Agosto → competência Agosto;
- não feche Agosto só porque as contas do começo do mês foram pagas.

### Cartão de crédito

Exemplo:

- compra/parcela atribuída a Agosto → realizado de Agosto;
- forma a fatura que fecha no fim de Agosto;
- vence em Setembro;
- sai do caixa de Setembro.

Nunca some competência e pagamento como se fossem dois gastos diferentes.

## Exemplo completo: Agosto de 2026

Situação em 08/08/2026:

- salário recebido no fim de Julho;
- contas do começo de Agosto já pagas;
- fatura anterior já paga;
- fatura aberta com vencimento em Setembro;
- vale/supermercado de Agosto ainda sendo consumido;
- combustível de Agosto ainda não totalmente realizado.

**Ciclo correto: Agosto.**

A combinação `ciclo Agosto + fatura atual Setembro` é normal e não deve gerar alerta de “vencimento desalinhado”.

Linha do tempo:

| Data aproximada | Evento | Tratamento |
| --- | --- | --- |
| fim de Jul | recebe salário | dinheiro que financia Agosto |
| início de Ago | paga contas/fatura que vencem em Agosto | caixa de Agosto |
| durante Ago | usa vale/supermercado/combustível | realizado de Agosto |
| durante Ago | usa cartão | competência Agosto; fatura de Setembro |
| 29–30/08 | banco fecha a fatura | ciclo continua Agosto |
| último dia útil de Ago | recebe salário | dinheiro que financia Setembro |
| fim Ago / início Set | revisa custos, cartão e investimentos | ainda fechando Agosto |
| fim Ago / início Set | fecha Agosto, opcionalmente pagando a fatura de Setembro junto | avança para Setembro |
| depois do fechamento | cartão já pago gira para Outubro | ciclo permanece Setembro |

## Migração e backups antigos

Backups anteriores não tinham o mês de competência persistido em cada lançamento. Na primeira carga desta versão, o FinTano faz uma migração determinística usando a posição da fatura naquele momento:

- lançamento em `current` → competência do mês anterior ao vencimento atual;
- lançamento em `next` → competência do mês do vencimento atual.

A partir daí a competência fica salva e não muda quando a fatura gira.

Pagamentos novos também passam a ser guardados em um histórico de snapshots (`uf_credit_card_paid_invoices_v2`). O snapshot legado único continua sendo lido para compatibilidade, mas versões antigas que já giraram uma fatura sem guardar sua composição podem não permitir reconstruir perfeitamente um mês passado.

## Diagnóstico do backup de produção de 07/08/2026

O backup mostrava:

- ciclo ativo indevidamente em Setembro;
- fatura atual com vencimento em Setembro;
- realizados de Agosto já parcialmente cadastrados;
- Supermercado e Combustível de Agosto ainda incompletos.

O ajuste operacional correto é manter **Agosto** como ciclo enquanto Agosto estiver sendo consumido. A fatura de Setembro pode permanecer aberta normalmente.

O novo fluxo elimina o antigo botão que induzia a alinhar o ciclo ao vencimento e transforma o fechamento em uma revisão explícita, podendo incluir o pagamento da fatura formada pelo mês.