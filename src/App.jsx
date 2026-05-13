import { useEffect, useMemo, useRef, useState } from 'react'
import { COUNTRIES } from './countries'

const STORAGE_KEYS = {
  auth: 'foodlife_auth',
  profile: 'foodlife_profile',
  foods: 'foodlife_foods',
  entries: 'foodlife_entries',
  dayInfo: 'foodlife_day_info',
  goals: 'foodlife_goals',
  reactions: 'foodlife_reactions',
}

const MEAL_SECTIONS = [
  { key: 'snidane', title: 'Snídaně', colorClass: 'panel-teal' },
  { key: 'svacina1', title: 'Svačina', colorClass: 'panel-cyan' },
  { key: 'obed', title: 'Oběd', colorClass: 'panel-sky' },
  { key: 'svacina2', title: 'Svačina 2', colorClass: 'panel-blue' },
  { key: 'vecere', title: 'Večeře', colorClass: 'panel-indigo' },
  { key: 'piti', title: 'Pití', colorClass: 'panel-cyan' },
  { key: 'ostatni', title: 'Ostatní', colorClass: 'panel-violet' },
]

const FOOD_MEAL_SECTIONS = MEAL_SECTIONS.filter((section) => section.key !== 'piti')
const DRINK_SECTION = MEAL_SECTIONS.find((section) => section.key === 'piti')
const RECIPE_MEAL_TAGS = MEAL_SECTIONS.map(({ key, title }) => ({ key, title }))
const DEFAULT_MEAL_TIMES = {
  snidane: '07:00',
  svacina1: '10:00',
  obed: '12:00',
  svacina2: '15:00',
  vecere: '18:00',
  ostatni: '20:00',
  piti: '08:00',
}

const DEFAULT_FOODS = [
  { id: createId(), name: 'Ovesná kaše' },
  { id: createId(), name: 'Banán' },
  { id: createId(), name: 'Kuřecí maso' },
  { id: createId(), name: 'Rýže' },
  { id: createId(), name: 'Jogurt' },
  { id: createId(), name: 'Vejce' },
  { id: createId(), name: 'Jablko' },
  { id: createId(), name: 'Salát' },
]

const DEFAULT_PROFILE = {
  name: '',
  email: '',
  gender: '',
  birthDate: '',
  height: '',
  weight: '',
  startWeight: '',
  countryCode: '',
  bodyType: '',
}

const GENDER_OPTIONS = ['Muž', 'Žena', 'Jiné', 'Nechci uvádět']

const BODY_TYPE_OPTIONS = [
  'Štíhlá',
  'Běžná',
  'Atletická',
  'Robustnější',
  'Silnější',
  'Nevím',
]

const PROFILE_REQUIRED_FIELDS = [
  'name',
  'birthDate',
  'weight',
  'height',
  'gender',
  'countryCode',
  'bodyType',
]

const DEFAULT_DAY_INFO = {
  exercise: '',
  exerciseEntries: [],
  exerciseKcal: '',
  sleepEntries: [],
  toiletEntries: [],
  moodEntries: [],
  toiletCount: '',
  toiletType: 'Normální',
  mood: 'Dobře',
  moodNote: '',
  dayNote: '',
  dayJournalHtml: '',
  dayJournalTitle: '',
  drinks: '',
}

const DEFAULT_GOALS = {
  goalType: 'lose',
  activityLevel: 'light',
}

const GOAL_OPTIONS = [
  { key: 'lose', label: 'Zhubnout', kcalOffset: -500 },
  { key: 'maintain', label: 'Udržet váhu', kcalOffset: 0 },
  { key: 'gain', label: 'Nabrat', kcalOffset: 300 },
]

const ACTIVITY_LEVELS = [
  { key: 'sedentary', label: 'Málo pohybu', multiplier: 1.2 },
  { key: 'light', label: 'Lehká aktivita', multiplier: 1.375 },
  { key: 'moderate', label: 'Střední aktivita', multiplier: 1.55 },
  { key: 'active', label: 'Vysoká aktivita', multiplier: 1.725 },
]

const REACTION_TYPES = [
  'Nadýmání',
  'Bolest břicha',
  'Reflux / pálení žáhy',
  'Nevolnost',
  'Únava',
  'Brain fog',
  'Bolest hlavy',
  'Svědění / vyrážka',
  'Flush / zčervenání',
  'Bušení srdce',
  'Jiné',
]

const ONSET_SPEEDS = [
  'Okamžitě po jídle',
  'Do 2 hodin',
  'Večer',
  'Druhý den',
  'Nevím',
]

const HISTAMINE_BASE_POINTS = {
  0: 0,
  1: 1,
  2: 3,
  3: 6,
}

const HISTAMINE_MARKER_POINTS = {
  histamine_marker: 1,
  other_amines_marker: 1,
  liberator_marker: 1,
  inhibitor_marker: 2,
}

const REPORT_MAX_DAYS = 31

function createId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Server-backed fields such as the journal can be too large for localStorage.
  }
}

function dayInfoStorageValue(infoByDate) {
  return Object.fromEntries(
    Object.entries(infoByDate || {}).map(([date, info]) => {
      const { dayJournalHtml, ...lightInfo } = info || {}
      return [date, lightInfo]
    }),
  )
}

function readNumber(value) {
  const number = parseFloat(String(value ?? '').replace(',', '.'))
  return Number.isFinite(number) ? number : null
}

function getProfileAge(birthDate) {
  if (!birthDate) return null
  const birth = new Date(birthDate)
  if (Number.isNaN(birth.getTime())) return null

  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const hadBirthday = today.getMonth() > birth.getMonth() || (
    today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate()
  )
  if (!hadBirthday) age -= 1
  return age > 0 ? age : null
}

function getGenderConstant(gender) {
  const value = String(gender || '').toLowerCase()
  if (value.includes('žena') || value.includes('zena')) return -161
  if (value.includes('muž') || value.includes('muz')) return 5
  return -78
}

function calculateEnergyPlan(profile, goals, exerciseKcal) {
  const weight = readNumber(profile.weight || profile.startWeight)
  const height = readNumber(profile.height)
  const age = getProfileAge(profile.birthDate)
  if (!weight || !height || !age) return null

  const activity = ACTIVITY_LEVELS.find((item) => item.key === goals.activityLevel) || ACTIVITY_LEVELS[1]
  const goal = GOAL_OPTIONS.find((item) => item.key === goals.goalType) || GOAL_OPTIONS[0]
  const exercise = Math.max(0, readNumber(exerciseKcal) || 0)
  const bmr = (10 * weight) + (6.25 * height) - (5 * age) + getGenderConstant(profile.gender)
  const expenditure = (bmr * activity.multiplier) + exercise
  const target = Math.max(1200, expenditure + goal.kcalOffset)

  return {
    age,
    bmr,
    expenditure,
    target,
    exercise,
    goal,
    activity,
  }
}

function isProfileComplete(profile) {
  return PROFILE_REQUIRED_FIELDS.every((field) => String(profile[field] || '').trim() !== '')
}

function profilePayload(profile) {
  return {
    name: profile.name || '',
    birthDate: profile.birthDate || '',
    weight: profile.weight || '',
    height: profile.height || '',
    gender: profile.gender || '',
    countryCode: profile.countryCode || '',
    bodyType: profile.bodyType || '',
  }
}

function formatToday() {
  return new Date().toISOString().slice(0, 10)
}

function formatDisplayDate(value) {
  if (!value) return ''
  const date = new Date(`${value}T12:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('cs-CZ', {
    weekday: 'short',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  })
}

function shiftDate(value, days) {
  const date = new Date(`${value}T12:00:00`)
  if (Number.isNaN(date.getTime())) return value
  date.setDate(date.getDate() + days)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getDateRange(startValue, endValue, maxDays = REPORT_MAX_DAYS) {
  if (!startValue || !endValue) return []
  const start = startValue <= endValue ? startValue : endValue
  const end = startValue <= endValue ? endValue : startValue
  const days = []
  let cursor = start

  while (cursor <= end && days.length < maxDays) {
    days.push(cursor)
    cursor = shiftDate(cursor, 1)
  }

  return days
}

function getDateRangeLength(startValue, endValue) {
  if (!startValue || !endValue) return 0
  const start = new Date(`${startValue <= endValue ? startValue : endValue}T12:00:00`)
  const end = new Date(`${startValue <= endValue ? endValue : startValue}T12:00:00`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0
  return Math.floor((end - start) / 86400000) + 1
}

function groupMealsByType(meals) {
  return (meals || []).reduce((groups, meal) => {
    const key = meal.meal_type || 'ostatni'
    return {
      ...groups,
      [key]: [...(groups[key] || []), meal],
    }
  }, {})
}

function useTapToggle(onToggle) {
  const lastTouchRef = useRef(0)
  const touchStartRef = useRef(null)
  const touchMovedRef = useRef(false)

  return {
    onClick: () => {
      if (Date.now() - lastTouchRef.current < 500) return
      onToggle()
    },
    onTouchStart: (event) => {
      const touch = event.touches?.[0]
      if (!touch) return

      touchMovedRef.current = false
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
      }
    },
    onTouchMove: (event) => {
      const touch = event.touches?.[0]
      const start = touchStartRef.current
      if (!touch || !start) return

      const deltaX = Math.abs(touch.clientX - start.x)
      const deltaY = Math.abs(touch.clientY - start.y)
      if (deltaX > 8 || deltaY > 8) {
        touchMovedRef.current = true
      }
    },
    onTouchEnd: (event) => {
      lastTouchRef.current = Date.now()
      if (!touchMovedRef.current) {
        event.preventDefault()
        onToggle()
      }
      touchStartRef.current = null
      touchMovedRef.current = false
    },
    onTouchCancel: () => {
      lastTouchRef.current = Date.now()
      touchStartRef.current = null
      touchMovedRef.current = false
    },
  }
}

function AccordionSection({
  title,
  subtitle,
  colorClass,
  statusClass = '',
  headerAction = null,
  isOpen,
  onToggle,
  children,
}) {
  const sectionRef = useRef(null)
  const tapHandlers = useTapToggle(onToggle)

  useEffect(() => {
    if (!isOpen || !sectionRef.current) return

    const timeout = window.setTimeout(() => {
      sectionRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }, 60)

    return () => window.clearTimeout(timeout)
  }, [isOpen])

  return (
    <div className={`accordion ${isOpen ? 'accordion-open' : ''} ${statusClass}`} ref={sectionRef}>
      <div className={`accordion-header ${colorClass}`}>
        <button type="button" className="accordion-toggle" {...tapHandlers}>
          <div>
            <div className="accordion-title">{title}</div>
            {subtitle ? <div className="accordion-subtitle">{subtitle}</div> : null}
          </div>
          <div className={`accordion-arrow ${isOpen ? 'open' : ''}`}>⌄</div>
        </button>
        {headerAction ? <div className="accordion-header-actions">{headerAction}</div> : null}
      </div>

      {isOpen ? <div className="accordion-body">{children}</div> : null}
    </div>
  )
}

function InnerSection({ title, subtitle, isOpen, onToggle, children }) {
  const tapHandlers = useTapToggle(onToggle)

  return (
    <section className={`inner-section ${isOpen ? 'inner-section-open' : ''}`}>
      <button type="button" className="inner-section-header" {...tapHandlers}>
        <span>
          <span className="inner-section-title">{title}</span>
          {subtitle ? <span className="inner-section-subtitle">{subtitle}</span> : null}
        </span>
        <span className={`inner-section-arrow ${isOpen ? 'open' : ''}`}>v</span>
      </button>

      {isOpen ? <div className="inner-section-body">{children}</div> : null}
    </section>
  )
}

function parseAmount(value) {
  const number = parseFloat(String(value).replace(',', '.'))
  return Number.isFinite(number) && number > 0 ? number : null
}

function gramsFromAmount(amount, unit, servingGrams = null) {
  const value = parseAmount(amount)
  if (!value) return null
  if (unit === 'g' || unit === 'ml') return value
  const serving = parseAmount(servingGrams)
  if (serving) return value * serving
  return null
}

function emptyTotals() {
  return { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, knownItems: 0 }
}

function getMealTotals(items) {
  return items.reduce((totals, item) => {
    const grams = item.grams ?? gramsFromAmount(item.amount, item.unit, item.serving_grams)
    if (!grams || item.kcal_100g === null || item.kcal_100g === undefined) return totals

    const ratio = grams / 100
    return {
      kcal: totals.kcal + Number(item.kcal_100g || 0) * ratio,
      protein: totals.protein + Number(item.protein_100g || 0) * ratio,
      carbs: totals.carbs + Number(item.carbs_100g || 0) * ratio,
      fat: totals.fat + Number(item.fat_100g || 0) * ratio,
      fiber: totals.fiber + Number(item.fiber_100g || 0) * ratio,
      knownItems: totals.knownItems + 1,
    }
  }, emptyTotals())
}

function getItemTotals(item) {
  const grams = item.grams ?? gramsFromAmount(item.amount, item.unit, item.serving_grams)
  if (!grams || item.kcal_100g === null || item.kcal_100g === undefined) {
    return { ...emptyTotals(), grams: grams || null }
  }

  const ratio = grams / 100
  return {
    kcal: Number(item.kcal_100g || 0) * ratio,
    protein: Number(item.protein_100g || 0) * ratio,
    carbs: Number(item.carbs_100g || 0) * ratio,
    fat: Number(item.fat_100g || 0) * ratio,
    fiber: Number(item.fiber_100g || 0) * ratio,
    knownItems: 1,
    grams,
  }
}

function formatMacro(value, suffix = 'g') {
  if (!Number.isFinite(value)) return '-'
  return `${Math.round(value * 10) / 10} ${suffix}`
}

function formatWeight(value) {
  const number = readNumber(value)
  if (!number) return '-'
  return `${Math.round(number * 10) / 10} kg`
}

function dateDaysAgo(dateValue, days) {
  return shiftDate(dateValue, -days)
}

function formatShortDate(dateValue) {
  if (!dateValue) return ''
  const date = new Date(`${dateValue}T12:00:00`)
  if (Number.isNaN(date.getTime())) return dateValue
  return date.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' })
}

function getCurrentTimeValue() {
  const date = new Date()
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function getDefaultMealTime(mealKey) {
  return DEFAULT_MEAL_TIMES[mealKey] || '12:00'
}

function getMealTimeValue(meal) {
  return meal?.meal_time?.slice(11, 16) || getDefaultMealTime(meal?.meal_type)
}

function normalizeToiletEntries(todayInfo) {
  if (Array.isArray(todayInfo.toiletEntries)) return todayInfo.toiletEntries
  return []
}

function normalizeMoodEntries(todayInfo) {
  if (Array.isArray(todayInfo.moodEntries)) return todayInfo.moodEntries
  return []
}

function normalizeSleepEntries(todayInfo) {
  if (Array.isArray(todayInfo.sleepEntries)) return todayInfo.sleepEntries
  return []
}

function getReactionTimeValue(reaction) {
  if (reaction?.time) return reaction.time
  if (reaction?.onsetTime) return String(reaction.onsetTime).slice(11, 16) || String(reaction.onsetTime).slice(0, 5)
  return ''
}

function getWeightNumber(log) {
  return readNumber(log?.weight)
}

function formatItemMeasure(item, grams) {
  if (!grams || !Number.isFinite(Number(grams))) return 'Bez množství'
  const rounded = Math.round(Number(grams) * 10) / 10
  return item.unit === 'ml' ? `${rounded} ml` : `${rounded} g`
}

function hasServingSize(unit, servingGrams) {
  return servingGrams && !['g', 'ml'].includes(unit)
}

function formatUnitWithServing(unit, servingGrams) {
  if (!hasServingSize(unit, servingGrams)) return unit
  return `${unit} (${Math.round(Number(servingGrams))} g)`
}

function formatItemAmount(item) {
  const amount = item.amount || ''
  const unit = item.unit || ''
  const grams = item.grams ?? gramsFromAmount(item.amount, item.unit, item.serving_grams)
  if (hasServingSize(unit, item.serving_grams) && grams) {
    return `${amount} ${unit} (${Math.round(Number(grams))} g)`
  }
  return `${amount} ${unit}`.trim()
}

function getExerciseUnitLabel(calcUnit) {
  if (calcUnit === 'distance_km') return 'km'
  if (calcUnit === 'reps') return 'opakování'
  return 'min'
}

function getExerciseUnitHint(calcUnit) {
  if (calcUnit === 'distance_km') return 'Vzdálenost v km'
  if (calcUnit === 'reps') return 'Počet opakování'
  return 'Délka v minutách'
}

function calculateExerciseKcal(exercise, amount, weightKg) {
  const value = parseAmount(amount)
  if (!exercise || !value) return null

  if (exercise.calc_unit === 'duration') {
    const met = parseAmount(exercise.met)
    const weight = parseAmount(weightKg)
    if (!met || !weight) return null
    return met * weight * (value / 60)
  }

  if (exercise.calc_unit === 'distance_km') {
    const perKm = parseAmount(exercise.kcal_per_km_per_kg)
    const weight = parseAmount(weightKg)
    if (!perKm || !weight) return null
    return perKm * weight * value
  }

  if (exercise.calc_unit === 'reps') {
    const perRep = parseAmount(exercise.kcal_per_rep)
    if (!perRep) return null
    return perRep * value
  }

  return null
}

function normalizeExerciseEntries(todayInfo) {
  if (Array.isArray(todayInfo.exerciseEntries) && todayInfo.exerciseEntries.length > 0) {
    return todayInfo.exerciseEntries
  }

  if (todayInfo.exercise || todayInfo.exerciseKcal) {
    return [{
      id: 'legacy-exercise',
      source: 'manual',
      name: todayInfo.exercise || 'Ruční záznam cvičení',
      amount: '',
      unit: '',
      kcal: todayInfo.exerciseKcal || '',
      note: '',
    }]
  }

  return []
}

function getExerciseEntriesSummary(entries) {
  return entries
    .map((entry) => {
      const amount = entry.amount ? `${entry.amount}${entry.unit ? ` ${entry.unit}` : ''}` : ''
      const kcal = parseAmount(entry.kcal)
      return [
        entry.name,
        amount,
        kcal ? `~${Math.round(kcal)} kcal` : '',
      ].filter(Boolean).join(' ')
    })
    .join('; ')
}

function getExerciseEntriesKcal(entries) {
  return entries.reduce((sum, entry) => sum + (parseAmount(entry.kcal) || 0), 0)
}

function getFoodKindLabel(food) {
  if (
    food.food_kind === 'edited' ||
    food.food_kind === 'custom' ||
    food.source === 'user' ||
    food.external_source === 'FoodLife-user-edit'
  ) {
    return 'Moje jídlo'
  }
  return ''
}

function FoodKindBadge({ food }) {
  const label = getFoodKindLabel(food)
  if (!label) return null

  return <span className="food-badge">{label}</span>
}

function hasSighiInfo(item) {
  return item?.sighi_score_raw !== null && item?.sighi_score_raw !== undefined
}

function SighiBadge({ item }) {
  if (!hasSighiInfo(item)) return null

  const raw = item.sighi_score_raw ?? '?'
  const score = item.sighi_score
  const isSuggested = Number(item.sighi_approved) !== 1
  const className = score === null || score === undefined
    ? `sighi-badge sighi-unknown${isSuggested ? ' sighi-suggested' : ''}`
    : `sighi-badge sighi-${score}${isSuggested ? ' sighi-suggested' : ''}`

  return <span className={className}>SIGHI {raw}{isSuggested ? ' návrh' : ''}</span>
}

function getSighiMarkers(item) {
  return [
    item.histamine_marker ? `H: histamin ${item.histamine_marker}` : '',
    item.other_amines_marker ? `A: aminy ${item.other_amines_marker}` : '',
    item.liberator_marker ? `L: liberátor ${item.liberator_marker}` : '',
    item.inhibitor_marker ? `B: DAO blokátor ${item.inhibitor_marker}` : '',
    item.uncertain_marker ? `?: ${item.uncertain_marker}` : '',
    item.other_marker ? item.other_marker : '',
  ].filter(Boolean)
}

function SighiDetails({ item }) {
  if (!hasSighiInfo(item)) return null
  const markers = getSighiMarkers(item)

  return (
    <div className="sighi-details">
      <div>
        <span>Histamin</span>
        <strong><SighiBadge item={item} /></strong>
      </div>
      {item.sighi_food ? (
        <div>
          <span>SIGHI shoda</span>
          <strong>{item.sighi_food}</strong>
        </div>
      ) : null}
      {item.sighi_confidence !== null && item.sighi_confidence !== undefined ? (
        <div>
          <span>Párování</span>
          <strong>{Number(item.sighi_approved) === 1 ? 'schváleno' : 'návrh'} · {item.sighi_confidence} %</strong>
        </div>
      ) : null}
      {markers.length ? (
        <div>
          <span>Markery</span>
          <strong>{markers.join(' • ')}</strong>
        </div>
      ) : null}
      {item.sighi_notes ? (
        <div>
          <span>Poznámka</span>
          <strong>{item.sighi_notes}</strong>
        </div>
      ) : null}
    </div>
  )
}

function sighiFieldsFromFood(food) {
  return {
    sighi_id: food?.sighi_id ?? null,
    sighi_food: food?.sighi_food ?? null,
    sighi_score_raw: food?.sighi_score_raw ?? null,
    sighi_score: food?.sighi_score ?? null,
    histamine_marker: food?.histamine_marker ?? null,
    other_amines_marker: food?.other_amines_marker ?? null,
    liberator_marker: food?.liberator_marker ?? null,
    inhibitor_marker: food?.inhibitor_marker ?? null,
    uncertain_marker: food?.uncertain_marker ?? null,
    other_marker: food?.other_marker ?? null,
    sighi_notes: food?.sighi_notes ?? null,
    sighi_approved: food?.sighi_approved ?? null,
    sighi_confidence: food?.sighi_confidence ?? null,
    sighi_match_method: food?.sighi_match_method ?? null,
  }
}

function getHistamineServingMultiplier(item) {
  const grams = Number(item?.grams ?? 0)
  if (!Number.isFinite(grams) || grams <= 0) return 1
  if (grams <= 50) return 0.7
  if (grams <= 150) return 1
  if (grams <= 300) return 1.25
  return 1.5
}

function getHistamineItemRisk(item) {
  if (!hasSighiInfo(item)) {
    return {
      points: 0,
      known: false,
      basePoints: 0,
      markerPoints: 0,
      multiplier: 1,
      markers: [],
    }
  }

  const score = Number(item.sighi_score)
  const basePoints = HISTAMINE_BASE_POINTS[score] ?? 0
  const markers = Object.entries(HISTAMINE_MARKER_POINTS)
    .filter(([field]) => item?.[field])
    .map(([field, points]) => ({ field, points, value: item[field] }))
  const markerPoints = markers.reduce((sum, marker) => sum + marker.points, 0)
  const multiplier = getHistamineServingMultiplier(item)
  const suggestedPenalty = Number(item.sighi_approved) === 1 ? 0 : 0.5
  const points = (basePoints + markerPoints + suggestedPenalty) * multiplier

  return {
    points,
    known: true,
    basePoints,
    markerPoints,
    multiplier,
    markers,
  }
}

function getHistamineRiskLevel(score) {
  if (score >= 13) {
    return {
      key: 'high',
      label: 'Vyšší riziko',
      tone: 'risk-high',
      text: 'Dnes je tam víc rizikových položek nebo markerů. U citlivějšího člověka už může dávat smysl sledovat příznaky.',
    }
  }
  if (score >= 8) {
    return {
      key: 'elevated',
      label: 'Zvýšené riziko',
      tone: 'risk-elevated',
      text: 'Den už má několik histaminově zajímavých položek. Nejde o diagnózu, spíš o signál ke sledování.',
    }
  }
  if (score >= 3) {
    return {
      key: 'moderate',
      label: 'Mírné riziko',
      tone: 'risk-moderate',
      text: 'Zatím převládá nízké až střední riziko. Důležité bude, jestli se opakuje stejný vzorec s příznaky.',
    }
  }
  return {
    key: 'low',
    label: 'Nízké riziko',
    tone: 'risk-low',
    text: 'Podle spárovaných SIGHI položek je dnešní histaminové riziko zatím nízké.',
  }
}

function getHistamineSummary(meals) {
  const mealRows = []
  const riskyItems = []
  let score = 0
  let knownItems = 0
  let unknownItems = 0

  for (const meal of meals || []) {
    let mealScore = 0
    const mealRiskyItems = []

    for (const item of meal.items || []) {
      const risk = getHistamineItemRisk(item)
      if (!risk.known) {
        unknownItems += 1
        continue
      }

      knownItems += 1
      score += risk.points
      mealScore += risk.points

      if (risk.points > 0) {
        const row = {
          ...item,
          mealTitle: meal.title,
          mealType: meal.meal_type,
          risk,
        }
        riskyItems.push(row)
        mealRiskyItems.push(row)
      }
    }

    mealRows.push({
      meal,
      score: mealScore,
      level: getHistamineRiskLevel(mealScore),
      items: mealRiskyItems.sort((a, b) => b.risk.points - a.risk.points),
    })
  }

  const roundedScore = Math.round(score * 10) / 10

  return {
    score: roundedScore,
    level: getHistamineRiskLevel(roundedScore),
    knownItems,
    unknownItems,
    riskyItems: riskyItems.sort((a, b) => b.risk.points - a.risk.points),
    meals: mealRows.filter((meal) => meal.meal.items?.length),
  }
}

function getHistamineReactionInsight(histamineSummary, reactions) {
  if (!reactions.length) {
    return 'Zatím nejsou zapsané příznaky. Jakmile něco zaznamenáš, půjde porovnat rizikové položky a reakci v čase.'
  }

  const topItems = histamineSummary.riskyItems.slice(0, 3).map((item) => item.name || item.custom_name).filter(Boolean)
  if (!topItems.length) {
    return 'Dnes jsou zapsané příznaky, ale u jídel zatím není dost spárovaných SIGHI údajů pro smysluplnou stopu.'
  }

  return `Dnes jsou zapsané příznaky a největší histaminovou stopu táhnou: ${topItems.join(', ')}. Ber to jako hypotézu k pozorování, ne jako jistý závěr.`
}

function FoodValueDetails({ item }) {
  const totals = getItemTotals(item)
  const hasValues = totals.knownItems > 0

  return (
    <>
      <div className="food-value-details">
        <div>
          <span>Přepočet</span>
          <strong>{formatItemMeasure(item, totals.grams)}</strong>
        </div>
        <div>
          <span>Energie</span>
          <strong>{hasValues ? `${Math.round(totals.kcal)} kcal` : '-'}</strong>
        </div>
        <div>
          <span>Bílkoviny</span>
          <strong>{hasValues ? formatMacro(totals.protein) : '-'}</strong>
        </div>
        <div>
          <span>Sacharidy</span>
          <strong>{hasValues ? formatMacro(totals.carbs) : '-'}</strong>
        </div>
        <div>
          <span>Tuky</span>
          <strong>{hasValues ? formatMacro(totals.fat) : '-'}</strong>
        </div>
        <div>
          <span>Vláknina</span>
          <strong>{hasValues ? formatMacro(totals.fiber) : '-'}</strong>
        </div>
        {hasServingSize(item.unit, item.serving_grams) ? (
          <div>
            <span>Porce</span>
            <strong>1 {formatUnitWithServing(item.unit, item.serving_grams)}</strong>
          </div>
        ) : null}
      </div>
      <SighiDetails item={item} />
    </>
  )
}

function MealTotals({ items }) {
  const totals = getMealTotals(items)

  return (
    <div className="meal-totals">
      <div><strong>{Math.round(totals.kcal)}</strong><span>kcal</span></div>
      <div><strong>{formatMacro(totals.protein)}</strong><span>bílkoviny</span></div>
      <div><strong>{formatMacro(totals.carbs)}</strong><span>sacharidy</span></div>
      <div><strong>{formatMacro(totals.fat)}</strong><span>tuky</span></div>
      <div><strong>{formatMacro(totals.fiber)}</strong><span>vláknina</span></div>
    </div>
  )
}

function getDrinkItemMl(item) {
  const amount = parseAmount(item.amount)
  const unit = item.unit || item.default_unit
  if (unit === 'ml' && amount) return amount

  const grams = item.grams ?? gramsFromAmount(item.amount, unit, item.serving_grams)
  const gramsValue = parseAmount(grams)
  if (gramsValue) return gramsValue

  return amount || 0
}

function getDrinkItemsMl(items) {
  return (items || []).reduce((sum, item) => sum + getDrinkItemMl(item), 0)
}

function getDrinkMealsMl(meals) {
  return meals.reduce((mealSum, meal) => {
    return mealSum + getDrinkItemsMl(meal.items)
  }, 0)
}

function getFluidTargetMl(profile) {
  const weight = parseAmount(profile?.weight) || parseAmount(profile?.startWeight)
  if (!weight) return 2500
  return Math.round(weight * 35)
}

function formatFluidMl(value) {
  const ml = Math.round(value || 0)
  if (ml >= 1000) return `${Math.round((ml / 1000) * 10) / 10} l`
  return `${ml} ml`
}

function getDailyStatus(dayTotals, energyPlan) {
  if (!energyPlan) return 'Po doplnění cíle se tu ukáže, jestli den směřuje k hubnutí, udržení nebo nabírání.'

  const balance = Math.round(dayTotals.kcal - energyPlan.target)
  if (energyPlan.goal.key === 'lose') {
    return balance <= 0
      ? 'Dnešní příjem je zatím pod cílem pro hubnutí.'
      : `Dnes jsi asi ${balance} kcal nad cílem pro hubnutí.`
  }
  if (energyPlan.goal.key === 'gain') {
    return balance >= 0
      ? 'Dnešní příjem už podporuje nabírání.'
      : `Pro nabírání ještě chybí asi ${Math.abs(balance)} kcal.`
  }
  return Math.abs(balance) <= 150
    ? 'Dnes jsi velmi blízko udržovacímu cíli.'
    : `Dnes jsi asi ${Math.abs(balance)} kcal ${balance > 0 ? 'nad' : 'pod'} udržovacím cílem.`
}

function MainDashboard({
  date,
  dayTotals,
  totalItems,
  energyPlan,
  mealsByType,
  isMealsLoading,
  onOpenSection,
  onOpenMenu,
}) {
  const kcal = Math.round(dayTotals.kcal)
  const target = energyPlan?.target || null
  const remaining = target ? Math.round(target - kcal) : null
  const progress = target ? Math.min(100, Math.round((kcal / target) * 100)) : 0
  const foodMeals = FOOD_MEAL_SECTIONS.filter((section) => section.key !== 'ostatni')

  return (
    <section className="day-dashboard">
      <div className="dashboard-hero">
        <div>
          <div className="topbar-small">Denní dashboard</div>
          <h2>Souhrn dne</h2>
          <p>{getDailyStatus(dayTotals, energyPlan)}</p>
        </div>
        <div className="dashboard-score">
          <strong>{kcal}</strong>
          <span>kcal</span>
        </div>
      </div>

      <div className="dashboard-progress-row">
        <div>
          <span>Cíl dne</span>
          <strong>{target ? `${Math.round(target)} kcal` : '-'}</strong>
        </div>
        <div>
          <span>{remaining !== null && remaining < 0 ? 'Nad cílem' : 'Zbývá'}</span>
          <strong>{remaining === null ? '-' : `${Math.abs(remaining)} kcal`}</strong>
        </div>
        <div>
          <span>Záznamy</span>
          <strong>{isMealsLoading ? '...' : totalItems}</strong>
        </div>
      </div>

      {target ? (
        <div className="dashboard-progress" aria-label="Plnění denního cíle">
          <span style={{ width: `${progress}%` }} />
        </div>
      ) : null}

      <div className="dashboard-macros">
        <div><strong>{formatMacro(dayTotals.protein)}</strong><span>Bílkoviny</span></div>
        <div><strong>{formatMacro(dayTotals.carbs)}</strong><span>Sacharidy</span></div>
        <div><strong>{formatMacro(dayTotals.fat)}</strong><span>Tuky</span></div>
        <div><strong>{formatMacro(dayTotals.fiber)}</strong><span>Vláknina</span></div>
      </div>

      <div className="quick-actions">
        <button className="quick-action primary" type="button" onClick={() => onOpenSection('food')}>Přidat jídlo</button>
        <button className="quick-action" type="button" onClick={() => onOpenSection('drinks', 'piti')}>Přidat pití</button>
        <button className="quick-action" type="button" onClick={() => onOpenSection('weight')}>Hmotnost</button>
        <button className="quick-action" type="button" onClick={() => onOpenSection('exercise')}>Cvičení</button>
        <button className="quick-action" type="button" onClick={onOpenMenu}>Cíle a profil</button>
      </div>

      <div className="meal-strip">
        {foodMeals.map((section) => {
          const meals = mealsByType[section.key] || []
          const totals = getMealTotals(meals.flatMap((meal) => meal.items || []))
          return (
            <button key={section.key} type="button" onClick={() => onOpenSection('food', section.key)}>
              <span>{section.title}</span>
              <strong>{meals.length ? `${Math.round(totals.kcal)} kcal` : 'Přidat'}</strong>
            </button>
          )
        })}
      </div>
    </section>
  )
}
function DailyOverview({ date, mealsByType, dayTotals, totalItems, energyPlan, isLoading }) {
  const target = energyPlan?.target || null
  const kcal = Math.round(dayTotals.kcal)
  const balance = target ? kcal - target : null
  const progress = target ? Math.min(100, Math.round((kcal / target) * 100)) : 0

  function getStatusText() {
    if (!energyPlan) return 'Doplň profil a cíl, potom se tu ukáže orientační stav dne.'
    if (energyPlan.goal.key === 'lose') {
      return balance <= 0
        ? 'Dnes jsi zatím v pásmu, které by mělo podporovat hubnutí.'
        : `Pro hubnutí je dnes příjem asi o ${Math.round(balance)} kcal výš než cíl.`
    }
    if (energyPlan.goal.key === 'gain') {
      return balance >= 0
        ? 'Dnes jsi zatím nad cílem, což podporuje nabírání.'
        : `Pro nabírání ještě chybí asi ${Math.abs(Math.round(balance))} kcal.`
    }
    return Math.abs(balance) <= 150
      ? 'Dnes jsi velmi blízko udržovacímu cíli.'
      : `Od udržovacího cíle jsi asi ${Math.abs(Math.round(balance))} kcal ${balance > 0 ? 'nad' : 'pod'}.`
  }

  return (
    <section className="side-panel">
      <div className="side-panel-head">
        <div>
          <div className="side-eyebrow">Denní přehled</div>
          <h3>{date}</h3>
        </div>
        <strong>{totalItems}</strong>
      </div>

      {isLoading ? <div className="empty-box">Načítám jídla...</div> : null}

      <div className="side-progress">
        <div>
          <span>Příjem</span>
          <strong>{kcal} kcal</strong>
        </div>
        <div>
          <span>Cíl</span>
          <strong>{target ? `${Math.round(target)} kcal` : '-'}</strong>
        </div>
      </div>

      {target ? (
        <div className="goal-progress" aria-label="Plnění cíle">
          <span style={{ width: `${progress}%` }} />
        </div>
      ) : null}

      <div className="goal-status">{getStatusText()}</div>
      <MealTotals items={[{ grams: 100, kcal_100g: dayTotals.kcal, protein_100g: dayTotals.protein, carbs_100g: dayTotals.carbs, fat_100g: dayTotals.fat, fiber_100g: dayTotals.fiber }]} />

      <div className="side-meal-list">
        {MEAL_SECTIONS.map((section) => {
          const meals = mealsByType[section.key] || []
          const totals = getMealTotals(meals.flatMap((meal) => meal.items || []))
          return (
            <div key={section.key} className="side-meal-row">
              <span>{section.title}</span>
              <strong>{meals.length ? `${Math.round(totals.kcal)} kcal` : '-'}</strong>
            </div>
          )
        })}
      </div>
    </section>
  )
}

const WEIGHT_RANGES = [
  { key: '7', label: '7 dnů', days: 7 },
  { key: '30', label: 'Měsíc', days: 30 },
  { key: '365', label: 'Rok', days: 365 },
]

function WeightChart({ logs }) {
  const points = logs
    .map((log) => ({ ...log, value: getWeightNumber(log) }))
    .filter((log) => Number.isFinite(log.value))

  if (points.length < 2) {
    return (
      <div className="weight-chart-empty">
        Přidej aspoň dva záznamy a tady se ukáže vývoj v čase.
      </div>
    )
  }

  const width = 640
  const height = 190
  const padding = 24
  const values = points.map((point) => point.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const spread = Math.max(1, max - min)
  const lower = min - spread * 0.18
  const upper = max + spread * 0.18
  const range = Math.max(1, upper - lower)

  const toX = (index) => padding + (index / Math.max(1, points.length - 1)) * (width - padding * 2)
  const toY = (value) => height - padding - ((value - lower) / range) * (height - padding * 2)
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${toX(index)} ${toY(point.value)}`).join(' ')

  return (
    <div className="weight-chart-wrap">
      <svg className="weight-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Graf vývoje hmotnosti">
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} />
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} />
        <path d={path} />
        {points.map((point, index) => (
          <g key={`${point.date}_${point.weight}`}>
            <circle cx={toX(index)} cy={toY(point.value)} r="4" />
            {index === 0 || index === points.length - 1 ? (
              <text x={toX(index)} y={toY(point.value) - 10} textAnchor={index === 0 ? 'start' : 'end'}>
                {formatWeight(point.value)}
              </text>
            ) : null}
          </g>
        ))}
      </svg>
      <div className="weight-chart-labels">
        <span>{formatShortDate(points[0].date)}</span>
        <span>{formatShortDate(points[points.length - 1].date)}</span>
      </div>
    </div>
  )
}

function WeightTracker({
  date,
  logs,
  isLoading,
  profileWeight,
  onSaveWeight,
}) {
  const [rangeKey, setRangeKey] = useState('30')
  const [weight, setWeight] = useState('')
  const [note, setNote] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const todayLog = logs.find((log) => log.date === date)
  const sortedLogs = [...logs].sort((a, b) => a.date.localeCompare(b.date))
  const latestLog = sortedLogs[sortedLogs.length - 1] || null
  const previousLog = sortedLogs.length > 1 ? sortedLogs[sortedLogs.length - 2] : null
  const selectedRange = WEIGHT_RANGES.find((range) => range.key === rangeKey) || WEIGHT_RANGES[1]
  const rangeStart = dateDaysAgo(date, selectedRange.days - 1)
  const rangeLogs = sortedLogs.filter((log) => log.date >= rangeStart && log.date <= date)
  const latestWeight = getWeightNumber(latestLog)
  const previousWeight = getWeightNumber(previousLog)
  const change = Number.isFinite(latestWeight) && Number.isFinite(previousWeight)
    ? Math.round((latestWeight - previousWeight) * 10) / 10
    : null
  const firstRangeWeight = getWeightNumber(rangeLogs[0])
  const rangeChange = Number.isFinite(latestWeight) && Number.isFinite(firstRangeWeight)
    ? Math.round((latestWeight - firstRangeWeight) * 10) / 10
    : null

  useEffect(() => {
    setWeight(todayLog?.weight || '')
    setNote(todayLog?.note || '')
    setError('')
  }, [todayLog?.id, todayLog?.weight, todayLog?.note, date])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!readNumber(weight)) {
      setError('Doplň platnou hmotnost.')
      return
    }

    setIsSaving(true)
    setError('')
    try {
      await onSaveWeight({ date, weight, note })
    } catch {
      setError('Hmotnost se nepodařilo uložit.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="weight-panel">
      <div className="weight-top">
        <div>
          <div className="side-eyebrow">Vážení</div>
          <h3>Hmotnost v čase</h3>
          <p>Stačí jeden záznam denně. Dlouhodobý trend je důležitější než jednotlivé výkyvy.</p>
        </div>
        <div className="weight-current">
          <span>Poslední</span>
          <strong>{latestLog ? formatWeight(latestLog.weight) : formatWeight(profileWeight)}</strong>
          {change !== null ? <small>{change > 0 ? '+' : ''}{change} kg od minula</small> : null}
        </div>
      </div>

      <div className="weight-grid">
        <form className="weight-form" onSubmit={handleSubmit}>
          <label className="label">Hmotnost pro {formatShortDate(date)}</label>
          <div className="weight-input-row">
            <input
              className="input"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              inputMode="decimal"
              placeholder="Např. 82,4"
            />
            <span>kg</span>
          </div>
          <input
            className="input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Poznámka, třeba ráno nalačno"
          />
          {error ? <div className="inline-error">{error}</div> : null}
          <button className="button button-full" type="submit" disabled={isSaving}>
            {isSaving ? 'Ukládám...' : todayLog ? 'Uložit' : 'Přidat'}
          </button>
        </form>

        <div className="weight-summary">
          <div>
            <span>Rozsah</span>
            <strong>{selectedRange.label}</strong>
          </div>
          <div>
            <span>Změna v období</span>
            <strong>{rangeChange === null ? '-' : `${rangeChange > 0 ? '+' : ''}${rangeChange} kg`}</strong>
          </div>
          <div>
            <span>Záznamů</span>
            <strong>{isLoading ? '...' : rangeLogs.length}</strong>
          </div>
        </div>
      </div>

      <div className="weight-range-tabs">
        {WEIGHT_RANGES.map((range) => (
          <button
            key={range.key}
            type="button"
            className={rangeKey === range.key ? 'active' : ''}
            onClick={() => setRangeKey(range.key)}
          >
            {range.label}
          </button>
        ))}
      </div>

      <WeightChart logs={rangeLogs} />

      <div className="weight-history">
        {sortedLogs.slice(-6).reverse().map((log) => (
          <div key={log.id || log.date} className="weight-history-row">
            <span>{formatShortDate(log.date)}</span>
            <strong>{formatWeight(log.weight)}</strong>
            {log.note ? <small>{log.note}</small> : null}
          </div>
        ))}
        {!isLoading && sortedLogs.length === 0 ? (
          <div className="empty-box">Zatím tu není žádné vážení.</div>
        ) : null}
      </div>
    </div>
  )
}

function GoalsPanel({ goals, onGoalsChange, todayInfo, onTodayInfoChange, energyPlan, dayTotals }) {
  const intake = Math.round(dayTotals.kcal)
  const remaining = energyPlan ? Math.round(energyPlan.target - intake) : null

  function updateGoal(field, value) {
    onGoalsChange((prev) => ({ ...DEFAULT_GOALS, ...prev, [field]: value }))
  }

  return (
    <section className="side-panel">
      <div className="side-panel-head">
        <div>
          <div className="side-eyebrow">Cíle</div>
          <h3>Energetický plán</h3>
        </div>
      </div>

      <div className="form-group">
        <label className="label">Co chci získat</label>
        <select className="input" value={goals.goalType} onChange={(e) => updateGoal('goalType', e.target.value)}>
          {GOAL_OPTIONS.map((goal) => (
            <option key={goal.key} value={goal.key}>{goal.label}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="label">Běžná aktivita</label>
        <select className="input" value={goals.activityLevel} onChange={(e) => updateGoal('activityLevel', e.target.value)}>
          {ACTIVITY_LEVELS.map((activity) => (
            <option key={activity.key} value={activity.key}>{activity.label}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="label">Dnešní cvičení navíc (kcal)</label>
        <input
          className="input"
          type="number"
          min="0"
          step="1"
          value={todayInfo.exerciseKcal || ''}
          onChange={(e) => onTodayInfoChange('exerciseKcal', e.target.value)}
          placeholder="Např. 250"
        />
      </div>

      {energyPlan ? (
        <div className="side-metric-grid">
          <div><span>Věk</span><strong>{energyPlan.age}</strong></div>
          <div><span>BMR</span><strong>{Math.round(energyPlan.bmr)}</strong></div>
          <div><span>Výdej</span><strong>{Math.round(energyPlan.expenditure)}</strong></div>
          <div><span>Cíl příjmu</span><strong>{Math.round(energyPlan.target)}</strong></div>
        </div>
      ) : (
        <div className="empty-box">Pro výpočet doplň datum narození, výšku, váhu a pohlaví v profilu.</div>
      )}

      {energyPlan ? (
        <div className="goal-status">
          {remaining >= 0
            ? `Do dnešního cíle zbývá asi ${remaining} kcal.`
            : `Dnes jsi asi o ${Math.abs(remaining)} kcal nad cílem.`}
        </div>
      ) : null}
    </section>
  )
}

function AppSideMenu({
  open,
  onClose,
  profile,
  onProfileChange,
  onProfileSave,
  isProfileSaving,
  profileError,
  bmiValue,
  bmiCategory,
  goals,
  onGoalsChange,
  todayInfo,
  onTodayInfoChange,
  mealsByType,
  dayTotals,
  totalItemsToday,
  energyPlan,
  selectedDate,
  isMealsLoading,
  onLogout,
}) {
  return (
    <>
      {open ? <button className="side-menu-backdrop" aria-label="Zavřít menu" onClick={onClose} /> : null}

      <aside className={`side-menu ${open ? 'open' : ''}`} aria-hidden={!open}>
        <div className="side-menu-header">
          <div>
            <div className="side-eyebrow">FoodLife</div>
            <div className="side-menu-title">Můj panel</div>
          </div>
          <button className="side-menu-close" type="button" onClick={onClose} aria-label="Zavřít menu">×</button>
        </div>

        <div className="side-menu-body">
          <DailyOverview
            date={selectedDate}
            mealsByType={mealsByType}
            dayTotals={dayTotals}
            totalItems={totalItemsToday}
            energyPlan={energyPlan}
            isLoading={isMealsLoading}
          />

          <GoalsPanel
            goals={goals}
            onGoalsChange={onGoalsChange}
            todayInfo={todayInfo}
            onTodayInfoChange={onTodayInfoChange}
            energyPlan={energyPlan}
            dayTotals={dayTotals}
          />

          <section className="side-panel">
            <ProfileEditor
              profile={profile}
              onChange={onProfileChange}
              onSave={onProfileSave}
              isSaving={isProfileSaving}
              error={profileError}
              bmiValue={bmiValue}
              bmiCategory={bmiCategory}
            />
          </section>

          <button className="button button-light button-full" type="button" onClick={onLogout}>
            Odhlásit
          </button>
        </div>
      </aside>
    </>
  )
}
function draftItemsFromRecipe(recipe) {
  return (recipe.items || []).map((item) => ({
    id: createId(),
    recipe_id: recipe.id,
    food_id: item.food_id,
    name: item.name || item.custom_name,
    custom_name: item.custom_name,
    amount: item.amount || '',
    unit: item.unit || item.default_unit || 'g',
    grams: item.grams ?? gramsFromAmount(item.amount, item.unit || item.default_unit || 'g', item.serving_grams),
    serving_grams: item.serving_grams ?? null,
    note: item.note || '',
    kcal_100g: item.kcal_100g,
    protein_100g: item.protein_100g,
    carbs_100g: item.carbs_100g,
    fat_100g: item.fat_100g,
    fiber_100g: item.fiber_100g,
    ...sighiFieldsFromFood(item),
  }))
}

function ProfileEditor({
  profile,
  onChange,
  onSave,
  isSaving,
  error,
  bmiValue,
  bmiCategory,
  isSetup = false,
}) {
  function updateProfile(field, value) {
    onChange((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <form className="profile-form" onSubmit={onSave}>
      {isSetup ? (
        <div className="profile-intro">
          <div className="topbar-small">První nastavení</div>
          <h1 className="profile-title">Doplň svůj profil</h1>
          <p className="profile-text">
            Díky těmto údajům půjde později lépe počítat cíle, doporučovat jídla a hledat souvislosti s trávením.
          </p>
        </div>
      ) : (
        <h3 className="card-title">Profil</h3>
      )}

      <div className="profile-grid">
        <div className="form-group">
          <label className="label">Jméno</label>
          <input
            className="input"
            value={profile.name || ''}
            onChange={(e) => updateProfile('name', e.target.value)}
            placeholder="Jméno"
            required
          />
        </div>

        <div className="form-group">
          <label className="label">Datum narození</label>
          <input
            className="input"
            type="date"
            value={profile.birthDate || ''}
            onChange={(e) => updateProfile('birthDate', e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label className="label">Váha (kg)</label>
          <input
            className="input"
            type="number"
            min="1"
            step="0.1"
            value={profile.weight || ''}
            onChange={(e) => updateProfile('weight', e.target.value)}
            placeholder="Např. 78"
            required
          />
        </div>

        <div className="form-group">
          <label className="label">Výška (cm)</label>
          <input
            className="input"
            type="number"
            min="1"
            step="0.1"
            value={profile.height || ''}
            onChange={(e) => updateProfile('height', e.target.value)}
            placeholder="Např. 182"
            required
          />
        </div>

        <div className="form-group">
          <label className="label">Pohlaví</label>
          <select
            className="input"
            value={profile.gender || ''}
            onChange={(e) => updateProfile('gender', e.target.value)}
            required
          >
            <option value="">Vyber</option>
            {GENDER_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="label">Stát</label>
          <select
            className="input"
            value={profile.countryCode || ''}
            onChange={(e) => updateProfile('countryCode', e.target.value)}
            required
          >
            <option value="">Vyber stát</option>
            {COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>
                {country.nameCs}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="label">Typ postavy</label>
          <select
            className="input"
            value={profile.bodyType || ''}
            onChange={(e) => updateProfile('bodyType', e.target.value)}
            required
          >
            <option value="">Vyber</option>
            {BODY_TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="label">E-mail</label>
          <div className="input profile-readonly">{profile.email || '-'}</div>
        </div>
      </div>

      <div className="form-group">
        <label className="label">BMI</label>
        <div className="input profile-readonly">
          {bmiValue ? `${bmiValue} (${bmiCategory})` : 'Vyplň výšku a váhu'}
        </div>
      </div>

      {error ? <div className="inline-error">{error}</div> : null}

      <button className="button button-full" type="submit" disabled={isSaving}>
        {isSaving ? 'Ukládám...' : isSetup ? 'Uložit profil a pokračovat' : 'Uložit profil'}
      </button>
    </form>
  )
}

const EMPTY_CUSTOM_FOOD = {
  id: null,
  base_food_id: null,
  name_cs: '',
  name_en: '',
  category: '',
  default_unit: 'g',
  serving_grams: '',
  kcal_100g: '',
  protein_100g: '',
  carbs_100g: '',
  fat_100g: '',
  fiber_100g: '',
  sugar_100g: '',
  sodium_mg_100g: '',
  note: '',
}

const EMPTY_RECIPE_FORM = {
  id: null,
  title: '',
  note: '',
  instructions: '',
  prep_minutes: '',
  cook_minutes: '',
  servings: '1',
  difficulty: 'easy',
  goal_type: 'none',
  carb_level: 'unknown',
  ai_prompt: '',
  meal_types: ['snidane'],
  items: [],
}

function RecipeLibrary({
  recipes,
  isLoading,
  isOpen,
  onToggle,
  onUseRecipe,
  onSaveRecipe,
  onDeleteRecipe,
  editRecipeRequest,
  createRecipeRequest,
  onCreateFood,
}) {
  const [mealFilter, setMealFilter] = useState('all')
  const [goalFilter, setGoalFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [smartPrompt, setSmartPrompt] = useState('')
  const [expandedRecipeId, setExpandedRecipeId] = useState(null)
  const [editChoiceRecipeId, setEditChoiceRecipeId] = useState(null)
  const [usingRecipeId, setUsingRecipeId] = useState(null)
  const [message, setMessage] = useState('')
  const [recipeForm, setRecipeForm] = useState(EMPTY_RECIPE_FORM)
  const [recipeSearchQuery, setRecipeSearchQuery] = useState('')
  const [recipeSearchResults, setRecipeSearchResults] = useState([])
  const [selectedRecipeFood, setSelectedRecipeFood] = useState(null)
  const [recipeAmount, setRecipeAmount] = useState('')
  const [recipeUnit, setRecipeUnit] = useState('g')
  const [recipeItemNote, setRecipeItemNote] = useState('')
  const [isRecipeSearching, setIsRecipeSearching] = useState(false)
  const [isRecipeSaving, setIsRecipeSaving] = useState(false)
  const [recipeError, setRecipeError] = useState('')
  const [openParts, setOpenParts] = useState({ form: false, list: true, ai: false })
  const [lastIngredientSearchQuery, setLastIngredientSearchQuery] = useState('')
  const isRecipeFormOpen = recipeForm.id !== null || recipeForm.title.trim() !== '' || recipeForm.note.trim() !== '' || recipeForm.items.length > 0 || Boolean(openParts.form)

  const goalLabels = {
    none: 'bez cíle',
    lose_weight: 'hubnutí',
    maintain_weight: 'udržení',
    gain_weight: 'nabírání',
    digestive_comfort: 'trávení',
    low_fodmap: 'low FODMAP',
    low_histamine: 'low histamin',
  }

  const filteredRecipes = recipes.filter((recipe) => {
    const mealTypes = recipe.meal_types?.length ? recipe.meal_types : [recipe.meal_type || 'ostatni']
    const haystack = `${recipe.title || ''} ${recipe.description || ''} ${(recipe.tag_labels || []).join(' ')}`.toLowerCase()
    const matchesMeal = mealFilter === 'all' || mealTypes.includes(mealFilter)
    const matchesGoal = goalFilter === 'all' || recipe.goal_type === goalFilter || (recipe.tag_codes || []).includes(goalFilter)
    const matchesQuery = query.trim() === '' || haystack.includes(query.trim().toLowerCase())
    return matchesMeal && matchesGoal && matchesQuery && recipe.items?.length
  })

  useEffect(() => {
    const q = recipeSearchQuery.trim()
    setRecipeError('')

    if (selectedRecipeFood?.name_cs === q) {
      setRecipeSearchResults([])
      setIsRecipeSearching(false)
      return undefined
    }

    if (q.length < 2) {
      setRecipeSearchResults([])
      setIsRecipeSearching(false)
      setLastIngredientSearchQuery('')
      return undefined
    }

    const controller = new AbortController()
    const timeout = window.setTimeout(async () => {
      setIsRecipeSearching(true)
      try {
        const response = await fetch(`foods-search.php?q=${encodeURIComponent(q)}&type=food`, {
          credentials: 'same-origin',
          signal: controller.signal,
        })
        if (!response.ok) throw new Error('food_search_failed')
        const data = await response.json()
        setRecipeSearchResults(data.foods || [])
        setLastIngredientSearchQuery(q)
      } catch (err) {
        if (err.name !== 'AbortError') setRecipeError('Potraviny se nepodařilo načíst.')
      } finally {
        setIsRecipeSearching(false)
      }
    }, 250)

    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [recipeSearchQuery, selectedRecipeFood])

  function togglePart(part) {
    setOpenParts((prev) => ({ ...prev, [part]: !prev[part] }))
  }

  function openPart(part) {
    setOpenParts((prev) => ({ ...prev, [part]: true }))
  }

  function recipeFormFromRecipe(recipe, { asCopy = false } = {}) {
    return {
      id: asCopy ? null : recipe.id,
      title: recipe.title || '',
      note: recipe.description || '',
      instructions: recipe.instructions || '',
      prep_minutes: recipe.prep_minutes ?? '',
      cook_minutes: recipe.cook_minutes ?? '',
      servings: recipe.servings ?? '1',
      difficulty: recipe.difficulty || 'easy',
      goal_type: recipe.goal_type || 'none',
      carb_level: recipe.carb_level || 'unknown',
      ai_prompt: recipe.ai_prompt || '',
      meal_types: recipe.meal_types?.length ? recipe.meal_types : [recipe.meal_type || 'ostatni'],
      items: draftItemsFromRecipe(recipe),
    }
  }

  function editRecipe(recipe, options = {}) {
    const shouldCopy = options.asCopy || recipe.source !== 'user'
    setRecipeForm(recipeFormFromRecipe(recipe, { asCopy: shouldCopy }))
    setRecipeError('')
    openPart('form')
  }

  useEffect(() => {
    if (!editRecipeRequest?.recipe) return
    editRecipe(editRecipeRequest.recipe, { asCopy: editRecipeRequest.asCopy })
  }, [editRecipeRequest])

  useEffect(() => {
    if (!createRecipeRequest?.token) return
    setRecipeForm({
      ...EMPTY_RECIPE_FORM,
      title: createRecipeRequest.title || '',
      meal_types: createRecipeRequest.mealType ? [createRecipeRequest.mealType] : EMPTY_RECIPE_FORM.meal_types,
    })
    setRecipeError('')
    openPart('form')
  }, [createRecipeRequest])

  function resetRecipeForm() {
    setRecipeForm(EMPTY_RECIPE_FORM)
    setRecipeError('')
    setRecipeSearchQuery('')
    setRecipeSearchResults([])
    setSelectedRecipeFood(null)
    setRecipeAmount('')
    setRecipeUnit('g')
    setRecipeItemNote('')
  }

  function toggleRecipeType(type) {
    setRecipeForm((prev) => {
      const hasType = prev.meal_types.includes(type)
      const nextTypes = hasType
        ? prev.meal_types.filter((item) => item !== type)
        : [...prev.meal_types, type]

      return {
        ...prev,
        meal_types: nextTypes.length ? nextTypes : [type],
      }
    })
  }

  function updateRecipeItem(itemId, patch) {
    setRecipeForm((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.id !== itemId) return item
        const next = { ...item, ...patch }
        next.grams = gramsFromAmount(next.amount, next.unit, next.serving_grams)
        return next
      }),
    }))
  }

  function handleSelectRecipeFood(food) {
    setSelectedRecipeFood(food)
    setRecipeSearchQuery(food.name_cs)
    setRecipeUnit(food.default_unit || 'g')
    setRecipeAmount(food.serving_grams ? '1' : '')
    setRecipeSearchResults([])
  }

  function handleAddRecipeItem() {
    const parsedAmount = parseAmount(recipeAmount)
    const name = selectedRecipeFood?.name_cs || recipeSearchQuery.trim()

    if (!name || !parsedAmount) {
      setRecipeError('Vyber surovinu a doplň množství.')
      return
    }

    const grams = gramsFromAmount(parsedAmount, recipeUnit, selectedRecipeFood?.serving_grams)
    setRecipeForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: createId(),
          food_id: selectedRecipeFood?.id || null,
          name,
          custom_name: selectedRecipeFood ? null : name,
          amount: parsedAmount,
          unit: recipeUnit,
          grams,
          serving_grams: selectedRecipeFood?.serving_grams ?? null,
          note: recipeItemNote.trim(),
          kcal_100g: selectedRecipeFood?.kcal_100g ?? null,
          protein_100g: selectedRecipeFood?.protein_100g ?? null,
          carbs_100g: selectedRecipeFood?.carbs_100g ?? null,
          fat_100g: selectedRecipeFood?.fat_100g ?? null,
          fiber_100g: selectedRecipeFood?.fiber_100g ?? null,
          ...sighiFieldsFromFood(selectedRecipeFood),
        },
      ],
    }))

    setRecipeSearchQuery('')
    setRecipeSearchResults([])
    setSelectedRecipeFood(null)
    setRecipeAmount('')
    setRecipeUnit('g')
    setRecipeItemNote('')
    setRecipeError('')
  }

  async function handleRecipeSubmit(e) {
    e.preventDefault()
    if (!recipeForm.title.trim()) {
      setRecipeError('Doplň název receptu.')
      return
    }
    if (recipeForm.items.length === 0) {
      setRecipeError('Recept musí mít aspoň jednu surovinu.')
      return
    }

    setIsRecipeSaving(true)
    setRecipeError('')
    try {
      await onSaveRecipe(recipeForm)
      setRecipeForm(EMPTY_RECIPE_FORM)
      setMessage('Recept je uložený.')
      openPart('list')
    } catch {
      setRecipeError('Recept se nepodařilo uložit.')
    } finally {
      setIsRecipeSaving(false)
    }
  }

  async function handleRecipeDelete(recipeId) {
    try {
      await onDeleteRecipe(recipeId)
      if (recipeForm.id === recipeId) setRecipeForm(EMPTY_RECIPE_FORM)
    } catch {
      setRecipeError('Recept se nepodařilo smazat.')
    }
  }

  async function handleUse(recipe, mealType) {
    setUsingRecipeId(`${recipe.id}_${mealType}`)
    setMessage('')
    try {
      await onUseRecipe(recipe, mealType)
      setMessage(`Recept „${recipe.title}” je vložený do dne.`)
    } catch {
      setMessage('Recept se nepodařilo vložit do dne.')
    } finally {
      setUsingRecipeId(null)
    }
  }

  function handleCreateIngredient() {
    if (!onCreateFood) return
    onCreateFood(recipeSearchQuery.trim())
  }

  function handleCreateRecipeFromFilter() {
    setRecipeForm({
      ...EMPTY_RECIPE_FORM,
      title: query.trim(),
      meal_types: mealFilter !== 'all' ? [mealFilter] : EMPTY_RECIPE_FORM.meal_types,
    })
    setRecipeError('')
    openPart('form')
  }

  function handleEditRequest(recipe) {
    if (recipe.source !== 'user') {
      editRecipe(recipe, { asCopy: true })
      return
    }

    setEditChoiceRecipeId((currentId) => currentId === recipe.id ? null : recipe.id)
  }

  return (
    <AccordionSection
      title="Recepty"
      subtitle="Chytrá knihovna jídel z potravin v databázi"
      colorClass="panel-cyan"
      isOpen={isOpen}
      onToggle={onToggle}
    >
      <div className="recipe-library">
        <div className="recipe-smart-box">
          <div>
            <div className="side-eyebrow">Chytré recepty</div>
            <h3>Vyber hotový recept nebo si připrav zadání pro AI</h3>
            <p>
              Recepty jsou postavené na potravinách z databáze. Další krok bude generování podle chuti,
              cíle, denního příjmu a potravin, které uživateli vadí.
            </p>
          </div>
          <div className="form-group">
            <label className="label">Na co máš chuť</label>
            <input
              className="input"
              value={smartPrompt}
              onChange={(e) => setSmartPrompt(e.target.value)}
              placeholder="Např. teplá večeře bez nadýmání, chci hubnout"
            />
            <div className="form-hint">
              Zatím slouží jako příprava zadání. AI napojení přidáme až nad ověřenou receptovou databází.
            </div>
          </div>
        </div>

        <InnerSection
          title={recipeForm.id ? 'Upravit recept' : 'Vytvořit recept'}
          subtitle={`${recipeForm.items.length} surovin`}
          isOpen={isRecipeFormOpen}
          onToggle={() => togglePart('form')}
        >
          <form onSubmit={handleRecipeSubmit}>
            <div className="recipe-form-grid">
              <div className="form-group">
                <label className="label">Název receptu</label>
                <input
                  className="input"
                  value={recipeForm.title}
                  onChange={(e) => setRecipeForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Např. jogurt s banánem a vločkami"
                />
              </div>
              <div className="form-group">
                <label className="label">Počet porcí</label>
                <input
                  className="input"
                  value={recipeForm.servings}
                  onChange={(e) => setRecipeForm((prev) => ({ ...prev, servings: e.target.value }))}
                  placeholder="1"
                />
              </div>
              <div className="form-group">
                <label className="label">Příprava min</label>
                <input
                  className="input"
                  value={recipeForm.prep_minutes}
                  onChange={(e) => setRecipeForm((prev) => ({ ...prev, prep_minutes: e.target.value }))}
                  placeholder="10"
                />
              </div>
              <div className="form-group">
                <label className="label">Vaření min</label>
                <input
                  className="input"
                  value={recipeForm.cook_minutes}
                  onChange={(e) => setRecipeForm((prev) => ({ ...prev, cook_minutes: e.target.value }))}
                  placeholder="20"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="label">Tagy jídla</label>
              <div className="recipe-tag-grid">
                {RECIPE_MEAL_TAGS.map((tag) => (
                  <label key={tag.key} className="recipe-tag-option">
                    <input
                      type="checkbox"
                      checked={recipeForm.meal_types.includes(tag.key)}
                      onChange={() => toggleRecipeType(tag.key)}
                    />
                    <span>{tag.title}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="recipe-form-grid">
              <div className="form-group">
                <label className="label">Zaměření</label>
                <select
                  className="input"
                  value={recipeForm.goal_type}
                  onChange={(e) => setRecipeForm((prev) => ({ ...prev, goal_type: e.target.value }))}
                >
                  <option value="none">Bez cíle</option>
                  <option value="lose_weight">Hubnutí</option>
                  <option value="maintain_weight">Udržení</option>
                  <option value="gain_weight">Nabírání</option>
                  <option value="digestive_comfort">Šetřit trávení</option>
                  <option value="low_fodmap">Low FODMAP</option>
                  <option value="low_histamine">Low histamin</option>
                </select>
              </div>
              <div className="form-group">
                <label className="label">Sacharidy</label>
                <select
                  className="input"
                  value={recipeForm.carb_level}
                  onChange={(e) => setRecipeForm((prev) => ({ ...prev, carb_level: e.target.value }))}
                >
                  <option value="unknown">Neurčeno</option>
                  <option value="low">Nízké</option>
                  <option value="medium">Střední</option>
                  <option value="high">Vyšší</option>
                </select>
              </div>
              <div className="form-group">
                <label className="label">Obtížnost</label>
                <select
                  className="input"
                  value={recipeForm.difficulty}
                  onChange={(e) => setRecipeForm((prev) => ({ ...prev, difficulty: e.target.value }))}
                >
                  <option value="easy">Snadné</option>
                  <option value="medium">Střední</option>
                  <option value="hard">Náročné</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="label">Popis receptu</label>
              <input
                className="input"
                value={recipeForm.note}
                onChange={(e) => setRecipeForm((prev) => ({ ...prev, note: e.target.value }))}
                placeholder="Krátký popis, pro koho se hodí, co na něm ladit..."
              />
            </div>

            <div className="form-group food-search-wrap">
              <label className="label">Přidat surovinu z databáze nebo vlastní potraviny</label>
              <input
                className="input"
                value={recipeSearchQuery}
                onChange={(e) => setRecipeSearchQuery(e.target.value)}
                placeholder="Např. banán, tvaroh, vejce, moje potravina..."
              />
              {recipeSearchResults.length > 0 ? (
                <div className="food-search-results">
                  {recipeSearchResults.map((food) => (
                    <button type="button" key={food.id} onClick={() => handleSelectRecipeFood(food)}>
                      <span>{food.name_cs}</span>
                      <small>
                        <FoodKindBadge food={food} />
                        <SighiBadge item={food} />
                        {hasServingSize(food.default_unit, food.serving_grams)
                          ? ` 1 ${food.default_unit} (${Math.round(Number(food.serving_grams))} g) •`
                          : ''}
                        {' '}
                        {Math.round(Number(food.kcal_100g || 0))} kcal / 100 g
                      </small>
                    </button>
                  ))}
                </div>
              ) : null}
              {isRecipeSearching ? <div className="form-hint">Hledám...</div> : null}
              {recipeSearchQuery.trim().length >= 2
                && !isRecipeSearching
                && lastIngredientSearchQuery === recipeSearchQuery.trim()
                && recipeSearchResults.length === 0
                && !selectedRecipeFood ? (
                <div className="not-found-box">
                  <strong>Potravina nenalezena.</strong>
                  <span>Chceš ji založit jako vlastní potravinu?</span>
                  <button type="button" className="button button-light button-small" onClick={handleCreateIngredient}>
                    Vytvořit potravinu
                  </button>
                </div>
              ) : null}
            </div>

            <div className="draft-edit-grid">
              <input
                className="input"
                value={recipeAmount}
                onChange={(e) => setRecipeAmount(e.target.value)}
                placeholder="Množství"
                aria-label="Množství nové suroviny"
              />
              <select
                className="input"
                value={recipeUnit}
                onChange={(e) => setRecipeUnit(e.target.value)}
                aria-label="Jednotka nové suroviny"
              >
                <option value="g">g</option>
                <option value="ml">ml</option>
                <option value="ks">ks</option>
                <option value="plátek">plátek</option>
                <option value="porce">porce</option>
                <option value="lžička">lžička</option>
                <option value="lžíce">lžíce</option>
              </select>
              <input
                className="input"
                value={recipeItemNote}
                onChange={(e) => setRecipeItemNote(e.target.value)}
                placeholder="Úprava suroviny"
                aria-label="Poznámka k nové surovině"
              />
              <button type="button" className="button button-light button-small" onClick={handleAddRecipeItem}>
                Přidat
              </button>
            </div>

            {recipeForm.items.length === 0 ? (
              <div className="empty-box">Přidej první surovinu z databáze, nebo napiš vlastní název a množství.</div>
            ) : (
              <>
                <div className="list">
                  {recipeForm.items.map((item) => (
                    <div key={item.id} className="editable-meal-item">
                      <div className="list-title">{item.name}</div>
                      <FoodValueDetails item={item} />
                      <div className="draft-edit-grid">
                        <input
                          className="input"
                          value={item.amount}
                          onChange={(e) => updateRecipeItem(item.id, { amount: e.target.value })}
                          aria-label="Množství"
                        />
                        <select
                          className="input"
                          value={item.unit || 'g'}
                          onChange={(e) => updateRecipeItem(item.id, { unit: e.target.value })}
                          aria-label="Jednotka"
                        >
                          <option value="g">g</option>
                          <option value="ml">ml</option>
                          <option value="ks">ks</option>
                          <option value="plátek">plátek</option>
                          <option value="porce">porce</option>
                          <option value="lžička">lžička</option>
                          <option value="lžíce">lžíce</option>
                        </select>
                        <input
                          className="input"
                          value={item.note || ''}
                          onChange={(e) => updateRecipeItem(item.id, { note: e.target.value })}
                          placeholder="Úprava suroviny"
                          aria-label="Poznámka"
                        />
                        <button
                          type="button"
                          className="delete-button"
                          onClick={() => setRecipeForm((prev) => ({
                            ...prev,
                            items: prev.items.filter((recipeItem) => recipeItem.id !== item.id),
                          }))}
                        >
                          Smazat
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <MealTotals items={recipeForm.items} />
              </>
            )}

            <div className="form-group">
              <label className="label">Postup přípravy</label>
              <textarea
                className="textarea"
                value={recipeForm.instructions}
                onChange={(e) => setRecipeForm((prev) => ({ ...prev, instructions: e.target.value }))}
                placeholder="1. Připrav suroviny&#10;2. Uvař / orestuj / promíchej&#10;3. Dochuť a podávej"
              />
            </div>

            <InnerSection
              title="AI / Google příprava"
              subtitle="Zadání pro automatické vytvoření receptu"
              isOpen={Boolean(openParts.ai)}
              onToggle={() => togglePart('ai')}
            >
              <div className="form-group">
                <label className="label">Co má recept splnit</label>
                <textarea
                  className="textarea"
                  value={recipeForm.ai_prompt}
                  onChange={(e) => setRecipeForm((prev) => ({ ...prev, ai_prompt: e.target.value }))}
                  placeholder="Např. chci večeři do 20 minut, bez cibule, low histamin, hodně bílkovin, ne moc sacharidů..."
                />
              </div>
              <div className="form-hint">
                Tohle je připravené jako strukturované zadání. Další krok bude napojení na AI nebo vyhledávání receptů a automatické doplnění surovin z databáze.
              </div>
            </InnerSection>

            {recipeError ? <div className="inline-error">{recipeError}</div> : null}

            <div className="inner-action-row">
              <button className="button button-full" type="submit" disabled={isRecipeSaving}>
                {isRecipeSaving ? 'Ukládám...' : recipeForm.id ? 'Uložit změny receptu' : 'Uložit recept'}
              </button>
              {recipeForm.id || recipeForm.items.length ? (
                <button className="button button-light" type="button" onClick={resetRecipeForm}>
                  Nový recept
                </button>
              ) : null}
            </div>
          </form>
        </InnerSection>

        <div className="recipe-filter-grid">
          <div className="form-group">
            <label className="label">Část dne</label>
            <select className="input" value={mealFilter} onChange={(e) => setMealFilter(e.target.value)}>
              <option value="all">Vše</option>

              {FOOD_MEAL_SECTIONS.map((section) => (
                <option key={section.key} value={section.key}>{section.title}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Cíl</label>
            <select className="input" value={goalFilter} onChange={(e) => setGoalFilter(e.target.value)}>
              <option value="all">Vše</option>
              <option value="lose_weight">Hubnutí</option>
              <option value="maintain_weight">Udržení</option>
              <option value="digestive_comfort">Šetřit trávení</option>
              <option value="low_carb">Nízkosacharidové</option>
              <option value="high_protein">Vysoký protein</option>
            </select>
          </div>
          <div className="form-group">
            <label className="label">Hledat</label>
            <input
              className="input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Kuře, večeře, low FODMAP..."
            />
          </div>
        </div>

        {message ? <div className="goal-status">{message}</div> : null}
        {isLoading ? <div className="empty-box">Načítám recepty...</div> : null}

        {!isLoading && filteredRecipes.length === 0 ? (
          <div className="empty-box">
            Recept nenalezen.
            <button type="button" className="button button-light button-small" onClick={handleCreateRecipeFromFilter}>
              Vytvořit recept
            </button>
          </div>
        ) : (
          <div className="recipe-compact-list">
            {filteredRecipes.map((recipe) => {
              const totals = getMealTotals(recipe.items || [])
              const mealTypes = (recipe.meal_types || [recipe.meal_type]).filter(Boolean)
              const actionTypes = mealTypes.filter((type) => type !== 'piti').slice(0, 3)
              const isExpanded = expandedRecipeId === recipe.id
              const isSystemRecipe = recipe.source === 'system'
              return (
                <article key={recipe.id} className={`recipe-row ${isExpanded ? 'recipe-row-open' : ''}`}>
                  <button
                    type="button"
                    className="recipe-row-summary"
                    onClick={() => setExpandedRecipeId(isExpanded ? null : recipe.id)}
                  >
                    <div>
                      <div className="recipe-source">{recipe.source === 'system' ? 'FoodLife recept' : recipe.source === 'ai' ? 'AI návrh' : 'Moje jídlo'}</div>
                      <h4>{recipe.title}</h4>
                    </div>
                    <strong>{Math.round(totals.kcal)} kcal</strong>
                    <span className={`accordion-arrow ${isExpanded ? 'open' : ''}`}>v</span>
                  </button>

                  {isExpanded ? (
                    <div className="recipe-row-detail">
                      {recipe.description ? <p>{recipe.description}</p> : null}

                  <div className="recipe-meta-row">
                    <span>{goalLabels[recipe.goal_type] || recipe.goal_type}</span>
                    {recipe.prep_minutes || recipe.cook_minutes ? <span>{Number(recipe.prep_minutes || 0) + Number(recipe.cook_minutes || 0)} min</span> : null}
                    {recipe.carb_level && recipe.carb_level !== 'unknown' ? <span>Sacharidy: {recipe.carb_level}</span> : null}
                  </div>

                  <div className="recipe-chip-list">
                    {(recipe.tag_labels || []).slice(0, 4).map((tag) => <span key={tag}>{tag}</span>)}
                  </div>

                  <MealTotals items={recipe.items || []} />

                  <div className="recipe-ingredients">
                    {(recipe.items || []).slice(0, 5).map((item) => (
                      <span key={item.id}>{item.name} {formatItemAmount(item)}</span>
                    ))}
                  </div>

                  {recipe.instructions ? <div className="recipe-instructions">{recipe.instructions}</div> : null}

                      <div className="recipe-use-actions">
                    {actionTypes.map((type) => {
                      const tag = RECIPE_MEAL_TAGS.find((item) => item.key === type)
                      const key = `${recipe.id}_${type}`
                      return (
                        <button
                          key={type}
                          className="button button-small"
                          type="button"
                          disabled={usingRecipeId === key}
                          onClick={() => handleUse(recipe, type)}
                        >
                          {usingRecipeId === key ? 'Vkládám...' : `Vložit: ${tag?.title || type}`}
                        </button>
                      )
                    })}
                        <button
                          className="button button-light button-small"
                          type="button"
                          onClick={() => handleEditRequest(recipe)}
                        >
                          {isSystemRecipe ? 'Upravit kopii' : 'Upravit'}
                        </button>
                        {!isSystemRecipe ? (
                          <button
                            className="delete-button"
                            type="button"
                            onClick={() => handleRecipeDelete(recipe.id)}
                          >
                            Smazat
                          </button>
                        ) : null}
                      </div>
                      {editChoiceRecipeId === recipe.id ? (
                        <div className="recipe-edit-choice">
                          <span>Chceš upravit tento recept, nebo z něj vytvořit novou kopii?</span>
                          <div>
                            <button
                              className="button button-small"
                              type="button"
                              onClick={() => {
                                setEditChoiceRecipeId(null)
                                editRecipe(recipe, { asCopy: false })
                              }}
                            >
                              Upravit stávající
                            </button>
                            <button
                              className="button button-light button-small"
                              type="button"
                              onClick={() => {
                                setEditChoiceRecipeId(null)
                                editRecipe(recipe, { asCopy: true })
                              }}
                            >
                              Vytvořit kopii
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              )
            })}
          </div>
        )}
      </div>
    </AccordionSection>
  )
}
function CustomFoodsManager({
  foods,
  recipes,
  isLoading,
  isRecipesLoading,
  isOpen,
  onToggle,
  editRecipeRequest,
  createFoodRequest,
  onSaveFood,
  onDeleteFood,
  onSaveRecipe,
  onDeleteRecipe,
}) {
  const [form, setForm] = useState(EMPTY_CUSTOM_FOOD)
  const [recipeForm, setRecipeForm] = useState(EMPTY_RECIPE_FORM)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [recipeSearchQuery, setRecipeSearchQuery] = useState('')
  const [recipeSearchResults, setRecipeSearchResults] = useState([])
  const [selectedRecipeFood, setSelectedRecipeFood] = useState(null)
  const [recipeAmount, setRecipeAmount] = useState('')
  const [recipeUnit, setRecipeUnit] = useState('g')
  const [recipeItemNote, setRecipeItemNote] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [isRecipeSearching, setIsRecipeSearching] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isRecipeSaving, setIsRecipeSaving] = useState(false)
  const [error, setError] = useState('')
  const [recipeError, setRecipeError] = useState('')
  const [openParts, setOpenParts] = useState({})
  const isRecipeFormOpen = recipeForm.id !== null || recipeForm.title.trim() !== '' || recipeForm.note.trim() !== '' || recipeForm.items.length > 0

  function togglePart(part) {
    setOpenParts((prev) => ({ ...prev, [part]: !prev[part] }))
  }

  function openPart(part) {
    setOpenParts((prev) => ({ ...prev, [part]: true }))
  }

  useEffect(() => {
    const q = searchQuery.trim()
    if (q.length < 2) {
      setSearchResults([])
      setIsSearching(false)
      return undefined
    }

    const controller = new AbortController()
    const timeout = window.setTimeout(async () => {
      setIsSearching(true)
      try {
        const response = await fetch(`foods-search.php?q=${encodeURIComponent(q)}`, {
          credentials: 'same-origin',
          signal: controller.signal,
        })
        if (!response.ok) throw new Error('food_search_failed')
        const data = await response.json()
        setSearchResults(data.foods || [])
      } catch (err) {
        if (err.name !== 'AbortError') setError('Potraviny se nepodařilo načíst.')
      } finally {
        setIsSearching(false)
      }
    }, 250)

    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [searchQuery])

  useEffect(() => {
    const q = recipeSearchQuery.trim()
    setRecipeError('')

    if (selectedRecipeFood?.name_cs === q) {
      setRecipeSearchResults([])
      setIsRecipeSearching(false)
      return undefined
    }

    if (q.length < 2) {
      setRecipeSearchResults([])
      setIsRecipeSearching(false)
      return undefined
    }

    const controller = new AbortController()
    const timeout = window.setTimeout(async () => {
      setIsRecipeSearching(true)
      try {
        const response = await fetch(`foods-search.php?q=${encodeURIComponent(q)}&type=food`, {
          credentials: 'same-origin',
          signal: controller.signal,
        })
        if (!response.ok) throw new Error('food_search_failed')
        const data = await response.json()
        setRecipeSearchResults(data.foods || [])
      } catch (err) {
        if (err.name !== 'AbortError') setRecipeError('Potraviny se nepodarilo nacist.')
      } finally {
        setIsRecipeSearching(false)
      }
    }, 250)

    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [recipeSearchQuery, selectedRecipeFood])

  function updateField(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
      ...(field === 'default_unit' && ['g', 'ml'].includes(value) ? { serving_grams: '' } : {}),
    }))
  }

  function formFromFood(food, { asEditableCopy = false } = {}) {
    return {
      id: asEditableCopy || food.source !== 'user' ? null : food.id,
      base_food_id: asEditableCopy || food.source !== 'user' ? food.id : null,
      food_kind: asEditableCopy || food.source !== 'user' ? 'edited' : food.food_kind,
      source: food.source,
      external_source: food.external_source,
      name_cs: food.name_cs || '',
      name_en: food.name_en || '',
      category: food.category || '',
      default_unit: food.default_unit || 'g',
      serving_grams: ['g', 'ml'].includes(food.default_unit) ? '' : food.serving_grams ?? '',
      kcal_100g: food.kcal_100g ?? '',
      protein_100g: food.protein_100g ?? '',
      carbs_100g: food.carbs_100g ?? '',
      fat_100g: food.fat_100g ?? '',
      fiber_100g: food.fiber_100g ?? '',
      sugar_100g: food.sugar_100g ?? '',
      sodium_mg_100g: food.sodium_mg_100g ?? '',
      note: food.note || '',
    }
  }

  function editFood(food) {
    setForm(formFromFood(food))
    setError('')
    openPart('foodForm')
  }

  function editSearchFood(food) {
    setForm(formFromFood(food, { asEditableCopy: food.source !== 'user' }))
    setSearchQuery('')
    setSearchResults([])
    setError('')
    openPart('foodForm')
  }

  function resetForm() {
    setForm(EMPTY_CUSTOM_FOOD)
    setError('')
  }

  function recipeFormFromRecipe(recipe, { asCopy = false } = {}) {
    return {
      id: asCopy ? null : recipe.id,
      title: recipe.title || '',
      note: recipe.description || '',
      meal_types: recipe.meal_types?.length ? recipe.meal_types : [recipe.meal_type || 'ostatni'],
      items: draftItemsFromRecipe(recipe),
    }
  }

  function editRecipe(recipe, options = {}) {
    const shouldCopy = options.asCopy || recipe.source !== 'user'
    setRecipeForm(recipeFormFromRecipe(recipe, { asCopy: shouldCopy }))
    setRecipeError('')
    openPart('recipes')
  }

  useEffect(() => {
    if (!editRecipeRequest?.recipe) return
    editRecipe(editRecipeRequest.recipe, { asCopy: editRecipeRequest.asCopy })
  }, [editRecipeRequest])

  useEffect(() => {
    if (!createFoodRequest?.token) return
    setForm({
      ...EMPTY_CUSTOM_FOOD,
      name_cs: createFoodRequest.name || '',
    })
    setSearchQuery('')
    setSearchResults([])
    setError('')
    openPart('foodForm')
  }, [createFoodRequest])

  function resetRecipeForm() {
    setRecipeForm(EMPTY_RECIPE_FORM)
    setRecipeError('')
    setRecipeSearchQuery('')
    setRecipeSearchResults([])
    setSelectedRecipeFood(null)
    setRecipeAmount('')
    setRecipeUnit('g')
    setRecipeItemNote('')
  }

  function toggleRecipeType(type) {
    setRecipeForm((prev) => {
      const hasType = prev.meal_types.includes(type)
      const nextTypes = hasType
        ? prev.meal_types.filter((item) => item !== type)
        : [...prev.meal_types, type]

      return {
        ...prev,
        meal_types: nextTypes.length ? nextTypes : [type],
      }
    })
  }

  function updateRecipeItem(itemId, patch) {
    setRecipeForm((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.id !== itemId) return item
        const next = { ...item, ...patch }
        next.grams = gramsFromAmount(next.amount, next.unit, next.serving_grams)
        return next
      }),
    }))
  }

  function handleSelectRecipeFood(food) {
    setSelectedRecipeFood(food)
    setRecipeSearchQuery(food.name_cs)
    setRecipeUnit(food.default_unit || 'g')
    setRecipeAmount(food.serving_grams ? '1' : '')
    setRecipeSearchResults([])
  }

  function handleAddRecipeItem() {
    const parsedAmount = parseAmount(recipeAmount)
    const name = selectedRecipeFood?.name_cs || recipeSearchQuery.trim()

    if (!name || !parsedAmount) {
      setRecipeError('Vyber surovinu a dopln mnozstvi.')
      return
    }

    const grams = gramsFromAmount(parsedAmount, recipeUnit, selectedRecipeFood?.serving_grams)
    setRecipeForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: createId(),
          food_id: selectedRecipeFood?.id || null,
          name,
          custom_name: selectedRecipeFood ? null : name,
          amount: parsedAmount,
          unit: recipeUnit,
          grams,
          serving_grams: selectedRecipeFood?.serving_grams ?? null,
          note: recipeItemNote.trim(),
          kcal_100g: selectedRecipeFood?.kcal_100g ?? null,
          protein_100g: selectedRecipeFood?.protein_100g ?? null,
          carbs_100g: selectedRecipeFood?.carbs_100g ?? null,
          fat_100g: selectedRecipeFood?.fat_100g ?? null,
          fiber_100g: selectedRecipeFood?.fiber_100g ?? null,
          ...sighiFieldsFromFood(selectedRecipeFood),
        },
      ],
    }))

    setRecipeSearchQuery('')
    setRecipeSearchResults([])
    setSelectedRecipeFood(null)
    setRecipeAmount('')
    setRecipeUnit('g')
    setRecipeItemNote('')
    setRecipeError('')
  }

  async function handleRecipeSubmit(e) {
    e.preventDefault()
    if (!recipeForm.title.trim()) {
      setRecipeError('Doplň název jídla.')
      return
    }
    if (recipeForm.items.length === 0) {
      setRecipeError('Jídlo musí mít aspoň jednu surovinu.')
      return
    }

    setIsRecipeSaving(true)
    setRecipeError('')
    try {
      await onSaveRecipe(recipeForm)
      setRecipeForm(EMPTY_RECIPE_FORM)
    } catch {
      setRecipeError('Uložené jídlo se nepodařilo uložit.')
    } finally {
      setIsRecipeSaving(false)
    }
  }

  async function handleRecipeDelete(recipeId) {
    try {
      await onDeleteRecipe(recipeId)
      if (recipeForm.id === recipeId) setRecipeForm(EMPTY_RECIPE_FORM)
    } catch {
      setRecipeError('Uložené jídlo se nepodařilo smazat.')
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name_cs.trim()) {
      setError('Doplň název potraviny.')
      return
    }

    setIsSaving(true)
    setError('')
    try {
      await onSaveFood(form)
      setForm(EMPTY_CUSTOM_FOOD)
    } catch {
      setError('Potravinu se nepodařilo uložit.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(foodId) {
    try {
      await onDeleteFood(foodId)
      if (form.id === foodId) setForm(EMPTY_CUSTOM_FOOD)
    } catch {
      setError('Potravinu se nepodařilo smazat.')
    }
  }

  return (
    <AccordionSection
      title="Moje potraviny"
      subtitle={`${foods.length} vlastních položek`}
      colorClass="panel-violet"
      isOpen={isOpen}
      onToggle={onToggle}
    >
      <InnerSection
        title={form.base_food_id ? 'Upravit databázovou potravinu' : form.id ? 'Upravit potravinu' : 'Nová potravina'}
        subtitle="Vytvoření nebo doladění hodnot na 100 g"
        isOpen={Boolean(openParts.foodForm)}
        onToggle={() => togglePart('foodForm')}
      >
        {form.id || form.base_food_id ? (
          <div className="inner-action-row">
            <button className="button button-light button-small" onClick={resetForm}>
              Nová
            </button>
          </div>
        ) : null}

        <div className="form-group food-search-wrap">
          <label className="label">Najít potravinu z databáze k úpravě</label>
          <input
            className="input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Např. jogurt, banán, tvaroh..."
          />
          {searchResults.length > 0 ? (
            <div className="food-search-results">
              {searchResults.map((food) => (
                <button type="button" key={food.id} onClick={() => editSearchFood(food)}>
                  <span>{food.name_cs}</span>
                  <small>
                    <FoodKindBadge food={food} />
                    <SighiBadge item={food} />
                    {hasServingSize(food.default_unit, food.serving_grams)
                      ? ` 1 ${food.default_unit} (${Math.round(Number(food.serving_grams))} g) •`
                      : ''}
                    {' '}
                    {Math.round(Number(food.kcal_100g || 0))} kcal / 100 g
                  </small>
                </button>
              ))}
            </div>
          ) : null}
          {isSearching ? <div className="form-hint">Hledám...</div> : null}
        </div>

        {form.base_food_id ? (
          <div className="food-edit-notice">Uloží se jako tvoje upravená kopie. Původní databázová položka zůstane beze změny.</div>
        ) : null}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label">Název</label>
            <input
              className="input"
              value={form.name_cs}
              onChange={(e) => updateField('name_cs', e.target.value)}
              placeholder="Např. řecký jogurt 5 %"
            />
          </div>

          <div className="custom-food-grid">
            <div className="form-group">
              <label className="label">Energie kcal / 100 g</label>
              <input className="input" value={form.kcal_100g} onChange={(e) => updateField('kcal_100g', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="label">Bílkoviny / 100 g</label>
              <input className="input" value={form.protein_100g} onChange={(e) => updateField('protein_100g', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="label">Sacharidy / 100 g</label>
              <input className="input" value={form.carbs_100g} onChange={(e) => updateField('carbs_100g', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="label">Tuky / 100 g</label>
              <input className="input" value={form.fat_100g} onChange={(e) => updateField('fat_100g', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="label">Vláknina / 100 g</label>
              <input className="input" value={form.fiber_100g} onChange={(e) => updateField('fiber_100g', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="label">Cukry / 100 g</label>
              <input className="input" value={form.sugar_100g} onChange={(e) => updateField('sugar_100g', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="label">Jednotka</label>
              <select className="input" value={form.default_unit} onChange={(e) => updateField('default_unit', e.target.value)}>
                <option value="g">g</option>
                <option value="ml">ml</option>
                <option value="ks">ks</option>
                <option value="plátek">plátek</option>
                <option value="porce">porce</option>
                <option value="lžička">lžička</option>
                <option value="lžíce">lžíce</option>
              </select>
            </div>
            {!['g', 'ml'].includes(form.default_unit) ? (
              <div className="form-group">
                <label className="label">Velikost 1 {form.default_unit} v gramech</label>
                <input
                  className="input"
                  value={form.serving_grams}
                  onChange={(e) => updateField('serving_grams', e.target.value)}
                  placeholder="Např. 150"
                />
              </div>
            ) : null}
          </div>

          <div className="form-group">
            <label className="label">Poznámka</label>
            <input
              className="input"
              value={form.note}
              onChange={(e) => updateField('note', e.target.value)}
              placeholder="Značka, obchod, složení..."
            />
          </div>

          {error ? <div className="inline-error">{error}</div> : null}

          <button className="button button-full" type="submit" disabled={isSaving}>
            {isSaving
              ? 'Ukládám...'
              : form.id
                ? 'Uložit změny potraviny'
                : form.base_food_id
                  ? 'Uložit jako upravenou potravinu'
                  : 'Vytvořit potravinu'}
          </button>
        </form>
      </InnerSection>

      <InnerSection
        title="Uložené vlastní potraviny"
        subtitle={`${foods.length} položek`}
        isOpen={Boolean(openParts.foods)}
        onToggle={() => togglePart('foods')}
      >
        {isLoading ? (
          <div className="empty-box">Načítám...</div>
        ) : foods.length === 0 ? (
          <div className="empty-box">Zatím tu není žádná vlastní potravina.</div>
        ) : (
          <div className="list">
            {foods.map((food) => (
              <div key={food.id} className="list-item">
                <div>
                  <div className="list-title">{food.name_cs}</div>
                  <div className="list-subtitle">
                    <FoodKindBadge food={food} />
                    <SighiBadge item={food} />
                    {' '}
                    {Math.round(Number(food.kcal_100g || 0))} kcal / 100 g
                    {hasServingSize(food.default_unit, food.serving_grams) ? ` • 1 ${food.default_unit} (${Math.round(Number(food.serving_grams))} g)` : ''}
                  </div>
                </div>
                <div className="saved-meal-actions">
                  <button className="button button-light button-small" onClick={() => editFood(food)}>
                    Upravit
                  </button>
                  <button className="delete-button" onClick={() => handleDelete(food.id)}>
                    Smazat
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </InnerSection>

      {false ? (
      <InnerSection
        title={isRecipeFormOpen ? (recipeForm.id ? 'Upravit uložené jídlo' : 'Upravit kopii jídla') : 'Uložená jídla'}
        subtitle={`${recipes.length} jídel`}
        isOpen={Boolean(openParts.recipes)}
        onToggle={() => togglePart('recipes')}
      >
        {isRecipeFormOpen ? (
          <div className="inner-action-row">
            <button className="button button-light button-small" onClick={resetRecipeForm}>
              Zavřít úpravu
            </button>
          </div>
        ) : null}

        {isRecipeFormOpen ? (
          <form onSubmit={handleRecipeSubmit}>
            <div className="form-group">
              <label className="label">Název jídla</label>
              <input
                className="input"
                value={recipeForm.title}
                onChange={(e) => setRecipeForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Např. míchaná vajíčka"
              />
            </div>

            <div className="form-group">
              <label className="label">Tagy jídla</label>
              <div className="recipe-tag-grid">
                {RECIPE_MEAL_TAGS.map((tag) => (
                  <label key={tag.key} className="recipe-tag-option">
                    <input
                      type="checkbox"
                      checked={recipeForm.meal_types.includes(tag.key)}
                      onChange={() => toggleRecipeType(tag.key)}
                    />
                    <span>{tag.title}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="label">Poznámka</label>
              <input
                className="input"
                value={recipeForm.note}
                onChange={(e) => setRecipeForm((prev) => ({ ...prev, note: e.target.value }))}
                placeholder="Např. bez cibule, lehčí večeře..."
              />
            </div>

            <div className="form-group food-search-wrap">
              <label className="label">Přidat surovinu</label>
              <input
                className="input"
                value={recipeSearchQuery}
                onChange={(e) => setRecipeSearchQuery(e.target.value)}
                placeholder="Např. banán, tvaroh, vejce..."
              />
              {recipeSearchResults.length > 0 ? (
                <div className="food-search-results">
                  {recipeSearchResults.map((food) => (
                    <button type="button" key={food.id} onClick={() => handleSelectRecipeFood(food)}>
                      <span>{food.name_cs}</span>
                      <small>
                        <FoodKindBadge food={food} />
                        <SighiBadge item={food} />
                        {hasServingSize(food.default_unit, food.serving_grams)
                          ? ` 1 ${food.default_unit} (${Math.round(Number(food.serving_grams))} g) -`
                          : ''}
                        {' '}
                        {Math.round(Number(food.kcal_100g || 0))} kcal / 100 g
                      </small>
                    </button>
                  ))}
                </div>
              ) : null}
              {isRecipeSearching ? <div className="form-hint">Hledám...</div> : null}
            </div>

            <div className="draft-edit-grid">
              <input
                className="input"
                value={recipeAmount}
                onChange={(e) => setRecipeAmount(e.target.value)}
                placeholder="Množství"
                aria-label="Množství nové suroviny"
              />
              <select
                className="input"
                value={recipeUnit}
                onChange={(e) => setRecipeUnit(e.target.value)}
                aria-label="Jednotka nové suroviny"
              >
                <option value="g">g</option>
                <option value="ml">ml</option>
                <option value="ks">ks</option>
                <option value="plátek">plátek</option>
                <option value="porce">porce</option>
                <option value="lžička">lžička</option>
                <option value="lžíce">lžíce</option>
              </select>
              <input
                className="input"
                value={recipeItemNote}
                onChange={(e) => setRecipeItemNote(e.target.value)}
                placeholder="Poznámka"
                aria-label="Poznámka k nové surovině"
              />
              <button type="button" className="button button-light button-small" onClick={handleAddRecipeItem}>
                Přidat
              </button>
            </div>

            {recipeForm.items.length === 0 ? (
              <div className="empty-box">Jídlo nemá žádné suroviny.</div>
            ) : (
              <div className="list">
                {recipeForm.items.map((item) => (
                  <div key={item.id} className="editable-meal-item">
                    <div className="list-title">{item.name}</div>
                    <FoodValueDetails item={item} />
                    <div className="draft-edit-grid">
                      <input
                        className="input"
                        value={item.amount}
                        onChange={(e) => updateRecipeItem(item.id, { amount: e.target.value })}
                        aria-label="Množství"
                      />
                      <select
                        className="input"
                        value={item.unit || 'g'}
                        onChange={(e) => updateRecipeItem(item.id, { unit: e.target.value })}
                        aria-label="Jednotka"
                      >
                        <option value="g">g</option>
                        <option value="ml">ml</option>
                        <option value="ks">ks</option>
                        <option value="plátek">plátek</option>
                        <option value="porce">porce</option>
                        <option value="lžička">lžička</option>
                        <option value="lžíce">lžíce</option>
                      </select>
                      <input
                        className="input"
                        value={item.note || ''}
                        onChange={(e) => updateRecipeItem(item.id, { note: e.target.value })}
                        placeholder="Poznámka"
                        aria-label="Poznámka"
                      />
                      <button
                        type="button"
                        className="delete-button"
                        onClick={() => setRecipeForm((prev) => ({
                          ...prev,
                          items: prev.items.filter((recipeItem) => recipeItem.id !== item.id),
                        }))}
                      >
                        Smazat
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {recipeError ? <div className="inline-error">{recipeError}</div> : null}

            <button className="button button-full" type="submit" disabled={isRecipeSaving}>
              {isRecipeSaving ? 'Ukládám...' : recipeForm.id ? 'Uložit změny jídla' : 'Uložit jako moje jídlo'}
            </button>
          </form>
        ) : null}

        {isRecipesLoading ? (
          <div className="empty-box">Načítám uložená jídla...</div>
        ) : recipes.length === 0 ? (
          <div className="empty-box">Zatím tu není žádné uložené jídlo.</div>
        ) : (
          <div className="list">
            {recipes.map((recipe) => (
              <div key={recipe.id} className="list-item">
                <div>
                  <div className="list-title">{recipe.title}</div>
                  <div className="list-subtitle">
                    {(recipe.meal_types || [recipe.meal_type]).map((type) => (
                      RECIPE_MEAL_TAGS.find((tag) => tag.key === type)?.title || type
                    )).join(' • ')}
                    {` • ${recipe.items.length} surovin`}
                  </div>
                </div>
                <div className="saved-meal-actions">
                  <button className="button button-light button-small" onClick={() => editRecipe(recipe)}>
                    Upravit
                  </button>
                  <button className="delete-button" onClick={() => handleRecipeDelete(recipe.id)}>
                    Smazat
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </InnerSection>
      ) : null}
    </AccordionSection>
  )
}

function getDefaultFoodMealKey() {
  const hour = new Date().getHours()
  if (hour < 10) return 'snidane'
  if (hour < 12) return 'svacina1'
  if (hour < 15) return 'obed'
  if (hour < 18) return 'svacina2'
  if (hour < 22) return 'vecere'
  return 'ostatni'
}

function MealQuickAdd({
  mealsByType,
  recipes,
  isRecipesLoading,
  quickAddRequest,
  onSaveMeal,
  onCreateFood,
  onCreateRecipe,
}) {
  const quickAddRef = useRef(null)
  const [mealKey, setMealKey] = useState(getDefaultFoodMealKey)
  const [mealTime, setMealTime] = useState(() => getDefaultMealTime(getDefaultFoodMealKey()))
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [selectedFood, setSelectedFood] = useState(null)
  const [amount, setAmount] = useState('')
  const [unit, setUnit] = useState('g')
  const [note, setNote] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isOpen, setIsOpen] = useState(true)
  const [lastFoodSearchQuery, setLastFoodSearchQuery] = useState('')

  const section = FOOD_MEAL_SECTIONS.find((item) => item.key === mealKey) || FOOD_MEAL_SECTIONS[0]
  const savedMeals = mealsByType[section.key] || []
  const allRecipes = recipes || []
  const searchNeedle = query.trim().toLowerCase()
  const recipeResults = searchNeedle.length >= 2 && !selectedFood ? allRecipes.filter((recipe) => {
    const haystack = [
      recipe.title,
      recipe.description,
      recipe.note,
      ...(recipe.items || []).map((item) => item.name || item.custom_name),
    ].filter(Boolean).join(' ').toLowerCase()
    return haystack.includes(searchNeedle)
  }) : []
  const hasSearchNeedle = searchNeedle.length >= 2 && !selectedFood
  const hasCombinedResults = hasSearchNeedle && (recipeResults.length > 0 || results.length > 0)
  const searchNotFound = hasSearchNeedle
    && !isSearching
    && !isRecipesLoading
    && lastFoodSearchQuery === query.trim()
    && recipeResults.length === 0
    && results.length === 0
  const timePresets = ['07:00', '10:00', '12:00', '15:00', '18:00']

  useEffect(() => {
    if (!quickAddRequest?.mealKey) return

    setMealKey(quickAddRequest.mealKey)
    setMealTime(getDefaultMealTime(quickAddRequest.mealKey))
    setIsOpen(true)
    setMessage('')
    setError('')

    const timeout = window.setTimeout(() => {
      quickAddRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }, 80)

    return () => window.clearTimeout(timeout)
  }, [quickAddRequest?.token])

  useEffect(() => {
    const q = query.trim()
    setError('')

    if (selectedFood?.name_cs === q) {
      setResults([])
      setIsSearching(false)
      return undefined
    }

    if (q.length < 2) {
      setResults([])
      setIsSearching(false)
      setLastFoodSearchQuery('')
      return undefined
    }

    const controller = new AbortController()
    const timeout = window.setTimeout(async () => {
      setIsSearching(true)
      try {
        const response = await fetch(`foods-search.php?q=${encodeURIComponent(q)}&type=food`, {
          credentials: 'same-origin',
          signal: controller.signal,
        })
        if (!response.ok) throw new Error('search_failed')
        const data = await response.json()
        setResults(data.foods || [])
        setLastFoodSearchQuery(q)
      } catch (err) {
        if (err.name !== 'AbortError') setError('Potraviny se nepodařilo načíst.')
      } finally {
        setIsSearching(false)
      }
    }, 250)

    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [query, selectedFood])

  function handleSelectFood(food) {
    const nextUnit = food.default_unit || 'g'
    setSelectedFood(food)
    setQuery(food.name_cs)
    setUnit(nextUnit)
    setAmount(hasServingSize(nextUnit, food.serving_grams) ? '1' : '')
    setResults([])
    setMessage('')
  }

  function resetFoodForm() {
    setQuery('')
    setSelectedFood(null)
    setResults([])
    setAmount('')
    setNote('')
  }

  function buildItem(parsedAmount, name) {
    return {
      id: createId(),
      food_id: selectedFood?.id || null,
      name,
      custom_name: selectedFood ? null : name,
      amount: parsedAmount,
      unit,
      grams: gramsFromAmount(parsedAmount, unit, selectedFood?.serving_grams),
      serving_grams: selectedFood?.serving_grams ?? null,
      note: note.trim(),
      kcal_100g: selectedFood?.kcal_100g ?? null,
      protein_100g: selectedFood?.protein_100g ?? null,
      carbs_100g: selectedFood?.carbs_100g ?? null,
      fat_100g: selectedFood?.fat_100g ?? null,
      fiber_100g: selectedFood?.fiber_100g ?? null,
      ...sighiFieldsFromFood(selectedFood),
    }
  }

  async function saveItems(items, mealNote = '') {
    const targetMeal = savedMeals[0] || null
    const nextItems = [...(targetMeal?.items || []), ...items]
    await onSaveMeal(section, nextItems, targetMeal?.note || mealNote, targetMeal?.id || null, mealTime)
    setMessage(`Přidáno do: ${section.title}`)
  }

  async function handleAddFood() {
    const parsedAmount = parseAmount(amount)
    const name = selectedFood?.name_cs || query.trim()

    if (!name || !parsedAmount) {
      setError('Vyber potravinu a doplň množství.')
      return
    }

    setIsSaving(true)
    setError('')
    setMessage('')
    try {
      await saveItems([buildItem(parsedAmount, name)])
      resetFoodForm()
    } catch {
      setError('Položku se nepodařilo uložit.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleInsertRecipe(recipe) {
    if (!recipe) {
      setError('Vyber uložené jídlo.')
      return
    }

    setIsSaving(true)
    setError('')
    setMessage('')
    try {
      await saveItems(draftItemsFromRecipe(recipe), recipe.title)
      resetFoodForm()
    } catch {
      setError('Uložené jídlo se nepodařilo vložit.')
    } finally {
      setIsSaving(false)
    }
  }

  function handleCreateFood() {
    if (!onCreateFood) return
    onCreateFood(query.trim())
  }

  function handleCreateRecipe() {
    if (!onCreateRecipe) return
    onCreateRecipe(query.trim(), section.key)
  }

  return (
    <div ref={quickAddRef} className="quick-add-anchor">
      <InnerSection
        title="Přidat jídlo"
        subtitle={`${section.title} • jedna akce pro celý den`}
        isOpen={isOpen}
        onToggle={() => setIsOpen((value) => !value)}
      >
      <div className="quick-meal-entry">
        <div className="form-group">
          <label className="label">Co to je za jídlo</label>
          <select
            className="input"
            value={mealKey}
            onChange={(e) => {
              const nextMealKey = e.target.value
              setMealKey(nextMealKey)
              setMealTime(getDefaultMealTime(nextMealKey))
              setQuery('')
              setSelectedFood(null)
              setResults([])
              setMessage('')
            }}
          >
            {FOOD_MEAL_SECTIONS.map((item) => (
              <option key={item.key} value={item.key}>{item.title}</option>
            ))}
          </select>
        </div>

        <div className="time-picker-panel">
          <div className="form-group">
            <label className="label">Čas jídla</label>
            <input
              className="input"
              type="time"
              value={mealTime}
              onChange={(e) => setMealTime(e.target.value)}
            />
          </div>
          <div className="time-chip-row" aria-label="Rychlá volba času">
            {timePresets.map((time) => (
              <button
                key={time}
                type="button"
                className={mealTime === time ? 'time-chip active' : 'time-chip'}
                onClick={() => setMealTime(time)}
              >
                {time}
              </button>
            ))}
          </div>
        </div>

        <div className="quick-meal-columns">
          <div className="quick-meal-card">
            <div className="quick-meal-card-title">Potravina nebo recept</div>
            <div className="form-group food-search-wrap">
              <label className="label">Vyhledat</label>
              <input
                className="input"
                value={query}
                onChange={(e) => {
                  setSelectedFood(null)
                  setQuery(e.target.value)
                  setMessage('')
                }}
                placeholder="Např. banán, rýže, jogurt nebo název receptu..."
              />
              {hasCombinedResults ? (
                <div className="food-search-results">
                  {recipeResults.map((recipe) => {
                    const totals = getMealTotals(recipe.items || [])
                    return (
                      <button type="button" key={`recipe-${recipe.id}`} onClick={() => handleInsertRecipe(recipe)} disabled={isSaving}>
                        <span className="search-result-copy">
                          <span>{recipe.title}</span>
                          <small>
                            <span className="result-type-badge recipe">Recept</span>
                            {(recipe.items || []).length} surovin • {Math.round(totals.kcal)} kcal
                          </small>
                        </span>
                      </button>
                    )
                  })}
                  {results.map((food) => (
                    <button type="button" key={`food-${food.id}`} onClick={() => handleSelectFood(food)}>
                      <span className="search-result-copy">
                        <span>{food.name_cs}</span>
                        <small>
                          <span className="result-type-badge food">Potravina</span>
                          <FoodKindBadge food={food} />
                          <SighiBadge item={food} />
                          {hasServingSize(food.default_unit, food.serving_grams) ? ` 1 ${food.default_unit} (${Math.round(Number(food.serving_grams))} g) • ` : ' '}
                          {Math.round(Number(food.kcal_100g || 0))} kcal / 100 g
                        </small>
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
              {isSearching ? <div className="form-hint">Hledám...</div> : null}
              {searchNotFound ? (
                <div className="not-found-box">
                  <strong>Nic nenalezeno.</strong>
                  <span>Můžeš založit vlastní potravinu nebo nový recept.</span>
                  <div className="inline-action-row">
                    <button type="button" className="button button-light button-small" onClick={handleCreateFood}>
                      Vytvořit potravinu
                    </button>
                    <button type="button" className="button button-light button-small" onClick={handleCreateRecipe}>
                      Vytvořit recept
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="meal-input-grid">
              <div className="form-group">
                <label className="label">Množství</label>
                <input className="input" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="150" />
              </div>
              <div className="form-group">
                <label className="label">Jednotka</label>
                <select className="input" value={unit} onChange={(e) => setUnit(e.target.value)}>
                  <option value="g">g</option>
                  <option value="ml">ml</option>
                  <option value="ks">ks</option>
                  <option value="plátek">plátek</option>
                  <option value="porce">porce</option>
                  <option value="lžička">lžička</option>
                  <option value="lžíce">lžíce</option>
                </select>
                {hasServingSize(unit, selectedFood?.serving_grams) ? (
                  <div className="form-hint">1 {unit} ({Math.round(Number(selectedFood.serving_grams))} g)</div>
                ) : null}
              </div>
            </div>

            <div className="form-group">
              <label className="label">Poznámka</label>
              <input
                className="input"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Např. vařené, bez cukru, větší porce"
              />
            </div>

            <button className="button button-full" onClick={handleAddFood} disabled={isSaving}>
              {isSaving ? 'Ukládám...' : `Přidat do ${section.title.toLowerCase()}`}
            </button>
          </div>

        </div>

        {error ? <div className="inline-error">{error}</div> : null}
        {message ? <div className="save-message">{message}</div> : null}
      </div>
      </InnerSection>
    </div>
  )
}

function MealSection({
  section,
  savedMeals,
  recipes,
  isRecipesLoading,
  profile,
  embedded = false,
  hideEntry = false,
  isOpen,
  onToggle,
  onQuickAdd,
  onSaveMeal,
  onDeleteMeal,
  onSaveRecipe,
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [selectedFood, setSelectedFood] = useState(null)
  const [amount, setAmount] = useState('')
  const [unit, setUnit] = useState(section.key === 'piti' ? 'ml' : 'g')
  const [note, setNote] = useState('')
  const [draftItems, setDraftItems] = useState([])
  const [mealNote, setMealNote] = useState('')
  const [mealTime, setMealTime] = useState(() => getDefaultMealTime(section.key))
  const [editingMealId, setEditingMealId] = useState(null)
  const [expandedDraftItems, setExpandedDraftItems] = useState({})
  const [expandedSavedItems, setExpandedSavedItems] = useState({})
  const [recipeTitle, setRecipeTitle] = useState('')
  const [isRecipeSaving, setIsRecipeSaving] = useState(false)
  const [quickDrinkSaving, setQuickDrinkSaving] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [openParts, setOpenParts] = useState({ hydration: true, builder: true, overview: true })
  const isDrinkSection = section.key === 'piti'

  function togglePart(part) {
    setOpenParts((prev) => ({ ...prev, [part]: !prev[part] }))
  }

  function openPart(part) {
    setOpenParts((prev) => ({ ...prev, [part]: true }))
  }

  useEffect(() => {
    const q = query.trim()
    setError('')

    if (selectedFood?.name_cs === q) {
      setResults([])
      setIsSearching(false)
      return undefined
    }

    if (q.length < 2) {
      setResults([])
      setIsSearching(false)
      return undefined
    }

    const controller = new AbortController()
    const timeout = window.setTimeout(async () => {
      setIsSearching(true)
      try {
        const response = await fetch(`foods-search.php?q=${encodeURIComponent(q)}&type=${section.key === 'piti' ? 'drink' : 'food'}`, {
          credentials: 'same-origin',
          signal: controller.signal,
        })
        if (!response.ok) throw new Error('search_failed')
        const data = await response.json()
        setResults(data.foods || [])
      } catch (err) {
        if (err.name !== 'AbortError') setError('Potraviny se nepodařilo načíst.')
      } finally {
        setIsSearching(false)
      }
    }, 250)

    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [query, selectedFood])

  function handleSelectFood(food) {
    setSelectedFood(food)
    setQuery(food.name_cs)
    setUnit(food.default_unit || (section.key === 'piti' ? 'ml' : 'g'))
    setAmount(section.key === 'piti' && (food.default_unit || 'ml') === 'ml' ? '250' : food.serving_grams ? '1' : '')
    setResults([])
  }

  function getAutosaveMeal() {
    return savedMeals[0] || null
  }

  function resetBuilderForm() {
    setQuery('')
    setSelectedFood(null)
    setResults([])
    setAmount('')
    setNote('')
  }

  function buildSelectedMealItem(parsedAmount, name) {
    const grams = gramsFromAmount(parsedAmount, unit, selectedFood?.serving_grams)
    return {
      id: createId(),
      food_id: selectedFood?.id || null,
      name,
      custom_name: selectedFood ? null : name,
      amount: parsedAmount,
      unit,
      grams,
      serving_grams: selectedFood?.serving_grams ?? null,
      note: note.trim(),
      kcal_100g: selectedFood?.kcal_100g ?? null,
      protein_100g: selectedFood?.protein_100g ?? null,
      carbs_100g: selectedFood?.carbs_100g ?? null,
      fat_100g: selectedFood?.fat_100g ?? null,
      fiber_100g: selectedFood?.fiber_100g ?? null,
      ...sighiFieldsFromFood(selectedFood),
    }
  }

  async function handleAddItem() {
    const parsedAmount = parseAmount(amount)
    const name = selectedFood?.name_cs || query.trim()

    if (!name || !parsedAmount) {
      setError('Vyber potravinu a doplň množství.')
      openPart('builder')
      return
    }

    const nextItem = buildSelectedMealItem(parsedAmount, name)

    if (editingMealId) {
      setDraftItems((prev) => [...prev, nextItem])
      resetBuilderForm()
      setError('')
      openPart('draft')
      return
    }

    const targetMeal = getAutosaveMeal()
    const nextItems = [...(targetMeal?.items || []), nextItem]

    setIsSaving(true)
    setError('')
    try {
      await onSaveMeal(
        section,
        nextItems,
        targetMeal?.note || '',
        targetMeal?.id || null,
        targetMeal ? getMealTimeValue(targetMeal) : getDefaultMealTime(section.key),
      )
      resetBuilderForm()
      openPart('overview')
    } catch {
      setError('Položku se nepodařilo uložit.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleInsertRecipe(recipe) {
    if (!recipe) {
      setError('Vyber uložené jídlo.')
      openPart('builder')
      return
    }

    const recipeItems = draftItemsFromRecipe(recipe)

    if (editingMealId) {
      setDraftItems((prev) => [...prev, ...recipeItems])
      setMealNote((prev) => prev || recipe.title)
      resetBuilderForm()
      setError('')
      openPart('draft')
      return
    }

    const targetMeal = getAutosaveMeal()
    const nextItems = [...(targetMeal?.items || []), ...recipeItems]

    setIsSaving(true)
    setError('')
    try {
      await onSaveMeal(
        section,
        nextItems,
        targetMeal?.note || recipe.title,
        targetMeal?.id || null,
        targetMeal ? getMealTimeValue(targetMeal) : getDefaultMealTime(section.key),
      )
      resetBuilderForm()
      openPart('overview')
    } catch {
      setError('Uložené jídlo se nepodařilo vložit.')
    } finally {
      setIsSaving(false)
    }
  }

  function updateDraftItem(itemId, patch) {
    setDraftItems((prev) => prev.map((item) => {
      if (item.id !== itemId) return item

      const next = { ...item, ...patch }
      next.grams = gramsFromAmount(next.amount, next.unit, next.serving_grams)
      return next
    }))
  }

  function toggleDraftItem(itemId) {
    setExpandedDraftItems((prev) => ({ ...prev, [itemId]: !prev[itemId] }))
  }

  function toggleSavedItem(itemId) {
    setExpandedSavedItems((prev) => ({ ...prev, [itemId]: !prev[itemId] }))
  }

  function handleEditMeal(meal) {
    setEditingMealId(meal.id)
    setDraftItems(meal.items.map((item) => ({
      id: createId(),
      original_item_id: item.id,
      food_id: item.food_id,
      recipe_id: item.recipe_id,
      name: item.name || item.custom_name,
      custom_name: item.custom_name,
      amount: item.amount || '',
      unit: item.unit || item.default_unit || 'g',
      grams: item.grams ?? gramsFromAmount(item.amount, item.unit || item.default_unit || 'g', item.serving_grams),
      serving_grams: item.serving_grams ?? null,
      note: item.note || '',
      kcal_100g: item.kcal_100g,
      protein_100g: item.protein_100g,
      carbs_100g: item.carbs_100g,
      fat_100g: item.fat_100g,
      fiber_100g: item.fiber_100g,
      ...sighiFieldsFromFood(item),
    })))
    setMealNote(meal.note || '')
    setMealTime(getMealTimeValue(meal))
    setError('')
    setExpandedDraftItems({})
    openPart('draft')
  }

  function cancelEditMeal() {
    setEditingMealId(null)
    setDraftItems([])
    setMealNote('')
    setMealTime(getDefaultMealTime(section.key))
    setExpandedDraftItems({})
    setError('')
  }

  async function handleSaveMeal() {
    if (draftItems.length === 0 || isSaving) return

    setIsSaving(true)
    setError('')
    try {
      await onSaveMeal(section, draftItems, mealNote, editingMealId, mealTime)
      setDraftItems([])
      setMealNote('')
      setMealTime(getDefaultMealTime(section.key))
      setEditingMealId(null)
      setExpandedDraftItems({})
    } catch {
      setError('Jídlo se nepodařilo uložit.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDeleteSavedItem(meal, itemId) {
    if (isSaving) return

    const nextItems = (meal.items || []).filter((item) => item.id !== itemId)
    setIsSaving(true)
    setError('')
    try {
      if (nextItems.length === 0) {
        await onDeleteMeal(meal.id)
      } else {
        await onSaveMeal(section, nextItems, meal.note || '', meal.id, getMealTimeValue(meal))
      }
    } catch {
      setError('Položku se nepodařilo smazat.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleSaveRecipe() {
    const title = recipeTitle.trim() || mealNote.trim() || section.title
    if (draftItems.length === 0 || isRecipeSaving) return

    setIsRecipeSaving(true)
    setError('')
    try {
      await onSaveRecipe({
        title,
        meal_types: [section.key],
        note: mealNote,
        items: draftItems,
      })
      setRecipeTitle('')
    } catch {
      setError('Uložené jídlo se nepodařilo vytvořit.')
    } finally {
      setIsRecipeSaving(false)
    }
  }

  async function handleQuickDrink(name, ml) {
    if (quickDrinkSaving) return

    setQuickDrinkSaving(name)
    setError('')
    try {
      await onSaveMeal(section, [{
        id: createId(),
        food_id: null,
        name,
        custom_name: name,
        amount: ml,
        unit: 'ml',
        grams: ml,
        serving_grams: null,
        note: 'rychlé přidání',
        kcal_100g: 0,
        protein_100g: 0,
        carbs_100g: 0,
        fat_100g: 0,
        fiber_100g: 0,
      }], name)
    } catch {
      setError('Nápoj se nepodařilo uložit.')
    } finally {
      setQuickDrinkSaving('')
    }
  }

  const savedCount = savedMeals.reduce((sum, meal) => sum + meal.items.length, 0)
  const fluidTargetMl = getFluidTargetMl(profile)
  const drinkMealsForHydration = editingMealId
    ? savedMeals.filter((meal) => meal.id !== editingMealId)
    : savedMeals
  const fluidDraftMl = isDrinkSection ? getDrinkItemsMl(draftItems) : 0
  const fluidSavedMl = isDrinkSection ? getDrinkMealsMl(drinkMealsForHydration) : 0
  const fluidCurrentMl = fluidSavedMl + fluidDraftMl
  const fluidProgress = fluidTargetMl ? Math.min(100, Math.round((fluidCurrentMl / fluidTargetMl) * 100)) : 0
  const sectionSubtitle = isDrinkSection
    ? `${formatFluidMl(fluidCurrentMl)} / ${formatFluidMl(fluidTargetMl)} • ${savedCount} položek`
    : `${savedMeals.length} uložených jídel • ${savedCount} položek`
  const hasSavedItems = savedCount > 0
  const showEntryTools = !hideEntry || editingMealId || isDrinkSection
  const searchNeedle = query.trim().toLowerCase()
  const canSearchRecipes = !isDrinkSection && !selectedFood
  const recipeResults = canSearchRecipes && searchNeedle.length >= 2 ? (recipes || []).filter((recipe) => {
    const haystack = [
      recipe.title,
      recipe.description,
      recipe.note,
      ...(recipe.items || []).map((item) => item.name || item.custom_name),
    ].filter(Boolean).join(' ').toLowerCase()
    return haystack.includes(searchNeedle)
  }) : []
  const hasSearchNeedle = searchNeedle.length >= 2 && !selectedFood
  const hasCombinedResults = hasSearchNeedle && (recipeResults.length > 0 || results.length > 0)

  const sectionContent = (
    <>
      {isDrinkSection ? (
        <InnerSection
          title="Pitný režim"
          subtitle={`${formatFluidMl(fluidCurrentMl)} z ${formatFluidMl(fluidTargetMl)}`}
          isOpen={openParts.hydration !== false}
          onToggle={() => togglePart('hydration')}
        >
          <div className="hydration-panel">
            <div className="hydration-top">
              <div>
                <span>Dnes vypito</span>
                <strong>{formatFluidMl(fluidCurrentMl)}</strong>
              </div>
              <div>
                <span>Doporučení</span>
                <strong>{formatFluidMl(fluidTargetMl)}</strong>
              </div>
              <div>
                <span>Zbývá</span>
                <strong>{formatFluidMl(Math.max(0, fluidTargetMl - fluidCurrentMl))}</strong>
              </div>
            </div>
            <div className="hydration-meter" aria-label="Plnění pitného režimu">
              <span style={{ width: `${fluidProgress}%` }} />
            </div>
            {fluidDraftMl > 0 ? (
              <div className="form-hint">Včetně rozpracovaných nápojů: {formatFluidMl(fluidDraftMl)}</div>
            ) : null}
            <div className="hydration-actions">
              <button className="button button-light" onClick={() => handleQuickDrink('Voda', 250)} disabled={Boolean(quickDrinkSaving)}>
                Voda 250 ml
              </button>
              <button className="button button-light" onClick={() => handleQuickDrink('Čaj', 250)} disabled={Boolean(quickDrinkSaving)}>
                Čaj 250 ml
              </button>
              <button className="button button-light" onClick={() => handleQuickDrink('Voda', 500)} disabled={Boolean(quickDrinkSaving)}>
                Voda 500 ml
              </button>
            </div>
            {quickDrinkSaving ? <div className="form-hint">Ukládám {quickDrinkSaving.toLowerCase()}...</div> : null}
          </div>
        </InnerSection>
      ) : null}

      {showEntryTools ? (
        <InnerSection
          title={`Skládání ${section.title.toLowerCase()}`}
          subtitle={selectedFood ? selectedFood.name_cs : section.key === 'piti' ? 'Přidat nápoj' : 'Potravina nebo recept'}
          isOpen={Boolean(openParts.builder)}
          onToggle={() => togglePart('builder')}
        >
          <div className="form-group food-search-wrap">
            <label className="label">{section.key === 'piti' ? 'Nápoj' : 'Potravina nebo recept'}</label>
            <input
              className="input"
              value={query}
              onChange={(e) => {
                setSelectedFood(null)
                setQuery(e.target.value)
              }}
              placeholder={section.key === 'piti' ? 'Např. voda, káva, džus...' : 'Např. banán, rýže, jogurt nebo recept...'}
            />
            {hasCombinedResults ? (
              <div className="food-search-results">
                {recipeResults.map((recipe) => {
                  const totals = getMealTotals(recipe.items || [])
                  return (
                    <button type="button" key={`recipe-${recipe.id}`} onClick={() => handleInsertRecipe(recipe)} disabled={isSaving}>
                      <span className="search-result-copy">
                        <span>{recipe.title}</span>
                        <small>
                          <span className="result-type-badge recipe">Recept</span>
                          {(recipe.items || []).length} surovin • {Math.round(totals.kcal)} kcal
                        </small>
                      </span>
                    </button>
                  )
                })}
                {results.map((food) => (
                  <button type="button" key={`food-${food.id}`} onClick={() => handleSelectFood(food)}>
                    <span className="search-result-copy">
                      <span>{food.name_cs}</span>
                      <small>
                        <span className="result-type-badge food">Potravina</span>
                        <FoodKindBadge food={food} />
                        <SighiBadge item={food} />
                        {hasServingSize(food.default_unit, food.serving_grams) ? ` 1 ${food.default_unit} (${Math.round(Number(food.serving_grams))} g) • ` : ' '}
                        {Math.round(Number(food.kcal_100g || 0))} kcal / 100 {section.key === 'piti' ? 'ml' : 'g'}
                      </small>
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
            {isSearching ? <div className="form-hint">Hledám...</div> : null}
          </div>

          <div className="meal-input-grid">
            <div className="form-group">
              <label className="label">Množství</label>
              <input
                className="input"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={section.key === 'piti' ? '250' : '150'}
              />
            </div>

            <div className="form-group">
              <label className="label">Jednotka</label>
              <select className="input" value={unit} onChange={(e) => setUnit(e.target.value)}>
                <option value="g">g</option>
                <option value="ml">ml</option>
                <option value="ks">ks</option>
                <option value="plátek">plátek</option>
                <option value="porce">porce</option>
                <option value="lžička">lžička</option>
                <option value="lžíce">lžíce</option>
              </select>
              {hasServingSize(unit, selectedFood?.serving_grams) ? (
                <div className="form-hint">1 {unit} ({Math.round(Number(selectedFood.serving_grams))} g)</div>
              ) : null}
            </div>
          </div>

          <div className="form-group">
            <label className="label">Poznámka k položce</label>
            <input
              className="input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={section.key === 'piti' ? 'Např. bez cukru, po tréninku, s ledem' : 'Např. vařená rýže, bez cukru, po tréninku'}
            />
          </div>

          {error ? <div className="inline-error">{error}</div> : null}

          <button className="button button-full" onClick={handleAddItem} disabled={isSaving}>
            {isSaving ? 'Ukládám...' : 'Přidat'}
          </button>
        </InnerSection>
      ) : null}

      {editingMealId ? (
        <InnerSection
          title={`Úprava ${section.title.toLowerCase()}`}
          subtitle={`${draftItems.length} položek`}
          isOpen={Boolean(openParts.draft)}
          onToggle={() => togglePart('draft')}
        >
          <div className="inner-action-row">
            <button className="button button-light button-small" onClick={cancelEditMeal}>
              Zrušit úpravy
            </button>
          </div>
          {draftItems.length === 0 ? (
            <div className="empty-box">Přidej první položku a potom úpravy ulož.</div>
          ) : (
            <>
              <div className="list">
                {draftItems.map((item) => (
                  <div key={item.id} className="editable-meal-item">
                    <button className="meal-item-toggle" onClick={() => toggleDraftItem(item.id)}>
                      <div>
                        <div className="list-title">{item.name}</div>
                        <div className="list-subtitle">
                          {formatItemAmount(item)}
                          {item.note ? ` • ${item.note}` : ''}
                          <SighiBadge item={item} />
                        </div>
                      </div>
                    </button>

                    {expandedDraftItems[item.id] ? <FoodValueDetails item={item} /> : null}

                    <div className="draft-edit-grid">
                      <input
                        className="input"
                        value={item.amount}
                        onChange={(e) => updateDraftItem(item.id, { amount: e.target.value })}
                        aria-label="Množství"
                      />
                      <select
                        className="input"
                        value={item.unit || 'g'}
                        onChange={(e) => updateDraftItem(item.id, { unit: e.target.value })}
                        aria-label="Jednotka"
                      >
                        <option value="g">g</option>
                        <option value="ml">ml</option>
                        <option value="ks">ks</option>
                        <option value="plátek">plátek</option>
                        <option value="porce">porce</option>
                        <option value="lžička">lžička</option>
                        <option value="lžíce">lžíce</option>
                      </select>
                      <input
                        className="input"
                        value={item.note || ''}
                        onChange={(e) => updateDraftItem(item.id, { note: e.target.value })}
                        placeholder="Poznámka"
                        aria-label="Poznámka"
                      />
                      <button
                        className="delete-button"
                        onClick={() => setDraftItems((prev) => prev.filter((draft) => draft.id !== item.id))}
                      >
                        Smazat
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <MealTotals items={draftItems} />

              <div className="form-group">
                <label className="label">Poznámka k celému jídlu</label>
                <input
                  className="input"
                  value={mealNote}
                  onChange={(e) => setMealNote(e.target.value)}
                  placeholder="Např. rychlá snídaně, větší porce, po běhu"
                />
              </div>

              <div className="form-group">
                <label className="label">Čas jídla</label>
                <input
                  className="input"
                  type="time"
                  value={mealTime}
                  onChange={(e) => setMealTime(e.target.value)}
                />
              </div>

              <button className="button button-full" onClick={handleSaveMeal} disabled={isSaving}>
                {isSaving ? 'Ukládám...' : `Uložit úpravy ${section.title.toLowerCase()}`}
              </button>
            </>
          )}
        </InnerSection>
      ) : null}

      <InnerSection
        title="Dnešní přehled"
        subtitle={`${savedMeals.length} záznamů`}
        isOpen={Boolean(openParts.overview)}
        onToggle={() => togglePart('overview')}
      >
        {savedMeals.length === 0 ? (
          <div className="empty-box">Zatím není uložený žádný záznam.</div>
        ) : (
          <div className="list">
            {savedMeals.map((meal) => (
              <div key={meal.id} className="saved-meal">
                <div className="saved-meal-head">
                  <div>
                    <div className="list-title">{meal.title || section.title}</div>
                    <div className="list-subtitle">{meal.meal_time?.slice(11, 16)}</div>
                  </div>
                  <div className="saved-meal-actions">
                    <button className="button button-light button-small" onClick={() => handleEditMeal(meal)}>
                      Upravit
                    </button>
                    <button className="delete-button" onClick={() => onDeleteMeal(meal.id)}>
                      Smazat
                    </button>
                  </div>
                </div>
                <div className="meal-item-lines">
                  {meal.items.map((item) => (
                    <div key={item.id} className="saved-meal-item">
                      <button className="meal-item-toggle" onClick={() => toggleSavedItem(item.id)}>
                        <span>{item.name || item.custom_name}<SighiBadge item={item} /></span>
                        <span>{formatItemAmount(item)}</span>
                      </button>
                      <button
                        className="delete-button button-small"
                        onClick={() => handleDeleteSavedItem(meal, item.id)}
                        disabled={isSaving}
                      >
                        Smazat položku
                      </button>
                      {expandedSavedItems[item.id] ? <FoodValueDetails item={item} /> : null}
                    </div>
                  ))}
                </div>
                <MealTotals items={meal.items} />
              </div>
            ))}
          </div>
        )}
      </InnerSection>
    </>
  )

  if (embedded) return sectionContent

  return (
    <AccordionSection
      title={section.title}
      subtitle={sectionSubtitle}
      colorClass={section.colorClass}
      statusClass={hasSavedItems ? 'meal-complete' : 'meal-missing'}
      headerAction={onQuickAdd ? (
        <button
          type="button"
          className="accordion-action-button"
          onClick={onQuickAdd}
        >
          Přidat
        </button>
      ) : null}
      isOpen={isOpen}
      onToggle={onToggle}
    >
      {sectionContent}
    </AccordionSection>
  )
}

function ExercisePanel({ todayInfo, onTodayInfoChange, profile }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [selectedExercise, setSelectedExercise] = useState(null)
  const [amount, setAmount] = useState('')
  const [manualName, setManualName] = useState('')
  const [manualAmount, setManualAmount] = useState('')
  const [manualKcal, setManualKcal] = useState('')
  const [manualNote, setManualNote] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState('')
  const [manualError, setManualError] = useState('')
  const [openParts, setOpenParts] = useState({ database: true, manual: false, entries: true })

  const profileWeight = parseAmount(profile.weight) || parseAmount(profile.startWeight)
  const exerciseEntries = useMemo(() => normalizeExerciseEntries(todayInfo), [todayInfo])
  const estimatedKcal = useMemo(() => (
    calculateExerciseKcal(selectedExercise, amount, profileWeight)
  ), [selectedExercise, amount, profileWeight])

  function togglePart(part) {
    setOpenParts((prev) => ({ ...prev, [part]: !prev[part] }))
  }

  useEffect(() => {
    const q = query.trim()
    setError('')

    if (selectedExercise?.name_cs === q) {
      setResults([])
      setIsSearching(false)
      return undefined
    }

    if (q.length < 2) {
      setResults([])
      setIsSearching(false)
      return undefined
    }

    const controller = new AbortController()
    const timeout = window.setTimeout(async () => {
      setIsSearching(true)
      try {
        const response = await fetch(`exercises-search.php?q=${encodeURIComponent(q)}`, {
          credentials: 'same-origin',
          signal: controller.signal,
        })
        if (!response.ok) throw new Error('exercise_search_failed')
        const data = await response.json()
        setResults(data.exercises || [])
      } catch (err) {
        if (err.name !== 'AbortError') {
          setResults([])
          setError('Databáze cvičení není dostupná. Zkontroluj import tabulky exercises.')
        }
      } finally {
        setIsSearching(false)
      }
    }, 250)

    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [query, selectedExercise])

  function selectExercise(exercise) {
    setSelectedExercise(exercise)
    setQuery(exercise.name_cs)
    setAmount(exercise.default_amount || '')
    setResults([])
    setError('')
  }

  function syncExerciseEntries(nextEntries) {
    onTodayInfoChange('exerciseEntries', nextEntries)
    onTodayInfoChange('exercise', getExerciseEntriesSummary(nextEntries))
    onTodayInfoChange('exerciseKcal', String(Math.round(getExerciseEntriesKcal(nextEntries))))
  }

  function addExerciseToDay() {
    const kcal = estimatedKcal ? Math.round(estimatedKcal) : null

    if (!selectedExercise || !kcal) {
      setError(profileWeight ? 'Vyber aktivitu a doplň množství.' : 'Doplň v profilu hmotnost, aby šel spočítat výdej.')
      return
    }

    const unitLabel = getExerciseUnitLabel(selectedExercise.calc_unit)
    syncExerciseEntries([
      ...exerciseEntries,
      {
        id: createId(),
        source: 'database',
        exercise_id: selectedExercise.id,
        name: selectedExercise.name_cs,
        amount: String(amount),
        unit: unitLabel,
        kcal: String(kcal),
        category: selectedExercise.category || '',
        intensity: selectedExercise.intensity || '',
        calc_unit: selectedExercise.calc_unit,
        met: selectedExercise.met,
        kcal_per_rep: selectedExercise.kcal_per_rep,
        kcal_per_km_per_kg: selectedExercise.kcal_per_km_per_kg,
        note: selectedExercise.note || '',
      },
    ])

    setQuery('')
    setSelectedExercise(null)
    setAmount('')
    setResults([])
    setError('')
  }

  function addManualExercise() {
    const kcal = parseAmount(manualKcal)
    if (!manualName.trim() || !kcal) {
      setManualError('Doplň název aktivity a kcal.')
      return
    }

    syncExerciseEntries([
      ...exerciseEntries,
      {
        id: createId(),
        source: 'manual',
        name: manualName.trim(),
        amount: manualAmount.trim(),
        unit: '',
        kcal: String(Math.round(kcal)),
        note: manualNote.trim(),
      },
    ])

    setManualName('')
    setManualAmount('')
    setManualKcal('')
    setManualNote('')
    setManualError('')
  }

  function updateExerciseEntry(entryId, patch) {
    const nextEntries = exerciseEntries.map((entry) => {
      if (entry.id !== entryId) return entry

      const next = { ...entry, ...patch }
      if (Object.prototype.hasOwnProperty.call(patch, 'amount') && next.source === 'database') {
        const recalculated = calculateExerciseKcal(next, next.amount, profileWeight)
        if (recalculated) next.kcal = String(Math.round(recalculated))
      }

      return next
    })

    syncExerciseEntries(nextEntries)
  }

  function deleteExerciseEntry(entryId) {
    syncExerciseEntries(exerciseEntries.filter((entry) => entry.id !== entryId))
  }

  return (
    <div className="exercise-panel">
      <InnerSection
        title="Vybrat cvičení z databáze"
        subtitle={selectedExercise ? selectedExercise.name_cs : 'Najdi aktivitu a nech spočítat výdej'}
        isOpen={Boolean(openParts.database)}
        onToggle={() => togglePart('database')}
      >
        <div className="form-group food-search-wrap">
          <label className="label">Aktivita</label>
          <input
            className="input"
            value={query}
            onChange={(e) => {
              setSelectedExercise(null)
              setQuery(e.target.value)
            }}
            placeholder="Např. kliky, kolo, běh, chůze..."
          />
          {results.length > 0 ? (
            <div className="food-search-results">
              {results.map((exercise) => (
                <button type="button" key={exercise.id} onClick={() => selectExercise(exercise)}>
                  <span>{exercise.name_cs}</span>
                  <small>
                    {exercise.category}
                    {exercise.intensity ? ` • ${exercise.intensity}` : ''}
                    {exercise.calc_unit === 'duration' && exercise.met ? ` • MET ${exercise.met}` : ''}
                  </small>
                </button>
              ))}
            </div>
          ) : null}
          {isSearching ? <div className="form-hint">Hledám...</div> : null}
        </div>

        <div className="exercise-input-grid">
          <div className="form-group">
            <label className="label">{getExerciseUnitHint(selectedExercise?.calc_unit)}</label>
            <input
              className="input"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={selectedExercise?.default_amount || '30'}
            />
          </div>
          <div className="exercise-estimate">
            <span>Odhad výdeje</span>
            <strong>{estimatedKcal ? `${Math.round(estimatedKcal)} kcal` : '-'}</strong>
          </div>
        </div>

        {selectedExercise?.note ? <div className="form-hint">{selectedExercise.note}</div> : null}
        {!profileWeight && selectedExercise && selectedExercise.calc_unit !== 'reps' ? (
          <div className="inline-error">Pro výpočet podle času nebo vzdálenosti je potřeba hmotnost v profilu.</div>
        ) : null}
        {error ? <div className="inline-error">{error}</div> : null}

        <button className="button button-full" onClick={addExerciseToDay}>
          Přidat
        </button>
      </InnerSection>

      <InnerSection
        title="Přidat ručně"
        subtitle="Když máš údaj z hodinek nebo aplikace"
        isOpen={Boolean(openParts.manual)}
        onToggle={() => togglePart('manual')}
      >
        <div className="form-group">
          <label className="label">Aktivita</label>
          <input
            className="input"
            value={manualName}
            onChange={(e) => setManualName(e.target.value)}
            placeholder="Např. Posilovna, kolo, běh..."
          />
        </div>

        <div className="exercise-manual-grid">
          <div className="form-group">
            <label className="label">Množství / délka</label>
            <input
              className="input"
              value={manualAmount}
              onChange={(e) => setManualAmount(e.target.value)}
              placeholder="Např. 45 min, 30 km"
            />
          </div>
          <div className="form-group">
            <label className="label">Kcal</label>
            <input
              className="input"
              type="number"
              min="0"
              step="1"
              value={manualKcal}
              onChange={(e) => setManualKcal(e.target.value)}
              placeholder="Např. 250"
            />
          </div>
        </div>

        <div className="form-group">
          <label className="label">Poznámka</label>
          <input
            className="input"
            value={manualNote}
            onChange={(e) => setManualNote(e.target.value)}
            placeholder="Např. Apple Watch, vyšší tep, kopce..."
          />
        </div>

        {manualError ? <div className="inline-error">{manualError}</div> : null}

        <button className="button button-full" onClick={addManualExercise}>
          Přidat
        </button>
      </InnerSection>

      <InnerSection
        title="Dnešní cvičení"
        subtitle={`${exerciseEntries.length} položek • ${Math.round(getExerciseEntriesKcal(exerciseEntries))} kcal`}
        isOpen={Boolean(openParts.entries)}
        onToggle={() => togglePart('entries')}
      >
        {exerciseEntries.length === 0 ? (
          <div className="empty-box">Zatím tu není žádné cvičení.</div>
        ) : (
          <>
            <div className="list">
              {exerciseEntries.map((entry) => (
                <div key={entry.id} className="exercise-entry editable-meal-item">
                  <div>
                    <div className="list-title">{entry.name}</div>
                    <div className="list-subtitle">
                      {entry.amount ? `${entry.amount}${entry.unit ? ` ${entry.unit}` : ''}` : 'Bez množství'}
                      {entry.category ? ` • ${entry.category}` : ''}
                      {entry.source === 'database' ? ' • databáze' : ' • ručně'}
                    </div>
                  </div>

                  <div className="exercise-entry-grid">
                    <input
                      className="input"
                      value={entry.name || ''}
                      onChange={(e) => updateExerciseEntry(entry.id, { name: e.target.value })}
                      aria-label="Název aktivity"
                    />
                    <input
                      className="input"
                      value={entry.amount || ''}
                      onChange={(e) => updateExerciseEntry(entry.id, { amount: e.target.value })}
                      aria-label="Množství"
                      placeholder="Množství"
                    />
                    <input
                      className="input"
                      type="number"
                      min="0"
                      step="1"
                      value={entry.kcal || ''}
                      onChange={(e) => updateExerciseEntry(entry.id, { kcal: e.target.value })}
                      aria-label="Kcal"
                      placeholder="kcal"
                    />
                    <input
                      className="input"
                      value={entry.note || ''}
                      onChange={(e) => updateExerciseEntry(entry.id, { note: e.target.value })}
                      aria-label="Poznámka"
                      placeholder="Poznámka"
                    />
                    <button className="delete-button" onClick={() => deleteExerciseEntry(entry.id)}>
                      Smazat
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="exercise-total">
              <span>Celkový výdej</span>
              <strong>{Math.round(getExerciseEntriesKcal(exerciseEntries))} kcal</strong>
            </div>
          </>
        )}
      </InnerSection>
    </div>
  )
}

function ToiletPanel({ todayInfo, onTodayInfoChange }) {
  const entries = useMemo(() => normalizeToiletEntries(todayInfo), [todayInfo])
  const [time, setTime] = useState(getCurrentTimeValue)
  const [consistency, setConsistency] = useState('Normální')
  const [note, setNote] = useState('')

  function saveEntries(nextEntries) {
    onTodayInfoChange('toiletEntries', nextEntries)
    onTodayInfoChange('toiletCount', String(nextEntries.length))
    onTodayInfoChange('toiletType', nextEntries[0]?.consistency || 'Normální')
  }

  function handleAdd() {
    const nextEntry = {
      id: createId(),
      time: time || getCurrentTimeValue(),
      consistency,
      note: note.trim(),
      createdAt: new Date().toISOString(),
    }
    saveEntries([...entries, nextEntry].sort((a, b) => String(a.time).localeCompare(String(b.time))))
    setTime(getCurrentTimeValue())
    setConsistency('Normální')
    setNote('')
  }

  function updateEntry(entryId, patch) {
    const nextEntries = entries
      .map((entry) => (entry.id === entryId ? { ...entry, ...patch } : entry))
      .sort((a, b) => String(a.time).localeCompare(String(b.time)))
    saveEntries(nextEntries)
  }

  function deleteEntry(entryId) {
    saveEntries(entries.filter((entry) => entry.id !== entryId))
  }

  return (
    <div className="toilet-panel">
      <div className="card">
        <h3 className="card-title">Přidat toaletu</h3>

        <div className="toilet-form-grid">
          <div className="form-group">
            <label className="label">Čas</label>
            <input
              className="input"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="label">Konzistence</label>
            <select
              className="input"
              value={consistency}
              onChange={(e) => setConsistency(e.target.value)}
            >
              <option>Tvrdá</option>
              <option>Tvrdší</option>
              <option>Normální</option>
              <option>Měkčí</option>
              <option>Řidší</option>
              <option>Průjem</option>
              <option>Zácpa</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="label">Poznámka</label>
          <input
            className="input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Např. bolest břicha, nadýmání, po jídle..."
          />
        </div>

        <button className="button button-full" type="button" onClick={handleAdd}>
          Přidat
        </button>
      </div>

      <div className="card">
        <h3 className="card-title">Dnešní záznamy</h3>
        {entries.length === 0 ? (
          <div className="empty-box">Dnes zatím není žádný záznam.</div>
        ) : (
          <div className="list">
            {entries.map((entry) => (
              <div key={entry.id} className="toilet-entry">
                <div className="toilet-entry-head">
                  <strong>{entry.time || '-'}</strong>
                  <span>{entry.consistency}</span>
                </div>
                <div className="toilet-entry-grid">
                  <input
                    className="input"
                    type="time"
                    value={entry.time || ''}
                    onChange={(e) => updateEntry(entry.id, { time: e.target.value })}
                    aria-label="Čas záznamu toalety"
                  />
                  <select
                    className="input"
                    value={entry.consistency || 'Normální'}
                    onChange={(e) => updateEntry(entry.id, { consistency: e.target.value })}
                    aria-label="Konzistence"
                  >
                    <option>Tvrdá</option>
                    <option>Tvrdší</option>
                    <option>Normální</option>
                    <option>Měkčí</option>
                    <option>Řidší</option>
                    <option>Průjem</option>
                    <option>Zácpa</option>
                  </select>
                  <input
                    className="input"
                    value={entry.note || ''}
                    onChange={(e) => updateEntry(entry.id, { note: e.target.value })}
                    placeholder="Poznámka"
                    aria-label="Poznámka"
                  />
                  <button className="delete-button" type="button" onClick={() => deleteEntry(entry.id)}>
                    Smazat
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function HistaminePanel({ histamineSummary, reactions }) {
  const topItems = histamineSummary.riskyItems.slice(0, 6)
  const insight = getHistamineReactionInsight(histamineSummary, reactions)

  return (
    <div className="histamine-panel">
      <div className={`histamine-score-card ${histamineSummary.level.tone}`}>
        <div>
          <span>Histaminové riziko dne</span>
          <strong>{histamineSummary.level.label}</strong>
          <p>{histamineSummary.level.text}</p>
        </div>
        <div className="histamine-score">
          <strong>{histamineSummary.score}</strong>
          <span>bodů</span>
        </div>
      </div>

      <div className="histamine-metrics">
        <div>
          <span>Spárované položky</span>
          <strong>{histamineSummary.knownItems}</strong>
        </div>
        <div>
          <span>Bez SIGHI dat</span>
          <strong>{histamineSummary.unknownItems}</strong>
        </div>
        <div>
          <span>Zapsané příznaky</span>
          <strong>{reactions.length}</strong>
        </div>
      </div>

      <div className="card histamine-explainer">
        <h3 className="card-title">Jak to počítáme</h3>
        <p>
          Nejde o přesné mg histaminu. SIGHI je kompatibilitní škála, proto FoodLife počítá
          orientační rizikové body podle skóre 0-3, markerů H/A/L/B a velikosti porce.
        </p>
      </div>

      <div className="card">
        <h3 className="card-title">Největší tahouni rizika</h3>
        {topItems.length === 0 ? (
          <div className="empty-box">Z dnešních jídel zatím nevychází žádná riziková SIGHI položka.</div>
        ) : (
          <div className="histamine-risk-list">
            {topItems.map((item) => (
              <div key={`${item.id}_${item.mealTitle}`} className="histamine-risk-item">
                <div>
                  <div className="list-title">
                    {item.name || item.custom_name}
                    <SighiBadge item={item} />
                  </div>
                  <div className="list-subtitle">
                    {item.mealTitle || 'Jídlo'} • {formatItemAmount(item)}
                    {item.sighi_food ? ` • SIGHI: ${item.sighi_food}` : ''}
                  </div>
                </div>
                <strong>{Math.round(item.risk.points * 10) / 10} b</strong>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="card-title">Rozpad podle jídel</h3>
        {histamineSummary.meals.length === 0 ? (
          <div className="empty-box">Zatím tu nejsou jídla k vyhodnocení.</div>
        ) : (
          <div className="histamine-meal-list">
            {histamineSummary.meals.map(({ meal, score, level, items }) => (
              <div key={meal.id} className="histamine-meal-row">
                <div>
                  <div className="list-title">{meal.title}</div>
                  <div className="list-subtitle">
                    {level.label}
                    {items.length ? ` • ${items.slice(0, 3).map((item) => item.name || item.custom_name).join(', ')}` : ''}
                  </div>
                </div>
                <strong>{Math.round(score * 10) / 10} b</strong>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card histamine-insight">
        <h3 className="card-title">Zpětné vyhodnocení</h3>
        <p>{insight}</p>
      </div>
    </div>
  )
}

function ReactionsPanel({ reactions, histamineSummary, onAddReaction, onUpdateReaction, onDeleteReaction }) {
  const [type, setType] = useState(REACTION_TYPES[0])
  const [intensity, setIntensity] = useState('5')
  const [time, setTime] = useState(getCurrentTimeValue)
  const [onsetSpeed, setOnsetSpeed] = useState(ONSET_SPEEDS[0])
  const [note, setNote] = useState('')

  function handleSubmit(e) {
    e.preventDefault()

    onAddReaction({
      type,
      intensity: Number(intensity),
      time: time || getCurrentTimeValue(),
      onsetSpeed,
      note: note.trim(),
    })

    setType(REACTION_TYPES[0])
    setIntensity('5')
    setTime(getCurrentTimeValue())
    setOnsetSpeed(ONSET_SPEEDS[0])
    setNote('')
  }

  return (
    <div className="event-panel">
      <form className="card" onSubmit={handleSubmit}>
        <h3 className="card-title">Přidat reakci těla</h3>

        <div className="event-form-grid">
          <div className="form-group">
            <label className="label">Čas</label>
            <input
              className="input"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="label">Typ reakce</label>
            <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
              {REACTION_TYPES.map((reactionType) => (
                <option key={reactionType}>{reactionType}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="label">Nástup</label>
            <select
              className="input"
              value={onsetSpeed}
              onChange={(e) => setOnsetSpeed(e.target.value)}
            >
              {ONSET_SPEEDS.map((speed) => (
                <option key={speed}>{speed}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="label">Intenzita: {intensity}/10</label>
          <input
            className="input"
            type="range"
            min="0"
            max="10"
            value={intensity}
            onChange={(e) => setIntensity(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="label">Poznámka</label>
          <textarea
            className="textarea"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Co přesně cítíš, kde, jak dlouho, po čem se to zhoršilo..."
          />
        </div>

        <button className="button button-full" type="submit">
          Přidat
        </button>
      </form>

      {reactions.length > 0 ? (
        <div className="card histamine-insight">
          <h4 className="card-title">Histaminová stopa</h4>
          <p>{getHistamineReactionInsight(histamineSummary, reactions)}</p>
        </div>
      ) : null}

      <div className="card">
        <h4 className="card-title">Dnešní reakce</h4>

        {reactions.length === 0 ? (
          <div className="empty-box">Zatím tu není žádná reakce.</div>
        ) : (
          <div className="list">
            {reactions.map((reaction) => (
              <div key={reaction.id} className="event-entry">
                <div className="event-entry-head">
                  <strong>{getReactionTimeValue(reaction) || '-'}</strong>
                  <span>{reaction.type}</span>
                </div>
                <div className="event-entry-grid">
                  <input
                    className="input"
                    type="time"
                    value={getReactionTimeValue(reaction)}
                    onChange={(e) => onUpdateReaction(reaction.id, { time: e.target.value, onsetTime: '' })}
                    aria-label="Čas reakce"
                  />
                  <select
                    className="input"
                    value={reaction.type || REACTION_TYPES[0]}
                    onChange={(e) => onUpdateReaction(reaction.id, { type: e.target.value })}
                    aria-label="Typ reakce"
                  >
                    {REACTION_TYPES.map((reactionType) => (
                      <option key={reactionType}>{reactionType}</option>
                    ))}
                  </select>
                  <select
                    className="input"
                    value={reaction.onsetSpeed || ONSET_SPEEDS[0]}
                    onChange={(e) => onUpdateReaction(reaction.id, { onsetSpeed: e.target.value })}
                    aria-label="Nástup reakce"
                  >
                    {ONSET_SPEEDS.map((speed) => (
                      <option key={speed}>{speed}</option>
                    ))}
                  </select>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    max="10"
                    value={reaction.intensity ?? ''}
                    onChange={(e) => onUpdateReaction(reaction.id, { intensity: Number(e.target.value) })}
                    aria-label="Intenzita"
                  />
                  <input
                    className="input"
                    value={reaction.note || ''}
                    onChange={(e) => onUpdateReaction(reaction.id, { note: e.target.value })}
                    placeholder="Poznámka"
                    aria-label="Poznámka"
                  />
                  <button className="delete-button" onClick={() => onDeleteReaction(reaction.id)}>
                    Smazat
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function MoodPanel({ todayInfo, onTodayInfoChange }) {
  const entries = useMemo(() => normalizeMoodEntries(todayInfo), [todayInfo])
  const [time, setTime] = useState(getCurrentTimeValue)
  const [mood, setMood] = useState(todayInfo.mood || 'Dobře')
  const [energy, setEnergy] = useState('5')
  const [note, setNote] = useState('')

  function saveEntries(nextEntries) {
    onTodayInfoChange('moodEntries', nextEntries)
    onTodayInfoChange('mood', nextEntries[0]?.mood || mood || 'Dobře')
    onTodayInfoChange('moodNote', nextEntries[0]?.note || '')
  }

  function handleAdd() {
    const nextEntry = {
      id: createId(),
      time: time || getCurrentTimeValue(),
      mood,
      energy: Number(energy),
      note: note.trim(),
      createdAt: new Date().toISOString(),
    }
    saveEntries([...entries, nextEntry].sort((a, b) => String(a.time).localeCompare(String(b.time))))
    setTime(getCurrentTimeValue())
    setMood('Dobře')
    setEnergy('5')
    setNote('')
  }

  function updateEntry(entryId, patch) {
    const nextEntries = entries
      .map((entry) => (entry.id === entryId ? { ...entry, ...patch } : entry))
      .sort((a, b) => String(a.time).localeCompare(String(b.time)))
    saveEntries(nextEntries)
  }

  function deleteEntry(entryId) {
    saveEntries(entries.filter((entry) => entry.id !== entryId))
  }

  return (
    <div className="event-panel">
      <div className="card">
        <h3 className="card-title">Přidat pocit</h3>

        <div className="event-form-grid">
          <div className="form-group">
            <label className="label">Čas</label>
            <input
              className="input"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="label">Nálada</label>
            <select className="input" value={mood} onChange={(e) => setMood(e.target.value)}>
              <option>Skvěle</option>
              <option>Dobře</option>
              <option>Normálně</option>
              <option>Unaveně</option>
              <option>Špatně</option>
            </select>
          </div>

          <div className="form-group">
            <label className="label">Energie: {energy}/10</label>
            <input
              className="input"
              type="range"
              min="0"
              max="10"
              value={energy}
              onChange={(e) => setEnergy(e.target.value)}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="label">Poznámka</label>
          <input
            className="input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Např. nafouklý, bez energie, soustředěný..."
          />
        </div>

        <button className="button button-full" type="button" onClick={handleAdd}>
          Přidat
        </button>
      </div>

      <div className="card">
        <h3 className="card-title">Dnešní pocity</h3>
        {entries.length === 0 ? (
          <div className="empty-box">Dnes zatím není žádný záznam.</div>
        ) : (
          <div className="list">
            {entries.map((entry) => (
              <div key={entry.id} className="event-entry">
                <div className="event-entry-head">
                  <strong>{entry.time || '-'}</strong>
                  <span>{entry.mood} • energie {entry.energy ?? '-'}/10</span>
                </div>
                <div className="event-entry-grid mood-entry-grid">
                  <input
                    className="input"
                    type="time"
                    value={entry.time || ''}
                    onChange={(e) => updateEntry(entry.id, { time: e.target.value })}
                    aria-label="Čas pocitu"
                  />
                  <select
                    className="input"
                    value={entry.mood || 'Dobře'}
                    onChange={(e) => updateEntry(entry.id, { mood: e.target.value })}
                    aria-label="Nálada"
                  >
                    <option>Skvěle</option>
                    <option>Dobře</option>
                    <option>Normálně</option>
                    <option>Unaveně</option>
                    <option>Špatně</option>
                  </select>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    max="10"
                    value={entry.energy ?? ''}
                    onChange={(e) => updateEntry(entry.id, { energy: Number(e.target.value) })}
                    aria-label="Energie"
                  />
                  <input
                    className="input"
                    value={entry.note || ''}
                    onChange={(e) => updateEntry(entry.id, { note: e.target.value })}
                    placeholder="Poznámka"
                    aria-label="Poznámka"
                  />
                  <button className="delete-button" type="button" onClick={() => deleteEntry(entry.id)}>
                    Smazat
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SleepPanel({ todayInfo, onTodayInfoChange }) {
  const entries = useMemo(() => normalizeSleepEntries(todayInfo), [todayInfo])
  const sleepEntry = entries[0] || null
  const fellAsleepAt = sleepEntry?.fellAsleepAt || '22:00'
  const durationHours = Number(sleepEntry?.durationHours ?? 8)
  const quality = sleepEntry?.quality || 'V kuse'
  const note = sleepEntry?.note || ''

  function saveSleep(patch) {
    const nextEntry = {
      id: sleepEntry?.id || createId(),
      fellAsleepAt,
      durationHours,
      quality,
      note,
      createdAt: sleepEntry?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...patch,
    }
    onTodayInfoChange('sleepEntries', [nextEntry])
  }

  function adjustDuration(delta) {
    const nextValue = Math.max(0, Math.min(16, durationHours + delta))
    saveSleep({ durationHours: nextValue })
  }

  function clearSleep() {
    onTodayInfoChange('sleepEntries', [])
  }

  return (
    <div className="sleep-panel">
      <div className="card sleep-card">
        <h3 className="card-title">Spánek</h3>

        <div className="sleep-grid">
          <div className="form-group">
            <label className="label">Usnul jsem v</label>
            <input
              className="input"
              type="time"
              value={fellAsleepAt}
              onChange={(e) => saveSleep({ fellAsleepAt: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="label">Délka spánku</label>
            <div className="sleep-stepper">
              <button type="button" onClick={() => adjustDuration(-1)} aria-label="Ubrat hodinu">-</button>
              <strong>{durationHours} h</strong>
              <button type="button" onClick={() => adjustDuration(1)} aria-label="Přidat hodinu">+</button>
            </div>
          </div>

          <div className="form-group">
            <label className="label">Kvalita spánku</label>
            <select className="input" value={quality} onChange={(e) => saveSleep({ quality: e.target.value })}>
              <option>V kuse</option>
              <option>Probouzel jsem se</option>
              <option>Lehký spánek</option>
              <option>Neklidný spánek</option>
              <option>Špatný spánek</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="label">Popis</label>
          <textarea
            className="input"
            rows="3"
            value={note}
            onChange={(e) => saveSleep({ note: e.target.value })}
            placeholder="Např. usínání, noční buzení, sny, ráno energie..."
          />
        </div>

        <div className="inline-action-row">
          {!sleepEntry ? (
            <button className="button button-full" type="button" onClick={() => saveSleep({})}>
              Přidat
            </button>
          ) : (
            <button className="button button-light button-small" type="button" onClick={clearSleep}>
              Vymazat
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function textToDiaryHtml(text) {
  const escaped = String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

  return escaped
    .split(/\n{2,}/)
    .map((part) => `<p>${part.replace(/\n/g, '<br />') || '<br />'}</p>`)
    .join('')
}

function htmlToPlainText(html) {
  const element = document.createElement('div')
  element.innerHTML = html || ''
  return element.textContent?.trim() || ''
}

function ReportModal({
  open,
  onClose,
  selectedDate,
  currentMeals,
  currentInfo,
  currentReactions,
  dayInfo,
  reactions,
  profile,
  goals,
}) {
  const [fromDate, setFromDate] = useState(selectedDate)
  const [toDate, setToDate] = useState(selectedDate)
  const [reportDays, setReportDays] = useState([])
  const [reportWeights, setReportWeights] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setFromDate(selectedDate)
    setToDate(selectedDate)
    setReportDays([])
    setReportWeights([])
    setError('')
  }, [open, selectedDate])

  if (!open) return null

  async function fetchJson(url) {
    const response = await fetch(url, {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) throw new Error(url)
    return response.json()
  }

  async function loadReport() {
    const totalDays = getDateRangeLength(fromDate, toDate)
    if (totalDays > REPORT_MAX_DAYS) {
      setError(`Report jde najednou vytvořit maximálně pro ${REPORT_MAX_DAYS} dnů.`)
      return
    }

    const dates = getDateRange(fromDate, toDate)
    setIsLoading(true)
    setError('')

    try {
      const start = dates[0]
      const end = dates[dates.length - 1]
      const weightPromise = fetchJson(`weight-logs.php?end_date=${encodeURIComponent(end)}&days=${Math.max(7, dates.length)}`)

      const days = await Promise.all(dates.map(async (date) => {
        const [mealsData, healthData, journalData] = date === selectedDate
          ? [
              { meals: currentMeals || [] },
              { health: { exists: true, exerciseEntries: normalizeExerciseEntries(currentInfo), sleepEntries: normalizeSleepEntries(currentInfo), toiletEntries: normalizeToiletEntries(currentInfo), moodEntries: normalizeMoodEntries(currentInfo), reactions: currentReactions || [] } },
              { journal: { title: currentInfo.dayJournalTitle || '', html: currentInfo.dayJournalHtml || '', text: currentInfo.dayNote || '' } },
            ]
          : await Promise.all([
              fetchJson(`meals-day.php?date=${encodeURIComponent(date)}`),
              fetchJson(`day-health.php?date=${encodeURIComponent(date)}`),
              fetchJson(`day-journal.php?date=${encodeURIComponent(date)}`),
            ])

        const localInfo = dayInfo[date] || DEFAULT_DAY_INFO
        const health = healthData.health || {}
        const journal = journalData.journal || {}
        const info = {
          ...localInfo,
          exerciseEntries: health.exists ? (health.exerciseEntries || []) : normalizeExerciseEntries(localInfo),
          exerciseKcal: health.exists ? String(Math.round(getExerciseEntriesKcal(health.exerciseEntries || []))) : (localInfo.exerciseKcal || ''),
          exercise: health.exists ? getExerciseEntriesSummary(health.exerciseEntries || []) : (localInfo.exercise || ''),
          sleepEntries: health.exists ? (health.sleepEntries || []) : normalizeSleepEntries(localInfo),
          toiletEntries: health.exists ? (health.toiletEntries || []) : normalizeToiletEntries(localInfo),
          moodEntries: health.exists ? (health.moodEntries || []) : normalizeMoodEntries(localInfo),
          dayJournalTitle: journal.title || localInfo.dayJournalTitle || '',
          dayJournalHtml: journal.html || localInfo.dayJournalHtml || '',
          dayNote: journal.text || localInfo.dayNote || '',
        }

        return {
          date,
          meals: mealsData.meals || [],
          info,
          reactions: health.exists ? (health.reactions || []) : (reactions[date] || []),
        }
      }))

      const weightData = await weightPromise
      setReportDays(days)
      setReportWeights((weightData.logs || []).filter((log) => log.date >= start && log.date <= end))
    } catch {
      setError('Report se nepodařilo načíst. Zkus to prosím znovu.')
    } finally {
      setIsLoading(false)
    }
  }

  const allMeals = reportDays.flatMap((day) => day.meals)
  const totalTotals = getMealTotals(allMeals.flatMap((meal) => meal.items || []))
  const totalExercise = reportDays.reduce((sum, day) => sum + getExerciseEntriesKcal(normalizeExerciseEntries(day.info)), 0)
  const allReactions = reportDays.flatMap((day) => day.reactions || [])
  const allSleepEntries = reportDays.flatMap((day) => normalizeSleepEntries(day.info))
  const allToiletEntries = reportDays.flatMap((day) => normalizeToiletEntries(day.info))
  const allMoodEntries = reportDays.flatMap((day) => normalizeMoodEntries(day.info))
  const sleepAverage = allSleepEntries.length
    ? allSleepEntries.reduce((sum, entry) => sum + (Number(entry.durationHours) || 0), 0) / allSleepEntries.length
    : null
  const firstWeight = getWeightNumber(reportWeights[0])
  const lastWeight = getWeightNumber(reportWeights[reportWeights.length - 1])
  const weightChange = Number.isFinite(firstWeight) && Number.isFinite(lastWeight)
    ? Math.round((lastWeight - firstWeight) * 10) / 10
    : null

  return (
    <div className="report-modal">
      <div className="report-shell">
        <div className="report-toolbar no-print">
          <div>
            <h2>Report FoodLife</h2>
            <p>Souhrn jídel, pohybu, hmotnosti, pocitů, reakcí a deníku.</p>
          </div>
          <button className="side-menu-close" type="button" onClick={onClose} aria-label="Zavřít report">×</button>
        </div>

        <div className="report-controls no-print">
          <label>
            Od
            <input className="input" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </label>
          <label>
            Do
            <input className="input" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </label>
          <button className="button" type="button" onClick={loadReport} disabled={isLoading}>
            {isLoading ? 'Načítám...' : 'Vytvořit report'}
          </button>
          <button className="button button-light" type="button" onClick={() => window.print()} disabled={!reportDays.length}>
            Export PDF
          </button>
        </div>

        {error ? <div className="inline-error no-print">{error}</div> : null}

        <div className="report-print-area">
          {reportDays.length === 0 ? (
            <div className="empty-box no-print">Vyber rozsah a klikni na Vytvořit report.</div>
          ) : (
            <>
              <section className="report-page report-summary-page">
                <div className="report-page-head">
                  <div>
                    <div className="side-eyebrow">FoodLife report</div>
                    <h1>{formatShortDate(reportDays[0].date)} - {formatShortDate(reportDays[reportDays.length - 1].date)}</h1>
                  </div>
                  <div className="report-profile">
                    <strong>{profile.name || 'Uživatel'}</strong>
                    <span>{profile.weight ? `${profile.weight} kg` : ''}{profile.height ? ` • ${profile.height} cm` : ''}</span>
                  </div>
                </div>

                <div className="report-metrics">
                  <div><span>Průměr kcal / den</span><strong>{Math.round(totalTotals.kcal / reportDays.length)}</strong></div>
                  <div><span>Bílkoviny celkem</span><strong>{formatMacro(totalTotals.protein)}</strong></div>
                  <div><span>Cvičení celkem</span><strong>{Math.round(totalExercise)} kcal</strong></div>
                  <div><span>Spánek průměr</span><strong>{sleepAverage === null ? '-' : `${Math.round(sleepAverage * 10) / 10} h`}</strong></div>
                  <div><span>Reakce těla</span><strong>{allReactions.length}</strong></div>
                  <div><span>Toaleta</span><strong>{allToiletEntries.length}</strong></div>
                  <div><span>Pocity</span><strong>{allMoodEntries.length}</strong></div>
                </div>

                <div className="report-section">
                  <h2>Hmotnost v období</h2>
                  <div className="report-weight-line">
                    <span>Záznamů: {reportWeights.length}</span>
                    <span>Změna: {weightChange === null ? '-' : `${weightChange > 0 ? '+' : ''}${weightChange} kg`}</span>
                  </div>
                  <WeightChart logs={reportWeights} />
                </div>

                <div className="report-section">
                  <h2>Souhrn dní</h2>
                  <div className="report-day-table">
                    {reportDays.map((day) => {
                      const totals = getMealTotals(day.meals.flatMap((meal) => meal.items || []))
                      const plan = calculateEnergyPlan(profile, goals, day.info.exerciseKcal)
                      const exerciseKcal = getExerciseEntriesKcal(normalizeExerciseEntries(day.info))
                      return (
                        <div key={day.date}>
                          <span>{formatShortDate(day.date)}</span>
                          <strong>{Math.round(totals.kcal)} kcal</strong>
                          <span>{plan ? `cíl ${Math.round(plan.target)}` : 'cíl -'}</span>
                          <span>pohyb {Math.round(exerciseKcal)} kcal</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </section>

              {reportDays.map((day) => {
                const mealsByTypeForDay = groupMealsByType(day.meals)
                const totals = getMealTotals(day.meals.flatMap((meal) => meal.items || []))
                const plan = calculateEnergyPlan(profile, goals, day.info.exerciseKcal)
                const histamine = getHistamineSummary(day.meals)
                const exerciseEntries = normalizeExerciseEntries(day.info)
                const sleepEntries = normalizeSleepEntries(day.info)
                const journalText = htmlToPlainText(day.info.dayJournalHtml) || day.info.dayNote || ''

                return (
                  <section key={day.date} className="report-page">
                    <div className="report-page-head">
                      <div>
                        <div className="side-eyebrow">Denní report</div>
                        <h1>{formatDisplayDate(day.date)}</h1>
                      </div>
                      <div className="report-kcal">
                        <strong>{Math.round(totals.kcal)} kcal</strong>
                        <span>{plan ? `cíl ${Math.round(plan.target)} kcal` : 'bez cíle'}</span>
                      </div>
                    </div>

                    <div className="report-metrics">
                      <div><span>Bílkoviny</span><strong>{formatMacro(totals.protein)}</strong></div>
                      <div><span>Sacharidy</span><strong>{formatMacro(totals.carbs)}</strong></div>
                      <div><span>Tuky</span><strong>{formatMacro(totals.fat)}</strong></div>
                      <div><span>Vláknina</span><strong>{formatMacro(totals.fiber)}</strong></div>
                      <div><span>Cvičení</span><strong>{Math.round(getExerciseEntriesKcal(exerciseEntries))} kcal</strong></div>
                      <div><span>Histamin</span><strong>{histamine.score} b</strong></div>
                    </div>

                    <div className="report-grid">
                      <div className="report-section">
                        <h2>Jídlo a pití</h2>
                        {MEAL_SECTIONS.map((section) => {
                          const meals = mealsByTypeForDay[section.key] || []
                          if (!meals.length) return null
                          return (
                            <div key={section.key} className="report-meal-block">
                              <h3>{section.title}</h3>
                              {meals.map((meal) => (
                                <div key={meal.id} className="report-row">
                                  <div>
                                    <strong>{meal.title}</strong>
                                    <span>{meal.items?.map((item) => `${item.name || item.custom_name} ${formatItemAmount(item)}`).join(', ')}</span>
                                  </div>
                                  <em>{Math.round(getMealTotals(meal.items || []).kcal)} kcal</em>
                                </div>
                              ))}
                            </div>
                          )
                        })}
                      </div>

                      <div className="report-section">
                        <h2>Tělo</h2>
                        <div className="report-mini-list">
                          <strong>Spánek</strong>
                          {sleepEntries.length ? sleepEntries.map((entry) => (
                            <span key={entry.id}>{entry.fellAsleepAt ? `${entry.fellAsleepAt} • ` : ''}{entry.durationHours ?? 8} h • {entry.quality || 'V kuse'}{entry.note ? ` • ${entry.note}` : ''}</span>
                          )) : <span>Bez záznamu</span>}
                        </div>
                        <div className="report-mini-list">
                          <strong>Cvičení</strong>
                          {exerciseEntries.length ? exerciseEntries.map((entry) => (
                            <span key={entry.id}>{entry.name} {entry.amount || ''} {entry.unit || ''} • {entry.kcal || 0} kcal</span>
                          )) : <span>Bez záznamu</span>}
                        </div>
                        <div className="report-mini-list">
                          <strong>Jak se cítím</strong>
                          {normalizeMoodEntries(day.info).length ? normalizeMoodEntries(day.info).map((entry) => (
                            <span key={entry.id}>{entry.time || ''} {entry.mood} • energie {entry.energy ?? '-'}/10 {entry.note ? `• ${entry.note}` : ''}</span>
                          )) : <span>Bez záznamu</span>}
                        </div>
                        <div className="report-mini-list">
                          <strong>Reakce těla</strong>
                          {day.reactions.length ? day.reactions.map((entry) => (
                            <span key={entry.id}>{getReactionTimeValue(entry)} {entry.type} • {entry.intensity}/10 {entry.note ? `• ${entry.note}` : ''}</span>
                          )) : <span>Bez záznamu</span>}
                        </div>
                        <div className="report-mini-list">
                          <strong>Toaleta</strong>
                          {normalizeToiletEntries(day.info).length ? normalizeToiletEntries(day.info).map((entry) => (
                            <span key={entry.id}>{entry.time || ''} {entry.consistency} {entry.note ? `• ${entry.note}` : ''}</span>
                          )) : <span>Bez záznamu</span>}
                        </div>
                      </div>
                    </div>

                    <div className="report-section">
                      <h2>Deník</h2>
                      <p>{journalText || 'Bez zápisu.'}</p>
                    </div>
                  </section>
                )
              })}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function DiaryPanel({ todayInfo, onTodayInfoChange, saveState }) {
  const editorRef = useRef(null)
  const imageInputRef = useRef(null)
  const appliedHtmlRef = useRef('')
  const fallbackHtml = todayInfo.dayNote ? textToDiaryHtml(todayInfo.dayNote) : '<p></p>'
  const journalHtml = todayInfo.dayJournalHtml || fallbackHtml

  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return

    const shouldKeepTypingPosition = document.activeElement === editor && appliedHtmlRef.current !== ''
    if (shouldKeepTypingPosition) return

    if (editor.innerHTML !== journalHtml) {
      editor.innerHTML = journalHtml
      appliedHtmlRef.current = journalHtml
    }
  }, [journalHtml])

  function saveEditorContent() {
    const editor = editorRef.current
    if (!editor) return
    appliedHtmlRef.current = editor.innerHTML
    onTodayInfoChange('dayJournalHtml', editor.innerHTML)
    onTodayInfoChange('dayNote', editor.innerText.trim())
  }

  function runEditorCommand(command, value = null) {
    const editor = editorRef.current
    if (!editor) return
    editor.focus()
    document.execCommand(command, false, value)
    saveEditorContent()
  }

  function selectionIsInsideEditor(editor, selection) {
    if (!selection || selection.rangeCount === 0) return false
    const anchor = selection.anchorNode
    return Boolean(anchor && editor.contains(anchor))
  }

  function placeCaretAtMarker(marker) {
    const selection = window.getSelection()
    if (!selection || !marker) return

    const range = document.createRange()
    range.setStart(marker, 0)
    range.collapse(true)
    selection.removeAllRanges()
    selection.addRange(range)
    marker.removeAttribute('data-diary-caret')
  }

  function placeCaretAtEditorEnd(editor) {
    const selection = window.getSelection()
    if (!selection) return

    const range = document.createRange()
    range.selectNodeContents(editor)
    range.collapse(false)
    selection.removeAllRanges()
    selection.addRange(range)
  }

  function insertTemplate(html, options = {}) {
    const editor = editorRef.current
    if (!editor) return

    editor.focus()
    const selection = window.getSelection()
    if (!selectionIsInsideEditor(editor, selection)) {
      placeCaretAtEditorEnd(editor)
    }

    const template = document.createElement('template')
    template.innerHTML = `${html}${options.addTrailingLine === false ? '' : '<p><span data-diary-caret="1"></span><br /></p>'}`
    const marker = template.content.querySelector('[data-diary-caret]')
    const fragment = template.content

    const activeSelection = window.getSelection()
    if (!activeSelection || activeSelection.rangeCount === 0) return

    const range = activeSelection.getRangeAt(0)
    range.deleteContents()
    range.insertNode(fragment)
    placeCaretAtMarker(marker)
    saveEditorContent()
  }

  function insertTimeStamp() {
    insertTemplate(`<p><strong>${getCurrentTimeValue()}</strong> - <span data-diary-caret="1"></span></p>`, {
      addTrailingLine: false,
    })
  }

  function handleImageSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const alt = file.name.replace(/[<>"']/g, '')
      insertTemplate(`
        <figure>
          <img src="${reader.result}" alt="${alt}" />
          <figcaption>${alt}</figcaption>
        </figure>
      `)
      e.target.value = ''
    }
    reader.readAsDataURL(file)
  }

  const toolbarButtons = [
    { label: 'B', title: 'Tučně', command: 'bold' },
    { label: 'I', title: 'Kurzíva', command: 'italic' },
    { label: 'U', title: 'Podtržení', command: 'underline' },
    { label: 'H', title: 'Nadpis', command: 'formatBlock', value: 'h3' },
    { label: '•', title: 'Odrážky', command: 'insertUnorderedList' },
    { label: '1.', title: 'Číslování', command: 'insertOrderedList' },
    { label: '”', title: 'Citace', command: 'formatBlock', value: 'blockquote' },
  ]

  return (
    <div className="diary-panel">
      <div className="card diary-card">
        <div className="diary-head">
          <div>
            <h3 className="card-title">Deník dne</h3>
            <p className="card-subtitle">
              Zápisky, souvislosti, fotky a poznámky k tělu.
              {saveState ? ` ${saveState}` : ''}
            </p>
          </div>
          <button
            className="soft-button"
            type="button"
            onMouseDown={(e) => {
              e.preventDefault()
              insertTimeStamp()
            }}
          >
            Vložit čas
          </button>
        </div>

        <input
          className="input diary-title-input"
          value={todayInfo.dayJournalTitle || ''}
          onChange={(e) => onTodayInfoChange('dayJournalTitle', e.target.value)}
          placeholder="Nadpis dne"
        />

        <div className="diary-toolbar" aria-label="Formátování deníku">
          {toolbarButtons.map((button) => (
            <button
              key={button.title}
              className="diary-tool"
              type="button"
              title={button.title}
              onMouseDown={(e) => {
                e.preventDefault()
                runEditorCommand(button.command, button.value)
              }}
            >
              {button.label}
            </button>
          ))}
          <button
            className="diary-tool diary-tool-wide"
            type="button"
            onMouseDown={(e) => {
              e.preventDefault()
              runEditorCommand('removeFormat')
            }}
          >
            Vyčistit
          </button>
          <button
            className="diary-tool diary-tool-wide"
            type="button"
            onClick={() => imageInputRef.current?.click()}
          >
            Fotka
          </button>
          <input
            ref={imageInputRef}
            className="visually-hidden"
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
          />
        </div>

        <div className="diary-prompts">
          <button
            className="time-chip"
            type="button"
            onMouseDown={(e) => {
              e.preventDefault()
              insertTemplate('<h3>Ranní zápis</h3><ul><li>Spánek: </li><li>Energie: </li><li>Plán dne: </li></ul>')
            }}
          >
            Ráno
          </button>
          <button
            className="time-chip"
            type="button"
            onMouseDown={(e) => {
              e.preventDefault()
              insertTemplate('<h3>Tělo a trávení</h3><ul><li>Břicho: </li><li>Reakce: </li><li>Možný spouštěč: </li></ul>')
            }}
          >
            Tělo
          </button>
          <button
            className="time-chip"
            type="button"
            onMouseDown={(e) => {
              e.preventDefault()
              insertTemplate('<h3>Večerní rekapitulace</h3><ul><li>Co pomohlo: </li><li>Co zhoršilo den: </li><li>Zítra zkusím: </li></ul>')
            }}
          >
            Večer
          </button>
        </div>

        <div
          ref={editorRef}
          className="diary-editor"
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-label="Deníkový zápis"
          data-placeholder="Začni psát deník dne..."
          onInput={saveEditorContent}
          onBlur={saveEditorContent}
        />
      </div>
    </div>
  )
}

export default function App() {
  const [isHydrated, setIsHydrated] = useState(false)
  const [auth, setAuth] = useState({ loggedIn: false, email: '' })
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [profile, setProfile] = useState(DEFAULT_PROFILE)
  const [isProfileLoaded, setIsProfileLoaded] = useState(false)
  const [isProfileSaving, setIsProfileSaving] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [foods, setFoods] = useState(DEFAULT_FOODS)
  const [entries, setEntries] = useState({})
  const [dayInfo, setDayInfo] = useState({})
  const [goals, setGoals] = useState(DEFAULT_GOALS)
  const [dayMeals, setDayMeals] = useState([])
  const [isMealsLoading, setIsMealsLoading] = useState(false)
  const [customFoods, setCustomFoods] = useState([])
  const [isCustomFoodsLoading, setIsCustomFoodsLoading] = useState(false)
  const [recipes, setRecipes] = useState([])
  const [isRecipesLoading, setIsRecipesLoading] = useState(false)
  const [weightLogs, setWeightLogs] = useState([])
  const [isWeightLoading, setIsWeightLoading] = useState(false)
  const [isJournalLoading, setIsJournalLoading] = useState(false)
  const [journalLoadedDate, setJournalLoadedDate] = useState('')
  const [journalSaveState, setJournalSaveState] = useState('')
  const [isHealthLogLoading, setIsHealthLogLoading] = useState(false)
  const [healthLogLoadedDate, setHealthLogLoadedDate] = useState('')
  const [healthLogSaveState, setHealthLogSaveState] = useState('')
  const [reactions, setReactions] = useState({})
  const [openMain, setOpenMain] = useState(null)
  const [openMeal, setOpenMeal] = useState(null)
  const [quickAddRequest, setQuickAddRequest] = useState(null)
  const [recipeEditRequest, setRecipeEditRequest] = useState(null)
  const [recipeCreateRequest, setRecipeCreateRequest] = useState(null)
  const [customFoodCreateRequest, setCustomFoodCreateRequest] = useState(null)
  const [openMenu, setOpenMenu] = useState(false)
  const [openReport, setOpenReport] = useState(false)
  const [openCalendar, setOpenCalendar] = useState(false)
  const [selectedDate, setSelectedDate] = useState(formatToday())
  const calendarInputRef = useRef(null)
  const journalSaveTimerRef = useRef(null)
  const healthLogSaveTimerRef = useRef(null)

  const today = selectedDate
  const todayEntries = entries[today] || {}
  const todayInfo = dayInfo[today] || DEFAULT_DAY_INFO
  const todayReactions = useMemo(() => reactions[today] || [], [reactions, today])
  const mealsByType = useMemo(() => {
    return dayMeals.reduce((groups, meal) => {
      const key = meal.meal_type || 'ostatni'
      return {
        ...groups,
        [key]: [...(groups[key] || []), meal],
      }
    }, {})
  }, [dayMeals])
  const userRecipes = useMemo(() => recipes.filter((recipe) => recipe.source !== 'system'), [recipes])
  const recipesByType = useMemo(() => {
    return recipes.reduce((groups, recipe) => {
      const tags = recipe.meal_types?.length ? recipe.meal_types : [recipe.meal_type || 'ostatni']
      return tags.reduce((nextGroups, tag) => ({
        ...nextGroups,
        [tag]: [...(nextGroups[tag] || []), recipe],
      }), groups)
    }, {})
  }, [recipes])

  useEffect(() => {
    const savedProfile = readStorage(STORAGE_KEYS.profile, DEFAULT_PROFILE)
    const savedFoods = readStorage(STORAGE_KEYS.foods, DEFAULT_FOODS)
    const savedEntries = readStorage(STORAGE_KEYS.entries, {})
    const savedDayInfo = readStorage(STORAGE_KEYS.dayInfo, {})
    const savedGoals = readStorage(STORAGE_KEYS.goals, DEFAULT_GOALS)
    const savedReactions = readStorage(STORAGE_KEYS.reactions, {})

    async function hydrate() {
      let serverAuth = { loggedIn: false, email: '' }

      try {
        const response = await fetch('auth-status.php', {
          credentials: 'same-origin',
          headers: { Accept: 'application/json' },
        })

        if (response.ok) {
          serverAuth = await response.json()
        }
      } catch {
        serverAuth = { loggedIn: false, email: '' }
      }

      setAuth(serverAuth)
      setLoginEmail(serverAuth.email || savedProfile.email || '')
      setProfile((prev) => ({
        ...prev,
        ...savedProfile,
        email: serverAuth.email || savedProfile.email || prev.email,
      }))
      setFoods(savedFoods?.length ? savedFoods : DEFAULT_FOODS)
      setEntries(savedEntries || {})
      setDayInfo(savedDayInfo || {})
      setGoals({ ...DEFAULT_GOALS, ...(savedGoals || {}) })
      setReactions(savedReactions || {})
      setIsProfileLoaded(!serverAuth.loggedIn)
      setIsHydrated(true)
    }

    hydrate()
  }, [])

  useEffect(() => {
    // when selectedDate changes we can close calendar
    if (openCalendar) setOpenCalendar(false)
  }, [selectedDate])

  useEffect(() => {
    if (!isHydrated) return
    writeStorage(STORAGE_KEYS.auth, auth)
  }, [auth, isHydrated])

  useEffect(() => {
    if (!isHydrated) return
    writeStorage(STORAGE_KEYS.profile, profile)
  }, [profile, isHydrated])

  useEffect(() => {
    if (!isHydrated) return
    writeStorage(STORAGE_KEYS.foods, foods)
  }, [foods, isHydrated])

  useEffect(() => {
    if (!isHydrated) return
    writeStorage(STORAGE_KEYS.entries, entries)
  }, [entries, isHydrated])

  useEffect(() => {
    if (!isHydrated) return
    writeStorage(STORAGE_KEYS.dayInfo, dayInfoStorageValue(dayInfo))
  }, [dayInfo, isHydrated])

  useEffect(() => {
    if (!isHydrated) return
    writeStorage(STORAGE_KEYS.goals, goals)
  }, [goals, isHydrated])

  useEffect(() => {
    if (!isHydrated) return
    writeStorage(STORAGE_KEYS.reactions, reactions)
  }, [reactions, isHydrated])

  useEffect(() => {
    if (!isHydrated || auth.loggedIn) return
    window.location.replace('login.php')
  }, [auth.loggedIn, isHydrated])

  useEffect(() => {
    if (!isHydrated || !auth.loggedIn) return
    loadDayMeals(today)
  }, [auth.loggedIn, isHydrated, today])

  useEffect(() => {
    if (!isHydrated || !auth.loggedIn) return
    loadWeightLogs(today)
  }, [auth.loggedIn, isHydrated, today])

  useEffect(() => {
    if (!isHydrated || !auth.loggedIn) return
    loadDayJournal(today)
  }, [auth.loggedIn, isHydrated, today])

  useEffect(() => {
    if (!isHydrated || !auth.loggedIn) return
    loadDayHealth(today)
  }, [auth.loggedIn, isHydrated, today])

  useEffect(() => {
    if (!isHydrated || !auth.loggedIn) return
    loadUserProfile()
  }, [auth.loggedIn, isHydrated])

  useEffect(() => {
    if (!isHydrated || !auth.loggedIn) return
    loadCustomFoods()
  }, [auth.loggedIn, isHydrated])

  useEffect(() => {
    if (!isHydrated || !auth.loggedIn) return
    loadRecipes()
  }, [auth.loggedIn, isHydrated])

  useEffect(() => {
    if (!isHydrated || !auth.loggedIn || journalLoadedDate !== today || isJournalLoading) return

    const title = todayInfo.dayJournalTitle || ''
    const html = todayInfo.dayJournalHtml || ''
    const text = todayInfo.dayNote || ''

    window.clearTimeout(journalSaveTimerRef.current)
    setJournalSaveState('Ukládám...')

    journalSaveTimerRef.current = window.setTimeout(async () => {
      try {
        await saveDayJournal(today, title, html, text)
        setJournalSaveState('Uloženo')
      } catch {
        setJournalSaveState('Nepodařilo se uložit')
      }
    }, 700)

    return () => window.clearTimeout(journalSaveTimerRef.current)
  }, [
    auth.loggedIn,
    isHydrated,
    isJournalLoading,
    journalLoadedDate,
    today,
    todayInfo.dayJournalTitle,
    todayInfo.dayJournalHtml,
    todayInfo.dayNote,
  ])

  useEffect(() => {
    if (!isHydrated || !auth.loggedIn || healthLogLoadedDate !== today || isHealthLogLoading) return

    const exerciseEntries = normalizeExerciseEntries(todayInfo)
    const sleepEntries = normalizeSleepEntries(todayInfo)
    const toiletEntries = normalizeToiletEntries(todayInfo)
    const moodEntries = normalizeMoodEntries(todayInfo)

    window.clearTimeout(healthLogSaveTimerRef.current)
    setHealthLogSaveState('Ukládám...')

    healthLogSaveTimerRef.current = window.setTimeout(async () => {
      try {
        await saveDayHealth(today, exerciseEntries, sleepEntries, toiletEntries, moodEntries, todayReactions)
        setHealthLogSaveState('Uloženo')
      } catch {
        setHealthLogSaveState('Nepodařilo se uložit')
      }
    }, 700)

    return () => window.clearTimeout(healthLogSaveTimerRef.current)
  }, [
    auth.loggedIn,
    healthLogLoadedDate,
    isHealthLogLoading,
    isHydrated,
    today,
    todayInfo.exerciseEntries,
    todayInfo.exercise,
    todayInfo.exerciseKcal,
    todayInfo.sleepEntries,
    todayInfo.toiletEntries,
    todayInfo.moodEntries,
    todayReactions,
  ])

  function handleLogin(e) {
    e.preventDefault()
    if (!loginEmail.trim() || !loginPassword.trim()) return

    setAuth({
      loggedIn: true,
      email: loginEmail.trim(),
    })

    setProfile((prev) => ({
      ...prev,
      email: loginEmail.trim(),
    }))
  }

  function handleLogout() {
    window.location.href = 'logout.php'
  }

  async function loadUserProfile() {
    setIsProfileLoaded(false)
    setProfileError('')

    try {
      const response = await fetch('user-profile.php', {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      })
      if (!response.ok) throw new Error('profile_load_failed')

      const data = await response.json()
      setProfile((prev) => ({
        ...prev,
        ...(data.profile || {}),
        email: auth.email || prev.email,
      }))
    } catch {
      setProfileError('Profil se nepodařilo načíst.')
    } finally {
      setIsProfileLoaded(true)
    }
  }

  async function saveUserProfile(e) {
    e.preventDefault()

    if (!isProfileComplete(profile)) {
      setProfileError('Doplň prosím všechna pole profilu.')
      return
    }

    setIsProfileSaving(true)
    setProfileError('')

    try {
      const response = await fetch('user-profile.php', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profilePayload(profile)),
      })
      if (!response.ok) throw new Error('profile_save_failed')

      const data = await response.json()
      setProfile((prev) => ({
        ...prev,
        ...(data.profile || {}),
        email: auth.email || prev.email,
      }))
    } catch {
      setProfileError('Profil se nepodařilo uložit.')
    } finally {
      setIsProfileSaving(false)
    }
  }

  async function loadDayMeals(date) {
    setIsMealsLoading(true)
    try {
      const response = await fetch(`meals-day.php?date=${encodeURIComponent(date)}`, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      })
      if (!response.ok) throw new Error('meals_load_failed')
      const data = await response.json()
      setDayMeals(data.meals || [])
    } catch {
      setDayMeals([])
    } finally {
      setIsMealsLoading(false)
    }
  }

  async function loadWeightLogs(endDate = today) {
    setIsWeightLoading(true)
    try {
      const response = await fetch(`weight-logs.php?end_date=${encodeURIComponent(endDate)}&days=370`, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      })
      if (!response.ok) throw new Error('weight_logs_load_failed')
      const data = await response.json()
      setWeightLogs(data.logs || [])
    } catch {
      setWeightLogs([])
    } finally {
      setIsWeightLoading(false)
    }
  }

  async function loadDayJournal(date = today) {
    setIsJournalLoading(true)
    setJournalSaveState('Načítám...')
    setJournalLoadedDate('')

    try {
      const response = await fetch(`day-journal.php?date=${encodeURIComponent(date)}`, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      })
      if (!response.ok) throw new Error('journal_load_failed')

      const data = await response.json()
      const journal = data.journal || {}
      const hasServerJournal = Boolean(journal.title || journal.html || journal.text)

      setDayInfo((prev) => {
        const current = prev[date] || DEFAULT_DAY_INFO
        if (!hasServerJournal) {
          return {
            ...prev,
            [date]: {
              ...current,
              dayJournalTitle: current.dayJournalTitle || '',
              dayJournalHtml: current.dayJournalHtml || '',
              dayNote: current.dayNote || '',
            },
          }
        }

        return {
          ...prev,
          [date]: {
            ...current,
            dayJournalTitle: journal.title || '',
            dayJournalHtml: journal.html || '',
            dayNote: journal.text || '',
          },
        }
      })

      setJournalLoadedDate(date)
      setJournalSaveState(hasServerJournal ? 'Načteno ze serveru' : '')
    } catch {
      setJournalLoadedDate(date)
      setJournalSaveState('Deník se nepodařilo načíst')
    } finally {
      setIsJournalLoading(false)
    }
  }

  async function saveDayJournal(date, title, html, text) {
    const response = await fetch('day-journal.php', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ date, title, html, text }),
    })

    if (!response.ok) throw new Error('journal_save_failed')
    return response.json()
  }

  async function loadDayHealth(date = today) {
    setIsHealthLogLoading(true)
    setHealthLogSaveState('Načítám...')
    setHealthLogLoadedDate('')

    try {
      const response = await fetch(`day-health.php?date=${encodeURIComponent(date)}`, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      })
      if (!response.ok) throw new Error('day_health_load_failed')

      const data = await response.json()
      const health = data.health || {}
      const hasServerHealth = Boolean(health.exists)

        if (hasServerHealth) {
          const exerciseEntries = Array.isArray(health.exerciseEntries) ? health.exerciseEntries : []
          const sleepEntries = Array.isArray(health.sleepEntries) ? health.sleepEntries : []
          const toiletEntries = Array.isArray(health.toiletEntries) ? health.toiletEntries : []
          const moodEntries = Array.isArray(health.moodEntries) ? health.moodEntries : []
        const healthReactions = Array.isArray(health.reactions) ? health.reactions : []

        setDayInfo((prev) => {
          const current = prev[date] || DEFAULT_DAY_INFO
          return {
            ...prev,
            [date]: {
              ...current,
              exerciseEntries,
              exercise: getExerciseEntriesSummary(exerciseEntries),
              exerciseKcal: String(Math.round(getExerciseEntriesKcal(exerciseEntries))),
              sleepEntries,
              toiletEntries,
              toiletCount: String(toiletEntries.length),
              toiletType: toiletEntries[0]?.consistency || current.toiletType || 'Normální',
              moodEntries,
              mood: moodEntries[0]?.mood || current.mood || 'Dobře',
              moodNote: moodEntries[0]?.note || current.moodNote || '',
            },
          }
        })

        setReactions((prev) => ({
          ...prev,
          [date]: healthReactions,
        }))
      } else {
        setDayInfo((prev) => {
          const current = prev[date] || DEFAULT_DAY_INFO
          return {
            ...prev,
            [date]: {
              ...current,
              exerciseEntries: normalizeExerciseEntries(current),
              sleepEntries: normalizeSleepEntries(current),
              toiletEntries: normalizeToiletEntries(current),
              moodEntries: normalizeMoodEntries(current),
            },
          }
        })

        setReactions((prev) => ({
          ...prev,
          [date]: prev[date] || [],
        }))
      }

      setHealthLogLoadedDate(date)
      setHealthLogSaveState(hasServerHealth ? 'Načteno ze serveru' : '')
    } catch {
      setHealthLogLoadedDate(date)
      setHealthLogSaveState('Záznamy se nepodařilo načíst')
    } finally {
      setIsHealthLogLoading(false)
    }
  }

  async function saveDayHealth(date, exerciseEntries, sleepEntries, toiletEntries, moodEntries, dayReactions) {
    const response = await fetch('day-health.php', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        date,
        exerciseEntries,
        sleepEntries,
        toiletEntries,
        moodEntries,
        reactions: dayReactions,
      }),
    })

    if (!response.ok) throw new Error('day_health_save_failed')
    return response.json()
  }

  async function saveWeightLog(entry) {
    const response = await fetch('weight-logs.php', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(entry),
    })

    if (!response.ok) throw new Error('weight_log_save_failed')
    await loadWeightLogs(today)
  }

  async function useRecipeForMeal(recipe, mealType) {
    const section = MEAL_SECTIONS.find((item) => item.key === mealType)
    if (!section || !recipe.items?.length) throw new Error('recipe_not_usable')
    await saveMeal(section, draftItemsFromRecipe(recipe), recipe.title, null, getDefaultMealTime(section.key))
  }

  function openRecipeEditor(recipe, options = {}) {
    setOpenMain('food')
    setOpenMeal('recipes')
    setRecipeEditRequest({ recipe, asCopy: Boolean(options.asCopy), token: Date.now() })
  }

  function openRecipeCreator(title = '', mealType = 'snidane') {
    setOpenMain('food')
    setOpenMeal('recipes')
    setRecipeCreateRequest({ title, mealType, token: Date.now() })
  }

  function openCustomFoodCreator(name = '') {
    setOpenMain('food')
    setOpenMeal('custom-foods')
    setCustomFoodCreateRequest({ name, token: Date.now() })
  }

  async function saveMeal(section, items, note, mealId = null, time = null) {
    const response = await fetch('meal-save.php', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        date: today,
        meal_id: mealId,
        meal_type: section.key,
        title: section.title,
        note,
        time,
        items,
      }),
    })

    if (!response.ok) throw new Error('meal_save_failed')
    await loadDayMeals(today)
  }

  async function deleteSavedMeal(mealId) {
    const response = await fetch('meal-delete.php', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ meal_id: mealId }),
    })

    if (response.ok) {
      await loadDayMeals(today)
    }
  }

  async function loadCustomFoods() {
    setIsCustomFoodsLoading(true)
    try {
      const response = await fetch('user-foods.php', {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      })
      if (!response.ok) throw new Error('custom_foods_load_failed')
      const data = await response.json()
      setCustomFoods(data.foods || [])
    } catch {
      setCustomFoods([])
    } finally {
      setIsCustomFoodsLoading(false)
    }
  }

  async function saveCustomFood(food) {
    const response = await fetch('food-save.php', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(food),
    })

    if (!response.ok) throw new Error('custom_food_save_failed')
    await loadCustomFoods()
  }

  async function deleteCustomFood(foodId) {
    const response = await fetch('food-delete.php', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: foodId }),
    })

    if (!response.ok) throw new Error('custom_food_delete_failed')
    await loadCustomFoods()
  }

  async function loadRecipes() {
    setIsRecipesLoading(true)
    try {
      const response = await fetch('recipes-list.php', {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      })
      if (!response.ok) throw new Error('recipes_load_failed')
      const data = await response.json()
      setRecipes(data.recipes || [])
    } catch {
      setRecipes([])
    } finally {
      setIsRecipesLoading(false)
    }
  }

  async function saveRecipe(recipe) {
    const response = await fetch('recipe-save.php', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipe_id: recipe.id,
        title: recipe.title,
        meal_types: recipe.meal_types,
        note: recipe.note,
        description: recipe.note,
        instructions: recipe.instructions,
        prep_minutes: recipe.prep_minutes,
        cook_minutes: recipe.cook_minutes,
        servings: recipe.servings,
        difficulty: recipe.difficulty,
        goal_type: recipe.goal_type,
        carb_level: recipe.carb_level,
        ai_prompt: recipe.ai_prompt,
        items: recipe.items,
      }),
    })

    if (!response.ok) throw new Error('recipe_save_failed')
    await loadRecipes()
  }

  async function deleteRecipe(recipeId) {
    const response = await fetch('recipe-delete.php', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ recipe_id: recipeId }),
    })

    if (!response.ok) throw new Error('recipe_delete_failed')
    await loadRecipes()
  }

  function addFood(name) {
    const exists = foods.some((food) => food.name.toLowerCase() === name.toLowerCase())
    if (exists) return

    setFoods((prev) => [{ id: createId(), name }, ...prev])
  }

  function addMealItem(sectionKey, item) {
    setEntries((prev) => ({
      ...prev,
      [today]: {
        ...(prev[today] || {}),
        [sectionKey]: [...((prev[today] || {})[sectionKey] || []), item],
      },
    }))
  }

  function deleteMealItem(sectionKey, itemId) {
    setEntries((prev) => ({
      ...prev,
      [today]: {
        ...(prev[today] || {}),
        [sectionKey]: (((prev[today] || {})[sectionKey] || []).filter((item) => item.id !== itemId)),
      },
    }))
  }

  function updateTodayInfo(field, value) {
    setDayInfo((prev) => ({
      ...prev,
      [today]: {
        ...(prev[today] || DEFAULT_DAY_INFO),
        [field]: value,
      },
    }))
  }

  function addReaction(reaction) {
    setReactions((prev) => ({
      ...prev,
      [today]: [
        ...((prev[today] || [])),
        {
          id: createId(),
          ...reaction,
          createdAt: new Date().toISOString(),
        },
      ],
    }))
  }

  function deleteReaction(reactionId) {
    setReactions((prev) => ({
      ...prev,
      [today]: ((prev[today] || []).filter((reaction) => reaction.id !== reactionId)),
    }))
  }

  function updateReaction(reactionId, patch) {
    setReactions((prev) => ({
      ...prev,
      [today]: ((prev[today] || []).map((reaction) => (
        reaction.id === reactionId ? { ...reaction, ...patch } : reaction
      ))),
    }))
  }

  const totalItemsToday = MEAL_SECTIONS.reduce((sum, section) => {
    return sum + (mealsByType[section.key] || []).reduce((mealSum, meal) => mealSum + meal.items.length, 0)
  }, 0)

  const dayTotals = useMemo(() => {
    return getMealTotals(dayMeals.flatMap((meal) => meal.items || []))
  }, [dayMeals])

  const histamineSummary = useMemo(() => {
    return getHistamineSummary(dayMeals)
  }, [dayMeals])

  const energyPlan = useMemo(() => {
    return calculateEnergyPlan(profile, goals, todayInfo.exerciseKcal)
  }, [profile, goals, todayInfo.exerciseKcal])

  const foodEntryCount = FOOD_MEAL_SECTIONS.reduce((sum, section) => {
    return sum + (mealsByType[section.key] || []).reduce((mealSum, meal) => mealSum + (meal.items || []).length, 0)
  }, 0)
  const drinkEntryCount = getDrinkMealsMl(mealsByType[DRINK_SECTION?.key] || [])
  const exerciseEntryCount = normalizeExerciseEntries(todayInfo).length
  const toiletEntryCount = normalizeToiletEntries(todayInfo).length
  const sleepEntryCount = normalizeSleepEntries(todayInfo).length
  const moodEntryCount = normalizeMoodEntries(todayInfo).length
  const hasWeightLogToday = weightLogs.some((log) => log.date === today)
  const hasJournalContent = Boolean(
    todayInfo.dayJournalTitle?.trim()
    || todayInfo.dayNote?.trim()
    || htmlToPlainText(todayInfo.dayJournalHtml),
  )
  const sectionStatus = {
    food: foodEntryCount > 0,
    drinks: drinkEntryCount > 0,
    weight: hasWeightLogToday,
    exercise: exerciseEntryCount > 0,
    histamine: histamineSummary.knownItems > 0 || histamineSummary.unknownItems > 0,
    toilet: toiletEntryCount > 0,
    reactions: todayReactions.length > 0,
    mood: moodEntryCount > 0,
    sleep: sleepEntryCount > 0,
    notes: hasJournalContent,
  }
  const getSectionStatusClass = (sectionKey) => (sectionStatus[sectionKey] ? 'meal-complete' : 'meal-missing')

  function parseNumber(v) {
    const n = parseFloat(String(v).replace(',', '.'))
    return Number.isFinite(n) ? n : null
  }

  function getBMI(heightCm, weightKg) {
    const h = parseNumber(heightCm)
    const w = parseNumber(weightKg)
    if (!h || !w) return null
    const hm = h / 100
    const bmi = w / (hm * hm)
    return Math.round(bmi * 10) / 10
  }

  function getBMICategory(bmi) {
    if (bmi < 18.5) return 'Podváha'
    if (bmi < 25) return 'Normální'
    if (bmi < 30) return 'Nadváha'
    return 'Obezita'
  }

  const bmiValue = getBMI(profile.height, profile.weight || profile.startWeight)
  const bmiCategory = bmiValue ? getBMICategory(bmiValue) : ''
  const profileComplete = isProfileComplete(profile)

  function prevDay() {
    setSelectedDate(shiftDate(today, -1))
  }

  function nextDay() {
    setSelectedDate(shiftDate(today, 1))
  }

  function handleDateChange(val) {
    setSelectedDate(val)
  }

  function openCalendarPicker() {
    const picker = calendarInputRef.current
    if (picker?.showPicker) {
      try {
        picker.showPicker()
        return
      } catch {
        // Fallback for browsers that block programmatic date picker opening.
      }
    }

    if (picker) {
      picker.focus()
    }
    setOpenCalendar(true)
  }

  function openSection(sectionKey, mealKey = null) {
    setOpenMain(sectionKey)
    if (mealKey) setOpenMeal(mealKey)
  }

  function openQuickMealAdd(mealKey) {
    setOpenMain('food')
    setQuickAddRequest({ mealKey, token: Date.now() })
  }

  const headerKcal = Math.round(dayTotals.kcal)
  const headerTarget = energyPlan?.target || null
  const headerRemaining = headerTarget ? Math.round(headerTarget - headerKcal) : null
  const headerRemainingLabel = headerRemaining !== null && headerRemaining < 0 ? 'Nad cílem' : 'Zbývá'

  if (!isHydrated) {
    return <div className="loading-screen">Načítám…</div>
  }

  if (!auth.loggedIn) {
    return <div className="loading-screen">Přesměrovávám…</div>
  }

  if (!isProfileLoaded) {
    return <div className="loading-screen">Načítám profil…</div>
  }

  if (!profileComplete) {
    return (
      <div className="page profile-setup-page">
        <div className="profile-setup-panel">
          <ProfileEditor
            profile={profile}
            onChange={setProfile}
            onSave={saveUserProfile}
            isSaving={isProfileSaving}
            error={profileError}
            bmiValue={bmiValue}
            bmiCategory={bmiCategory}
            isSetup
          />
          <button className="button button-light button-full profile-logout-button" onClick={handleLogout}>
            Odhlásit
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page app-page">
      <div className="app-container">
        <div className="topbar">
          <div className="topbar-main">
            <div>
              <div className="topbar-small">{today === formatToday() ? 'Dnes' : ''}</div>
              <div className="day-switcher" aria-label="Přepínání dne">
                <button className="day-switch-button" type="button" onClick={prevDay} aria-label="Předchozí den">‹</button>
                <button className="day-date-button" type="button" onClick={openCalendarPicker}>
                  {formatDisplayDate(selectedDate)}
                </button>
                <button className="day-switch-button" type="button" onClick={nextDay} aria-label="Další den">›</button>
                <input
                  ref={calendarInputRef}
                  className="native-date-input"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  aria-label="Vybrat datum"
                />
              </div>
              <div className="topbar-text">Záznamy: {totalItemsToday}</div>
            </div>
          </div>

          <div className="topbar-metrics" aria-label="Denní kalorie">
            <div>
              <span>Kalorie</span>
              <strong>{headerKcal} kcal</strong>
            </div>
            <div>
              <span>Cíl</span>
              <strong>{headerTarget ? `${Math.round(headerTarget)} kcal` : '-'}</strong>
            </div>
            <div>
              <span>{headerRemainingLabel}</span>
              <strong>{headerRemaining === null ? '-' : `${Math.abs(headerRemaining)} kcal`}</strong>
            </div>
          </div>

          <button className="report-button" type="button" onClick={() => setOpenReport(true)}>
            Report
          </button>

          <button className="menu-button" onClick={() => setOpenMenu((v) => !v)} aria-label="Otevřít menu">
            <span />
            <span />
            <span />
          </button>
        </div>

        <MainDashboard
          date={selectedDate}
          dayTotals={dayTotals}
          totalItems={totalItemsToday}
          energyPlan={energyPlan}
          mealsByType={mealsByType}
          isMealsLoading={isMealsLoading}
          onOpenSection={openSection}
          onOpenMenu={() => setOpenMenu(true)}
        />

        <div className="app-content">
          <main className="app-main">
            <div className="accordion-stack">
          <AccordionSection
            title="Jídlo"
            subtitle="Snídaně, svačiny, oběd a večeře"
            colorClass="panel-teal"
            statusClass={getSectionStatusClass('food')}
            isOpen={openMain === 'food'}
            onToggle={() => setOpenMain(openMain === 'food' ? null : 'food')}
          >
            <div className="accordion-stack">
              {isMealsLoading ? <div className="empty-box">Načítám dnešní jídla...</div> : null}

              <MealQuickAdd
                mealsByType={mealsByType}
                recipes={recipes}
                isRecipesLoading={isRecipesLoading}
                quickAddRequest={quickAddRequest}
                onSaveMeal={saveMeal}
                onCreateFood={openCustomFoodCreator}
                onCreateRecipe={openRecipeCreator}
              />

              {FOOD_MEAL_SECTIONS.map((section) => (
                <MealSection
                  key={section.key}
                  section={section}
                  savedMeals={mealsByType[section.key] || []}
                  recipes={recipesByType[section.key] || []}
                  isRecipesLoading={isRecipesLoading}
                  hideEntry
                  isOpen={openMeal === section.key}
                  onToggle={() => setOpenMeal(openMeal === section.key ? null : section.key)}
                  onQuickAdd={() => openQuickMealAdd(section.key)}
                  onSaveMeal={saveMeal}
                  onDeleteMeal={deleteSavedMeal}
                  onSaveRecipe={saveRecipe}
                />
              ))}

              <RecipeLibrary
                recipes={recipes}
                isLoading={isRecipesLoading}
                isOpen={openMeal === 'recipes'}
                onToggle={() => setOpenMeal(openMeal === 'recipes' ? null : 'recipes')}
                onUseRecipe={useRecipeForMeal}
                onSaveRecipe={saveRecipe}
                onDeleteRecipe={deleteRecipe}
                editRecipeRequest={recipeEditRequest}
                createRecipeRequest={recipeCreateRequest}
                onCreateFood={openCustomFoodCreator}
              />

              <CustomFoodsManager
                foods={customFoods}
                recipes={userRecipes}
                isLoading={isCustomFoodsLoading}
                isRecipesLoading={isRecipesLoading}
                isOpen={openMeal === 'custom-foods'}
                onToggle={() => setOpenMeal(openMeal === 'custom-foods' ? null : 'custom-foods')}
                editRecipeRequest={recipeEditRequest}
                createFoodRequest={customFoodCreateRequest}
                onSaveFood={saveCustomFood}
                onDeleteFood={deleteCustomFood}
                onSaveRecipe={saveRecipe}
                onDeleteRecipe={deleteRecipe}
              />
            </div>
          </AccordionSection>

          <AccordionSection
            title="Pití"
            subtitle="Voda, káva, čaj, džus, limonády a alkohol"
            colorClass="panel-cyan"
            statusClass={getSectionStatusClass('drinks')}
            isOpen={openMain === 'drinks'}
            onToggle={() => setOpenMain(openMain === 'drinks' ? null : 'drinks')}
          >
            {DRINK_SECTION ? (
              <MealSection
                section={DRINK_SECTION}
                savedMeals={mealsByType[DRINK_SECTION.key] || []}
                recipes={recipesByType[DRINK_SECTION.key] || []}
                isRecipesLoading={isRecipesLoading}
                profile={profile}
                embedded
                isOpen={openMeal === DRINK_SECTION.key}
                onToggle={() => setOpenMeal(openMeal === DRINK_SECTION.key ? null : DRINK_SECTION.key)}
                onSaveMeal={saveMeal}
                onDeleteMeal={deleteSavedMeal}
                onSaveRecipe={saveRecipe}
              />
            ) : null}
          </AccordionSection>

          <AccordionSection
            title="Hmotnost"
            subtitle="Vážení, trend a vývoj v čase"
            colorClass="panel-sky"
            statusClass={getSectionStatusClass('weight')}
            isOpen={openMain === 'weight'}
            onToggle={() => setOpenMain(openMain === 'weight' ? null : 'weight')}
          >
            <WeightTracker
              date={selectedDate}
              logs={weightLogs}
              isLoading={isWeightLoading}
              profileWeight={profile.weight || profile.startWeight}
              onSaveWeight={saveWeightLog}
            />
          </AccordionSection>

          <AccordionSection
            title="Cvičení"
            subtitle="Trénink, pohyb a aktivita"
            colorClass="panel-sky"
            statusClass={getSectionStatusClass('exercise')}
            isOpen={openMain === 'exercise'}
            onToggle={() => setOpenMain(openMain === 'exercise' ? null : 'exercise')}
          >
            <ExercisePanel
              todayInfo={todayInfo}
              onTodayInfoChange={updateTodayInfo}
              profile={profile}
            />
          </AccordionSection>

          <AccordionSection
            title="Histamin"
            subtitle={`${histamineSummary.level.label} • ${histamineSummary.score} bodů`}
            colorClass="panel-indigo"
            statusClass={getSectionStatusClass('histamine')}
            isOpen={openMain === 'histamine'}
            onToggle={() => setOpenMain(openMain === 'histamine' ? null : 'histamine')}
          >
            <HistaminePanel
              histamineSummary={histamineSummary}
              reactions={todayReactions}
            />
          </AccordionSection>

          <AccordionSection
            title="Toaleta"
            subtitle={`${toiletEntryCount} záznamů`}
            colorClass="panel-blue"
            statusClass={getSectionStatusClass('toilet')}
            isOpen={openMain === 'toilet'}
            onToggle={() => setOpenMain(openMain === 'toilet' ? null : 'toilet')}
          >
            <ToiletPanel
              todayInfo={todayInfo}
              onTodayInfoChange={updateTodayInfo}
            />
          </AccordionSection>

          <AccordionSection
            title="Reakce těla"
            subtitle={`${todayReactions.length} záznamů`}
            colorClass="panel-indigo"
            statusClass={getSectionStatusClass('reactions')}
            isOpen={openMain === 'reactions'}
            onToggle={() => setOpenMain(openMain === 'reactions' ? null : 'reactions')}
          >
            <ReactionsPanel
              reactions={todayReactions}
              histamineSummary={histamineSummary}
              onAddReaction={addReaction}
              onUpdateReaction={updateReaction}
              onDeleteReaction={deleteReaction}
            />
          </AccordionSection>

          <AccordionSection
            title="Jak se cítím"
            subtitle={`${moodEntryCount} záznamů`}
            colorClass="panel-indigo"
            statusClass={getSectionStatusClass('mood')}
            isOpen={openMain === 'mood'}
            onToggle={() => setOpenMain(openMain === 'mood' ? null : 'mood')}
          >
            <MoodPanel
              todayInfo={todayInfo}
              onTodayInfoChange={updateTodayInfo}
            />
          </AccordionSection>

          <AccordionSection
            title="Jaký byl spánek"
            subtitle={normalizeSleepEntries(todayInfo)[0] ? `${normalizeSleepEntries(todayInfo)[0].fellAsleepAt || '22:00'} • ${normalizeSleepEntries(todayInfo)[0].durationHours ?? 8} h • ${normalizeSleepEntries(todayInfo)[0].quality || 'V kuse'}` : 'Čas usnutí, délka a kvalita'}
            colorClass="panel-blue"
            statusClass={getSectionStatusClass('sleep')}
            isOpen={openMain === 'sleep'}
            onToggle={() => setOpenMain(openMain === 'sleep' ? null : 'sleep')}
          >
            <SleepPanel
              todayInfo={todayInfo}
              onTodayInfoChange={updateTodayInfo}
            />
          </AccordionSection>

          <AccordionSection
            title="Popis dne"
            subtitle={todayInfo.dayJournalTitle || 'Deník, fotky a poznámky'}
            colorClass="panel-violet"
            statusClass={getSectionStatusClass('notes')}
            isOpen={openMain === 'notes'}
            onToggle={() => setOpenMain(openMain === 'notes' ? null : 'notes')}
          >
            <DiaryPanel
              todayInfo={todayInfo}
              onTodayInfoChange={updateTodayInfo}
              saveState={journalSaveState}
            />
          </AccordionSection>


            </div>
          </main>

          <aside className="desktop-day-panel">
            <DailyOverview
              date={selectedDate}
              mealsByType={mealsByType}
              dayTotals={dayTotals}
              totalItems={totalItemsToday}
              energyPlan={energyPlan}
              isLoading={isMealsLoading}
            />
          </aside>
        </div>
      </div>

      <AppSideMenu
        open={openMenu}
        onClose={() => setOpenMenu(false)}
        profile={profile}
        onProfileChange={setProfile}
        onProfileSave={saveUserProfile}
        isProfileSaving={isProfileSaving}
        profileError={profileError}
        bmiValue={bmiValue}
        bmiCategory={bmiCategory}
        goals={goals}
        onGoalsChange={setGoals}
        todayInfo={todayInfo}
        onTodayInfoChange={updateTodayInfo}
        mealsByType={mealsByType}
        dayTotals={dayTotals}
        totalItemsToday={totalItemsToday}
        energyPlan={energyPlan}
        selectedDate={selectedDate}
        isMealsLoading={isMealsLoading}
        onLogout={handleLogout}
      />

      <ReportModal
        open={openReport}
        onClose={() => setOpenReport(false)}
        selectedDate={selectedDate}
        currentMeals={dayMeals}
        currentInfo={todayInfo}
        currentReactions={todayReactions}
        dayInfo={dayInfo}
        reactions={reactions}
        profile={profile}
        goals={goals}
      />

      {/* Calendar modal */}
      {openCalendar ? (
        <div className="overlay" onClick={() => setOpenCalendar(false)}>
          <div className="calendar-modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, textAlign: 'center' }}>Vyber datum</h3>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 12 }}>
              <button className="button" onClick={prevDay}>◀</button>
              <input type="date" value={selectedDate} onChange={(e) => handleDateChange(e.target.value)} />
              <button className="button" onClick={nextDay}>▶</button>
            </div>
            <div style={{ textAlign: 'center' }}>
              <button className="button button-full" onClick={() => setOpenCalendar(false)}>Hotovo</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
