export default function ClothesLoader({ label = '' }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="clothes-loader">
        <span>👕</span>
        <span>👖</span>
        <span>👟</span>
        <span>👜</span>
      </div>
      {label && <p className="text-sm" style={{ color: '#8B1A1A' }}>{label}</p>}
    </div>
  )
}
