import * as React from "react"

const SMALL_SCREEN_BREAKPOINT = 1024 // lg

export function useIsSmallScreen() {
  const [isSmallScreen, setIsSmallScreen] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${SMALL_SCREEN_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsSmallScreen(window.innerWidth < SMALL_SCREEN_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsSmallScreen(window.innerWidth < SMALL_SCREEN_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isSmallScreen
}
