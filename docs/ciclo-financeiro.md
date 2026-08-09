# Ciclo financeiro: regra operacional

O FinTano usa um ciclo mensal orientado ao fechamento real do usuário. Para o cartão, a fronteira do ciclo é a **fatura que está sendo encerrada**, não a data original de cada compra.

## Regra curta

> **Ciclo Agosto = mês que está sendo encerrado em Agosto + fatura usada para encerrar Agosto.**
>
> Se essa fatura vence em Setembro, isso é normal. O vencimento e o nome do ciclo não precisam ser iguais.

Para a rotina atual:

- salário recebido no fim de Julho financia Agosto;
- durante Agosto, custos e consumos são atualizados normalmente;
- a fatura aberta com vencimento em Setembro é a fatura usada para encerrar Agosto;
- no fim de Agosto ou começo de Setembro, o usuário revisa Agosto e normalmente escolhe **Fechar ciclo + pagar fatura**;
- depois disso, o ciclo passa para Setembro e o cartão gira para a fatura seguinte.

## O cartão pertence ao ciclo pela fatura/bucket

A data exibida em um lançamento é informação da transação. Ela não redefine a qual ciclo aquele lançamento pertence depois que ele está dentro de uma fatura.

Exemplo:

- ciclo ativo: **Agosto/2026**;
- fatura atual: **vence em Setembro/2026**;
- uma compra avulsa dentro dessa fatura pode mostrar `20/07` ou `31/07` porque foi feita depois do fechamento bancário anterior;
- ela continua no bucket da fatura que encerra Agosto;
- portanto, não se divide essa fatura novamente em “competência Julho” e “competência Agosto” usando `purchaseDate`.

Essa regra também evita tratar datas originais de compras parceladas como se fossem a competência da parcela atual.

## Quais valores do cartão importam

A tela distingue três números:

1. **Total da fatura** — tudo que ainda será pago ao banco, incluindo valores de terceiros.
2. **Minha parte da fatura** — o que efetivamente é despesa do usuário naquela fatura.
3. **Antecipado** — valores já pagos antes e, portanto, fora do total ainda devido.

No backup real analisado em Agosto/2026:

- total da fatura a pagar: **R$ 4.456,02**;
- minha parte da fatura: **R$ 2.511,64**;
- parte de terceiros: **R$ 1.944,38**;
- valores pessoais já antecipados: **R$ 178,72**;
- soma dos lançamentos pessoais listados, incluindo antecipados: **R$ 2.690,36**.

Para o fechamento de Agosto, o Histórico deve gravar:

> **Fatura do ciclo (minha parte): R$ 2.511,64**

Os R$ 178,72 antecipados permanecem visíveis como informação, mas não são somados de novo porque já foram retirados do valor efetivamente devido.

## “Pagar em Setembro” com Ciclo Agosto está correto

Sim. O cartão tem seu calendário de vencimento, enquanto o ciclo representa o mês que está sendo encerrado.

Portanto, este estado é normal:

| Conceito | Valor |
| --- | --- |
| Ciclo ativo | Agosto/2026 |
| Fatura atual | Pagar em Setembro/2026 |
| Total da fatura | R$ 4.456,02 |
| Minha parte | R$ 2.511,64 |
| Ação de fechamento | Fechar Agosto e, opcionalmente, pagar a fatura de Setembro |

Não deve existir alerta de “vencimento desalinhado” apenas porque o vencimento é Setembro.

## Fechamento do ciclo

Antes de fechar:

1. aguarde o banco fechar a fatura;
2. confira ou importe os lançamentos;
3. atualize supermercado/vale, combustível e demais custos variáveis;
4. confira os investimentos realizados;
5. abra **Revisar fechamento**.

A revisão mostra:

- custos do ciclo;
- valores de custos ainda não preenchidos e o valor planejado que será usado;
- **minha parte da fatura**;
- **total da fatura**;
- valores já antecipados;
- investimentos realizados.

No final existem duas ações:

- **Fechar apenas o ciclo** — grava o Histórico e avança o ciclo sem girar o cartão;
- **Fechar ciclo + pagar fatura** — grava o mesmo Histórico, marca a fatura como paga, gira o cartão e avança o ciclo.

Para a rotina atual, **Fechar ciclo + pagar fatura** é o fluxo normal.

## A ordem não pode alterar o Histórico

Estes dois fluxos devem produzir o mesmo registro de Agosto:

### Fluxo A

1. Revisar Agosto.
2. Fechar ciclo + pagar fatura.

### Fluxo B

1. Pagar a fatura pela aba Cartões.
2. Depois revisar e fechar Agosto.

O pagamento salva um snapshot da fatura antes de girar `current → next`, contendo o total e a parte pessoal. Assim, mesmo se o cartão já estiver em Outubro quando Agosto for fechado, o FinTano recupera a fatura de Setembro usada naquele fechamento.

## Custos fora do cartão

### Contas com vencimento

Para débito, PIX ou boleto, a referência operacional continua sendo o mês do vencimento/pagamento esperado.

Exemplos:

- energia vencendo em Agosto → Ciclo Agosto;
- internet vencendo em Agosto → Ciclo Agosto;
- água vencendo em Setembro → Ciclo Setembro.

### Verbas mensais sem vencimento

Supermercado/vale, combustível, lazer e outras verbas de consumo pertencem ao mês em que são usadas.

Antes de fechar um ciclo, elas devem ser atualizadas. Se um custo ainda não tiver realizado informado, a revisão mostra explicitamente que o valor planejado será usado e persistido no fechamento.

## Migração de backups antigos

Versões anteriores adicionaram `spendingMonth` aos lançamentos e, em um momento, tentaram inferi-lo pela data da compra. Essa inferência não corresponde à rotina atual.

A migração agora normaliza o bucket:

- lançamento em `current` → ciclo imediatamente anterior ao mês de vencimento atual;
- lançamento em `next` → ciclo correspondente ao mês do vencimento atual.

Exemplo com `currentDueMonth = 2026-09`:

- todos os itens em `current` → bucket do **Ciclo Agosto**;
- todos os itens em `next` → bucket do **Ciclo Setembro**.

Isso repara inclusive backups que já receberam a migração anterior baseada em `purchaseDate`.

Pagamentos novos são preservados em `uf_credit_card_paid_invoices_v2`, com:

- mês de vencimento;
- total cheio da fatura;
- parte pessoal;
- composição do bucket para manter áreas do orçamento e antecipações estáveis após o giro.

## Diagnóstico do backup de 07/08/2026

O backup mostra:

- ciclo salvo em Setembro, embora o mês ainda sendo vivido fosse Agosto;
- fatura atual com `currentDueMonth = 2026-09`;
- total ainda devido de R$ 4.456,02;
- parte pessoal ainda devida de R$ 2.511,64;
- R$ 178,72 pessoais já antecipados;
- custos de Agosto parcialmente preenchidos.

Ao importar esse backup para testar:

1. corrija apenas o ciclo ativo para **Agosto**;
2. mantenha a fatura em **Pagar em Setembro**;
3. revise o fechamento;
4. espere ver **Minha parte da fatura = R$ 2.511,64** e **Total da fatura = R$ 4.456,02**;
5. ao fechar, o Histórico de Agosto deve registrar **Fatura = R$ 2.511,64**;
6. ao escolher fechar + pagar, o ciclo passa a Setembro e a fatura gira normalmente.


## Liberado para alocar

A aba Ciclo não usa mais o caixa do mês que está sendo fechado como “Liberado”. O número é uma **prévia do próximo ciclo**.

Ao fechar Agosto, por exemplo, o FinTano calcula o que poderá ser distribuído em Setembro:

`entradas de Setembro − fatura de Setembro − custos em conta de Setembro − aporte-base − saídas extraordinárias de Setembro`

O resultado fica disponível para **Desejos** (por exemplo, Comer fora e Viagens) e **aporte complementar**.

Regras importantes:

- a fatura abatida é `invoiceFormedByCycle`, isto é, a fatura que o ciclo atual acabou de formar;
- no backup de Agosto/2026, a prévia de Setembro deve abater **R$ 2.511,64**, e não procurar a fatura antiga que venceu em Agosto;
- se a fatura de Setembro for paga antes de Agosto ser fechado, o snapshot preserva os mesmos R$ 2.511,64 e o Liberado **não muda só por causa do pagamento**;
- custos do próximo mês vêm do planejamento recorrente, não dos realizados do mês que acabou;
- Desejos não são abatidos antes do cálculo, porque o objetivo desse número é justamente dizer quanto ainda pode ser alocado entre Desejos e aporte extra;
- se o valor da fatura que financiará o próximo ciclo não for confiável, a UI mostra `—` em vez de exibir um Liberado enganoso.

## Estrutura da aba Ciclo

A aba deve permanecer operacional e curta. A ordem é:

1. identificação do ciclo ativo;
2. **Liberado para alocar no próximo mês**, com a decomposição mínima do cálculo;
3. **Realizado do mês**, para corrigir débito/boleto e verbas variáveis;
4. **Fechamento**, com custos, minha parte da fatura e investimento realizado;
5. revisão final apenas quando o usuário escolher fechar.

Guias extensos, alertas duplicados, fluxo em cinco passos, painel completo de caixa e comparação detalhada Plano × Realizado não ficam mais na tela principal de Ciclo.

## Comparação com o planejamento na aba Ciclo

A aba Ciclo continua operacional e enxuta, mas mostra duas comparações que ajudam a decidir o próximo mês:

- **Liberado para alocar**: além do saldo disponível do próximo mês, mostra o total planejado de Desejos **fora do cartão** (por exemplo, Viagens e Qualidade de vida) e a margem contra esse plano. Se havia R$ 1.000 planejados e o saldo disponível é R$ 1.010, há R$ 10 além do plano; se o saldo é R$ 900, faltam R$ 100 para manter o plano original.
- **Fechamento**: Custos, Fatura pessoal e Investimentos mostram o realizado lado a lado com o planejado e a diferença. Para custos e fatura, ficar acima do plano é sinal de excesso; para investimentos, ficar acima do plano é positivo.

O cartão não entra novamente no valor planejado de Desejos do bloco Liberado: ele já foi abatido integralmente pela fatura do próximo caixa. Assim, a comparação responde quanto sobra para os envelopes que ainda serão alocados e para eventual aporte complementar.

