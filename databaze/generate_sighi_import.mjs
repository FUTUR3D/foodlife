import fs from 'node:fs'
import path from 'node:path'

const inputPath = path.join('databaze', 'podklady', 'sighi_histamin_potraviny_cz.csv')
const outputPath = path.join('databaze', '2026_05_09_sighi_histamine_import.sql')

function parseCsv(text) {
  const rows = []
  let row = []
  let value = ''
  let quoted = false

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    const next = text[i + 1]

    if (quoted) {
      if (char === '"' && next === '"') {
        value += '"'
        i += 1
      } else if (char === '"') {
        quoted = false
      } else {
        value += char
      }
      continue
    }

    if (char === '"') {
      quoted = true
    } else if (char === ';') {
      row.push(value)
      value = ''
    } else if (char === '\n') {
      row.push(value)
      rows.push(row)
      row = []
      value = ''
    } else if (char !== '\r') {
      value += char
    }
  }

  if (value || row.length) {
    row.push(value)
    rows.push(row)
  }

  return rows
}

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[:/;]+/g, ',')
    .replace(/[^a-z0-9ěščřžýáíéúůňďťóöäüß\s,.-]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function getTerms(food) {
  const base = String(food || '')
  const candidates = new Set()
  const simplified = base.replace(/\([^)]*\)/g, '').trim()

  candidates.add(base)
  candidates.add(simplified)

  for (const chunk of base.split(/[,;/]/)) {
    candidates.add(chunk)
  }

  for (const chunk of simplified.split(/[,;/]/)) {
    candidates.add(chunk)
  }

  return [...candidates]
    .map((term) => term.replace(/^[\s:-]+|[\s:-]+$/g, '').trim())
    .filter((term) => normalize(term).length >= 3)
    .filter((term, index, list) => list.findIndex((item) => normalize(item) === normalize(term)) === index)
}

function sql(value) {
  if (value === null || value === undefined || value === '') return 'NULL'
  return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "''")}'`
}

function scoreValue(raw) {
  const value = String(raw || '').trim()
  return /^[0-3]$/.test(value) ? Number(value) : null
}

const csv = fs.readFileSync(inputPath, 'utf8')
const [headers, ...rows] = parseCsv(csv)

const records = rows
  .filter((row) => row.length >= headers.length && row[3])
  .map((row, index) => {
    const obj = Object.fromEntries(headers.map((header, i) => [header, row[i] || '']))
    return {
      source_id: index + 1,
      ...obj,
      food_norm: normalize(obj.food),
      score_value: scoreValue(obj.sighi_score),
      terms: getTerms(obj.food),
    }
  })

const lines = []
lines.push('-- FoodLife SIGHI histamine reference import')
lines.push('-- Generated from databaze/podklady/sighi_histamin_potraviny_cz.csv')
lines.push('')
lines.push(`CREATE TABLE IF NOT EXISTS \`sighi_foods\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`source_id\` int(11) NOT NULL,
  \`page\` varchar(20) DEFAULT NULL,
  \`category\` varchar(180) DEFAULT NULL,
  \`subcategory\` varchar(180) DEFAULT NULL,
  \`food\` varchar(255) NOT NULL,
  \`food_norm\` varchar(255) NOT NULL,
  \`sighi_score_raw\` varchar(10) DEFAULT NULL,
  \`sighi_score\` tinyint(3) DEFAULT NULL,
  \`histamine_marker\` varchar(20) DEFAULT NULL,
  \`other_amines_marker\` varchar(20) DEFAULT NULL,
  \`liberator_marker\` varchar(20) DEFAULT NULL,
  \`inhibitor_marker\` varchar(20) DEFAULT NULL,
  \`uncertain_marker\` varchar(255) DEFAULT NULL,
  \`other_marker\` varchar(255) DEFAULT NULL,
  \`notes\` text DEFAULT NULL,
  \`created_at\` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uniq_sighi_source\` (\`source_id\`),
  KEY \`idx_sighi_food_norm\` (\`food_norm\`),
  KEY \`idx_sighi_score\` (\`sighi_score\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`)
lines.push('')
lines.push(`CREATE TABLE IF NOT EXISTS \`sighi_food_terms\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`sighi_food_id\` int(11) NOT NULL,
  \`term\` varchar(255) NOT NULL,
  \`term_norm\` varchar(255) NOT NULL,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uniq_sighi_term\` (\`sighi_food_id\`, \`term_norm\`),
  KEY \`idx_sighi_term_norm\` (\`term_norm\`),
  CONSTRAINT \`sighi_food_terms_ibfk_1\` FOREIGN KEY (\`sighi_food_id\`) REFERENCES \`sighi_foods\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`)
lines.push('')
lines.push(`CREATE TABLE IF NOT EXISTS \`food_sighi_links\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`food_id\` int(11) NOT NULL,
  \`sighi_food_id\` int(11) NOT NULL,
  \`match_method\` enum('auto_exact','auto_contains','manual','user') NOT NULL DEFAULT 'manual',
  \`confidence\` tinyint(3) NOT NULL DEFAULT 0,
  \`approved\` tinyint(1) NOT NULL DEFAULT 0,
  \`note\` varchar(255) DEFAULT NULL,
  \`created_at\` timestamp NULL DEFAULT current_timestamp(),
  \`updated_at\` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uniq_food_sighi\` (\`food_id\`, \`sighi_food_id\`),
  KEY \`idx_food_sighi_food\` (\`food_id\`, \`approved\`, \`confidence\`),
  KEY \`idx_food_sighi_sighi\` (\`sighi_food_id\`),
  CONSTRAINT \`food_sighi_links_ibfk_1\` FOREIGN KEY (\`food_id\`) REFERENCES \`foods\` (\`id\`) ON DELETE CASCADE,
  CONSTRAINT \`food_sighi_links_ibfk_2\` FOREIGN KEY (\`sighi_food_id\`) REFERENCES \`sighi_foods\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`)
lines.push('')
lines.push('START TRANSACTION;')
lines.push('SET FOREIGN_KEY_CHECKS=0;')
lines.push('TRUNCATE TABLE `food_sighi_links`;')
lines.push('TRUNCATE TABLE `sighi_food_terms`;')
lines.push('TRUNCATE TABLE `sighi_foods`;')
lines.push('SET FOREIGN_KEY_CHECKS=1;')

for (const record of records) {
  lines.push(`INSERT INTO \`sighi_foods\` (\`source_id\`, \`page\`, \`category\`, \`subcategory\`, \`food\`, \`food_norm\`, \`sighi_score_raw\`, \`sighi_score\`, \`histamine_marker\`, \`other_amines_marker\`, \`liberator_marker\`, \`inhibitor_marker\`, \`uncertain_marker\`, \`other_marker\`, \`notes\`) VALUES (${record.source_id}, ${sql(record.page)}, ${sql(record.category)}, ${sql(record.subcategory)}, ${sql(record.food)}, ${sql(record.food_norm)}, ${sql(record.sighi_score)}, ${record.score_value === null ? 'NULL' : record.score_value}, ${sql(record.histamine_marker)}, ${sql(record.other_amines_marker)}, ${sql(record.liberator_marker)}, ${sql(record.inhibitor_marker)}, ${sql(record.uncertain_marker)}, ${sql(record.other_marker)}, ${sql(record.notes)});`)
}

for (const record of records) {
  for (const term of record.terms) {
    lines.push(`INSERT IGNORE INTO \`sighi_food_terms\` (\`sighi_food_id\`, \`term\`, \`term_norm\`) SELECT \`id\`, ${sql(term)}, ${sql(normalize(term))} FROM \`sighi_foods\` WHERE \`source_id\` = ${record.source_id};`)
  }
}

lines.push('')
lines.push('-- Automaticke parovani jen pro jasne shody nazvu. Ostatni polozky zustanou k rucni kontrole.')
lines.push(`INSERT IGNORE INTO \`food_sighi_links\` (\`food_id\`, \`sighi_food_id\`, \`match_method\`, \`confidence\`, \`approved\`, \`note\`)
SELECT f.\`id\`, t.\`sighi_food_id\`, 'auto_exact', 100, 1, 'Automaticka presna shoda nazvu'
FROM \`foods\` f
JOIN \`sighi_food_terms\` t
  ON LOWER(TRIM(CONVERT(f.\`name_cs\` USING utf8mb4))) COLLATE utf8mb4_unicode_ci = t.\`term_norm\` COLLATE utf8mb4_unicode_ci
WHERE f.\`user_id\` IS NULL;`)
lines.push('')
lines.push(`INSERT IGNORE INTO \`food_sighi_links\` (\`food_id\`, \`sighi_food_id\`, \`match_method\`, \`confidence\`, \`approved\`, \`note\`)
SELECT f.\`id\`, t.\`sighi_food_id\`, 'auto_contains', 70, 0, 'Navrzena shoda podle obsazeneho nazvu - zkontrolovat'
FROM \`foods\` f
JOIN \`sighi_food_terms\` t
  ON CHAR_LENGTH(t.\`term_norm\`) >= 5
  AND LOWER(TRIM(CONVERT(f.\`name_cs\` USING utf8mb4))) COLLATE utf8mb4_unicode_ci LIKE CONCAT('%', t.\`term_norm\`, '%') COLLATE utf8mb4_unicode_ci
LEFT JOIN \`food_sighi_links\` existing ON existing.\`food_id\` = f.\`id\` AND existing.\`approved\` = 1
WHERE f.\`user_id\` IS NULL AND existing.\`id\` IS NULL;`)
lines.push('COMMIT;')
lines.push('')
lines.push('-- Kontrola po importu:')
lines.push('-- SELECT approved, match_method, COUNT(*) FROM food_sighi_links GROUP BY approved, match_method;')
lines.push('-- SELECT f.name_cs, s.food, l.confidence, l.approved FROM food_sighi_links l JOIN foods f ON f.id=l.food_id JOIN sighi_foods s ON s.id=l.sighi_food_id ORDER BY l.approved DESC, l.confidence DESC LIMIT 50;')

fs.writeFileSync(outputPath, `${lines.join('\n')}\n`, 'utf8')
console.log(`Generated ${outputPath} with ${records.length} SIGHI records.`)
