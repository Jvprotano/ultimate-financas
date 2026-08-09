from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected 1 match, got {count}")
    return text.replace(old, new, 1)


# 1. Allocation preview: keep the planned desires outside the card and expose
#    the margin after honoring that plan.
path = Path('src/lib/financialCycle.ts')
text = path.read_text()
text = replace_once(
    text,
    """export interface AllocationPreviewInput {\n  month: string\n  paycheck: number\n  invoice: number\n  costsOnAccount: number\n  baseInvestment: number\n  extraIncome?: number\n  extraExpense?: number\n}""",
    """export interface AllocationPreviewInput {\n  month: string\n  paycheck: number\n  invoice: number\n  costsOnAccount: number\n  baseInvestment: number\n  /** Desejos planejados fora do cartão: Viagens, Qualidade de vida etc. */\n  plannedWants: number\n  extraIncome?: number\n  extraExpense?: number\n}""",
    'allocation preview input',
)
text = replace_once(
    text,
    """  baseInvestment: number\n  extraExpense: number\n  committedBeforeAllocation: number\n  availableToAllocate: number\n  pool: number\n  shortfall: number""",
    """  baseInvestment: number\n  plannedWants: number\n  extraExpense: number\n  committedBeforeAllocation: number\n  availableToAllocate: number\n  /** Sobra (ou falta) depois de também respeitar o plano de Desejos fora do cartão. */\n  afterPlannedWants: number\n  pool: number\n  shortfall: number""",
    'allocation preview output',
)
text = replace_once(
    text,
    """  const extraIncome = Math.max(0, input.extraIncome ?? 0)\n  const extraExpense = Math.max(0, input.extraExpense ?? 0)\n  const totalIncome = input.paycheck + extraIncome\n  const committedBeforeAllocation =\n    input.invoice + input.costsOnAccount + input.baseInvestment + extraExpense\n  const availableToAllocate = totalIncome - committedBeforeAllocation""",
    """  const extraIncome = Math.max(0, input.extraIncome ?? 0)\n  const extraExpense = Math.max(0, input.extraExpense ?? 0)\n  const plannedWants = Math.max(0, input.plannedWants)\n  const totalIncome = input.paycheck + extraIncome\n  const committedBeforeAllocation =\n    input.invoice + input.costsOnAccount + input.baseInvestment + extraExpense\n  const availableToAllocate = totalIncome - committedBeforeAllocation\n  const afterPlannedWants = availableToAllocate - plannedWants""",
    'allocation preview calculation',
)
text = replace_once(
    text,
    """    costsOnAccount: input.costsOnAccount,\n    baseInvestment: input.baseInvestment,\n    extraExpense,\n    committedBeforeAllocation,\n    availableToAllocate,\n    pool: Math.max(0, availableToAllocate),""",
    """    costsOnAccount: input.costsOnAccount,\n    baseInvestment: input.baseInvestment,\n    plannedWants,\n    extraExpense,\n    committedBeforeAllocation,\n    availableToAllocate,\n    afterPlannedWants,\n    pool: Math.max(0, availableToAllocate),""",
    'allocation preview return',
)
path.write_text(text)


# 2. Feed the recurring, non-card desire plan into the next-cycle preview.
path = Path('src/hooks/useFinancas.ts')
text = path.read_text()
text = replace_once(
    text,
    """      costsOnAccount: metrics.costsOnAccount,\n      baseInvestment: metrics.directInvestmentTarget,\n      extraIncome,""",
    """      costsOnAccount: metrics.costsOnAccount,\n      baseInvestment: metrics.directInvestmentTarget,\n      // Neste contexto, Desejos fora do cartão são os envelopes que sairão da\n      // conta (Viagens, Qualidade de vida etc.). O cartão já foi abatido inteiro\n      // pela fatura acima.\n      plannedWants: metrics.wantsOnAccount,\n      extraIncome,""",
    'allocation preview wants input',
)
text = replace_once(
    text,
    """    metrics.costsOnAccount,\n    metrics.directInvestmentTarget,\n    metrics.paycheckInAccount,""",
    """    metrics.costsOnAccount,\n    metrics.directInvestmentTarget,\n    metrics.paycheckInAccount,\n    metrics.wantsOnAccount,""",
    'allocation preview dependency',
)
path.write_text(text)


# 3. Tests: make the distinction executable, including the exact +10/-100 examples.
path = Path('src/lib/financialCycle.test.ts')
text = path.read_text()
text = text.replace(
    """      costsOnAccount: 3_000,\n      baseInvestment: 1_500,""",
    """      costsOnAccount: 3_000,\n      baseInvestment: 1_500,\n      plannedWants: 1_000,""",
)
# Three existing previews share the same costs/base investment pair.
if text.count('plannedWants: 1_000,') != 3:
    raise RuntimeError(f"preview plannedWants migration: expected 3, got {text.count('plannedWants: 1_000,')}")
text = replace_once(
    text,
    """    expect(preview.availableToAllocate).toBeCloseTo(1_788.36)\n    expect(preview.pool).toBeCloseTo(1_788.36)""",
    """    expect(preview.availableToAllocate).toBeCloseTo(1_788.36)\n    expect(preview.plannedWants).toBe(1_000)\n    expect(preview.afterPlannedWants).toBeCloseTo(788.36)\n    expect(preview.pool).toBeCloseTo(1_788.36)""",
    'first preview plan comparison',
)
text = replace_once(
    text,
    """    expect(preview.availableToAllocate).toBeCloseTo(1_988.36)\n  })\n\n  it('mostra shortfall""",
    """    expect(preview.availableToAllocate).toBeCloseTo(1_988.36)\n    expect(preview.afterPlannedWants).toBeCloseTo(988.36)\n  })\n\n  it('mostra shortfall""",
    'second preview plan comparison',
)
text = replace_once(
    text,
    """    expect(preview.availableToAllocate).toBe(-500)\n    expect(preview.pool).toBe(0)\n    expect(preview.shortfall).toBe(500)\n  })\n})""",
    """    expect(preview.availableToAllocate).toBe(-500)\n    expect(preview.afterPlannedWants).toBe(-1_500)\n    expect(preview.pool).toBe(0)\n    expect(preview.shortfall).toBe(500)\n  })\n\n  it('mostra a margem contra o plano de desejos fora do cartão', () => {\n    const abovePlan = calculateAllocationPreview({\n      month: '2026-09',\n      paycheck: 5_010,\n      invoice: 2_000,\n      costsOnAccount: 1_000,\n      baseInvestment: 1_000,\n      plannedWants: 1_000,\n    })\n    expect(abovePlan.availableToAllocate).toBe(1_010)\n    expect(abovePlan.afterPlannedWants).toBe(10)\n\n    const belowPlan = calculateAllocationPreview({\n      month: '2026-09',\n      paycheck: 4_900,\n      invoice: 2_000,\n      costsOnAccount: 1_000,\n      baseInvestment: 1_000,\n      plannedWants: 1_000,\n    })\n    expect(belowPlan.availableToAllocate).toBe(900)\n    expect(belowPlan.afterPlannedWants).toBe(-100)\n  })\n})""",
    'explicit wants plan examples',
)
path.write_text(text)


# 4. UI: keep the compact V2 layout and add only inline comparison context.
path = Path('src/components/ClosingView.tsx')
text = path.read_text()
text = replace_once(
    text,
    """import { cycleSalaryMonth } from '../lib/activeCycle'\n\nexport function ClosingView""",
    """import { cycleSalaryMonth } from '../lib/activeCycle'\n\nfunction formatPlanComparison(planned: number, actual: number) {\n  const delta = actual - planned\n  if (Math.abs(delta) <= 0.005) return `planejado ${formatCurrency(planned)} · no planejado`\n  return `planejado ${formatCurrency(planned)} · ${formatCurrency(Math.abs(delta))} ${delta > 0 ? 'acima' : 'abaixo'}`\n}\n\nexport function ClosingView""",
    'plan comparison formatter',
)
text = replace_once(
    text,
    """  const allocationReliable = invoiceKnown\n  const allocationTone = nextCycleAllocation.shortfall > 0.005 ? 'negative' : 'accent'\n\n  return (""",
    """  const allocationReliable = invoiceKnown\n  const allocationTone = nextCycleAllocation.shortfall > 0.005 ? 'negative' : 'accent'\n  const allocationPlanDelta = nextCycleAllocation.afterPlannedWants\n  const costsPlanDelta = actuals.summary.effectiveCosts - actuals.summary.plannedCosts\n  const invoicePlanDelta = closingInvoiceDue - metrics.plannedOnCard\n  const investmentPlanDelta = investmentActuals.total - metrics.totalPlannedInvestment\n\n  return (""",
    'comparison deltas',
)
text = replace_once(
    text,
    """            <p className=\"mt-2 max-w-2xl text-xs leading-relaxed text-dark-text-muted\">\n              Depois de separar a fatura de {formatMonthLong(nextCycleAllocation.month)}, os custos\n              em conta e o aporte-base. Este é o valor que você pode distribuir entre Desejos e\n              aporte complementar no próximo mês.\n            </p>\n          </div>""",
    """            <p className=\"mt-2 max-w-2xl text-xs leading-relaxed text-dark-text-muted\">\n              Depois de separar a fatura de {formatMonthLong(nextCycleAllocation.month)}, os custos\n              em conta e o aporte-base. Este é o valor que você pode distribuir entre Desejos e\n              aporte complementar no próximo mês.\n            </p>\n            {allocationReliable && (\n              <div className=\"mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs\">\n                <span className=\"text-dark-text-muted\">\n                  Desejos planejados fora do cartão{' '}\n                  <strong className=\"font-semibold tabular-nums text-dark-text\">\n                    {formatCurrency(nextCycleAllocation.plannedWants)}\n                  </strong>\n                </span>\n                <span\n                  className={\n                    Math.abs(allocationPlanDelta) <= 0.005\n                      ? 'font-medium text-dark-text-secondary'\n                      : allocationPlanDelta > 0\n                        ? 'font-medium text-primary-300'\n                        : 'font-medium text-rose-300'\n                  }\n                >\n                  {Math.abs(allocationPlanDelta) <= 0.005\n                    ? 'exatamente no planejado'\n                    : allocationPlanDelta > 0\n                      ? `${formatCurrency(allocationPlanDelta)} além do planejado`\n                      : `${formatCurrency(Math.abs(allocationPlanDelta))} abaixo do planejado`}\n                </span>\n              </div>\n            )}\n          </div>""",
    'allocation planned wants comparison',
)
text = replace_once(
    text,
    """          <StatTile\n            label=\"Custos do mês\"\n            value={formatCurrency(actuals.summary.effectiveCosts)}\n            detail={\n              missingActualRows.length > 0\n                ? `${missingActualRows.length} sem realizado · usarão o plano`\n                : 'todos os realizados conferidos'\n            }\n          />""",
    """          <StatTile\n            label=\"Custos do mês\"\n            value={formatCurrency(actuals.summary.effectiveCosts)}\n            detail={`${formatPlanComparison(actuals.summary.plannedCosts, actuals.summary.effectiveCosts)}${\n              missingActualRows.length > 0\n                ? ` · ${missingActualRows.length} sem realizado`\n                : ''\n            }`}\n            tone={\n              costsPlanDelta > 0.005 ? 'negative' : costsPlanDelta < -0.005 ? 'positive' : 'neutral'\n            }\n          />""",
    'cost plan comparison tile',
)
text = replace_once(
    text,
    """          <StatTile\n            label=\"Minha parte da fatura\"\n            value={invoiceKnown ? formatCurrency(closingInvoiceDue) : '—'}\n            detail={\n              invoiceKnown\n                ? `pagar em ${formatMonthLong(cardCycleAccounting.invoiceFormedByCycle.dueMonth)}`\n                : 'confira Cartões antes de fechar'\n            }\n            tone=\"accent\"\n          />""",
    """          <StatTile\n            label=\"Minha parte da fatura\"\n            value={invoiceKnown ? formatCurrency(closingInvoiceDue) : '—'}\n            detail={\n              invoiceKnown\n                ? `${formatPlanComparison(metrics.plannedOnCard, closingInvoiceDue)} · pagar em ${formatMonthLong(cardCycleAccounting.invoiceFormedByCycle.dueMonth)}`\n                : 'confira Cartões antes de fechar'\n            }\n            tone={\n              !invoiceKnown\n                ? 'neutral'\n                : invoicePlanDelta > 0.005\n                  ? 'negative'\n                  : invoicePlanDelta < -0.005\n                    ? 'positive'\n                    : 'neutral'\n            }\n          />""",
    'invoice plan comparison tile',
)
text = replace_once(
    text,
    """          <StatTile\n            label=\"Investido no ciclo\"\n            value={formatCurrency(investmentActuals.total)}\n            detail={`${investmentActuals.savingsRate.toFixed(1)}% da base`}\n            tone=\"positive\"\n          />""",
    """          <StatTile\n            label=\"Investido no ciclo\"\n            value={formatCurrency(investmentActuals.total)}\n            detail={`${formatPlanComparison(metrics.totalPlannedInvestment, investmentActuals.total)} · ${investmentActuals.savingsRate.toFixed(1)}% da base`}\n            tone={\n              investmentPlanDelta < -0.005\n                ? 'negative'\n                : investmentPlanDelta > 0.005\n                  ? 'positive'\n                  : 'neutral'\n            }\n          />""",
    'investment plan comparison tile',
)
path.write_text(text)


# 5. Document the compact comparison semantics.
path = Path('docs/ciclo-financeiro.md')
text = path.read_text()
addition = """

## Comparação com o planejamento na aba Ciclo

A aba Ciclo continua operacional e enxuta, mas mostra duas comparações que ajudam a decidir o próximo mês:

- **Liberado para alocar**: além do saldo disponível do próximo mês, mostra o total planejado de Desejos **fora do cartão** (por exemplo, Viagens e Qualidade de vida) e a margem contra esse plano. Se havia R$ 1.000 planejados e o saldo disponível é R$ 1.010, há R$ 10 além do plano; se o saldo é R$ 900, faltam R$ 100 para manter o plano original.
- **Fechamento**: Custos, Fatura pessoal e Investimentos mostram o realizado lado a lado com o planejado e a diferença. Para custos e fatura, ficar acima do plano é sinal de excesso; para investimentos, ficar acima do plano é positivo.

O cartão não entra novamente no valor planejado de Desejos do bloco Liberado: ele já foi abatido integralmente pela fatura do próximo caixa. Assim, a comparação responde quanto sobra para os envelopes que ainda serão alocados e para eventual aporte complementar.
"""
if '## Comparação com o planejamento na aba Ciclo' not in text:
    text = text.rstrip() + addition + '\n'
path.write_text(text)

print('cycle plan comparison patch applied')
