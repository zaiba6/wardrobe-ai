const input        = document.getElementById('urlInput')
const saveBtn      = document.getElementById('saveBtn')
const testBtn      = document.getElementById('testBtn')
const status       = document.getElementById('status')
const recentGrid   = document.getElementById('recentGrid')
const emptyBoard   = document.getElementById('emptyBoard')
const loadingSpinner = document.getElementById('loadingSpinner')
const openApp      = document.getElementById('openApp')
const boardCount   = document.getElementById('boardCount')
const settingsToggle = document.getElementById('settingsToggle')
const settingsPanel  = document.getElementById('settingsPanel')

function setStatus(msg, type = 'mid') {
  status.textContent = msg
  status.className = `status-${type}`
}

settingsToggle.addEventListener('click', () => {
  settingsPanel.classList.toggle('open')
  settingsToggle.textContent = settingsPanel.classList.contains('open') ? 'close' : 'settings'
})

async function loadRecent(backendUrl, highlightFirst = false) {
  loadingSpinner.style.display = 'block'
  recentGrid.style.display = 'none'
  emptyBoard.style.display = 'none'
  openApp.style.display = 'none'

  try {
    const res = await fetch(`${backendUrl}/api/inspo`, { signal: AbortSignal.timeout(6000) })
    if (!res.ok) throw new Error()
    const items = await res.json()

    loadingSpinner.style.display = 'none'

    if (!items.length) {
      emptyBoard.style.display = 'block'
      return
    }

    boardCount.textContent = `${items.length} saved`
    recentGrid.innerHTML = ''

    // Show up to 12 most recent (4 columns × 3 rows)
    items.slice(0, 12).forEach((item, i) => {
      const div = document.createElement('div')
      div.className = 'thumb' + (highlightFirst && i === 0 ? ' new' : '')

      const img = document.createElement('img')
      img.src = `${backendUrl}${item.image_url}`
      img.alt = item.style_notes || 'inspo'
      img.loading = 'lazy'

      div.appendChild(img)
      recentGrid.appendChild(div)
    })

    recentGrid.style.display = 'grid'
    openApp.style.display = 'block'
    openApp.onclick = () => chrome.tabs.create({ url: backendUrl })

  } catch {
    loadingSpinner.style.display = 'none'
    emptyBoard.style.display = 'block'
    emptyBoard.textContent = 'could not connect — check settings'
  }
}

// Load saved URL on open
chrome.storage.sync.get(['backendUrl'], ({ backendUrl }) => {
  if (backendUrl) {
    input.value = backendUrl
    loadRecent(backendUrl)
  } else {
    // No URL yet — open settings automatically
    settingsPanel.classList.add('open')
    settingsToggle.textContent = 'close'
    loadingSpinner.style.display = 'none'
    emptyBoard.style.display = 'block'
    emptyBoard.textContent = 'add your app url in settings above'
  }
})

// Listen for a "just saved" message from background.js
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'inspo_saved') {
    chrome.storage.sync.get(['backendUrl'], ({ backendUrl }) => {
      if (backendUrl) loadRecent(backendUrl, true)
    })
  }
})

saveBtn.addEventListener('click', () => {
  const url = input.value.trim().replace(/\/$/, '')
  if (!url) { setStatus('please enter your app url', 'err'); return }
  chrome.storage.sync.set({ backendUrl: url }, () => {
    setStatus('saved ✓', 'ok')
    loadRecent(url)
    setTimeout(() => {
      setStatus('')
      settingsPanel.classList.remove('open')
      settingsToggle.textContent = 'settings'
    }, 1500)
  })
})

testBtn.addEventListener('click', async () => {
  const url = input.value.trim().replace(/\/$/, '')
  if (!url) { setStatus('enter your url first', 'err'); return }
  setStatus('connecting…', 'mid')
  try {
    const res = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(5000) })
    if (res.ok) {
      setStatus('connected ✓', 'ok')
      loadRecent(url)
    } else {
      setStatus(`error: ${res.status}`, 'err')
    }
  } catch {
    setStatus('could not connect', 'err')
  }
})

input.addEventListener('keydown', (e) => { if (e.key === 'Enter') saveBtn.click() })
