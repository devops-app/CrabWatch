export type MalaysianState =
  | 'Johor'
  | 'Kedah'
  | 'Kelantan'
  | 'Melaka'
  | 'Negeri Sembilan'
  | 'Pahang'
  | 'Pulau Pinang'
  | 'Perak'
  | 'Perlis'
  | 'Selangor'
  | 'Terengganu'
  | 'Sabah'
  | 'Sarawak'
  | 'Kuala Lumpur'
  | 'Labuan'
  | 'Putrajaya'

export const MALAYSIAN_STATES: MalaysianState[] = [
  'Johor',
  'Kedah',
  'Kelantan',
  'Melaka',
  'Negeri Sembilan',
  'Pahang',
  'Pulau Pinang',
  'Perak',
  'Perlis',
  'Selangor',
  'Terengganu',
  'Sabah',
  'Sarawak',
  'Kuala Lumpur',
  'Labuan',
  'Putrajaya',
]

export const COASTAL_STATES: MalaysianState[] = [
  'Johor',
  'Kedah',
  'Kelantan',
  'Melaka',
  'Negeri Sembilan',
  'Pahang',
  'Pulau Pinang',
  'Perak',
  'Terengganu',
  'Sabah',
  'Sarawak',
  'Perlis',
  'Selangor',
  'Kuala Lumpur',
  'Labuan',
]

export const MALAYSIA_BOUNDS = {
  north: 7.366,
  south: 0.853,
  east: 119.269,
  west: 99.645,
  center: { lat: 4.2105, lng: 101.9758 },
}
