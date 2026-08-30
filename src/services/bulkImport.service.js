// Bulk import domain logic (Excel file → validated word drafts).
//
// Layering per project rule: UI → Store → Service → Repository(Firebase).
// This module is framework-free: it decides whether an uploaded workbook
// matches the product template and builds the word drafts that the UI then
// persists through wordsStore. Browser file I/O (FileReader + SheetJS) lives
// in @/lib/excel so the pure validation here can be unit-tested in Node.

import { WORD_RULES, validateWord } from '@/lib/validators'
import { uuid } from '@/lib/uuid'

/** Exact header of the template (row 1) in public/template-create-multi-word.xlsx. */
export const TEMPLATE_COLUMNS = [
  'word',
  'transcription',
  'meaning',
  'example',
  'type',
  'topic',
  'level',
]

/** File served from /public — used by the download-template control. */
export const TEMPLATE_FILE_NAME = 'template-create-multi-word.xlsx'

/** Per-row status lifecycle (Not Created → Creating → Created | Failed). */
export const STATUS = {
  PENDING: 'pending',
  CREATING: 'creating',
  CREATED: 'created',
  FAILED: 'failed',
}

/** Vietnamese labels shown in the Status column. */
export const STATUS_LABELS = {
  [STATUS.PENDING]: 'Chưa tạo',
  [STATUS.CREATING]: 'Đang tạo',
  [STATUS.CREATED]: 'Đã tạo',
  [STATUS.FAILED]: 'Thất bại',
}

/** Bootstrap badge classes per status. */
export const STATUS_BADGE_CLASSES = {
  [STATUS.PENDING]: 'text-bg-secondary',
  [STATUS.CREATING]: 'text-bg-info',
  [STATUS.CREATED]: 'text-bg-success',
  [STATUS.FAILED]: 'text-bg-danger',
}

/** Row 1 of the template is the title/header row; word data starts on row 2. */
export const HEADER_ROW = 1
export const FIRST_DATA_ROW = 2

/** Human-readable field labels used in validation messages. */
const FIELD_LABELS = {
  word: 'Từ vựng',
  transcription: 'Phiên âm',
  meaning: 'Nghĩa',
  example: 'Ví dụ',
  type: 'Loại từ',
  topic: 'Chủ đề',
  level: 'Cấp độ',
}

/**
 * Normalize one raw cell (numbers/dates/null → trimmed string).
 * @param {*} value
 * @returns {string}
 */
export function normalizeCell(value) {
  return String(value ?? '').trim()
}

/**
 * Map a raw row array (7 cells) to a word draft in template column order.
 * @param {Array} [row]
 * @returns {{word:string, transcription:string, meaning:string, example:string, type:string, topic:string, level:string}}
 */
export function rowToValues(row = []) {
  return {
    word: normalizeCell(row[0]),
    transcription: normalizeCell(row[1]),
    meaning: normalizeCell(row[2]),
    example: normalizeCell(row[3]),
    type: normalizeCell(row[4]),
    topic: normalizeCell(row[5]),
    level: normalizeCell(row[6]),
  }
}

/**
 * Per-row validation messages using the same limits as the manual form.
 * collectionId is mocked because it comes from the modal dropdown, not the file.
 * @param {Object} values
 * @returns {string[]}
 */
function buildRowMessages(values) {
  const errors = validateWord({ ...values, collectionId: 'PLACEHOLDER' })
  return Object.keys(errors)
    .filter((field) => field !== 'collectionId')
    .map((field) => {
      const label = FIELD_LABELS[field] || field
      const max = WORD_RULES.maxLengths[field]
      if (typeof max === 'number' && values[field].length > max) {
        return `${label} vượt quá ${max} ký tự`
      }
      return `Cần nhập ${label}`
    })
}

/**
 * Validate uploaded rows against the product template.
 *
 * Flow (requirement): number of data fields + column order → required fields
 * → return errors when validation fails, drafts when it succeeds.
 *
 * @param {Array[]} rawRows  array of cell arrays; index 0 is the header row
 * @returns {{ok: true, items: Object[]}
 *          | {ok: false, errors: {detail?: string, rows?: Array<{row:number, messages:string[]}>}}}
 */
export function validateRows(rawRows) {
  if (!Array.isArray(rawRows) || rawRows.length === 0) {
    return { ok: false, errors: { detail: 'File Excel trống hoặc không đọc được dữ liệu.' } }
  }

  // 1) Template shape: exactly 7 columns, exact names, exact order.
  const header = (rawRows[0] || []).map(normalizeCell)
  const headerMatches =
    header.length === TEMPLATE_COLUMNS.length &&
    TEMPLATE_COLUMNS.every((column, index) => header[index] === column)

  if (!headerMatches) {
    return {
      ok: false,
      errors: {
        detail: `File không đúng với file mẫu. Hàng ${HEADER_ROW} phải có đúng ${TEMPLATE_COLUMNS.length} cột theo thứ tự: ${TEMPLATE_COLUMNS.join(', ')}.`,
      },
    }
  }

  // 2) Data rows (row 2+): column count, required fields, lengths.
  const rowErrors = []
  const items = []

  for (let i = 1; i < rawRows.length; i += 1) {
    const raw = rawRows[i] || []
    const rowNumber = i + 1

    // Fully blank rows are skipped (common trailing blank lines).
    if (raw.every((cell) => normalizeCell(cell) === '')) continue

    if (raw.length > TEMPLATE_COLUMNS.length) {
      rowErrors.push({
        row: rowNumber,
        messages: [
          `Hàng có ${raw.length} cột, vượt quá ${TEMPLATE_COLUMNS.length} cột của mẫu.`,
        ],
      })
      continue
    }

    const values = rowToValues(raw)
    const messages = buildRowMessages(values)
    if (messages.length > 0) {
      rowErrors.push({ row: rowNumber, messages })
      continue
    }

    items.push({
      key: uuid(),
      row: rowNumber,
      values,
      status: STATUS.PENDING,
      error: '',
    })
  }

  if (rowErrors.length > 0) {
    return { ok: false, errors: { rows: rowErrors } }
  }

  if (items.length === 0) {
    return {
      ok: false,
      errors: {
        detail: `File không chứa dữ liệu từ vựng (dữ liệu bắt đầu từ hàng ${FIRST_DATA_ROW}).`,
      },
    }
  }

  return { ok: true, items }
}