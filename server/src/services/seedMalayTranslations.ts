import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

// Use raw PrismaClient to bypass i18n middleware (no request-scoped locale in seed scripts)
const prisma = new PrismaClient()

const LOCALE = 'ms'

/* ── LevelConfig translations ── */
const LEVEL_TITLES_MS: Record<string, string> = {
  'Crab Scout': 'Peneroka Ketam',
  'Tidal Tracker': 'Penjejak Surut',
  'Mangrove Explorer': 'Peneroka Bakau',
  'Shell Collector': 'Pengumpul Cengkerang',
  'Coastal Researcher': 'Penyelidik Pantai',
  'Estuary Guardian': 'Penjaga Muara',
  'Molting Master': 'Pakar Molting',
  'Crab Whisperer': 'Pembisik Ketam',
  'Mangrove Sentinel': 'Pengawal Bakau',
  'Apex Observer': 'Pengamat Puncak',
  'Master Naturalist': 'Ahli Biologi Master',
  'Keeper of the Mangroves': 'Penjaga Bakau',
}

/* ── Achievement translations ── */
const ACHIEVEMENT_NAMES_MS: Record<string, string> = {
  'First Blood': 'Darah Pertama',
  'Shell Collector': 'Pengumpul Cengkerang',
  'Claw Master': 'Pakar Cangkuk',
  'Master Observer': 'Pengamat Master',
  'Legendary': 'Legendaris',
  'Mud Crab Discoverer': 'Penemu Ketam Lumpur',
  '5 Species Finder': 'Pencari 5 Spesies',
  '10 Species Finder': 'Pencari 10 Spesies',
  '20 Species Finder': 'Pencari 20 Spesies',
  '7-Day Streak': 'Streak 7 Hari',
  '30-Day Streak': 'Streak 30 Hari',
  'Trusted Eye': 'Mata Tepercaya',
  'Data Champion': 'Johan Data',
  'Level 5 Achieved': 'Pencapaian Tahap 5',
  'Level 10 Achieved': 'Pencapaian Tahap 10',
  'Level 25 Achieved': 'Pencapaian Tahap 25',
  'Level 50 Achieved': 'Pencapaian Tahap 50',
  'Midnight Observer': 'Pengamat Tengah Malam',
  'Weekend Warrior': 'Pergelut Hujung Minggu',
}

const ACHIEVEMENT_DESCRIPTONS_MS: Record<string, string> = {
  'Submit your first observation': 'Hantar pemerhatian pertama anda',
  'Submit 10 observations': 'Hantar 10 pemerhatian',
  'Submit 50 observations': 'Hantar 50 pemerhatian',
  'Submit 100 observations': 'Hantar 100 pemerhatian',
  'Submit 500 observations': 'Hantar 500 pemerhatian',
  'Submit your first species': 'Hantar spesies pertama anda',
  'Submit 5 different species': 'Hantar 5 spesies berbeza',
  'Submit 10 different species': 'Hantar 10 spesies berbeza',
  'Submit 20 different species': 'Hantar 20 spesies berbeza',
  'Maintain a 7-day observation streak': 'Kekalkan streak pemerhatian 7 hari',
  'Maintain a 30-day observation streak': 'Kekalkan streak pemerhatian 30 hari',
  'Get 10 approved observations with <10% rejection rate': 'Dapatkan 10 pemerhatian diluluskan dengan kadar penolakan <10%',
  'Get 50 approved observations': 'Dapatkan 50 pemerhatian diluluskan',
  'Reach level 5': 'Capai tahap 5',
  'Reach level 10': 'Capai tahap 10',
  'Reach level 25': 'Capai tahap 25',
  'Reach level 50': 'Capai tahap 50',
  'Submit an observation between 00:00-01:00': 'Hantar pemerhatian antara 00:00-01:00',
  'Submit 5 observations on weekends': 'Hantar 5 pemerhatian pada hujung minggu',
}

/* ── MissionDefinition translations ── */
const MISSION_NAMES_MS: Record<string, string> = {
  'Daily Observer': 'Pengamat Harian',
  'Active Observer': 'Pengamat Aktif',
  'Species Hunter': 'Pemburu Spesies',
  'Weekly Champion': 'Johan Mingguan',
  'Quick Validator': 'Pengesah Laju',
  'Diligent Validator': 'Pengesah Tekun',
}

const MISSION_DESCRIPTONS_MS: Record<string, string> = {
  'Submit 1 observation today': 'Hantar 1 pemerhatian hari ini',
  'Submit 3 observations today': 'Hantar 3 pemerhatian hari ini',
  'Submit 2 different species this week': 'Hantar 2 spesies berbeza minggu ini',
  'Submit 5 observations this week': 'Hantar 5 pemerhatian minggu ini',
  'Validate 1 observation today': 'Sahkan 1 pemerhatian hari ini',
  'Validate 5 observations today': 'Sahkan 5 pemerhatian hari ini',
}

/* ── OnboardingFlow translations ── */
const ONBOARDING_NAME_MS: Record<string, string> = {
  'Welcome to CrabWatch': 'Selamat Datang ke CrabWatch',
}

const ONBOARDING_STEPS_MS = [
  { key: 'complete_profile', title: 'Lengkapkan Profil Anda', description: 'Tambah butiran hubungan dan lokasi anda' },
  { key: 'first_observation', title: 'Hantar Pemerhatian Pertama', description: 'Ambil gambar dan hantar pemerhatian ketam pertama anda' },
  { key: 'learn_species', title: 'Ketahui Tentang Spesies', description: 'Lihat panduan spesies' },
  { key: 'second_observation', title: 'Hantar Pemerhatian Lagi', description: 'Bina streak pemerhatian anda' },
  { key: 'check_leaderboard', title: 'Periksa Papan Skor', description: 'Lihat kedudukan anda di antara pemerhati lain' },
]

/* ── Species translations ── */
const SPECIES_COMMON_NAME_MS: Record<string, string> = {
  'Blue Mud Crab': 'Ketam Lumpur Biru',
  'Green Mud Crab': 'Ketam Lumpur Hijau',
  'Olive Mud Crab': 'Ketam Lumpur Zaitun',
  'Tamil Mud Crab': 'Ketam Lumpur Tamil',
}

const SPECIES_DESCRIPTION_MS: Record<string, string> = {
  'The blue mud crab is one of the largest species of mud crab, found throughout the Indo-Pacific region.':
    'Ketam lumpur biru adalah salah satu spesies ketam lumpur terbesar, yang ditemui di seluruh kawasan Indo-Pasifik.',
  'The green mud crab is a commercially important species found in estuaries and mangrove areas.':
    'Ketam lumpur hijau adalah spesies penting secara komersial yang ditemui di muara dan kawasan bakau.',
  'The olive mud crab is a smaller species of mud crab with olive-green coloration.':
    'Ketam lumpur zaitun adalah spesies ketam lumpur yang lebih kecil dengan corak warna zaitun-hijau.',
  'The Tamil mud crab is the smallest of the Scylla species, with lighter coloration and a narrower carapace.':
    'Ketam lumpur Tamil adalah yang terkecil dalam spesies Scylla, dengan warna yang lebih cerah dan karapas yang lebih sempit.',
}

const SPECIES_KEY_FEATURES_MS: Record<string, string[]> = {
  'Blue Mud Crab': ['Warna biru pada karapas', 'Keliped besar', 'Boleh mencapai lebar karapas 30cm'],
  'Green Mud Crab': ['Warna hijau pada karapas', 'Ditemui dalam air payau', 'Sangat dikomersialkan'],
  'Olive Mud Crab': ['Warna zaitun-hijau', 'Saiz lebih kecil', 'Lebih suka substrat berlumpur'],
  'Tamil Mud Crab': ['Spesies Scylla terkecil', 'Warna lebih cerah', 'Karapas lebih sempit'],
}

/* ── Helpers ── */

async function upsertTranslation(
  locale: string,
  resourceType: string,
  resourceId: string,
  field: string,
  value: string,
) {
  await prisma.translation.upsert({
    where: {
      locale_resourceType_resourceId_field: {
        locale,
        resourceType,
        resourceId,
        field,
      },
    },
    update: { value },
    create: {
      locale,
      resourceType,
      resourceId,
      field,
      value,
    },
  })
}

async function seedLevelTranslations() {
  const levels = await prisma.levelConfig.findMany({ where: { active: true } })
  let count = 0

  for (const level of levels) {
    const msTitle = LEVEL_TITLES_MS[level.title]
    if (msTitle) {
      await upsertTranslation(LOCALE, 'LevelConfig', level.id, 'title', msTitle)
      count++
    }
    if (level.description) {
      // No hardcoded descriptions for levels — skip for now
    }
  }

  console.log(`[SEED] LevelConfig translations: ${count}/${levels.length} translated`)
}

async function seedAchievementTranslations() {
  const achievements = await prisma.achievement.findMany({ where: { isActive: true } })
  let nameCount = 0
  let descCount = 0

  for (const ach of achievements) {
    const msName = ACHIEVEMENT_NAMES_MS[ach.name]
    if (msName) {
      await upsertTranslation(LOCALE, 'Achievement', ach.id, 'name', msName)
      nameCount++
    }
    const msDesc = ACHIEVEMENT_DESCRIPTONS_MS[ach.description]
    if (msDesc) {
      await upsertTranslation(LOCALE, 'Achievement', ach.id, 'description', msDesc)
      descCount++
    }
  }

  console.log(
    `[SEED] Achievement translations: ${nameCount}/${achievements.length} names, ${descCount}/${achievements.length} descriptions`,
  )
}

async function seedMissionTranslations() {
  const missions = await prisma.missionDefinition.findMany({ where: { active: true } })
  let nameCount = 0
  let descCount = 0

  for (const mission of missions) {
    const msName = MISSION_NAMES_MS[mission.name]
    if (msName) {
      await upsertTranslation(LOCALE, 'MissionDefinition', mission.id, 'name', msName)
      nameCount++
    }
    const msDesc = MISSION_DESCRIPTONS_MS[mission.description]
    if (msDesc) {
      await upsertTranslation(LOCALE, 'MissionDefinition', mission.id, 'description', msDesc)
      descCount++
    }
  }

  console.log(
    `[SEED] MissionDefinition translations: ${nameCount}/${missions.length} names, ${descCount}/${missions.length} descriptions`,
  )
}

async function seedOnboardingTranslations() {
  const flows = await prisma.onboardingFlow.findMany({ where: { active: true } })
  let count = 0

  for (const flow of flows) {
    const msName = ONBOARDING_NAME_MS[flow.name]
    if (msName) {
      await upsertTranslation(LOCALE, 'OnboardingFlow', flow.id, 'name', msName)
      count++
    }

    // Translate steps JSON
    const steps = flow.steps as Array<{ key: string; title: string; description: string }>
    if (Array.isArray(steps)) {
      const msSteps = steps.map(step => {
        const msStep = ONBOARDING_STEPS_MS.find(s => s.key === step.key)
        return msStep
          ? { ...step, title: msStep.title, description: msStep.description }
          : step
      })
      await upsertTranslation(
        LOCALE,
        'OnboardingFlow',
        flow.id,
        'steps',
        JSON.stringify(msSteps),
      )
      count++
    }
  }

  console.log(`[SEED] OnboardingFlow translations: ${count}/${flows.length} translated`)
}

async function seedSpeciesTranslations() {
  const species = await prisma.species.findMany()
  let count = 0

  for (const sp of species) {
    const msName = SPECIES_COMMON_NAME_MS[sp.commonName]
    if (msName) {
      await upsertTranslation(LOCALE, 'Species', sp.id, 'commonName', msName)
      count++
    }

    const msDesc = SPECIES_DESCRIPTION_MS[sp.description]
    if (msDesc) {
      await upsertTranslation(LOCALE, 'Species', sp.id, 'description', msDesc)
    }

    const msFeatures = SPECIES_KEY_FEATURES_MS[sp.commonName]
    if (msFeatures) {
      await upsertTranslation(
        LOCALE,
        'Species',
        sp.id,
        'keyFeatures',
        JSON.stringify(msFeatures),
      )
    }
  }

  console.log(`[SEED] Species translations: ${count}/${species.length} translated`)
}

async function main() {
  console.log(`🌱 Seeding Malay (${LOCALE}) translations...`)

  await seedLevelTranslations()
  await seedAchievementTranslations()
  await seedMissionTranslations()
  await seedOnboardingTranslations()
  await seedSpeciesTranslations()

  const total = await prisma.translation.count({ where: { locale: LOCALE } })
  console.log(`\n✅ Total Malay translations in DB: ${total}`)
  console.log('🎉 Malay translation seed completed!')
}

main()
  .catch((e) => {
    console.error('❌ Translation seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
