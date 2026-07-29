import { describe, expect, it } from 'vitest'
import {
  addMonths,
  finiteNumber,
  ledgerBalance,
  monthKey,
  monthsBetween,
  normalizeLedger,
  normalizeText,
} from './shared'

describe('addMonths', () => {
  it('anda dentro do ano', () => {
    expect(addMonths('2026-07', 3)).toBe('2026-10')
  })

  it('vira o ano para frente', () => {
    expect(addMonths('2026-11', 3)).toBe('2027-02')
  })

  it('vira o ano para trás', () => {
    expect(addMonths('2026-02', -3)).toBe('2025-11')
  })

  it('dezembro + 1 é janeiro do ano seguinte', () => {
    expect(addMonths('2026-12', 1)).toBe('2027-01')
  })

  it('zero não muda nada', () => {
    expect(addMonths('2026-07', 0)).toBe('2026-07')
  })

  it('mês malformado é devolvido intacto', () => {
    expect(addMonths('julho', 1)).toBe('julho')
  })

  it('é consistente com monthsBetween', () => {
    expect(monthsBetween('2026-07', addMonths('2026-07', 18))).toBe(18)
  })
})

describe('monthsBetween', () => {
  it('conta a distância com sinal', () => {
    expect(monthsBetween('2026-07', '2026-12')).toBe(5)
    expect(monthsBetween('2026-12', '2026-07')).toBe(-5)
    expect(monthsBetween('2026-07', '2026-07')).toBe(0)
  })

  it('atravessa anos', () => {
    expect(monthsBetween('2026-07', '2028-01')).toBe(18)
  })

  it('entrada inválida devolve zero em vez de NaN', () => {
    expect(monthsBetween('x', '2026-07')).toBe(0)
  })
})

describe('monthKey', () => {
  it('formata com dois dígitos no mês', () => {
    expect(monthKey(new Date(2026, 0, 15))).toBe('2026-01')
    expect(monthKey(new Date(2026, 11, 1))).toBe('2026-12')
  })
})

describe('finiteNumber', () => {
  it('rejeita o que não é número finito', () => {
    expect(finiteNumber(Number.NaN)).toBe(0)
    expect(finiteNumber(Infinity)).toBe(0)
    expect(finiteNumber(undefined)).toBe(0)
    expect(finiteNumber('100')).toBe(0)
  })

  it('respeita o padrão informado', () => {
    expect(finiteNumber(undefined, 6)).toBe(6)
    expect(finiteNumber(0, 6)).toBe(0)
  })
})

describe('normalizeLedger', () => {
  it('descarta movimentações de valor zero', () => {
    const ledger = normalizeLedger([
      { id: 'a', amount: 100, date: '2026-01-01T00:00:00.000Z' },
      { id: 'b', amount: 0, date: '2026-01-02T00:00:00.000Z' },
    ])
    expect(ledger).toHaveLength(1)
  })

  it('entrada que não é lista vira lista vazia', () => {
    expect(normalizeLedger(null)).toEqual([])
    expect(normalizeLedger('x')).toEqual([])
  })

  it('valor inválido zera e a movimentação é descartada', () => {
    expect(normalizeLedger([{ id: 'a', amount: Number.NaN }])).toEqual([])
  })
})

describe('ledgerBalance', () => {
  it('soma entradas e saídas', () => {
    expect(
      ledgerBalance([
        { id: 'a', amount: 1_000, date: '' },
        { id: 'b', amount: -300, date: '' },
      ]),
    ).toBe(700)
  })

  it('livro vazio tem saldo zero', () => {
    expect(ledgerBalance([])).toBe(0)
  })
})

describe('normalizeText', () => {
  it('remove acento e caixa para comparar nomes', () => {
    expect(normalizeText('Itaú')).toBe('itau')
    expect(normalizeText('  AÇÕES  ')).toBe('acoes')
  })

  it('nomes equivalentes colidem', () => {
    expect(normalizeText('São Paulo')).toBe(normalizeText('sao paulo'))
  })
})
