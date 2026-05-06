import { useEffect, useMemo, useState } from 'react'

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
  age: '',
  height: '',
  weight: '',
  startWeight: '',
}

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

function FoodLibrary({ foods, onAddFood }) {
  const [newFood, setNewFood] = useState('')

  function handleAdd() {
    const name = newFood.trim()
    if (!name) return
    onAddFood(name)
    setNewFood('')
  }

  return (
    <div className="card">
      <h3 className="card-title">Databáze jídel</h3>

      <div className="form-row">
        <input
          className="input"
          value={newFood}
          onChange={(e) => setNewFood(e.target.value)}
          placeholder="Přidat nové jídlo"
        />
        <button className="button" onClick={handleAdd}>
          Přidat
        </button>
      </div>

      <div className="food-grid">
        {foods.map((food) => (
          <div key={food.id} className="food-chip">
            {food.name}
          </div>
        ))}
      </div>
    </div>
  )
}

function MealSection({
  section,
  items,
  foods,
  isOpen,
  onToggle,
  onAddItem,
  onDeleteItem,
}) {
  const [query, setQuery] = useState('')
  const [selectedFoodId, setSelectedFoodId] = useState(foods[0]?.id || '')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    if (!foods.find((f) => f.id === selectedFoodId)) {
      setSelectedFoodId(foods[0]?.id || '')
    }
  }, [foods, selectedFoodId])

  const filteredFoods = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return foods
    return foods.filter((food) => food.name.toLowerCase().includes(q))
  }, [foods, query])

  function handleAdd() {
    if (!selectedFoodId) return

    onAddItem(section.key, {
      id: createId(),
      foodId: selectedFoodId,
      amount,
      note,
      createdAt: new Date().toISOString(),
    })

    setAmount('')
    setNote('')
    setQuery('')
  }

  return (
    <AccordionSection
      title={section.title}
      subtitle={`${items.length} položek dnes`}
      colorClass={section.colorClass}
      isOpen={isOpen}
      onToggle={onToggle}
    >
      <div className="card">
        <h4 className="card-title">Přidat jídlo</h4>

        <div className="form-group">
          <label className="label">Hledat v seznamu</label>
          <input
            className="input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Např. banán, rýže..."
          />
        </div>

        <div className="form-group">
          <label className="label">Vyber jídlo</label>
          <select
            className="input"
            value={selectedFoodId}
            onChange={(e) => setSelectedFoodId(e.target.value)}
          >
            {filteredFoods.length === 0 ? (
              <option value="">Nic nenalezeno</option>
            ) : (
              filteredFoods.map((food) => (
                <option key={food.id} value={food.id}>
                  {food.name}
                </option>
              ))
            )}
          </select>
        </div>

        <div className="form-group">
          <label className="label">Množství</label>
          <input
            className="input"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Např. 150 g"
          />
        </div>

        <div className="form-group">
          <label className="label">Poznámka</label>
          <input
            className="input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Např. bez cukru"
          />
        </div>

        <button className="button button-full" onClick={handleAdd}>
          Přidat do sekce
        </button>
      </div>

      <div className="card">
        <h4 className="card-title">Dnešní položky</h4>

        {items.length === 0 ? (
          <div className="empty-box">Zatím tu nic není.</div>
        ) : (
          <div className="list">
            {items.map((item) => {
              const food = foods.find((f) => f.id === item.foodId)
              return (
                <div key={item.id} className="list-item">
                  <div>
                    <div className="list-title">{food?.name || 'Neznámé jídlo'}</div>
                    <div className="list-subtitle">
                      {item.amount || 'Bez množství'}
                      {item.note ? ` • ${item.note}` : ''}
                    </div>
                  </div>
                  <button className="delete-button" onClick={() => onDeleteItem(section.key, item.id)}>
                    Smazat
                  </button>
                </div>
              )
            })}
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
  const [foods, setFoods] = useState(DEFAULT_FOODS)
  const [entries, setEntries] = useState({})
  const [dayInfo, setDayInfo] = useState({})
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
    return sum + (todayEntries[section.key]?.length || 0)
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
    return (
      <div className="page login-page">
        <div className="login-box">
          <div className="badge">FoodLife App</div>
          <h1 className="main-title">Sledování jídla a životního stylu</h1>
          <p className="main-text">
            První verze webové aplikace. Přihlášení je zatím lokální a uloží se do prohlížeče.
          </p>

          <form className="card" onSubmit={handleLogin}>
            <h2 className="card-title">Přihlášení</h2>

            <div className="form-group">
              <label className="label">E-mail</label>
              <input
                className="input"
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="jmeno@email.cz"
              />
            </div>

            <div className="form-group">
              <label className="label">Heslo</label>
              <input
                className="input"
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <button className="button button-full" type="submit">
              Přihlásit se
            </button>
          </form>
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
            <button className="button button-light" onClick={() => setOpenMain(openMain === 'profile' ? null : 'profile')}>Profil</button>
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
              {MEAL_SECTIONS.map((section) => (
                <MealSection
                  key={section.key}
                  section={section}
                  foods={foods}
                  items={todayEntries[section.key] || []}
                  isOpen={openMeal === section.key}
                  onToggle={() => setOpenMeal(openMeal === section.key ? null : section.key)}
                  onAddItem={addMealItem}
                  onDeleteItem={deleteMealItem}
                />
              ))}

              <AccordionSection
                title="Pití"
                subtitle="Kolik jsi dnes vypil"
                colorClass="panel-cyan"
                isOpen={openMeal === 'drinks'}
                onToggle={() => setOpenMeal(openMeal === 'drinks' ? null : 'drinks')}
              >
                <div className="card">
                  <h4 className="card-title">Pitný režim</h4>
                  <div className="form-group">
                    <label className="label">Co a kolik jsi vypil</label>
                    <input
                      className="input"
                      value={todayInfo.drinks || ''}
                      onChange={(e) => updateTodayInfo('drinks', e.target.value)}
                      placeholder="Např. voda 1,5 l, káva 2x, čaj"
                    />
                  </div>
                </div>
              </AccordionSection>
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
              <h3 className="card-title">Profil</h3>

              <div className="form-group">
                <label className="label">Jméno</label>
                <input
                  className="input"
                  value={profile.name || ''}
                  onChange={(e) => setProfile((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Jméno"
                />
              </div>

              <div className="form-group">
                <label className="label">E-mail</label>
                <input
                  className="input"
                  type="email"
                  value={profile.email || ''}
                  onChange={(e) => setProfile((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="E-mail"
                />
              </div>

              <div className="form-group">
                <label className="label">Pohlaví</label>
                <select
                  className="input"
                  value={profile.gender || ''}
                  onChange={(e) => setProfile((prev) => ({ ...prev, gender: e.target.value }))}
                >
                  <option value="">--</option>
                  <option value="Muž">Muž</option>
                  <option value="Žena">Žena</option>
                  <option value="Jiné">Jiné</option>
                </select>
              </div>

              <div className="form-group">
                <label className="label">Věk</label>
                <input
                  className="input"
                  type="number"
                  value={profile.age || ''}
                  onChange={(e) => setProfile((prev) => ({ ...prev, age: e.target.value }))}
                  placeholder="Věk"
                />
              </div>

              <div className="form-group">
                <label className="label">Výška (cm)</label>
                <input
                  className="input"
                  value={profile.height || ''}
                  onChange={(e) => setProfile((prev) => ({ ...prev, height: e.target.value }))}
                  placeholder="Výška v cm"
                />
              </div>

              <div className="form-group">
                <label className="label">Váha (kg)</label>
                <input
                  className="input"
                  value={profile.weight || ''}
                  onChange={(e) => setProfile((prev) => ({ ...prev, weight: e.target.value }))}
                  placeholder="Váha v kg"
                />
              </div>

              <div className="form-group">
                <label className="label">BMI</label>
                <div className="input">
                  {bmiValue ? `${bmiValue} (${bmiCategory})` : 'Vyplň výšku a váhu'}
                </div>
              </div>
            </div>
          </AccordionSection>

          <FoodLibrary foods={foods} onAddFood={addFood} />
        </div>
      </div>

      {/* Side sliding menu */}
      <div className={`side-menu ${openMenu ? 'open' : ''}`}>
        <div className="side-menu-header">
          <div className="side-menu-title">Menu</div>
          <button className="button" onClick={() => setOpenMenu(false)}>Zavřít</button>
        </div>

        <div className="side-menu-list">
          <button className="side-item" onClick={() => { setOpenMain('profile'); setOpenMenu(false) }}>Profil</button>
          <button className="side-item" onClick={() => { setOpenMain('history'); setOpenMenu(false) }}>Historie</button>
          <button className="side-item" onClick={() => { setOpenMain('settings'); setOpenMenu(false) }}>Nastavení</button>
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
