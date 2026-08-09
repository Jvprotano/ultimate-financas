from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{path}: expected exactly one match, got {count}')
    file.write_text(text.replace(old, new, 1))


replace_once(
    'src/hooks/useFinancas.ts',
    """      // Próximo mês ainda não tem realizado: use o plano recorrente, não os
      // valores efetivos do mês que está sendo encerrado.
      costsOnAccount: metrics.costsOnAccount,""",
    """      // O Liberado carrega o resultado real do ciclo encerrado para o próximo:
      // economia em custos aumenta a folga; estouro reduz o que resta para alocar.
      // `cashFlow.costsOnAccount` usa realizado e cai no plano apenas onde ainda
      // não há valor efetivo informado.
      costsOnAccount: cashFlow.costsOnAccount,""",
)

replace_once(
    'src/hooks/useFinancas.ts',
    """    forecast.events,
    metrics.costsOnAccount,
    metrics.directInvestmentTarget,""",
    """    forecast.events,
    cashFlow.costsOnAccount,
    metrics.directInvestmentTarget,""",
)

replace_once(
    'src/components/ClosingView.tsx',
    'detail="planejamento recorrente do próximo mês"',
    'detail="realizado no ciclo atual · usa o plano apenas onde falta realizado"',
)

print('realized-cost allocation fix applied')
