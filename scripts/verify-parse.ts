import fs from 'node:fs'
import path from 'node:path'
import { parseExcelFile } from '../src/renderer/src/services/excelParser'

function findSampleXlsx(repoRoot: string): string {
  const dir = path.join(repoRoot, 'samples', 'holdings')
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.xlsx') && !f.startsWith('~$'))
  if (!files.length) throw new Error(`No sample xlsx found in ${dir}`)
  return path.join(dir, files[0])
}

function main(): void {
  const repoRoot = path.resolve(__dirname, '..', '..')
  const sampleFile = findSampleXlsx(repoRoot)
  const buffer = fs.readFileSync(sampleFile)
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  ) as ArrayBuffer

  const snapshot = parseExcelFile(arrayBuffer, 'influencer-demo-baxi')
  console.log(`sample: ${path.basename(sampleFile)}`)
  console.log(`snapshot version: ${snapshot.version}`)
  console.log(`parsed holdings: ${snapshot.stocks.length}`)

  const focus = ['赣锋锂业', '阳光电源', '万华化学']
  for (const stock of focus) {
    const item = snapshot.stocks.find((s) => s.stockName === stock)
    if (!item) {
      console.log(`${stock}: NOT_FOUND`)
      continue
    }
    console.log(
      `${stock}: group=${item.group}, operation=${item.operation}, stopLoss=${item.stopLoss ?? 'NA'}`
    )
  }
}

main()

