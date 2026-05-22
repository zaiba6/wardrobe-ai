const API = import.meta.env.VITE_API_URL ?? ''

export default function Login() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ backgroundColor: '#FAF7F2' }}>
      <div className="w-full max-w-sm text-center space-y-10">
        {/* Brand */}
        <div className="space-y-2">
          <h1 className="serif-italic text-4xl leading-tight" style={{ color: '#1C1917' }}>
            ButWhatDoIWear
          </h1>
          <p className="text-xs tracking-widest uppercase" style={{ color: '#9B8E84' }}>
            check your floordrobe
          </p>
        </div>

        {/* Tagline */}
        <div className="space-y-1">
          <p className="serif-italic text-lg" style={{ color: '#6B5E57' }}>
            your closet, your outfits, your vibe.
          </p>
          <p className="text-sm" style={{ color: '#C4B5AC' }}>
            sign in to access your personal wardrobe
          </p>
        </div>

        {/* Google button */}
        <a
          href={`${API}/api/auth/google`}
          className="flex items-center justify-center gap-3 w-full rounded-full px-6 py-3.5 border text-sm font-medium transition-all hover:bg-[#EED9D5] hover:border-[#B5756A]"
          style={{ borderColor: '#E3D9CE', color: '#1C1917', backgroundColor: '#fff' }}
        >
          {/* Google "G" logo */}
          <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </a>

        <p className="text-xs" style={{ color: '#C4B5AC' }}>
          your closet is private — only you can see it
        </p>
      </div>
    </div>
  )
}
