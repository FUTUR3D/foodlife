import { useEffect, useMemo, useState } from 'react'

const STORAGE_KEYS = {
  auth: 'foodlife_auth',
  profile: 'foodlife_profile',
  foods: 'foodlife_foods',
  entries: 'foodlife_entries',
  dayInfo: 'foodlife_day_info',
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
  height: '',
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

export default function App() {
  const [isHydrated, setIsHydrated] = useState(false)
  const [auth, setAuth] = useState({ loggedIn: false, email: '' })
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [profile, setProfile] = useState(DEFAULT_PROFILE)
  const [foods, setFoods] = useState(DEFAULT_FOODS)
  const [entries, setEntries] = useState({})
  const [dayInfo, setDayInfo] = useState({})
  const [openMain, setOpenMain] = useState(null)
  const [openMeal, setOpenMeal] = useState(null)

  const today = formatToday()
  const todayEntries = entries[today] || {}
  const todayInfo = dayInfo[today] || DEFAULT_DAY_INFO

  useEffect(() => {
    const savedAuth = readStorage(STORAGE_KEYS.auth, { loggedIn: false, email: '' })
    const savedProfile = readStorage(STORAGE_KEYS.profile, DEFAULT_PROFILE)
    const savedFoods = readStorage(STORAGE_KEYS.foods, DEFAULT_FOODS)
    const savedEntries = readStorage(STORAGE_KEYS.entries, {})
    const savedDayInfo = readStorage(STORAGE_KEYS.dayInfo, {})

    setAuth(savedAuth)
    setLoginEmail(savedAuth.email || '')
    setProfile(savedProfile)
    setFoods(savedFoods?.length ? savedFoods : DEFAULT_FOODS)
    setEntries(savedEntries || {})
    setDayInfo(savedDayInfo || {})
    setIsHydrated(true)
  }, [])

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
    setAuth({ loggedIn: false, email: '' })
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

  const totalItemsToday = MEAL_SECTIONS.reduce((sum, section) => {
    return sum + (todayEntries[section.key]?.length || 0)
  }, 0)

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
          <div>
            <div className="topbar-small">Dnes</div>
            <h1 className="topbar-title">Můj den</h1>
            <div className="topbar-text">
              Přihlášen: {auth.email} • Dnešní záznamy: {totalItemsToday}
            </div>
          </div>

          <div className="topbar-actions">
            <button
              className="button button-light"
              onClick={() => {
                const name = prompt('Jméno', profile.name || '')
                const height = prompt('Výška v cm', profile.height || '')
                const startWeight = prompt('Počáteční váha v kg', profile.startWeight || '')

                if (name !== null || height !== null || startWeight !== null) {
                  setProfile((prev) => ({
                    ...prev,
                    name: name ?? prev.name,
                    height: height ?? prev.height,
                    startWeight: startWeight ?? prev.startWeight,
                  }))
                }
              }}
            >
              Profil
            </button>

            <button className="button button-light" onClick={handleLogout}>
              Odhlásit
            </button>
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

          <FoodLibrary foods={foods} onAddFood={addFood} />
        </div>
      </div>
    </div>
  )
}