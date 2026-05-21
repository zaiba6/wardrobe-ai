const input = document.getElementById('urlInput')
const saveBtn = document.getElementById('saveBtn')
const testBtn = document.getElementById('testBtn')
const status = document.getElementById('status')

function setStatus(msg, type = 'mid') {
  status.textContent = msg
  status.className = `status-${type}`
}

// Load saved URL on open
chrome.storage.sync.get(['backendUrl'], ({ backendUrl }) => {
  if (backendUrl) input.value = backendUrl
})

saveBtn.addEventListener('click', () => {
  const url = input.value.trim().replace(/\/$/, '')
  if (!url) { setStatus('please enter your app url', 'err'); return }
  chrome.storage.sync.set({ backendUrl: url }, () => {
    setStatus('saved ✓', 'ok')
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
