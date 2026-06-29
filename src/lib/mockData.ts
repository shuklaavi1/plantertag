export interface Tree {
  id: number;
  planter_name: string;
  species: string;
  planted_date: string;
  main_photo_url: string;
  latitude: number;
  longitude: number;
  status: string;
}

export interface TreeLog {
  id: string;
  tree_id: number;
  type: 'photo' | 'visit';
  photo_url?: string;
  note?: string;
  log_latitude?: number;
  log_longitude?: number;
  staff_name: string;
  created_at: string;
}

const INDIAN_SPECIES = [
  'Sal (Shorea robusta)',
  'Teak (Tectona grandis)',
  'Mahua (Madhuca longifolia)',
  'Arjun (Terminalia arjuna)',
  'Bamboo (Dendrocalamus strictus)',
  'Neem (Azadirachta indica)',
  'Jamun (Syzygium cumini)',
  'Bel (Aegle marmelos)',
  'Karanj (Millettia pinnata)',
  'Semal (Bombax ceiba)'
];

const JHARKHAND_PLANTERS = [
  'Birsa Oraon', 'Karmi Munda', 'Sukhram Ho', 'Phulo Soren', 'Lakhiram Tudu',
  'Ramesh Oraon', 'Sita Devi', 'Sunil Munda', 'Gita Kisku', 'Anil Hembrom',
  'Rajesh Oraon', 'Meena Munda', 'Suman Ho', 'Sanjay Soren', 'Asha Tudu',
  'Vijay Oraon', 'Puja Devi', 'Santosh Munda', 'Sunita Kisku', 'Amit Hembrom',
  'Kiran Oraon', 'Sanjay Munda', 'Jyoti Ho', 'Rakesh Soren', 'Priyanka Tudu',
  'Suresh Oraon', 'Kavita Devi', 'Manoj Munda', 'Babita Kisku', 'Deepak Hembrom',
  'Lalita Oraon', 'Vikram Munda', 'Rupa Ho', 'Ajay Soren', 'Nisha Tudu',
  'Manish Oraon', 'Soni Devi', 'Rajendra Munda', 'Poonam Kisku', 'Vinod Hembrom',
  'Aarti Oraon', 'Dinesh Munda', 'Reena Ho', 'Subhash Soren', 'Sapna Tudu',
  'Alok Oraon', 'Kusum Devi', 'Pankaj Munda', 'Champa Kisku', 'Sanjay Hembrom'
];

export const STATIC_TREES: Tree[] = Array.from({ length: 50 }, (_, i) => {
  const id = i + 1;
  const species = INDIAN_SPECIES[i % INDIAN_SPECIES.length];
  const planter_name = JHARKHAND_PLANTERS[i % JHARKHAND_PLANTERS.length];
  
  // Set default status values matching seed script
  let status = 'Healthy';
  if (id === 8 || id === 22 || id === 38) {
    status = 'Needs Attention';
  } else if (id === 16) {
    status = 'Dead';
  }

  // Set default planted_date spread across recent months
  let planted_date = '2026-06-25';
  if (id % 10 === 0) planted_date = '2026-03-20';
  else if (id % 10 === 3) planted_date = '2026-04-05';
  else if (id % 10 === 6) planted_date = '2026-04-15';
  else if (id % 10 === 8) planted_date = '2026-05-18';
  else if (id % 10 === 1) planted_date = '2026-05-01';

  // Set default photo url
  let main_photo_url = '/demo/tree_mature.png';
  if (id % 3 === 0) main_photo_url = '/demo/tree_growing.png';
  else if (id % 3 === 2) main_photo_url = '/demo/tree_sapling.png';

  return {
    id,
    planter_name,
    species,
    planted_date,
    main_photo_url,
    latitude: 23.85412 + (i * 0.003),
    longitude: 84.12345 + (i * 0.003),
    status
  };
});

export const STATIC_LOGS: TreeLog[] = [
  // Tree 1 Logs
  {
    id: 'log-1-v1',
    tree_id: 1,
    type: 'visit',
    note: 'Initial base fertilization complete.',
    staff_name: 'Ramesh Kerketta',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'log-1-p1',
    tree_id: 1,
    type: 'photo',
    photo_url: '/demo/tree_sapling.png',
    note: 'Planting day snapshot.',
    staff_name: 'Sunita Tigga',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'log-1-v2',
    tree_id: 1,
    type: 'visit',
    note: 'Watered in the evening, soil moisture verified.',
    staff_name: 'Ajay Lakra',
    created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'log-1-v3',
    tree_id: 1,
    type: 'visit',
    note: 'Checked trunk health. Clear.',
    staff_name: 'Poonam Minz',
    created_at: new Date().toISOString()
  },
  // Tree 2 Logs
  {
    id: 'log-2-v1',
    tree_id: 2,
    type: 'visit',
    note: 'Soil aerated and watered.',
    staff_name: 'Sunita Tigga',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'log-2-p1',
    tree_id: 2,
    type: 'photo',
    photo_url: '/demo/tree_growing.png',
    note: 'Initial health checkup photo.',
    staff_name: 'Ajay Lakra',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'log-2-v2',
    tree_id: 2,
    type: 'visit',
    note: 'Evening checking. Watering complete.',
    staff_name: 'Deepak Toppo',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  }
];

export function getMockTrees(): Tree[] {
  if (typeof window === 'undefined') return STATIC_TREES;
  const stored = localStorage.getItem('ptr_mock_trees');
  if (!stored) {
    localStorage.setItem('ptr_mock_trees', JSON.stringify(STATIC_TREES));
    return STATIC_TREES;
  }
  return JSON.parse(stored);
}

export function getMockLogs(): TreeLog[] {
  if (typeof window === 'undefined') return STATIC_LOGS;
  const stored = localStorage.getItem('ptr_mock_logs');
  if (!stored) {
    localStorage.setItem('ptr_mock_logs', JSON.stringify(STATIC_LOGS));
    return STATIC_LOGS;
  }
  return JSON.parse(stored);
}

export function addMockLog(log: Omit<TreeLog, 'id' | 'created_at'>) {
  if (typeof window === 'undefined') return;
  const logs = getMockLogs();
  const newLog: TreeLog = {
    ...log,
    id: `mock-log-${Date.now()}`,
    created_at: new Date().toISOString()
  };
  logs.push(newLog);
  localStorage.setItem('ptr_mock_logs', JSON.stringify(logs));
}

export function updateMockTreeStatus(treeId: number, status: string) {
  if (typeof window === 'undefined') return;
  const trees = getMockTrees();
  const updated = trees.map(t => t.id === treeId ? { ...t, status } : t);
  localStorage.setItem('ptr_mock_trees', JSON.stringify(updated));
}

export function getMockSession(): { email: string; name: string } | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem('ptr_mock_session');
  return stored ? JSON.parse(stored) : null;
}

export function signInMock() {
  if (typeof window === 'undefined') return;
  const session = { email: 'demo@ptr.org', name: 'Demo Staff' };
  localStorage.setItem('ptr_mock_session', JSON.stringify(session));
  window.dispatchEvent(new Event('ptr_auth_change'));
}

export function signOutMock() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('ptr_mock_session');
  window.dispatchEvent(new Event('ptr_auth_change'));
}
