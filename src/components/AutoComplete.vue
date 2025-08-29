<template>
  <div class="ac" role="combobox" :aria-expanded="open ? 'true' : 'false'" :aria-owns="listId">
    <div class="ac-box">
      <input
        ref="inputEl"
        class="ac-input"
        :placeholder="placeholder"
        v-model="query"
        @keydown.down.prevent="move(1)"
        @keydown.up.prevent="move(-1)"
        @keydown.enter.prevent="commitHighlight"
        @keydown.esc.prevent="close"
        :aria-controls="listId"
        :aria-autocomplete="'list'"
      />
      <button v-if="query" class="ac-clear" @mousedown.prevent="clear">×</button>
    </div>

    <ul v-show="open && results.length" :id="listId" class="ac-pop" role="listbox">
      <li
        v-for="(opt,i) in results"
        :key="opt[valueKey] ?? i"
        :id="optionId(i)"
        class="ac-item"
        :class="{ active: i === hi }"
        role="option"
        :aria-selected="i === hi ? 'true' : 'false'"
        @pointerdown.prevent="select(opt)"
      >
        <span v-html="highlight(opt[labelKey] ?? '')"></span>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  modelValue: { type: Object, default: null },
  fetchUrl: { type: String, required: true },
  placeholder: { type: String, default: 'Search stations' },
  labelKey: { type: String, default: 'name' },
  valueKey: { type: String, default: 'id' },
  minChars: { type: Number, default: 1 },
  limit: { type: Number, default: 8 },
  delay: { type: Number, default: 150 }
})

const emit = defineEmits(['update:modelValue','select'])

const inputEl = ref(null)
const query = ref('')
const results = ref([])
const hi = ref(-1)
const open = ref(false)

const listId = 'ac-' + Math.random().toString(36).slice(2)

let debounceId = 0
let aborter = null
let cache = []
let selecting = false

function normalizeFold(s) {
  return (s ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function labelOf(v) {
  if (!v) return ''
  return String(v[props.labelKey] ?? '')
}

function idsEqual(a, b) {
  return String(a ?? '') === String(b ?? '')
}

function close() {
  open.value = false
}

function clear() {
  query.value = ''
  results.value = []
  hi.value = -1
  emit('update:modelValue', null)
  open.value = false
}

function optionId(i) {
  return `${listId}-opt-${i}`
}

function sanitize(s) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }
  return String(s).replace(/[&<>"']/g, ch => map[ch])
}

function highlight(label) {
  const text = String(label ?? '')
  const needle = query.value.trim()

  if (!needle) {
    return sanitize(text)
  }

  const foldedText = normalizeFold(text)
  const foldedNeedle = normalizeFold(needle)

  if (!foldedText.startsWith(foldedNeedle)) {
    return sanitize(text)
  }

  const head = sanitize(text.slice(0, needle.length))
  const tail = sanitize(text.slice(needle.length))

  return `<span class="hl">${head}</span>${tail}`
}

function move(dir) {
  if (!results.value.length) return

  const len = results.value.length
  const next = (hi.value + dir + len) % len
  hi.value = next

  const el = document.getElementById(optionId(next))
  if (el) el.scrollIntoView({ block: 'nearest' })
}

function commitHighlight() {
  const i = hi.value
  if (i < 0 || i >= results.value.length) return
  select(results.value[i])
}

function prefixFilter(q, list) {
  const needle = normalizeFold(q)

  return list
    .filter(x => normalizeFold(x?.[props.labelKey]).startsWith(needle))
    .slice(0, props.limit)
}

async function run(q) {
  if (aborter) aborter.abort()
  aborter = new AbortController()

  const url = new URL(props.fetchUrl)
  url.searchParams.set('search', q)
  url.searchParams.set('limit', String(props.limit))

  try {
    const res = await fetch(url.toString(), { signal: aborter.signal })
    if (!res.ok) throw new Error('bad')
    const data = await res.json()
    cache = Array.isArray(data) && data.length ? data : cache
  } catch {
    if (!cache.length) {
      try {
        const res = await fetch(props.fetchUrl)
        cache = await res.json()
      } catch {
        cache = []
      }
    }
  }

  const selectedId = props.modelValue?.[props.valueKey]
  const selectedLabel = labelOf(props.modelValue)
  const sameAsSelected = normalizeFold(q) === normalizeFold(selectedLabel)

  let filtered = prefixFilter(q, Array.isArray(cache) ? cache : [])

  if (sameAsSelected) {
    filtered = filtered.filter(x => !idsEqual(x?.[props.valueKey], selectedId))
  }

  results.value = filtered
  hi.value = results.value.length ? 0 : -1
  open.value = results.value.length > 0
}

watch(query, q => {
  if (selecting) return

  clearTimeout(debounceId)

  const selectedLabel = labelOf(props.modelValue)
  const sameAsSelected = q && normalizeFold(q) === normalizeFold(selectedLabel)

  if (!q || q.length < props.minChars || sameAsSelected) {
    results.value = []
    hi.value = -1
    open.value = false
    return
  }

  debounceId = setTimeout(() => run(q), props.delay)
})

watch(() => props.modelValue, v => {
  selecting = true

  query.value = labelOf(v)
  results.value = []
  hi.value = -1
  open.value = false

  selecting = false
})

function select(opt) {
  selecting = true

  clearTimeout(debounceId)
  if (aborter) aborter.abort()

  emit('update:modelValue', opt)
  emit('select', opt)

  query.value = labelOf(opt)
  results.value = []
  hi.value = -1
  open.value = false

  inputEl.value?.blur()
  selecting = false
}

function onDocPointer(e) {
  if (!open.value) return

  const root = document.getElementById(listId)?.parentElement
  const inside = root && root.contains(e.target)

  if (!inside) close()
}

onMounted(() => {
  document.addEventListener('pointerdown', onDocPointer)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocPointer)
})
</script>

<style scoped>
.ac{ 
    position:relative;
    width:100% 
}
.ac-box{ 
    position:relative; 
    display:flex; 
    align-items:center 
}
.ac-input{
  width:100%;
  padding:10px 36px 10px 12px;
  border-radius:999px;
  border:1px solid var(--border);
  font-size:16px;
  background:#fff;
}
.ac-clear{
  position:absolute; 
  right:8px; 
  top:50%; 
  transform:translateY(-50%);
  border:0; 
  background:transparent; 
  font-size:18px; 
  line-height:1; 
  padding:4px 8px; 
  opacity:.6
}
.ac-pop{
  position:absolute; 
  top: 30px; 
  left:0; 
  right:0;
  background:#fff;
  border:1px solid var(--border);
  border-radius:16px;
  box-shadow:0 12px 36px rgba(0,0,0,.14);
  max-height:300px;
  overflow:auto;
  z-index:1000;
  padding:6px 0;
}
.ac-item{
  display:block;
  padding:10px 14px;
  cursor:pointer;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
}
.hl{ font-weight:700 }
</style>
