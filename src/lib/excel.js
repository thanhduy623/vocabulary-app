// Browser utility for reading an uploaded Excel file into raw rows.
//
// SheetJS is deliberately isolated in this module so services and UI never
// touch workbook internals. The parser returns a plain array-of-arrays where
// row 0 is the first sheet row (array index = column index).

import * as XLSX from 'xlsx'

/**
 * Read the first sheet of an Excel file (xlsx/xls) as raw rows.
 * @param {File} file
 * @returns {Promise<Array[]>} array of cell arrays; row 0 is the first row
 * @throws {Error} when the file cannot be read or has no sheets
 */
export async function readWorkbookRows(file) {
  const buffer = await readFileAsArrayBuffer(file)
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: false })
  const sheetName = workbook.SheetNames?.[0]
  if (!sheetName) {
    throw new Error('File Excel không có sheet dữ liệu nào.')
  }
  const sheet = workbook.Sheets[sheetName]
  // header:1 → array-of-arrays; defval:'' → empty strings instead of undefined;
  // raw:true → keep original cell values (no Excel-style text rendering).
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true })
}

/**
 * Read a File object as an ArrayBuffer via FileReader.
 * @param {File} file
 * @returns {Promise<ArrayBuffer>}
 */
function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Không thể đọc file.'))
    reader.readAsArrayBuffer(file)
  })
}