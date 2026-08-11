import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'
import { App } from '@capacitor/app'

// Custom URL scheme the backend redirects back to after Google sign-in.
// Must match the CFBundleURLScheme registered in the iOS project's Info.plist.
export const APP_SCHEME = 'wardrobeai'

export const isNative = () => Capacitor.isNativePlatform()

/**
 * Kick off Google sign-in.
 *
 * On the web this is just a normal same-origin redirect (unchanged behavior).
 * In the native app we can't use the in-app webview (Google blocks embedded
 * webviews), so we open the system browser and tell the backend to redirect
 * back into the app via the custom scheme once auth completes.
 */
export function startGoogleLogin(API) {
  if (isNative()) {
    Browser.open({ url: `${API}/api/auth/google?platform=ios` })
  } else {
    window.location.href = `${API}/api/auth/google`
  }
}

/**
 * Listen for the deep link the backend sends after sign-in
 * (wardrobeai://auth?token=...). Extracts the token, hands it back via
 * onToken, and dismisses the system browser. Returns a cleanup function.
 * No-op on the web.
 */
export function registerAuthDeepLink(onToken) {
  if (!isNative()) return () => {}

  const handle = App.addListener('appUrlOpen', ({ url }) => {
    if (!url || !url.startsWith(`${APP_SCHEME}://`)) return
    try {
      const token = new URL(url).searchParams.get('token')
      if (token) onToken(token)
    } catch {
      /* malformed deep link — ignore */
    }
    Browser.close().catch(() => {})
  })

  return () => {
    handle.then(h => h.remove()).catch(() => {})
  }
}
