export function makeDataTransfer() {
  const store = {}
  return {
    data: store,
    setData(type, val) { store[type] = String(val) },
    getData(type) { return store[type] },
    dropEffect: 'move',
    effectAllowed: 'all',
    files: [],
    items: [],
    types: []
  }
}