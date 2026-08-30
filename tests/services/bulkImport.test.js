// Unit tests for the bulk-import validation (src/services/bulkImport.service.js).
// Node-only: validateRows is pure and framework-free (file I/O lives in @/lib/excel).

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import * as XLSX from 'xlsx'
import {
  TEMPLATE_COLUMNS,
  STATUS,
  validateRows,
} from '@/services/bulkImport.service'

/** A valid template header row (exactly the 7 template columns). */
function validHeader() {
  return [...TEMPLATE_COLUMNS]
}

/** Build a row with word/meaning filled; remaining cells optional. */
function dataRow(overrides = {}) {
  const { word = 'cat', transcription = '', meaning = 'con mèo', example = '', type = '', topic = '', level = '' } = overrides
  return [word, transcription, meaning, example, type, topic, level]
}

describe('validateRows — template shape', () => {
  it('accepts a file that matches the template', () => {
    const res = validateRows([
      validHeader(),
      ['abandon', '/əˈbændən/', 'bỏ rơi', 'He abandoned his car.', 'verb', 'Daily', 'B1'],
      ['beauty', '/ˈbjuːti/', 'vẻ đẹp', '', 'noun', 'Daily', 'A1'],
    ])

    expect(res.ok).toBe(true)
    expect(res.items).toHaveLength(2)
    expect(res.items[0]).toMatchObject({
      row: 2,
      values: {
        word: 'abandon',
        transcription: '/əˈbændən/',
        meaning: 'bỏ rơi',
        example: 'He abandoned his car.',
        type: 'verb',
        topic: 'Daily',
        level: 'B1',
      },
      status: STATUS.PENDING,
    })
    // every draft has a unique key for stable v-for identity
    expect(res.items[0].key).toBeTruthy()
    expect(res.items[1].key).not.toBe(res.items[0].key)
  })

  it('rejects an empty file', () => {
    expect(validateRows([]).ok).toBe(false)
    expect(validateRows(null).ok).toBe(false)
  })

  it('rejects wrong column names in the header', () => {
    const res = validateRows([
      ['word', 'meaning', 'transcription', 'example', 'type', 'topic', 'level'],
    ])
    expect(res.ok).toBe(false)
    expect(res.errors.detail).toMatch(/đúng 7 cột/)
  })

  it('rejects a header with the wrong number of columns', () => {
    const res = validateRows([['word', 'transcription', 'meaning']])
    expect(res.ok).toBe(false)
    expect(res.errors.detail).toMatch(/đúng 7 cột/)
  })

  it('rejects a file with a valid header but no data rows', () => {
    const res = validateRows([validHeader()])
    expect(res.ok).toBe(false)
    expect(res.errors.detail).toMatch(/không chứa dữ liệu từ vựng/)
  })
})

describe('validateRows — template file consistency', () => {
  it('header of public/template-create-multi-word.xlsx matches TEMPLATE_COLUMNS', () => {
    const templateUrl = new URL('../../public/template-create-multi-word.xlsx', import.meta.url)
    const workbook = XLSX.read(readFileSync(templateUrl), { type: 'buffer' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true })

    expect(rows[0].map(String)).toEqual(TEMPLATE_COLUMNS)
  })
})

describe('validateRows — end-to-end with a SheetJS-parsed workbook', () => {
  it('validates rows produced from a real xlsx buffer (browser data path)', () => {
    const aoa = [
      TEMPLATE_COLUMNS,
      ['abandon', '/əˈbændən/', 'bỏ rơi', 'He abandoned his car.', 'verb', 'Daily', 'B1'],
      ['', '/x/', '', '', '', '', ''], // invalid: missing word + meaning
      ['beauty', '/ˈbjuːti/', 'vẻ đẹp', '', 'noun', 'Daily', 'A1'],
    ]
    const ws = XLSX.utils.aoa_to_sheet(aoa)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'words')
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    const parsed = XLSX.read(buffer, { type: 'buffer' })
    const sheet = parsed.Sheets[parsed.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true })

    const res = validateRows(rows)
    expect(res.ok).toBe(false)
    expect(res.errors.rows[0].row).toBe(3) // sheet row 3
    expect(res.errors.rows[0].messages.join(' | ')).toContain('Từ vựng')
  })
})

describe('validateRows — data row checks', () => {
  it('reports required-field errors per row with their row number', () => {
    const res = validateRows([
      validHeader(),
      ['', '/x/', '', '', '', '', ''], // row 2: missing word + meaning
      dataRow(), // row 3: valid
    ])

    expect(res.ok).toBe(false)
    expect(res.errors.rows).toHaveLength(1)
    expect(res.errors.rows[0].row).toBe(2)
    expect(res.errors.rows[0].messages.join(' | ')).toContain('Từ vựng')
    expect(res.errors.rows[0].messages.join(' | ')).toContain('Nghĩa')
  })

  it('flags rows wider than the 7 template columns', () => {
    const res = validateRows([
      validHeader(),
      ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'EXTRA_COLUMN'],
    ])
    expect(res.ok).toBe(false)
    expect(res.errors.rows[0].row).toBe(2)
    expect(res.errors.rows[0].messages[0]).toMatch(/vượt quá 7 cột/)
  })

  it('rejects a word/meaning that exceeds the max length', () => {
    const res = validateRows([
      validHeader(),
      dataRow({ word: 'x'.repeat(201), meaning: 'y'.repeat(1001) }),
    ])
    expect(res.ok).toBe(false)
    expect(res.errors.rows[0].messages.join(' | ')).toContain('200 ký tự')
    expect(res.errors.rows[0].messages.join(' | ')).toContain('1000 ký tự')
  })

  it('skips fully blank rows (trailing empty lines)', () => {
    const res = validateRows([
      validHeader(),
      dataRow({ word: 'dog', meaning: 'con chó' }),
      ['', '', '', '', '', '', ''],
    ])
    expect(res.ok).toBe(true)
    expect(res.items).toHaveLength(1)
    expect(res.items[0].row).toBe(2)
  })

  it('trims cell values and stringifies numeric cells', () => {
    const res = validateRows([
      validHeader(),
      ['  cat  ', 0, '  con mèo  '],
    ])
    expect(res.items[0].values.word).toBe('cat')
    expect(res.items[0].values.transcription).toBe('0')
    expect(res.items[0].values.meaning).toBe('con mèo')
  })

  it('does not require transcription/example/type/topic/level', () => {
    const res = validateRows([
      validHeader(),
      dataRow({ word: 'dog', meaning: 'con chó' }),
    ])
    expect(res.ok).toBe(true)
    expect(res.items[0].values.level).toBe('')
  })
})