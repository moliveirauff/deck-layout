import { Outlet } from 'react-router-dom'
import { TopBar } from './TopBar'

/**
 * Root layout: top bar (48px) + scrollable content area below.
 * Wraps every page in the application.
 */
export function RootLayout() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gray-50">
      <TopBar />
      <main className="flex flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  )
}
