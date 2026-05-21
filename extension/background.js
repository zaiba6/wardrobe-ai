chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'save-inspo',
    title: 'Save to inspo board ✦',
    contexts: ['image'],
  })
})

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId !== 'save-inspo') return

  const { backendUrl } = await chrome.storage.sync.get(['backendUrl'])

  if (!backendUrl) {
    chrome.action.setBadgeText({ text: '!' })
    chrome.action.setBadgeBackgroundColor({ color: '#B5756A' })
    setTimeout(() => chrome.action.setBadgeText({ text: '' }), 3000)
    return
  }

  chrome.action.setBadgeText({ text: '…' })
  chrome.action.setBadgeBackgroundColor({ color: '#9B8E84' })

  try {
    // Fetch the image in the browser (has access to Pinterest CDN, cookies, etc.)
    const imgRes = await fetch(info.srcUrl)
    if (!imgRes.ok) throw new Error(`image fetch failed: ${imgRes.status}`)
    const blob = await imgRes.blob()

    // Send as a file upload — same endpoint the app uses
    const formData = new FormData()
    formData.append('image', blob, 'inspo.jpg')

    const res = await fetch(`${backendUrl}/api/inspo/upload`, {
      method: 'POST',
      body: formData,
    })

    if (res.ok) {
      chrome.action.setBadgeText({ text: '✓' })
      chrome.action.setBadgeBackgroundColor({ color: '#7A9E7A' })
      chrome.runtime.sendMessage({ type: 'inspo_saved' }).catch(() => {})
    } else {
      throw new Error(`upload failed: ${res.status}`)
    }
  } catch (err) {
    console.error('IHaveNothingToWear save error:', err)
    chrome.action.setBadgeText({ text: '✗' })
    chrome.action.setBadgeBackgroundColor({ color: '#C47A70' })
  }

  setTimeout(() => chrome.action.setBadgeText({ text: '' }), 3000)
})
