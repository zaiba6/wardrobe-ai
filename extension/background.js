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
    // Flash the badge to tell user to configure first
    chrome.action.setBadgeText({ text: '!' })
    chrome.action.setBadgeBackgroundColor({ color: '#B5756A' })
    setTimeout(() => chrome.action.setBadgeText({ text: '' }), 3000)
    return
  }

  // Flash saving state
  chrome.action.setBadgeText({ text: '…' })
  chrome.action.setBadgeBackgroundColor({ color: '#9B8E84' })

  try {
    const res = await fetch(`${backendUrl}/api/inspo/save-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: info.srcUrl }),
    })

    if (res.ok) {
      chrome.action.setBadgeText({ text: '✓' })
      chrome.action.setBadgeBackgroundColor({ color: '#7A9E7A' })
      // Tell the popup to refresh the grid if it's open
      chrome.runtime.sendMessage({ type: 'inspo_saved' }).catch(() => {})
    } else {
      chrome.action.setBadgeText({ text: '✗' })
      chrome.action.setBadgeBackgroundColor({ color: '#C47A70' })
    }
  } catch {
    chrome.action.setBadgeText({ text: '✗' })
    chrome.action.setBadgeBackgroundColor({ color: '#C47A70' })
  }

  setTimeout(() => chrome.action.setBadgeText({ text: '' }), 3000)
})
