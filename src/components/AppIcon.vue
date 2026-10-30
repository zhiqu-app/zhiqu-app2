<template>
  <svg class="app-icon" :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path v-for="(d, i) in paths" :key="i" :d="d" />
  </svg>
</template>
<script>
const icons = {
  home: ['M3 10 12 3l9 7', 'M5 9v12h5v-7h4v7h5V9'],
  book: ['M12 6C9 3 5 3 2 4v15c4-1 7 0 10 2 3-2 6-3 10-2V4c-3-1-7-1-10 2Z', 'M12 6v15'],
  graph: [
    'M12 4 4 17M12 4l8 13M4 17h16',
    'M10 4a2 2 0 1 0 4 0 2 2 0 0 0-4 0M2 19a2 2 0 1 0 4 0 2 2 0 0 0-4 0M18 19a2 2 0 1 0 4 0 2 2 0 0 0-4 0'
  ],
  edit: ['M13 4H4v17h13v-7M8 8h5M8 12h3', 'm14 12 6-6 2 2-6 6-3 1 1-3Z'],
  chart: ['M4 20V11h3v9M11 20V4h3v16M18 20V8h3v12'],
  calendar: ['M4 5h16v16H4ZM8 2v6M16 2v6M4 10h16', 'm8 15 3 3 5-5'],
  settings: [
    'm10 3-1 3-3 1-2 3 2 2v3l2 2 3-1 2 2 3-1 1-3 3-1v-3l-2-2V6l-3-1-2-2Z',
    'M9 12a3 3 0 1 0 6 0 3 3 0 0 0-6 0'
  ],
  search: ['M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14M15 15l6 6'],
  bell: ['M5 17h14l-2-3V9a5 5 0 0 0-10 0v5ZM10 21h4M12 2v2'],
  menu: ['M4 6h16M4 12h16M4 18h16'],
  close: ['m6 6 12 12M6 18 18 6'],
  plus: ['M12 4v16M4 12h16'],
  arrow: ['M5 12h14m-6-6 6 6-6 6'],
  chevron: ['m9 5 7 7-7 7'],
  upload: ['M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6'],
  file: ['M14 2H5v20h14V7ZM14 2v5h5M8 12h8M8 16h6'],
  check: ['m5 12 4 4L20 5'],
  clock: ['M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0M12 7v6l4 2'],
  send: ['m3 3 19 9-19 9 4-9-4-9ZM7 12h15'],
  eye: ['M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z', 'M9 12a3 3 0 1 0 6 0 3 3 0 0 0-6 0'],
  trash: ['M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7'],
  info: ['M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0M12 11v6M12 7h.01'],
  logout: ['M10 4H4v16h6M9 12h12m-5-5 5 5-5 5'],
  download: ['M12 3v13m-5-5 5 5 5-5M4 17v4h16v-4'],
  play: ['m8 4 12 8-12 8V4Z'],
  mail: ['M3 5h18v14H3ZM3 5l9 8 9-8'],
  lock: ['M5 10h14v11H5ZM8 10V6a4 4 0 0 1 8 0v4M12 14v3'],
  spark: ['m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z']
}
export default {
  name: 'AppIcon',
  props: { name: { type: String, default: 'book' }, size: { type: [Number, String], default: 22 } },
  computed: {
    paths() {
      return icons[this.name] || icons.book
    }
  }
}
</script>
