import { ObservationClient } from './client'

export default function ObservationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}): React.JSX.Element {
 return <ObservationClient idPromise={params} />
}
