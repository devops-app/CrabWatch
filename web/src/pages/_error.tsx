import type { NextPageContext } from 'next'

interface ErrorPageProps {
  statusCode?: number
}

function ErrorPage({ statusCode }: ErrorPageProps) {
  const code = statusCode ?? 500

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-3xl font-bold text-ocean-900">{code}</h1>
        <p className="text-gray-600">
          {code === 404 ? 'Page not found.' : 'Something went wrong.'}
        </p>
      </div>
    </main>
  )
}

ErrorPage.getInitialProps = ({ res, err }: NextPageContext): ErrorPageProps => {
  const statusCode = res?.statusCode ?? err?.statusCode ?? 404
  return { statusCode }
}

export default ErrorPage
