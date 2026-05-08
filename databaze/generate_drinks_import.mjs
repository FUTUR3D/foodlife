import fs from 'node:fs'
import path from 'node:path'

const inputPath = path.join('databaze', 'podklady', 'all_drinks_nutrition_database_cz.csv')
const outputPath = path.join('databaze', '2026_05_07_drinks_import.sql')
const externalSource = 'all_drinks_nutrition_database_cz'

function parseCsv(text) {
  const rows = []
  let row = []
  let value = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    const next = text[i + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        value += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      row.push(value)
      value = ''
      continue
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i += 1
      row.push(value)
      if (row.some((item) => item.trim() !== '')) rows.push(row)
      row = []
      value = ''
      continue
    }

    value += char
  }

  if (value || row.length) {
    row.push(value)
    if (row.some((item) => item.trim() !== '')) rows.push(row)
  }

  return rows
}

function sql(value) {
  if (value === null || value === undefined || value === '') return 'NULL'
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL'
  return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "''")}'`
}

function number(value) {
  const parsed = Number(String(value ?? '').replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

function round(value, places = 2) {
  if (value === null || value === undefined) return null
  const factor = 10 ** places
  return Math.round(value * factor) / factor
}

const csv = fs.readFileSync(inputPath, 'utf8').replace(/^\uFEFF/, '')
const [header, ...records] = parseCsv(csv)
const rows = records.map((record, index) => Object.fromEntries(header.map((key, columnIndex) => [key, record[columnIndex] ?? '']))).map((row, index) => {
  const kcal = number(row.kcal_100ml)
  const sugar = number(row.sugar_g_100ml)
  const fat = number(row.fat_g_100ml)
  const protein = number(row.protein_g_100ml)
  const salt = number(row.salt_g_100ml)
  const caffeine = number(row.caffeine_mg_100ml)
  const alcohol = number(row.alcohol_percent)
  const notes = []

  if (caffeine && caffeine > 0) notes.push(`Kofein: ${caffeine} mg / 100 ml`)
  if (alcohol && alcohol > 0) notes.push(`Alkohol: ${alcohol} % obj.`)

  return [
    'system',
    externalSource,
    `DRINK_CZ_${String(index + 1).padStart(4, '0')}`,
    row.name_cz || row.name,
    row.name || null,
    row.category_cz ? `Nápoj - ${row.category_cz}` : 'Nápoj',
    'ml',
    null,
    round(kcal === null ? null : kcal * 4.184),
    kcal,
    protein,
    sugar,
    sugar,
    fat,
    sugar,
    round(salt === null ? null : salt * 393.7),
    salt,
    notes.length ? notes.join('; ') : null,
  ]
})

const columns = [
  'source',
  'external_source',
  'external_code',
  'name_cs',
  'name_en',
  'category',
  'default_unit',
  'serving_grams',
  'energy_kj_100g',
  'kcal_100g',
  'protein_100g',
  'total_carbs_100g',
  'carbs_100g',
  'fat_100g',
  'sugar_100g',
  'sodium_mg_100g',
  'salt_100g',
  'note',
]

const chunks = []
const chunkSize = 80
for (let i = 0; i < rows.length; i += chunkSize) {
  const chunk = rows.slice(i, i + chunkSize)
  chunks.push(`INSERT INTO \`foods\` (${columns.map((column) => `\`${column}\``).join(', ')}) VALUES\n${chunk.map((row) => `(${row.map(sql).join(', ')})`).join(',\n')}\nON DUPLICATE KEY UPDATE\n  \`name_cs\` = VALUES(\`name_cs\`),\n  \`name_en\` = VALUES(\`name_en\`),\n  \`category\` = VALUES(\`category\`),\n  \`default_unit\` = VALUES(\`default_unit\`),\n  \`serving_grams\` = VALUES(\`serving_grams\`),\n  \`energy_kj_100g\` = VALUES(\`energy_kj_100g\`),\n  \`kcal_100g\` = VALUES(\`kcal_100g\`),\n  \`protein_100g\` = VALUES(\`protein_100g\`),\n  \`total_carbs_100g\` = VALUES(\`total_carbs_100g\`),\n  \`carbs_100g\` = VALUES(\`carbs_100g\`),\n  \`fat_100g\` = VALUES(\`fat_100g\`),\n  \`sugar_100g\` = VALUES(\`sugar_100g\`),\n  \`sodium_mg_100g\` = VALUES(\`sodium_mg_100g\`),\n  \`salt_100g\` = VALUES(\`salt_100g\`),\n  \`note\` = VALUES(\`note\`);`)
}

const output = `-- FoodLife drinks import generated from databaze/podklady/all_drinks_nutrition_database_cz.csv\n-- Values from the source are per 100 ml. FoodLife stores them in *_100g columns and treats 1 ml ~= 1 g for logging.\n-- Safe to import repeatedly thanks to uniq_food_external (external_source, external_code).\n\nSET NAMES utf8mb4;\n\n${chunks.join('\n\n')}\n`

fs.writeFileSync(outputPath, output, 'utf8')
console.log(`Generated ${outputPath} with ${rows.length} drinks.`)
