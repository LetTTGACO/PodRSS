import type { ClassValue } from 'clsx'
import { clsx } from 'clsx'
import dayjs from 'dayjs'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const ONE_DAY = 24 * 60 * 60 * 1000

export function getPastDays(days: number) {
  return Array.from({ length: days }, (_, index) => {
    return new Date(Date.now() - index * ONE_DAY).toISOString().split('T')[0]
  })
}

export function getCurrentDate() {
  // 获取当前日期，2025年3月22日
  return dayjs().format('YYYY年M月D日')
}
