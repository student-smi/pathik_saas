export function parseHouseNumber(houseNo: string): { num: number; sub: number; original: string } {
  const str = String(houseNo || '').trim()
  if (!str) return { num: 999999, sub: 0, original: str }

  // Check if house number is a slash pattern like "67/1", "68/2", "69/3"
  const slashMatch = str.match(/^(\d+)\/(\d+)$/)
  if (slashMatch) {
    const num = parseInt(slashMatch[1], 10)
    const sub = parseInt(slashMatch[2], 10)
    // Offset by +10000 to ensure slash houses appear after pure numeric houses (9 to 94)
    return { num: num + 10000, sub, original: str }
  }

  // Pure numeric house number like "9", "10", "94"
  const num = parseInt(str, 10)
  if (!isNaN(num)) {
    return { num, sub: 0, original: str }
  }

  return { num: 999999, sub: 0, original: str }
}

export function compareHouseNos(noA: string, noB: string): number {
  const parsedA = parseHouseNumber(noA)
  const parsedB = parseHouseNumber(noB)

  if (parsedA.num !== parsedB.num) {
    return parsedA.num - parsedB.num
  }
  if (parsedA.sub !== parsedB.sub) {
    return parsedA.sub - parsedB.sub
  }
  return parsedA.original.localeCompare(parsedB.original)
}
