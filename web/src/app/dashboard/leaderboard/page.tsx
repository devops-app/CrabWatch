import { LeaderboardClient } from './client'

export default function LeaderboardPage(
  props: { searchParams: Promise<{ scope?: string; page?: string }> }
): React.JSX.Element {
  const searchParams = props.searchParams.then(sp => ({
    scope: (sp.scope as 'ALL_TIME' | 'SEASONAL') || 'ALL_TIME',
    page: parseInt(sp.page || '1', 10) || 1,
  }))

  return (
    <LeaderboardClient searchParamsPromise={searchParams} />
  )
}
