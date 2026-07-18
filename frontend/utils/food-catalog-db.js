const DB_NAME = 'cf-food-catalog'
const DB_VERSION = 1
const META_KEY = 'catalog'

function openDb() {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB indisponível'))
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta')
      }
      if (!db.objectStoreNames.contains('foods')) {
        db.createObjectStore('foods', { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('Erro ao abrir IndexedDB'))
  })
}

function txDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error || new Error('Erro na transação IndexedDB'))
    tx.onabort = () => reject(tx.error || new Error('Transação IndexedDB abortada'))
  })
}

export async function readFoodCatalogMeta() {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('meta', 'readonly')
    const req = tx.objectStore('meta').get(META_KEY)
    req.onsuccess = () => resolve(req.result || null)
    req.onerror = () => reject(req.error || new Error('Erro ao ler meta do catálogo'))
  })
}

export async function readFoodCatalogItems() {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('foods', 'readonly')
    const req = tx.objectStore('foods').getAll()
    req.onsuccess = () => resolve(req.result || [])
    req.onerror = () => reject(req.error || new Error('Erro ao ler catálogo local'))
  })
}

export async function writeFoodCatalog({ version, items, syncedAt }) {
  const db = await openDb()
  const tx = db.transaction(['meta', 'foods'], 'readwrite')
  const metaStore = tx.objectStore('meta')
  const foodStore = tx.objectStore('foods')

  metaStore.put(
    {
      version,
      total: items.length,
      syncedAt: syncedAt || new Date().toISOString(),
    },
    META_KEY,
  )

  foodStore.clear()
  for (const item of items) {
    foodStore.put(item)
  }

  await txDone(tx)
}

export async function clearFoodCatalog() {
  const db = await openDb()
  const tx = db.transaction(['meta', 'foods'], 'readwrite')
  tx.objectStore('meta').delete(META_KEY)
  tx.objectStore('foods').clear()
  await txDone(tx)
}
