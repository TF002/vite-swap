import { useEffect, useState } from 'react'
import type { Page } from './data/exchange'
import HomePage from './pages/HomePage'
import RecordsPage from './pages/RecordsPage'

const getPageFromLocation = (): Page =>
  window.location.pathname === '/records' ? 'records' : 'home'

function App() {
  const [page, setPage] = useState<Page>(() => getPageFromLocation())

  useEffect(() => {
    const syncPageWithRoute = () => {
      setPage(getPageFromLocation())
    }

    window.addEventListener('popstate', syncPageWithRoute)

    return () => {
      window.removeEventListener('popstate', syncPageWithRoute)
    }
  }, [])

  const navigateTo = (nextPage: Page) => {
    const nextPath = nextPage === 'records' ? '/records' : '/'

    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath)
    }

    setPage(nextPage)
  }

  if (page === 'records') {
    return <RecordsPage onBackHome={() => navigateTo('home')} />
  }

  return <HomePage onOpenRecords={() => navigateTo('records')} />
}

export default App
