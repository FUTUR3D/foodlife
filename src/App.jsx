import { useEffect, useMemo, useState } from 'react'
import { COUNTRIES } from './countries'

const STORAGE_KEYS = {
  auth: 'foodlife_auth',
  profile: 'foodlife_profile',
  foods: 'foodlife_foods',
  entries: 'foodlife_entries',
  dayInfo: 'foodlife_day_info',
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
  toiletCount: '',
  toiletType: 'Normální',
  mood: 'Dobře',
  moodNote: '',
  dayNote: '',
  drinks: '',
}

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
  localStorage.setItem(key, JSON.stringify(value))
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

function AccordionSection({
  title,
  subtitle,
  colorClass,
  isOpen,
  onToggle,
  children,
}) {
  return (
    <div className="accordion">
      <button type="button" className={`accordion-header ${colorClass}`} onClick={onToggle}>
        <div>
          <div className="accordion-title">{title}</div>
          {subtitle ? <div className="accordion-subtitle">{subtitle}</div> : null}
        </div>
        <div className={`accordion-arrow ${isOpen ? 'open' : ''}`}>⌄</div>
      </button>

      {isOpen ? <div className="accordion-body">{children}</div> : null}
    </div>
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

function FoodValueDetails({ item }) {
  const totals = getItemTotals(item)
  const hasValues = totals.knownItems > 0

  return (
    <div className="food-value-details">
      <div>
        <span>Přepočet</span>
        <strong>{totals.grams ? formatMacro(totals.grams) : 'Bez gramáže'}</strong>
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

function CustomFoodsManager({
  foods,
  isLoading,
  isOpen,
  onToggle,
  onSaveFood,
  onDeleteFood,
}) {
  const [form, setForm] = useState(EMPTY_CUSTOM_FOOD)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

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
  }

  function editSearchFood(food) {
    setForm(formFromFood(food, { asEditableCopy: food.source !== 'user' }))
    setSearchQuery('')
    setSearchResults([])
    setError('')
  }

  function resetForm() {
    setForm(EMPTY_CUSTOM_FOOD)
    setError('')
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
      <div className="card">
        <div className="card-title-row">
          <h4 className="card-title">
            {form.base_food_id ? 'Upravit databázovou potravinu' : form.id ? 'Upravit potravinu' : 'Nová potravina'}
          </h4>
          {form.id || form.base_food_id ? (
            <button className="button button-light button-small" onClick={resetForm}>
              Nová
            </button>
          ) : null}
        </div>

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
      </div>

      <div className="card">
        <h4 className="card-title">Uložené vlastní potraviny</h4>
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
      </div>
    </AccordionSection>
  )
}

function MealSection({
  section,
  savedMeals,
  isOpen,
  onToggle,
  onSaveMeal,
  onDeleteMeal,
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [selectedFood, setSelectedFood] = useState(null)
  const [amount, setAmount] = useState('')
  const [unit, setUnit] = useState(section.key === 'piti' ? 'ml' : 'g')
  const [note, setNote] = useState('')
  const [draftItems, setDraftItems] = useState([])
  const [mealNote, setMealNote] = useState('')
  const [editingMealId, setEditingMealId] = useState(null)
  const [expandedDraftItems, setExpandedDraftItems] = useState({})
  const [expandedSavedItems, setExpandedSavedItems] = useState({})
  const [isSearching, setIsSearching] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

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
        const response = await fetch(`foods-search.php?q=${encodeURIComponent(q)}`, {
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
    setAmount(food.serving_grams ? '1' : '')
    setResults([])
  }

  function handleAddItem() {
    const parsedAmount = parseAmount(amount)
    const name = selectedFood?.name_cs || query.trim()

    if (!name || !parsedAmount) {
      setError('Vyber potravinu a doplň množství.')
      return
    }

    const grams = gramsFromAmount(parsedAmount, unit, selectedFood?.serving_grams)
    setDraftItems((prev) => [
      ...prev,
      {
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
      },
    ])

    setQuery('')
    setSelectedFood(null)
    setResults([])
    setAmount('')
    setNote('')
    setError('')
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
    })))
    setMealNote(meal.note || '')
    setError('')
    setExpandedDraftItems({})
  }

  function cancelEditMeal() {
    setEditingMealId(null)
    setDraftItems([])
    setMealNote('')
    setExpandedDraftItems({})
    setError('')
  }

  async function handleSaveMeal() {
    if (draftItems.length === 0 || isSaving) return

    setIsSaving(true)
    setError('')
    try {
      await onSaveMeal(section, draftItems, mealNote, editingMealId)
      setDraftItems([])
      setMealNote('')
      setEditingMealId(null)
      setExpandedDraftItems({})
    } catch {
      setError('Jídlo se nepodařilo uložit.')
    } finally {
      setIsSaving(false)
    }
  }

  const savedCount = savedMeals.reduce((sum, meal) => sum + meal.items.length, 0)

  return (
    <AccordionSection
      title={section.title}
      subtitle={`${savedMeals.length} uložených jídel • ${savedCount} položek`}
      colorClass={section.colorClass}
      isOpen={isOpen}
      onToggle={onToggle}
    >
      <div className="card">
        <h4 className="card-title">Skládání {section.title.toLowerCase()}</h4>

        <div className="form-group food-search-wrap">
          <label className="label">Potravina nebo nápoj</label>
          <input
            className="input"
            value={query}
            onChange={(e) => {
              setSelectedFood(null)
              setQuery(e.target.value)
            }}
            placeholder={section.key === 'piti' ? 'Např. voda, káva, džus...' : 'Např. banán, rýže, jogurt...'}
          />
          {results.length > 0 ? (
            <div className="food-search-results">
              {results.map((food) => (
                <button type="button" key={food.id} onClick={() => handleSelectFood(food)}>
                  <span>{food.name_cs}</span>
                  <small>
                    <FoodKindBadge food={food} />
                    {hasServingSize(food.default_unit, food.serving_grams) ? ` 1 ${food.default_unit} (${Math.round(Number(food.serving_grams))} g) • ` : ' '}
                    {Math.round(Number(food.kcal_100g || 0))} kcal / 100 g
                  </small>
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
            placeholder="Např. vařená rýže, bez cukru, po tréninku"
          />
        </div>

        {error ? <div className="inline-error">{error}</div> : null}

        <button className="button button-full" onClick={handleAddItem}>
          Přidat položku
        </button>
      </div>

      <div className="card">
        <div className="card-title-row">
          <h4 className="card-title">{editingMealId ? `Úprava ${section.title.toLowerCase()}` : 'Rozpracováno'}</h4>
          {editingMealId ? (
            <button className="button button-light button-small" onClick={cancelEditMeal}>
              Zrušit úpravy
            </button>
          ) : null}
        </div>
        {draftItems.length === 0 ? (
          <div className="empty-box">Přidej první položku a potom celé jídlo ulož.</div>
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

            <button className="button button-full" onClick={handleSaveMeal} disabled={isSaving}>
              {isSaving
                ? 'Ukládám...'
                : editingMealId
                  ? `Uložit úpravy ${section.title.toLowerCase()}`
                  : `Ukončit a uložit ${section.title.toLowerCase()}`}
            </button>
          </>
        )}
      </div>

      <div className="card">
        <h4 className="card-title">Dnešní přehled</h4>
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
                        <span>{item.name || item.custom_name}</span>
                        <span>{formatItemAmount(item)}</span>
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
      </div>
    </AccordionSection>
  )
}

function ReactionsPanel({ reactions, onAddReaction, onDeleteReaction }) {
  const [type, setType] = useState(REACTION_TYPES[0])
  const [intensity, setIntensity] = useState('5')
  const [onsetTime, setOnsetTime] = useState('')
  const [onsetSpeed, setOnsetSpeed] = useState(ONSET_SPEEDS[0])
  const [note, setNote] = useState('')

  function handleSubmit(e) {
    e.preventDefault()

    onAddReaction({
      type,
      intensity: Number(intensity),
      onsetTime,
      onsetSpeed,
      note: note.trim(),
    })

    setType(REACTION_TYPES[0])
    setIntensity('5')
    setOnsetTime('')
    setOnsetSpeed(ONSET_SPEEDS[0])
    setNote('')
  }

  return (
    <>
      <form className="card" onSubmit={handleSubmit}>
        <h3 className="card-title">Zadat symptom</h3>

        <div className="form-group">
          <label className="label">Typ reakce</label>
          <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
            {REACTION_TYPES.map((reactionType) => (
              <option key={reactionType}>{reactionType}</option>
            ))}
          </select>
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
          <label className="label">Čas vzniku</label>
          <input
            className="input"
            type="datetime-local"
            value={onsetTime}
            onChange={(e) => setOnsetTime(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="label">Rychlost nástupu</label>
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
          Uložit reakci
        </button>
      </form>

      {reactions.length > 0 ? (
        <div className="card">
          <h4 className="card-title">Možná souvislost</h4>
          <div className="empty-box">
            Později zde bude analýza jídel za posledních 2–48 hodin. Reakce nemusí být
            způsobena jen posledním jídlem, ale i kumulací potravin během dne nebo předchozích
            dnů.
          </div>
        </div>
      ) : null}

      <div className="card">
        <h4 className="card-title">Dnešní reakce</h4>

        {reactions.length === 0 ? (
          <div className="empty-box">Zatím tu není žádná reakce.</div>
        ) : (
          <div className="list">
            {reactions.map((reaction) => (
              <div key={reaction.id} className="list-item">
                <div>
                  <div className="list-title">{reaction.type}</div>
                  <div className="list-subtitle">
                    Intenzita: {reaction.intensity}/10 • Nástup: {reaction.onsetSpeed}
                    {reaction.onsetTime ? ` • Čas: ${reaction.onsetTime}` : ''}
                    {reaction.note ? ` • ${reaction.note}` : ''}
                  </div>
                </div>
                <button className="delete-button" onClick={() => onDeleteReaction(reaction.id)}>
                  Smazat
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
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
  const [dayMeals, setDayMeals] = useState([])
  const [isMealsLoading, setIsMealsLoading] = useState(false)
  const [customFoods, setCustomFoods] = useState([])
  const [isCustomFoodsLoading, setIsCustomFoodsLoading] = useState(false)
  const [reactions, setReactions] = useState({})
  const [openMain, setOpenMain] = useState(null)
  const [openMeal, setOpenMeal] = useState(null)
  const [openMenu, setOpenMenu] = useState(false)
  const [openCalendar, setOpenCalendar] = useState(false)
  const [selectedDate, setSelectedDate] = useState(formatToday())

  const today = selectedDate
  const todayEntries = entries[today] || {}
  const todayInfo = dayInfo[today] || DEFAULT_DAY_INFO
  const todayReactions = reactions[today] || []
  const mealsByType = useMemo(() => {
    return dayMeals.reduce((groups, meal) => {
      const key = meal.meal_type || 'ostatni'
      return {
        ...groups,
        [key]: [...(groups[key] || []), meal],
      }
    }, {})
  }, [dayMeals])

  useEffect(() => {
    const savedProfile = readStorage(STORAGE_KEYS.profile, DEFAULT_PROFILE)
    const savedFoods = readStorage(STORAGE_KEYS.foods, DEFAULT_FOODS)
    const savedEntries = readStorage(STORAGE_KEYS.entries, {})
    const savedDayInfo = readStorage(STORAGE_KEYS.dayInfo, {})
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
    writeStorage(STORAGE_KEYS.dayInfo, dayInfo)
  }, [dayInfo, isHydrated])

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
    loadUserProfile()
  }, [auth.loggedIn, isHydrated])

  useEffect(() => {
    if (!isHydrated || !auth.loggedIn) return
    loadCustomFoods()
  }, [auth.loggedIn, isHydrated])

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

  async function saveMeal(section, items, note, mealId = null) {
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

  const totalItemsToday = MEAL_SECTIONS.reduce((sum, section) => {
    return sum + (mealsByType[section.key] || []).reduce((mealSum, meal) => mealSum + meal.items.length, 0)
  }, 0)

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
    const d = new Date(today)
    d.setDate(d.getDate() - 1)
    setSelectedDate(d.toISOString().slice(0, 10))
  }

  function nextDay() {
    const d = new Date(today)
    d.setDate(d.getDate() + 1)
    setSelectedDate(d.toISOString().slice(0, 10))
  }

  function handleDateChange(val) {
    setSelectedDate(val)
  }

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
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="calendar-button" onClick={() => setOpenCalendar(true)} aria-label="Otevřít kalendář">📅</button>
            <div>
              <div className="topbar-small">{today === formatToday() ? 'Dnes' : ''}</div>
              <h1 className="topbar-title">Můj den</h1>
              <div className="topbar-text">{selectedDate} • Záznamy: {totalItemsToday}</div>
            </div>
          </div>

          <div className="topbar-actions">
            <button className="button button-light" onClick={handleLogout}>Odhlásit</button>
            <button className="menu-button" onClick={() => setOpenMenu((v) => !v)} aria-label="Otevřít menu">☰</button>
          </div>
        </div>

        <div className="accordion-stack">
          <AccordionSection
            title="Jídlo + pití"
            subtitle="Snídaně, svačiny, oběd, večeře a pití"
            colorClass="panel-teal"
            isOpen={openMain === 'food'}
            onToggle={() => setOpenMain(openMain === 'food' ? null : 'food')}
          >
            <div className="accordion-stack">
              {isMealsLoading ? <div className="empty-box">Načítám dnešní jídla...</div> : null}

              {MEAL_SECTIONS.map((section) => (
                <MealSection
                  key={section.key}
                  section={section}
                  savedMeals={mealsByType[section.key] || []}
                  isOpen={openMeal === section.key}
                  onToggle={() => setOpenMeal(openMeal === section.key ? null : section.key)}
                  onSaveMeal={saveMeal}
                  onDeleteMeal={deleteSavedMeal}
                />
              ))}

              <CustomFoodsManager
                foods={customFoods}
                isLoading={isCustomFoodsLoading}
                isOpen={openMeal === 'custom-foods'}
                onToggle={() => setOpenMeal(openMeal === 'custom-foods' ? null : 'custom-foods')}
                onSaveFood={saveCustomFood}
                onDeleteFood={deleteCustomFood}
              />
            </div>
          </AccordionSection>

          <AccordionSection
            title="Cvičení"
            subtitle="Trénink, pohyb a aktivita"
            colorClass="panel-sky"
            isOpen={openMain === 'exercise'}
            onToggle={() => setOpenMain(openMain === 'exercise' ? null : 'exercise')}
          >
            <div className="card">
              <h3 className="card-title">Cvičení</h3>
              <div className="form-group">
                <label className="label">Záznam cvičení</label>
                <input
                  className="input"
                  value={todayInfo.exercise || ''}
                  onChange={(e) => updateTodayInfo('exercise', e.target.value)}
                  placeholder="Např. Posilovna 45 min, běh 5 km..."
                />
              </div>
            </div>
          </AccordionSection>

          <AccordionSection
            title="Toaleta"
            subtitle="Počet a konzistence"
            colorClass="panel-blue"
            isOpen={openMain === 'toilet'}
            onToggle={() => setOpenMain(openMain === 'toilet' ? null : 'toilet')}
          >
            <div className="card">
              <h3 className="card-title">Toaleta / trávení</h3>

              <div className="form-group">
                <label className="label">Kolikrát dnes</label>
                <input
                  className="input"
                  value={todayInfo.toiletCount || ''}
                  onChange={(e) => updateTodayInfo('toiletCount', e.target.value)}
                  placeholder="Např. 2"
                />
              </div>

              <div className="form-group">
                <label className="label">Konzistence</label>
                <select
                  className="input"
                  value={todayInfo.toiletType || 'Normální'}
                  onChange={(e) => updateTodayInfo('toiletType', e.target.value)}
                >
                  <option>Normální</option>
                  <option>Řidší</option>
                  <option>Tvrdší</option>
                  <option>Průjem</option>
                  <option>Zácpa</option>
                </select>
              </div>
            </div>
          </AccordionSection>

          <AccordionSection
            title="Reakce těla"
            subtitle="Symptomy, intolerance a čas nástupu"
            colorClass="panel-indigo"
            isOpen={openMain === 'reactions'}
            onToggle={() => setOpenMain(openMain === 'reactions' ? null : 'reactions')}
          >
            <ReactionsPanel
              reactions={todayReactions}
              onAddReaction={addReaction}
              onDeleteReaction={deleteReaction}
            />
          </AccordionSection>

          <AccordionSection
            title="Jak se cítím"
            subtitle="Nálada, energie, symptomy"
            colorClass="panel-indigo"
            isOpen={openMain === 'mood'}
            onToggle={() => setOpenMain(openMain === 'mood' ? null : 'mood')}
          >
            <div className="card">
              <h3 className="card-title">Jak se cítím</h3>

              <div className="form-group">
                <label className="label">Nálada</label>
                <select
                  className="input"
                  value={todayInfo.mood || 'Dobře'}
                  onChange={(e) => updateTodayInfo('mood', e.target.value)}
                >
                  <option>Skvěle</option>
                  <option>Dobře</option>
                  <option>Normálně</option>
                  <option>Unaveně</option>
                  <option>Špatně</option>
                </select>
              </div>

              <div className="form-group">
                <label className="label">Poznámka</label>
                <input
                  className="input"
                  value={todayInfo.moodNote || ''}
                  onChange={(e) => updateTodayInfo('moodNote', e.target.value)}
                  placeholder="Např. nafouklý, bez energie, soustředěný..."
                />
              </div>
            </div>
          </AccordionSection>

          <AccordionSection
            title="Popis dne"
            subtitle="Stres, spánek, poznámky"
            colorClass="panel-violet"
            isOpen={openMain === 'notes'}
            onToggle={() => setOpenMain(openMain === 'notes' ? null : 'notes')}
          >
            <div className="card">
              <h3 className="card-title">Popis dne</h3>
              <div className="form-group">
                <label className="label">Poznámka k dni</label>
                <textarea
                  className="textarea"
                  value={todayInfo.dayNote || ''}
                  onChange={(e) => updateTodayInfo('dayNote', e.target.value)}
                  placeholder="Jaký byl den, stres, spánek, poznámky..."
                />
              </div>
            </div>
          </AccordionSection>

          <AccordionSection
            title="Profil"
            subtitle="Osobní informace"
            colorClass="panel-violet"
            isOpen={openMain === 'profile'}
            onToggle={() => setOpenMain(openMain === 'profile' ? null : 'profile')}
          >
            <div className="card">
              <ProfileEditor
                profile={profile}
                onChange={setProfile}
                onSave={saveUserProfile}
                isSaving={isProfileSaving}
                error={profileError}
                bmiValue={bmiValue}
                bmiCategory={bmiCategory}
              />
            </div>
          </AccordionSection>

        </div>
      </div>

      {/* Side sliding menu */}
      <div className={`side-menu ${openMenu ? 'open' : ''}`}>
        <div className="side-menu-header">
          <div className="side-menu-title">Menu</div>
          <button className="button" onClick={() => setOpenMenu(false)}>Zavřít</button>
        </div>

        <div className="side-menu-list">
          <button className="side-item" onClick={() => { setOpenMain('food'); setOpenMenu(false) }}>Jídlo + pití</button>
          <button className="side-item" onClick={() => { setOpenMain('exercise'); setOpenMenu(false) }}>Cvičení</button>
          <button className="side-item" onClick={() => { setOpenMain('toilet'); setOpenMenu(false) }}>Toaleta</button>
          <button className="side-item" onClick={() => { setOpenMain('reactions'); setOpenMenu(false) }}>Reakce těla</button>
          <button className="side-item" onClick={() => { setOpenMain('mood'); setOpenMenu(false) }}>Jak se cítím</button>
          <button className="side-item" onClick={() => { setOpenMain('notes'); setOpenMenu(false) }}>Popis dne</button>
          <button className="side-item" onClick={() => { setOpenMain('profile'); setOpenMenu(false) }}>Profil</button>
          <button className="side-item" onClick={() => { handleLogout(); setOpenMenu(false) }}>Odhlásit</button>
        </div>
      </div>

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
