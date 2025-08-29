const API = 'https://605c94c36d85de00170da8b4.mockapi.io'
export async function fetchStations() {
  const r = await fetch(`${API}/stations`, { cache: 'no-store' })
  if (!r.ok) throw new Error('Failed to load stations')
  return await r.json()
}
