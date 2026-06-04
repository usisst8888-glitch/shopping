'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

const CURRENT_YEAR = new Date().getFullYear()
const YEAR_FROM = CURRENT_YEAR - 100
const YEAR_TO = CURRENT_YEAR

function daysInMonth(year: number, month: number) {
  if (!year || !month) return 31
  return new Date(year, month, 0).getDate()
}

function pad2(n: number) {
  return n.toString().padStart(2, '0')
}

export function BirthdatePicker({
  name = 'birthdate',
  required = false,
  defaultValue,
  onValueChange,
}: {
  name?: string
  required?: boolean
  defaultValue?: string
  onValueChange?: (value: string) => void
}) {
  const initial = useMemo(() => {
    if (!defaultValue) return { y: '', m: '', d: '' }
    const [y, m, d] = defaultValue.split('-')
    return { y: y ?? '', m: m ? String(parseInt(m)) : '', d: d ? String(parseInt(d)) : '' }
  }, [defaultValue])

  const [year, setYear] = useState(initial.y)
  const [month, setMonth] = useState(initial.m)
  const [day, setDay] = useState(initial.d)
  const onValueChangeRef = useRef(onValueChange)
  useEffect(() => {
    onValueChangeRef.current = onValueChange
  }, [onValueChange])

  const years = useMemo(() => {
    const arr: number[] = []
    for (let y = YEAR_TO; y >= YEAR_FROM; y--) arr.push(y)
    return arr
  }, [])

  const maxDay = daysInMonth(parseInt(year) || 0, parseInt(month) || 0)
  // 월 변경으로 일이 범위를 벗어나면 자동 보정
  const safeDay = day && parseInt(day) > maxDay ? String(maxDay) : day

  const value = year && month && day ? `${year}-${pad2(parseInt(month))}-${pad2(parseInt(safeDay))}` : ''

  useEffect(() => {
    onValueChangeRef.current?.(value)
  }, [value])

  return (
    <div className="grid grid-cols-3 gap-2">
      <Select
        ariaLabel="년"
        value={year}
        onChange={setYear}
        placeholder="년"
        required={required}
      >
        {years.map((y) => (
          <option key={y} value={String(y)}>{y}</option>
        ))}
      </Select>
      <Select
        ariaLabel="월"
        value={month}
        onChange={setMonth}
        placeholder="월"
        required={required}
      >
        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
          <option key={m} value={String(m)}>{m}</option>
        ))}
      </Select>
      <Select
        ariaLabel="일"
        value={safeDay}
        onChange={setDay}
        placeholder="일"
        required={required}
      >
        {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
          <option key={d} value={String(d)}>{d}</option>
        ))}
      </Select>

      {/* 서버로 전송될 hidden 값 (YYYY-MM-DD) */}
      <input type="hidden" name={name} value={value} />
    </div>
  )
}

function Select({
  value,
  onChange,
  placeholder,
  required,
  ariaLabel,
  children,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  required: boolean
  ariaLabel: string
  children: React.ReactNode
}) {
  return (
    <div className="relative">
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className={`h-10 w-full appearance-none rounded-lg border border-zinc-300 bg-white px-3 pr-8 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 ${
          value ? 'text-zinc-900' : 'text-zinc-400'
        }`}
      >
        <option value="" disabled>{placeholder}</option>
        {children}
      </select>
      <svg
        className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden
      >
        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.06l3.71-3.83a.75.75 0 1 1 1.08 1.04l-4.25 4.39a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06Z" clipRule="evenodd" />
      </svg>
    </div>
  )
}
