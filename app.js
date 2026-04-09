const tabs = document.querySelectorAll('.tab');
const panels = document.querySelectorAll('.tab-panel');

const mapNames = {
  abyss: 'Abyss',
  ascent: 'Ascent',
  bind: 'Bind',
  breeze: 'Breeze',
  icebox: 'Icebox',
  lotus: 'Lotus',
  pearl: 'Pearl',
  split: 'Split',
  sunset: 'Sunset',
  fracture: 'Fracture',
  haven: 'Haven'
};

const mapPresentation = {
  abyss: {
    image: 'Abyss.webp',
    subtitle: 'Aucune séquence renseignée pour le moment.'
  },
  ascent: {
    image: 'Ascent.webp',
    subtitle: 'Aucune séquence renseignée pour le moment.'
  },
  bind: {
    image: 'Bind.webp',
    subtitle: 'Aucune séquence renseignée pour le moment.'
  },
  breeze: {
    image: 'Breeze.webp',
    subtitle: 'Aucune séquence renseignée pour le moment.'
  },
  icebox: {
    image: 'Icebox.webp',
    subtitle: 'Aucune séquence renseignée pour le moment.'
  },
  lotus: {
    image: 'Lotus.webp',
    subtitle: 'Contrôle des timings de rotation et prises en deux temps.'
  },
  pearl: {
    image: 'Pearl.webp',
    subtitle: 'Aucune séquence renseignée pour le moment.'
  },
  split: {
    image: 'Split.webp',
    subtitle: 'Aucune séquence renseignée pour le moment.'
  },
  sunset: {
    image: 'Sunset.webp',
    subtitle: 'Aucune séquence renseignée pour le moment.'
  },
  fracture: {
    image: 'Fracture.webp',
    subtitle: 'Aucune séquence renseignée pour le moment.'
  },
  haven: {
    image: 'Haven.webp',
    subtitle: 'Aucune séquence renseignée pour le moment.'
  }
};

const keys = {
  played: 'boberPlayedMatches',
  upcoming: 'boberUpcomingMatches',
  comments: 'boberComments',
  adminSession: 'boberAdminSession',
  players: 'boberPlayerAccounts',
  playerSession: 'boberPlayerSession',
  stratMode: 'boberStrategyMode',
  teamTierState: 'boberTeamTierState',
  activeTab: 'boberActiveTab',
  attendancePolls: 'boberAttendancePolls'
};

const syncSettings = {
  endpoint: 'https://gaauvofzcibtwzytapjs.supabase.co/functions/v1/sync',
  pollMs: 3000,
  enabled: window.location.protocol === 'http:' || window.location.protocol === 'https:',
  syncedKeys: new Set([
    keys.played,
    keys.upcoming,
    keys.comments,
    keys.players,
    keys.teamTierState,
    keys.attendancePolls
  ])
};

let sharedSyncVersion = 0;
let sharedSyncStopped = false;
let isApplyingRemoteState = false;

function isSyncedKey(key) {
  return syncSettings.syncedKeys.has(key);
}

function writeLocalJson(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function readLocalJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function pushSharedValue(key, value) {
  if (!syncSettings.enabled || sharedSyncStopped || isApplyingRemoteState || !isSyncedKey(key)) return;

  try {
    const response = await fetch(syncSettings.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ key, value })
    });

    if (response.status === 404) {
      sharedSyncStopped = true;
      return;
    }

    if (!response.ok) {
      return;
    }

    const payload = await response.json();
    if (payload && typeof payload.version === 'number') {
      sharedSyncVersion = Math.max(sharedSyncVersion, payload.version);
    }
  } catch {
    // Silent fallback to local mode.
  }
}

function applySharedState(state) {
  if (!state || typeof state !== 'object') return;

  isApplyingRemoteState = true;

  try {
    syncSettings.syncedKeys.forEach((key) => {
      if (!Object.prototype.hasOwnProperty.call(state, key)) return;
      writeLocalJson(key, state[key]);
    });
  } finally {
    isApplyingRemoteState = false;
  }
}

async function pullSharedState() {
  if (!syncSettings.enabled || sharedSyncStopped) return false;

  try {
    const response = await fetch(syncSettings.endpoint, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (response.status === 404) {
      sharedSyncStopped = true;
      return false;
    }

    if (!response.ok) return false;

    const payload = await response.json();
    if (!payload || typeof payload !== 'object') return false;

    const nextVersion = typeof payload.version === 'number' ? payload.version : 0;
    if (nextVersion <= sharedSyncVersion) return false;

    sharedSyncVersion = nextVersion;
    applySharedState(payload.data || {});
    return true;
  } catch {
    return false;
  }
}

function scheduleSharedPush(key, value) {
  void pushSharedValue(key, value);
}

const adminAccounts = [
  { username: 'limulesama', password: '1569' },
  { username: 'coach', password: 'wiprcoach' }
];

const predefinedMemberCodes = [
  { username: 'bobe', tempCode: 'bobe2026' },
  { username: 'h1mmel', tempCode: 'h1mmel2026' },
  { username: 'quentin', tempCode: 'quentin2026' },
  { username: 'warinen', tempCode: 'warinen2026' },
  { username: 'pinelancien', tempCode: 'pinel2026' },
  { username: 'korraze', tempCode: 'korraze2026' }
];

function saveData(key, data) {
  writeLocalJson(key, data);
  scheduleSharedPush(key, data);
}

function loadData(key) {
  const data = readLocalJson(key, []);
  return Array.isArray(data) ? data : [];
}

function setActiveTab(tabKey) {
  const targetTab = document.querySelector(`.tab[data-tab="${tabKey}"]`);
  const targetPanel = document.getElementById(tabKey);
  if (!targetTab || !targetPanel) return;

  tabs.forEach((btn) => btn.classList.remove('active'));
  panels.forEach((panel) => panel.classList.remove('active'));
  targetTab.classList.add('active');
  targetPanel.classList.add('active');
}

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    const tabKey = tab.dataset.tab;
    if (!tabKey) return;

    setActiveTab(tabKey);
    localStorage.setItem(keys.activeTab, tabKey);
  });
});

const storedActiveTab = localStorage.getItem(keys.activeTab);
if (storedActiveTab) {
  setActiveTab(storedActiveTab);
}

const filterRow = document.getElementById('stratFilter');
const stratCards = document.querySelectorAll('.strat-card');
const stratGrid = document.getElementById('stratGrid');
const stratTitle = document.getElementById('stratTitle');
const commentMapTitle = document.getElementById('commentMapTitle');
const mapMenu = document.getElementById('mapMenu');
const mapMenuLabel = document.getElementById('mapMenuLabel');
const mapMenuList = mapMenu?.querySelector('.menu-list') || null;
const authGate = document.getElementById('authGate');
const mapMenuItems = document.querySelectorAll('[data-map-select]');
const mapPreviewImage = document.getElementById('mapPreviewImage');
const mapPreviewTitle = document.getElementById('mapPreviewTitle');
const mapPreviewSubtitle = document.getElementById('mapPreviewSubtitle');
const emptyState = document.getElementById('emptyState');
const defensePrinciples = document.getElementById('defensePrinciples');
const topSearch = document.getElementById('topSearch');
const topAuthState = document.getElementById('topAuthState');
const siteLockBanner = document.getElementById('siteLockBanner');
const openAuthGateBtn = document.getElementById('openAuthGateBtn');
const teamGrid = document.getElementById('teamGrid');
const teamProfiles = document.querySelectorAll('.team-profile');
const teamDetailName = document.getElementById('teamDetailName');
const teamDetailRole = document.getElementById('teamDetailRole');
const teamDetailStory = document.getElementById('teamDetailStory');
const teamDetailAgents = document.getElementById('teamDetailAgents');
const teamTierWrap = document.getElementById('teamTierWrap');
const teamTierImage = document.getElementById('teamTierImage');
const tierDrops = document.querySelectorAll('.team-tier-drop');

let draggedTierItem = null;
let selectedTierItem = null;
let currentTeamProfile = 'bobe';

let currentTypeFilter = 'attack';
let currentMap = 'lotus';
let currentSearch = '';

const storedMode = localStorage.getItem(keys.stratMode);
if (storedMode === 'attack' || storedMode === 'defense') {
  currentTypeFilter = storedMode;
}

const allValorantAgents = [
  'Astra',
  'Breach',
  'Brimstone',
  'Chamber',
  'Clove',
  'Cypher',
  'Deadlock',
  'Fade',
  'Gekko',
  'Harbor',
  'Iso',
  'Jett',
  'KAY/O',
  'Killjoy',
  'Neon',
  'Omen',
  'Phoenix',
  'Raze',
  'Reyna',
  'Sage',
  'Skye',
  'Sova',
  'Tejo',
  'Viper',
  'Vyse',
  'Waylay',
  'Yoru'
];

const tierOrder = [
  'pool',
  'very-comfortable',
  'comfortable',
  'playable',
  'not-comfortable',
  'helle-nah'
];

const tierListsByKey = {
  pool: () => document.getElementById('tierPool'),
  'very-comfortable': () => document.getElementById('tierVeryComfortable'),
  comfortable: () => document.getElementById('tierComfortable'),
  playable: () => document.getElementById('tierPlayable'),
  'not-comfortable': () => document.getElementById('tierNotComfortable'),
  'helle-nah': () => document.getElementById('tierHelleNah')
};

const availableAgentIcons = new Set([
  'astra',
  'breach',
  'brimstone',
  'chamber',
  'clove',
  'cypher',
  'deadlock',
  'fade',
  'gekko',
  'jett',
  'killjoy',
  'neon',
  'omen',
  'viper',
  'waylay'
]);

function getAgentIconPath(agentName) {
  const slug = String(agentName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!slug || !availableAgentIcons.has(slug)) return '';
  return `agent/${slug}.png`;
}

const teamProfilesData = {
  bobe: {
    name: 'BOBE',
    role: 'Propriétaire / Flex initiateur smokeur',
    story: 'Propriétaire du projet, il cadre la vision d\'équipe et prend les rôles flex initiateur/smokeur selon les besoins.',
    agents: ['Sova', 'Skye', 'Tejo', 'Fade', 'Astra'],
    tierImage: 'agent_bobe.PNG'
  },
  limulesama: {
    name: 'Limulesama',
    role: 'Capitaine / Mercato monster / Dueliste',
    story: 'Duelliste en formation, en constante progression, avec une vraie volonté de s\'imposer dans ce rôle clé.',
    agents: ['Waylay', 'Raze', 'Jett', 'Phoenix'],
    tierImage: 'agent_limule.png'
  },
  h1mmel: {
    name: 'h1mmel',
    role: 'IGL / Flex smokeur sentinel',
    story: 'Parmi les fondateurs de la team, il propose régulièrement des calls en début de round, très appréciés par l\'équipe. Il joue aussi un rôle de mini-coach, en apportant de la réflexion sur les stratégies et les compositions.',
    agents: ['Viper', 'Omen', 'Deadlock', 'Vyse', 'Killjoy'],
    tierImage: 'agent_h1mmel.png'
  },
  quentin: {
    name: 'Quentin',
    role: 'Shot caller / Flex initiateur smoker',
    story: 'Son expérience est essentielle, notamment dans la gestion de la pression. Un joueur fiable sur qui l\'équipe peut compter pour faire les bons reads.',
    agents: ['Astra', 'Gekko', 'Omen'],
    tierImage: 'agent_quentin.png'
  },
  warinen: {
    name: 'Warinen',
    role: 'Flex initiateur smoker',
    story: 'Joueur polyvalent, son intelligence de jeu est un vrai atout pour l\'équipe. Il apporte de la justesse et de la cohérence dans les décisions.',
    agents: ['Brimstone', 'Fade', 'Chamber', 'Phoenix'],
    tierImage: 'agent_warinen.png'
  },
  pinelancien: {
    name: 'Pinelancien',
    role: 'Flex initiateur smokeur / Sentinel',
    story: 'Toujours présent pour accompagner le duelliste, il sécurise les actions et apporte de la stabilité dans le jeu.',
    agents: ['Breach', 'Viper', 'Omen', 'Cypher'],
    tierImage: 'agent_pinelancien.png'
  },
  korraze: {
    name: 'kørraZé',
    role: 'Flex dueliste smokeur',
    story: 'Arrivé plus tard dans le groupe, c\'est un duelliste en apprentissage du jeu en équipe. Très solide mécaniquement, avec un fort potentiel (radiant en devenir).',
    agents: ['Phoenix', 'Yoru', 'Viper']
  }
};

function renderTeamProfile(profileKey) {
  if (!teamDetailName || !teamDetailRole || !teamDetailStory || !teamDetailAgents) return;

  const profile = teamProfilesData[profileKey];
  if (!profile) return;

  currentTeamProfile = profileKey;

  teamDetailName.textContent = profile.name;
  teamDetailRole.textContent = profile.role;
  teamDetailStory.textContent = profile.story;
  teamDetailAgents.innerHTML = profile.agents.map((agent) => `<li>${agent}</li>`).join('');
  renderTierBoard(profileKey);

  if (teamTierWrap && teamTierImage) {
    if (profile.tierImage) {
      teamTierImage.src = profile.tierImage;
      teamTierImage.alt = `Tier list agents de ${profile.name}`;
      teamTierWrap.classList.remove('hidden');
    } else {
      teamTierImage.src = '';
      teamTierImage.alt = 'Tier list indisponible';
      teamTierWrap.classList.add('hidden');
    }
  }
}

function loadTierStateData() {
  try {
    const raw = localStorage.getItem(keys.teamTierState);
    if (!raw) return {};

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function saveTierStateData(data) {
  writeLocalJson(keys.teamTierState, data);
  scheduleSharedPush(keys.teamTierState, data);
}

function getTierOwnerKey() {
  return normalizeUsername(currentPlayer || 'guest');
}

function getDefaultTierState() {
  return {
    pool: [...allValorantAgents],
    'very-comfortable': [],
    comfortable: [],
    playable: [],
    'not-comfortable': [],
    'helle-nah': []
  };
}

function sanitizeTierState(state) {
  const byName = new Map();
  allValorantAgents.forEach((agent) => {
    byName.set(agent.toLowerCase(), agent);
  });

  const normalized = {
    pool: [],
    'very-comfortable': [],
    comfortable: [],
    playable: [],
    'not-comfortable': [],
    'helle-nah': []
  };

  const used = new Set();

  tierOrder.forEach((tierKey) => {
    const list = Array.isArray(state?.[tierKey]) ? state[tierKey] : [];

    list.forEach((entry) => {
      const canonical = byName.get(String(entry || '').toLowerCase());
      if (!canonical || used.has(canonical)) return;
      normalized[tierKey].push(canonical);
      used.add(canonical);
    });
  });

  allValorantAgents.forEach((agent) => {
    if (!used.has(agent)) {
      normalized.pool.push(agent);
    }
  });

  return normalized;
}

function loadTierStateForProfile(profileKey) {
  const tierData = loadTierStateData();
  const ownerKey = getTierOwnerKey();
  const profileState = tierData?.[ownerKey]?.[profileKey];

  if (!profileState) {
    return getDefaultTierState();
  }

  return sanitizeTierState(profileState);
}

function saveCurrentTierBoard() {
  if (!currentTeamProfile) return;

  const tierData = loadTierStateData();
  const ownerKey = getTierOwnerKey();

  if (!tierData[ownerKey] || typeof tierData[ownerKey] !== 'object') {
    tierData[ownerKey] = {};
  }

  const snapshot = {
    pool: [],
    'very-comfortable': [],
    comfortable: [],
    playable: [],
    'not-comfortable': [],
    'helle-nah': []
  };

  tierOrder.forEach((tierKey) => {
    const list = tierListsByKey[tierKey]?.();
    if (!list) return;

    snapshot[tierKey] = Array.from(list.querySelectorAll('.tier-agent-item')).map((item) => item.dataset.agentName || '');
  });

  tierData[ownerKey][currentTeamProfile] = sanitizeTierState(snapshot);
  saveTierStateData(tierData);
}

function createTierItem(agent) {
  const item = document.createElement('li');
  item.className = 'tier-agent-item';
  item.dataset.agentName = agent;
  item.dataset.agent = agent.toLowerCase();
  item.title = agent;
  item.draggable = true;

  const iconPath = getAgentIconPath(agent);
  if (iconPath) {
    const icon = document.createElement('img');
    icon.className = 'tier-agent-icon';
    icon.src = iconPath;
    icon.alt = agent;
    icon.draggable = false;
    item.appendChild(icon);
  } else {
    const fallback = document.createElement('span');
    fallback.className = 'tier-agent-fallback';
    fallback.textContent = agent;
    item.appendChild(fallback);
  }

  item.addEventListener('dragstart', (event) => {
    draggedTierItem = item;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      // Required for Firefox to start drag operations.
      event.dataTransfer.setData('text/plain', item.dataset.agent);
    }
  });
  item.addEventListener('dragend', () => {
    draggedTierItem = null;
  });
  item.addEventListener('click', () => {
    if (selectedTierItem && selectedTierItem !== item) {
      selectedTierItem.classList.remove('selected');
    }

    if (selectedTierItem === item) {
      item.classList.remove('selected');
      selectedTierItem = null;
      return;
    }

    item.classList.add('selected');
    selectedTierItem = item;
  });

  return item;
}

function renderTierBoard(profileKey = currentTeamProfile) {
  const tierPool = document.getElementById('tierPool');
  const tierVeryComfortable = document.getElementById('tierVeryComfortable');
  const tierComfortable = document.getElementById('tierComfortable');
  const tierPlayable = document.getElementById('tierPlayable');
  const tierNotComfortable = document.getElementById('tierNotComfortable');
  const tierHelleNah = document.getElementById('tierHelleNah');

  if (!tierPool || !tierVeryComfortable || !tierComfortable || !tierPlayable || !tierNotComfortable || !tierHelleNah) return;

  [tierPool, tierVeryComfortable, tierComfortable, tierPlayable, tierNotComfortable, tierHelleNah].forEach((list) => {
    list.innerHTML = '';
  });

  const tierState = loadTierStateForProfile(profileKey);
  const listMap = {
    pool: tierPool,
    'very-comfortable': tierVeryComfortable,
    comfortable: tierComfortable,
    playable: tierPlayable,
    'not-comfortable': tierNotComfortable,
    'helle-nah': tierHelleNah
  };

  tierOrder.forEach((tierKey) => {
    const targetList = listMap[tierKey];
    if (!targetList) return;

    tierState[tierKey].forEach((agent) => {
      targetList.appendChild(createTierItem(agent));
    });
  });

  selectedTierItem = null;
}

tierDrops.forEach((dropZone) => {
  dropZone.addEventListener('dragover', (event) => {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  });

  dropZone.addEventListener('drop', (event) => {
    event.preventDefault();
    let itemToMove = draggedTierItem;

    if (!itemToMove && event.dataTransfer) {
      const transferredAgent = event.dataTransfer.getData('text/plain').toLowerCase();
      if (transferredAgent) {
        itemToMove = document.querySelector(`.tier-agent-item[data-agent="${transferredAgent}"]`);
      }
    }

    if (!itemToMove) return;

    itemToMove.classList.remove('selected');
    selectedTierItem = null;
    dropZone.appendChild(itemToMove);
    draggedTierItem = null;
    saveCurrentTierBoard();
  });

  dropZone.addEventListener('click', (event) => {
    if (!selectedTierItem) return;
    if (event.target.closest('.tier-agent-item')) return;

    selectedTierItem.classList.remove('selected');
    dropZone.appendChild(selectedTierItem);
    selectedTierItem = null;
    saveCurrentTierBoard();
  });
});

function positionMapMenu() {
  if (!mapMenu || !mapMenuLabel || !mapMenuList) return;

  const triggerRect = mapMenuLabel.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const horizontalMargin = 10;
  const desiredWidth = Math.min(viewportWidth * 0.92, 380);
  let left = triggerRect.left + (triggerRect.width / 2) - (desiredWidth / 2);

  left = Math.max(horizontalMargin, Math.min(left, viewportWidth - desiredWidth - horizontalMargin));

  mapMenuList.style.width = `${desiredWidth}px`;
  mapMenuList.style.left = `${left}px`;
  mapMenuList.style.top = `${triggerRect.bottom + 8}px`;
}

function applyStratFilters() {
  let visibleCount = 0;

  stratGrid.classList.toggle('attack-view', currentTypeFilter === 'attack');

  stratCards.forEach((card) => {
    const mapMatch = card.dataset.map === currentMap;
    const typeMatch = card.dataset.type === currentTypeFilter;
    const titleText = (card.querySelector('h3')?.textContent || '').toLowerCase();
    const bodyText = (card.querySelector('p')?.textContent || '').toLowerCase();
    const textMatch = !currentSearch || titleText.includes(currentSearch) || bodyText.includes(currentSearch);

    const show = mapMatch && typeMatch && textMatch;
    card.style.display = show ? 'block' : 'none';
    if (show) visibleCount += 1;
  });

  const label = mapNames[currentMap] || 'Lotus';
  const presentation = mapPresentation[currentMap] || mapPresentation.lotus;

  stratTitle.textContent = `Séquences - ${label}`;
  commentMapTitle.textContent = `REX - ${label}`;
  mapPreviewTitle.textContent = label;
  mapPreviewSubtitle.textContent = presentation.subtitle;
  mapPreviewImage.src = presentation.image;
  mapPreviewImage.alt = `Aperçu de la map ${label}`;
  mapMenuLabel.textContent = `Map : ${label}`;

  emptyState.classList.toggle('hidden', visibleCount > 0);

  if (defensePrinciples) {
    const showDefensePrinciples = currentMap === 'lotus' && currentTypeFilter === 'defense';
    defensePrinciples.classList.toggle('hidden', !showDefensePrinciples);
  }
}

filterRow.addEventListener('click', (event) => {
  const button = event.target.closest('.pill');
  if (!button) return;

  filterRow.querySelectorAll('.pill').forEach((pill) => pill.classList.remove('active'));
  button.classList.add('active');
  currentTypeFilter = button.dataset.filter;
  localStorage.setItem(keys.stratMode, currentTypeFilter);
  applyStratFilters();
  renderComments();
});

if (filterRow) {
  filterRow.querySelectorAll('.pill').forEach((pill) => {
    pill.classList.toggle('active', pill.dataset.filter === currentTypeFilter);
  });
}

mapMenuItems.forEach((item) => {
  item.addEventListener('click', () => {
    const nextMap = item.dataset.mapSelect;
    if (!nextMap) return;

    currentMap = nextMap;
    mapMenuItems.forEach((candidate) => candidate.classList.remove('active'));
    item.classList.add('active');

    if (mapMenu && mapMenu.open) {
      mapMenu.open = false;
    }

    applyStratFilters();
    renderComments();
  });
});

if (mapMenu) {
  mapMenu.addEventListener('toggle', () => {
    if (mapMenu.open) {
      positionMapMenu();
    }
  });
}

window.addEventListener('resize', () => {
  if (mapMenu?.open) {
    positionMapMenu();
  }
});

window.addEventListener('scroll', () => {
  if (mapMenu?.open) {
    positionMapMenu();
  }
}, { passive: true });

document.addEventListener('click', (event) => {
  const target = event.target;
  const clickedOpenAuthButton = Boolean(openAuthGateBtn && openAuthGateBtn.contains(target));

  if (mapMenu?.open && !mapMenu.contains(target)) {
    mapMenu.open = false;
  }

  if (authGate?.open && !authGate.contains(target) && !clickedOpenAuthButton) {
    authGate.open = false;
  }
});

if (teamGrid) {
  teamGrid.addEventListener('click', (event) => {
    const button = event.target.closest('.team-profile');
    if (!button) return;

    const profileKey = button.dataset.profile;
    if (!profileKey) return;

    teamProfiles.forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    renderTeamProfile(profileKey);
  });
}

if (topSearch) {
  topSearch.addEventListener('input', () => {
    currentSearch = topSearch.value.trim().toLowerCase();
    applyStratFilters();
  });
}

const imageModal = document.getElementById('imageModal');
const modalImage = document.getElementById('modalImage');
const modalCaption = document.getElementById('modalCaption');
const closeModal = document.getElementById('closeModal');

stratCards.forEach((card) => {
  card.addEventListener('click', (event) => {
    const clickedImage = event.target.closest('img');
    const image = clickedImage || card.querySelector('img');
    if (!image) return;

    const title = card.querySelector('h3').textContent;
    modalImage.src = image.src;
    modalImage.alt = image.alt;
    modalCaption.textContent = title;
    imageModal.showModal();
  });
});

closeModal.addEventListener('click', () => imageModal.close());
imageModal.addEventListener('click', (event) => {
  const rect = imageModal.getBoundingClientRect();
  const inDialog =
    event.clientX >= rect.left &&
    event.clientX <= rect.right &&
    event.clientY >= rect.top &&
    event.clientY <= rect.bottom;

  if (!inDialog) imageModal.close();
});

const playedForm = document.getElementById('playedForm');
const playedList = document.getElementById('playedList');

function renderPlayed() {
  if (!playedList) return;

  const playedMatches = loadData(keys.played);
  playedList.innerHTML = playedMatches.length
    ? playedMatches.map((match) => `
      <li>
        <strong>${match.opponent}</strong> - ${match.score}
        <div class="muted">${new Date(match.date).toLocaleDateString('fr-FR')}</div>
      </li>
    `).join('')
    : '<li class="muted">Aucun match joué pour le moment.</li>';
}

if (playedForm) {
  playedForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const opponent = document.getElementById('playedOpponent').value.trim();
    const date = document.getElementById('playedDate').value;
    const score = document.getElementById('playedScore').value.trim();

    if (!opponent || !date || !score) return;

    const playedMatches = loadData(keys.played);
    playedMatches.unshift({ opponent, date, score });
    saveData(keys.played, playedMatches);
    playedForm.reset();
    renderPlayed();
    renderCommentMatchOptions();
  });
}

const upcomingForm = document.getElementById('upcomingForm');
const upcomingList = document.getElementById('upcomingList');

function renderUpcoming() {
  if (!upcomingList) return;

  const upcomingMatches = loadData(keys.upcoming);
  upcomingList.innerHTML = upcomingMatches.length
    ? upcomingMatches.map((match) => `
      <li>
        <strong>${match.opponent}</strong>
        <div class="muted">${new Date(match.datetime).toLocaleString('fr-FR')}</div>
        ${match.map ? `<div class="muted">Map: ${match.map}</div>` : ''}
      </li>
    `).join('')
    : '<li class="muted">Aucun match planifié.</li>';
}

if (upcomingForm) {
  upcomingForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const opponent = document.getElementById('upcomingOpponent').value.trim();
    const datetime = document.getElementById('upcomingDate').value;
    const map = document.getElementById('upcomingMap').value.trim();

    if (!opponent || !datetime) return;

    const upcomingMatches = loadData(keys.upcoming);
    upcomingMatches.unshift({ opponent, datetime, map });
    saveData(keys.upcoming, upcomingMatches);
    upcomingForm.reset();
    renderUpcoming();
    renderCommentMatchOptions();
  });
}

const commentForm = document.getElementById('commentForm');
const commentList = document.getElementById('commentList');
const commentMatchSelect = document.getElementById('commentMatch');
const playerLoginForm = document.getElementById('playerLoginForm');
const playerResetForm = document.getElementById('playerResetForm');
const playerResetHint = document.getElementById('playerResetHint');
const playerConnected = document.getElementById('playerConnected');
const playerStatus = document.getElementById('playerStatus');
const playerLogout = document.getElementById('playerLogout');
const commentAuthorInput = document.getElementById('commentAuthor');

let currentAdmin = localStorage.getItem(keys.adminSession) || '';
let currentPlayer = localStorage.getItem(keys.playerSession) || '';
let pendingPasswordResetUser = '';

if (currentAdmin && !currentPlayer) {
  currentPlayer = currentAdmin;
  localStorage.setItem(keys.playerSession, currentPlayer);
}

function normalizeUsername(value) {
  return value.trim().toLowerCase();
}

function loadAttendancePolls() {
  try {
    const raw = localStorage.getItem(keys.attendancePolls);
    if (!raw) return {};

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function saveAttendancePolls(data) {
  writeLocalJson(keys.attendancePolls, data);
  scheduleSharedPush(keys.attendancePolls, data);
}

let hideCompletedDays = true;

function getVoteChoice(voteEntry) {
  if (typeof voteEntry === 'string') return voteEntry;
  if (voteEntry && typeof voteEntry === 'object' && typeof voteEntry.choice === 'string') {
    return voteEntry.choice;
  }
  return '';
}

function getVoteDisplayName(userKey, voteEntry) {
  if (voteEntry && typeof voteEntry === 'object' && typeof voteEntry.name === 'string' && voteEntry.name.trim()) {
    return voteEntry.name.trim();
  }
  return userKey;
}

function getCalendarEventId(item) {
  if (!item) return '';

  if (item.dataset.eventId) {
    return item.dataset.eventId;
  }

  const label = item.querySelector('strong')?.textContent?.trim() || '';
  const generated = label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  item.dataset.eventId = generated || `event-${Date.now()}`;
  return item.dataset.eventId;
}

function renderAttendancePolls() {
  const calendarItems = document.querySelectorAll('.weekly-calendar li');
  if (!calendarItems.length) return;

  const calendarRoot = document.querySelector('.weekly-calendar');
  if (!calendarRoot) return;

  const completedItems = Array.from(calendarItems).filter((item) => item.classList.contains('completed'));
  const hiddenCount = completedItems.length;
  let completedToggle = calendarRoot.parentElement?.querySelector('.completed-toggle-wrap');
  if (!completedToggle) {
    completedToggle = document.createElement('div');
    completedToggle.className = 'completed-toggle-wrap';
    calendarRoot.parentElement?.insertBefore(completedToggle, calendarRoot);
  }

  completedToggle.innerHTML = `
    <button type="button" class="completed-toggle-btn" data-toggle-completed="true">
      ${hideCompletedDays ? `Afficher les jours termines (${hiddenCount})` : `Masquer les jours termines (${hiddenCount})`}
    </button>
  `;

  const polls = loadAttendancePolls();
  const currentUserKey = currentPlayer ? normalizeUsername(currentPlayer) : '';
  const isAdmin = Boolean(currentAdmin);

  calendarItems.forEach((item) => {
    const eventId = getCalendarEventId(item);
    if (!eventId) return;

    item.classList.toggle('completed-hidden', hideCompletedDays && item.classList.contains('completed'));

    const titleNode = item.querySelector(':scope > strong');
    const timeNode = item.querySelector(':scope > span');
    if (titleNode && timeNode && !item.querySelector('.calendar-main-info')) {
      const mainInfo = document.createElement('button');
      mainInfo.type = 'button';
      mainInfo.className = 'calendar-main-info';
      mainInfo.appendChild(titleNode);
      mainInfo.appendChild(timeNode);
      item.prepend(mainInfo);
    }

    const eventVotes = polls[eventId] && typeof polls[eventId] === 'object' ? polls[eventId] : {};
    const voteEntries = Object.entries(eventVotes);
    const yesVoters = [];
    const maybeVoters = [];
    const noVoters = [];

    voteEntries.forEach(([userKey, voteEntry]) => {
      const choice = getVoteChoice(voteEntry);
      const name = getVoteDisplayName(userKey, voteEntry);

      if (choice === 'yes') yesVoters.push(name);
      if (choice === 'maybe') maybeVoters.push(name);
      if (choice === 'no') noVoters.push(name);
    });

    const yesCount = yesVoters.length;
    const maybeCount = maybeVoters.length;
    const noCount = noVoters.length;
    const myVote = currentUserKey ? getVoteChoice(eventVotes[currentUserKey]) : '';

    const renderVoteList = (targetChoice) => {
      const targetVotes = voteEntries.filter(([, voteEntry]) => getVoteChoice(voteEntry) === targetChoice);
      if (!targetVotes.length) return 'aucun';

      return targetVotes.map(([userKey, voteEntry]) => {
        const displayName = getVoteDisplayName(userKey, voteEntry);
        if (!isAdmin) {
          return displayName;
        }

        return `${displayName} <button type="button" class="admin-vote-btn" data-remove-vote="${userKey}" data-event-id="${eventId}">Supprimer</button>`;
      }).join(', ');
    };

    let pollNode = item.querySelector('.presence-poll');
    if (!pollNode) {
      pollNode = document.createElement('div');
      pollNode.className = 'presence-poll';
      item.appendChild(pollNode);
    }

    pollNode.innerHTML = `
      <p class="presence-label">Presence</p>
      <div class="presence-actions">
        <button type="button" class="presence-btn ${myVote === 'yes' ? 'active' : ''}" data-choice="yes">Oui (${yesCount})</button>
        <button type="button" class="presence-btn ${myVote === 'maybe' ? 'active' : ''}" data-choice="maybe">Peut-etre (${maybeCount})</button>
        <button type="button" class="presence-btn ${myVote === 'no' ? 'active' : ''}" data-choice="no">Non (${noCount})</button>
      </div>
    `;

    let detailsNode = item.querySelector('.presence-details');
    if (!detailsNode) {
      detailsNode = document.createElement('div');
      detailsNode.className = 'presence-details';
      item.appendChild(detailsNode);
    }

    detailsNode.innerHTML = `
      <p class="presence-details-title">Votes du jour</p>
      ${isAdmin ? `<button type="button" class="admin-vote-btn admin-vote-clear-btn" data-clear-votes="${eventId}">Supprimer tous les votes</button>` : ''}
      <div class="presence-details-grid">
        <p><strong>Oui:</strong> ${renderVoteList('yes')}</p>
        <p><strong>Peut-etre:</strong> ${renderVoteList('maybe')}</p>
        <p><strong>Non:</strong> ${renderVoteList('no')}</p>
      </div>
    `;

    detailsNode.classList.toggle('open', item.classList.contains('show-presence-details'));
  });
}

const weeklyCalendar = document.querySelector('.weekly-calendar');
if (weeklyCalendar) {
  document.addEventListener('click', (event) => {
    const completedToggleButton = event.target.closest('.completed-toggle-btn');
    if (!completedToggleButton) return;

    hideCompletedDays = !hideCompletedDays;
    renderAttendancePolls();
  });

  weeklyCalendar.addEventListener('click', (event) => {
    const removeVoteButton = event.target.closest('.admin-vote-btn[data-remove-vote]');
    if (removeVoteButton) {
      if (!currentAdmin) return;

      const eventId = removeVoteButton.dataset.eventId;
      const voteUserKey = removeVoteButton.dataset.removeVote;
      if (!eventId || !voteUserKey) return;

      const polls = loadAttendancePolls();
      if (!polls[eventId] || typeof polls[eventId] !== 'object') return;

      delete polls[eventId][voteUserKey];

      if (!Object.keys(polls[eventId]).length) {
        delete polls[eventId];
      }

      saveAttendancePolls(polls);
      renderAttendancePolls();
      return;
    }

    const clearVotesButton = event.target.closest('.admin-vote-btn[data-clear-votes]');
    if (clearVotesButton) {
      if (!currentAdmin) return;

      const eventId = clearVotesButton.dataset.clearVotes;
      if (!eventId) return;

      const polls = loadAttendancePolls();
      if (!polls[eventId]) return;

      delete polls[eventId];
      saveAttendancePolls(polls);
      renderAttendancePolls();
      return;
    }

    const button = event.target.closest('.presence-btn');
    if (button) {
      if (!currentPlayer) {
        alert('Connecte-toi pour voter au sondage de presence.');
        return;
      }

      const eventItem = button.closest('li');
      const eventId = getCalendarEventId(eventItem);
      const choice = button.dataset.choice;
      const userKey = normalizeUsername(currentPlayer);

      if (!eventId || !choice || !userKey) return;

      const polls = loadAttendancePolls();
      if (!polls[eventId] || typeof polls[eventId] !== 'object') {
        polls[eventId] = {};
      }

      const existingChoice = getVoteChoice(polls[eventId][userKey]);

      if (existingChoice === choice) {
        delete polls[eventId][userKey];
      } else {
        polls[eventId][userKey] = {
          choice,
          name: currentPlayer
        };
      }

      saveAttendancePolls(polls);
      renderAttendancePolls();
      return;
    }

    const dayButton = event.target.closest('.calendar-main-info');
    if (dayButton) {
      const eventItem = dayButton.closest('li');
      if (!eventItem) return;
      eventItem.classList.toggle('show-presence-details');
      const details = eventItem.querySelector('.presence-details');
      if (details) {
        details.classList.toggle('open', eventItem.classList.contains('show-presence-details'));
      }
    }
  });
}

function loadPlayers() {
  const rawPlayers = loadData(keys.players);
  return Array.isArray(rawPlayers) ? rawPlayers : [];
}

function findPredefinedMember(usernameKey) {
  return predefinedMemberCodes.find((member) => normalizeUsername(member.username) === usernameKey) || null;
}

function savePlayerAccount(username, password, forcePasswordChange = false) {
  const players = loadPlayers();
  const usernameKey = normalizeUsername(username);
  const existingIndex = players.findIndex((player) => normalizeUsername(player.username || '') === usernameKey);
  const payload = {
    username,
    password,
    forcePasswordChange,
    updatedAt: new Date().toISOString()
  };

  if (existingIndex >= 0) {
    const existing = players[existingIndex] || {};
    players[existingIndex] = {
      ...existing,
      ...payload,
      createdAt: existing.createdAt || payload.updatedAt
    };
  } else {
    players.unshift({
      ...payload,
      createdAt: payload.updatedAt
    });
  }

  saveData(keys.players, players);
}

function openPasswordReset(username) {
  pendingPasswordResetUser = username;

  if (playerLoginForm) playerLoginForm.classList.add('hidden');
  if (playerResetForm) playerResetForm.classList.remove('hidden');
  if (playerResetHint) {
    playerResetHint.textContent = `Premiere connexion pour ${username}. Redefinis ton mot de passe.`;
  }

  const resetPasswordInput = document.getElementById('playerResetPassword');
  if (resetPasswordInput) {
    resetPasswordInput.focus();
  }
}

function completePlayerLogin(username) {
  currentAdmin = '';
  localStorage.removeItem(keys.adminSession);
  currentPlayer = username;
  localStorage.setItem(keys.playerSession, currentPlayer);
}

function updatePlayerUi() {
  const isConnected = Boolean(currentPlayer);

  if (!playerLoginForm || !playerConnected || !playerStatus || !commentAuthorInput) {
    return;
  }

  if (isConnected) {
    playerLoginForm.classList.add('hidden');
    if (playerResetForm) playerResetForm.classList.add('hidden');
  } else if (!pendingPasswordResetUser) {
    playerLoginForm.classList.remove('hidden');
    if (playerResetForm) playerResetForm.classList.add('hidden');
  }

  playerConnected.classList.toggle('hidden', !isConnected);

  if (isConnected) {
    playerStatus.textContent = currentAdmin
      ? `Connecté: ${currentPlayer} (admin)`
      : `Connecté: ${currentPlayer}`;
    commentAuthorInput.value = currentPlayer;
    commentAuthorInput.readOnly = true;
  } else {
    playerStatus.textContent = '';
    commentAuthorInput.readOnly = false;
    commentAuthorInput.placeholder = 'Pseudo';
  }

  updateAuthState();
  updateSiteAccessUi();
}

function updateAuthState() {
  if (!topAuthState) return;

  if (currentAdmin) {
    topAuthState.textContent = `Admin: ${currentAdmin}`;
    return;
  }

  if (currentPlayer) {
    topAuthState.textContent = `Joueur: ${currentPlayer}`;
    return;
  }

  topAuthState.textContent = 'Non connecté';
}

function updateSiteAccessUi() {
  const isConnected = Boolean(currentPlayer);

  document.body.classList.toggle('site-locked', !isConnected);
  if (siteLockBanner) {
    siteLockBanner.classList.toggle('hidden', isConnected);
  }
}

function focusAuthLogin() {
  if (currentPlayer || !playerLoginForm || pendingPasswordResetUser) return;

  playerLoginForm.classList.remove('hidden');
  playerLoginForm.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const loginUsernameInput = document.getElementById('playerLoginUsername');
  if (loginUsernameInput) {
    loginUsernameInput.focus();
  }
}

function updateAdminUi() {
  updateAuthState();
}

function generateCommentId() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }

  return `comm-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function renderCommentMatchOptions() {
  if (!commentMatchSelect) return;

  commentMatchSelect.disabled = false;
  commentMatchSelect.placeholder = 'Match (ex: BOBER vs TEAMX - 13-9)';
}

if (playerLoginForm) {
  playerLoginForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const username = document.getElementById('playerLoginUsername').value.trim();
    const password = document.getElementById('playerLoginPassword').value;
    const usernameKey = normalizeUsername(username);
    const predefinedMember = findPredefinedMember(usernameKey);

    const adminAccount = adminAccounts.find((candidate) => {
      return normalizeUsername(candidate.username) === usernameKey && candidate.password === password;
    });

    if (adminAccount) {
      currentAdmin = adminAccount.username;
      currentPlayer = adminAccount.username;
      localStorage.setItem(keys.adminSession, currentAdmin);
      localStorage.setItem(keys.playerSession, currentPlayer);
      playerLoginForm.reset();
      updateAdminUi();
      updatePlayerUi();
      renderTierBoard(currentTeamProfile);
      renderComments();
      renderAttendancePolls();
      return;
    }

    const players = loadPlayers();
    const existingUser = players.find((player) => {
      return normalizeUsername(player.username || '') === usernameKey;
    });

    if (!predefinedMember) {
      alert('Pseudo non autorise. Utilise le pseudo d\'un membre predefini.');
      return;
    }

    const account = players.find((player) => {
      return normalizeUsername(player.username || '') === usernameKey && player.password === password;
    });

    if (account) {
      if (account.forcePasswordChange) {
        playerLoginForm.reset();
        openPasswordReset(account.username);
        return;
      }

      completePlayerLogin(account.username);
      playerLoginForm.reset();
      updateAdminUi();
      updatePlayerUi();
      renderTierBoard(currentTeamProfile);
      renderComments();
      renderAttendancePolls();
      return;
    }

    const canForceResetWithTempCode = Boolean(
      predefinedMember
      && predefinedMember.tempCode === password
      && (!existingUser || normalizeUsername(predefinedMember.username) === 'pinelancien')
    );

    if (canForceResetWithTempCode) {
      savePlayerAccount(predefinedMember.username, password, true);
      playerLoginForm.reset();
      openPasswordReset(predefinedMember.username);
      return;
    }

    alert('Identifiants invalides.');
  });
}

if (playerResetForm) {
  playerResetForm.addEventListener('submit', (event) => {
    event.preventDefault();

    if (!pendingPasswordResetUser) return;

    const newPasswordInput = document.getElementById('playerResetPassword');
    const confirmPasswordInput = document.getElementById('playerResetPasswordConfirm');
    const newPassword = newPasswordInput?.value || '';
    const confirmPassword = confirmPasswordInput?.value || '';

    if (newPassword.length < 4) {
      alert('Le nouveau mot de passe doit faire au moins 4 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      alert('La confirmation du mot de passe ne correspond pas.');
      return;
    }

    savePlayerAccount(pendingPasswordResetUser, newPassword, false);
    completePlayerLogin(pendingPasswordResetUser);
    pendingPasswordResetUser = '';
    playerResetForm.reset();

    updateAdminUi();
    updatePlayerUi();
    renderTierBoard(currentTeamProfile);
    renderComments();
    renderAttendancePolls();
  });
}

if (playerLogout) {
  playerLogout.addEventListener('click', () => {
    currentAdmin = '';
    localStorage.removeItem(keys.adminSession);
    currentPlayer = '';
    pendingPasswordResetUser = '';
    localStorage.removeItem(keys.playerSession);
    if (playerResetForm) {
      playerResetForm.reset();
      playerResetForm.classList.add('hidden');
    }
    updateAdminUi();
    updatePlayerUi();
    renderTierBoard(currentTeamProfile);
    renderComments();
    renderAttendancePolls();
  });
}

if (openAuthGateBtn) {
  openAuthGateBtn.addEventListener('click', () => {
    if (authGate) {
      authGate.open = true;
      focusAuthLogin();
    }
  });
}

if (authGate) {
  authGate.addEventListener('toggle', () => {
    if (authGate.open) {
      focusAuthLogin();
    }
  });
}

function renderComments() {
  const comments = loadData(keys.comments);
  const mapComments = comments.filter((entry) => (entry.map || 'lotus') === currentMap);
  const isAdmin = Boolean(currentAdmin);

  commentList.innerHTML = mapComments.length
    ? mapComments.map((entry) => {
      const commentId = entry.id || `${entry.createdAt}-${entry.author}-${entry.match}`;
      return `
      <li>
        <div class="comment-top">
          <strong>${entry.author}</strong> ${entry.match}
          ${isAdmin ? `<button class="delete-comment-btn" data-id="${commentId}">Supprimer</button>` : ''}
        </div>
        <p>${entry.text}</p>
        <div class="muted">${new Date(entry.createdAt).toLocaleString('fr-FR')}</div>
      </li>
    `;
    }).join('')
    : '<li class="muted">Pas encore de commentaire REX.</li>';
}

commentList.addEventListener('click', (event) => {
  const button = event.target.closest('.delete-comment-btn');
  if (!button || !currentAdmin) return;

  const targetId = button.dataset.id;
  const comments = loadData(keys.comments);
  const updatedComments = comments.filter((entry) => {
    const entryId = entry.id || `${entry.createdAt}-${entry.author}-${entry.match}`;
    return entryId !== targetId;
  });

  saveData(keys.comments, updatedComments);
  renderComments();
});

commentForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const typedAuthor = document.getElementById('commentAuthor').value.trim();
  const author = currentPlayer || typedAuthor;
  const match = document.getElementById('commentMatch').value.trim();
  const text = document.getElementById('commentText').value.trim();

  if (!author || !match || !text) return;

  const comments = loadData(keys.comments);
  comments.unshift({
    id: generateCommentId(),
    author,
    match,
    map: currentMap,
    text,
    createdAt: new Date().toISOString()
  });

  saveData(keys.comments, comments);
  commentForm.reset();
  updatePlayerUi();
  renderCommentMatchOptions();
  renderComments();
});

function rerenderAfterSharedSync() {
  applyStratFilters();
  renderPlayed();
  renderUpcoming();
  renderCommentMatchOptions();
  renderComments();
  renderAttendancePolls();
  renderTierBoard(currentTeamProfile);
}

function startSharedSyncPolling() {
  if (!syncSettings.enabled || sharedSyncStopped) return;

  const runSync = async () => {
    const hasRemoteUpdate = await pullSharedState();
    if (hasRemoteUpdate) {
      rerenderAfterSharedSync();
    }
  };

  void runSync();
  window.setInterval(() => {
    void runSync();
  }, syncSettings.pollMs);
}

renderPlayed();
renderUpcoming();
renderCommentMatchOptions();
applyStratFilters();
renderTeamProfile('bobe');
updateAdminUi();
updatePlayerUi();
renderComments();
renderAttendancePolls();
updateSiteAccessUi();
startSharedSyncPolling();
