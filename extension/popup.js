const input = document.getElementById('urlInput')
const saveBtn = document.getElementById('saveBtn')
const testBtn = document.getElementById('testBtn')
const status = document.getElementById('status')
const recentSection = document.getElementById('recentSection')
const recentGrid = document.getElementById('recentGrid')
const openApp = document.getElementById('openApp')
const hintText = document.getElementById('hintText')

function setStatus(msg, type = 'mid') {
  status.textContent = msg
  status.className = `status-${type}`
}

async function loadRecent(backendUrl) {
  try {
    const res = await fetch(`${backendUrl}/api/inspo`, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return
    const items = await res.json()
    if (!items.length) return

    recentSection.style.display = 'block'
    hintText.style.display = 'none'
    recentGrid.innerHTML = ''

    items.slice(0, 6).forEach(item => {
      const div = document.createElement('div')
      div.className = 'thumb'
      const img = document.createElement('img')
      img.src = `${backendUrl}${item.image_url}`
      img.alt = item.style_notes || 'inspo'
      div.appendChild(img)
      recentGrid.appendChild(div)
    })

    openApp.onclick = () => chrome.tabs.create({ url: backendUrl })
  } catch {
    // silently fail — recent grid is non-critical
  }
}

// Load saved URL on open
chrome.storage.sync.get(['backendUrl'], ({ backendUrl }) => {
  if (backendUrl) {
    input.value = backendUrl
    loadRecent(backendUrl)
  }
})

saveBtn.addEventListener('click', () => {
  const url = input.value.trim().replace(/\/$/, '')
  if (!url) { setStatus('please enter your app url', 'err'); return }
  chrome.storage.sync.set({ backendUrl: url }, () => {
    setStatus('saved ✓', 'ok')
    loadRecent(url)
    setTimeout(() => setStatus(''), 2000)
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
    setStatus('could not connect — check the url', 'err')
  }
})

input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveBtn.click()
})
