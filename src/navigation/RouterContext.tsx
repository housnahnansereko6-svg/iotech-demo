import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type AnchorHTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from 'react'
import { PATHS, type AppPath, type NavigablePath } from './paths'

interface NavigateOptions {
  replace?: boolean
}

interface RouterContextValue {
  pathname: string // the path, e.g. '/blog'
  search: string // the search params part, e.g. '?id=why-cybersecurity-matters' ('' if none)
  navigate: (to: NavigablePath, options?: NavigateOptions) => void
}

const RouterContext = createContext<RouterContextValue | null>(null)

function normalizePath(rawPath: string): string {
  if (!rawPath || rawPath === '/') return PATHS.LANDING
  return rawPath.endsWith('/') ? rawPath.slice(0, -1) : rawPath
}

// Splits '/blog?id=abc' into { pathname: '/blog', search: '?id=abc' }.
function splitAddress(address: string) {
  const questionMark = address.indexOf('?')
  if (questionMark === -1) return { pathname: normalizePath(address), search: '' }
  return {
    pathname: normalizePath(address.slice(0, questionMark)),
    search: address.slice(questionMark),
  }
}

// Reads the current address from the browser's address bar.
function readBrowserLocation() {
  if (typeof window === 'undefined') return { pathname: PATHS.LANDING as string, search: '' }
  return { pathname: normalizePath(window.location.pathname), search: window.location.search }
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState(readBrowserLocation)

  useEffect(() => {
    // Browser back/forward buttons: re-read the address bar.
    const handlePopState = () => setLocation(readBrowserLocation())

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const navigate = useCallback((to: NavigablePath, options?: NavigateOptions) => {
    const target = splitAddress(to)
    const fullTarget = target.pathname + target.search
    const current = window.location.pathname + window.location.search
    if (current !== fullTarget) {
      if (options?.replace) {
        window.history.replaceState({}, '', fullTarget)
      } else {
        window.history.pushState({}, '', fullTarget)
      }
    }
    setLocation(target)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const value = useMemo(
    () => ({ pathname: location.pathname, search: location.search, navigate }),
    [location, navigate],
  )

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>
}

export function useLocation() {
  const context = useContext(RouterContext)
  if (!context) {
    throw new Error('useLocation must be used within a RouterProvider')
  }
  return { pathname: context.pathname, search: context.search }
}

// Gives you the search params of the current address, ready to read:
//   address '/blog?id=abc'  ->  useSearchParams().get('id')  ->  'abc'
export function useSearchParams() {
  const { search } = useLocation()
  // useMemo: only rebuild the object when the search text actually changes.
  return useMemo(() => new URLSearchParams(search), [search])
}

export function useNavigate() {
  const context = useContext(RouterContext)
  if (!context) {
    throw new Error('useNavigate must be used within a RouterProvider')
  }
  return context.navigate
}

export interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  to: NavigablePath
  replace?: boolean
}

export function Link({ to, replace, onClick, children, ...rest }: LinkProps) {
  const navigate = useNavigate()

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event)
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.altKey ||
      event.ctrlKey ||
      event.shiftKey
    ) {
      return
    }
    event.preventDefault()
    navigate(to, { replace })
  }

  return (
    <a href={to} onClick={handleClick} {...rest}>
      {children}
    </a>
  )
}

export interface NavLinkProps extends Omit<LinkProps, 'className' | 'children'> {
  to: AppPath
  className?: string | ((state: { isActive: boolean }) => string)
  children?: ReactNode | ((state: { isActive: boolean }) => ReactNode)
}

export function NavLink({ to, className, children, ...rest }: NavLinkProps) {
  const { pathname } = useLocation()
  const isActive = pathname === to

  const resolvedClassName =
    typeof className === 'function' ? className({ isActive }) : className

  const resolvedChildren =
    typeof children === 'function' ? children({ isActive }) : children

  return (
    <Link
      to={to}
      aria-current={isActive ? 'page' : undefined}
      className={resolvedClassName}
      {...rest}
    >
      {resolvedChildren}
    </Link>
  )
}

