import { useEffect, useState } from 'react'

type ThemeMode = 'light' | 'dark' | 'system'
const KEY = 'ss-theme'
const query = () => window.matchMedia('(prefers-color-scheme: dark)')

function read(): ThemeMode {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

/** Follows the OS theme until the user picks one; the toggle always flips what is on screen. */
export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(read)
  const [systemDark, setSystemDark] = useState(() => query().matches)
  const dark = mode === 'dark' || (mode === 'system' && systemDark)

  useEffect(() => {
    const mq = query()
    const onChange = () => setSystemDark(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  useEffect(() => {
    try {
      if (mode === 'system') localStorage.removeItem(KEY)
      else localStorage.setItem(KEY, mode)
    } catch {
      /* storage blocked */
    }
  }, [mode])

  const toggle = () => {
    const html = document.documentElement
    html.classList.add('theme-switching')
    setTimeout(() => html.classList.remove('theme-switching'), 260)
    setMode(dark ? 'light' : 'dark')
  }

  return { dark, toggle }
}
