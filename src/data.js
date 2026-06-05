// data.js — CookCircle data + logic layer (recipes, personas, intent pipeline)

export const RECIPES = {
  dosa: {
    id: 'dosa', name: 'Dosa', emoji: '🥞',
    serves: 4,
    totalTime: '8 hr soak + 30 min',
    ingredients: [
      { item: 'Idli rice',        qty: 3,    unit: 'cups',
        subs: ['Parboiled rice — most authentic swap', 'Sona masuri rice — soak a bit longer', 'Basmati rice — lighter, less crisp'] },
      { item: 'Urad dal',         qty: 1,    unit: 'cup',
        subs: ['Whole urad dal (skin on) — soak 2 hours extra', 'Split moong dal — paler, milder dosas'] },
      { item: 'Fenugreek seeds',  qty: 0.5,  unit: 'tsp',
        subs: ['Skip it — add ¼ tsp baking soda to the batter before cooking', '1 tsp dry methi leaves'] },
      { item: 'Salt',             qty: 1,    unit: 'tsp',
        subs: ['Pink salt or sea salt — same qty'] },
      { item: 'Oil or ghee',      qty: null, unit: 'as needed',
        subs: ['Coconut oil — adds a subtle sweetness', 'Butter — richer but browns faster'] },
    ],
    nutrition: {
      perQty: '1 dosa (≈70 g)',
      servingUnits: 3,
      calories: 120,
      protein_g: 4,
      fat_g: 2,
      carbs_g: 22,
      carbs: { complex_g: 20, sugar_g: 1, fiber_g: 1 },
    },
    steps: [
      'Soak 3 cups rice and 1 cup urad dal in water for about 6 hours.',
      'Grind the soaked rice and dal into a smooth, thick batter.',
      'Cover and let the batter ferment overnight, around 8 hours.',
      'Heat a flat pan and spread a ladle of batter into a thin circle.',
      'Cook until golden and crisp, then fold and serve hot.',
    ],
    // ── intent tags: phrases / keywords that should NAVIGATE TO this step ──
    stepTags: [
      ['soak','soaking','rice','dal','urad','water','start','beginning','first'],
      ['grind','grinding','batter','paste','smooth','thick','mixer','blend'],
      ['ferment','fermenting','overnight','rise','rest','prove','proof'],
      ['spread','pan','ladle','thin','circle','tawa','griddle','pour'],
      ['cook','cooking','golden','crisp','fold','serve','last','final','finish','finishing'],
    ],
    tips: [
      'Add a handful of poha (flattened rice) while grinding for extra crispness.',
      'A pinch of fenugreek seeds helps the batter ferment beautifully.',
      'Warm spots speed fermentation — near the stove or inside the oven with the light on.',
      'Wipe the hot pan with a halved onion so the batter spreads without sticking.',
      'Lower the heat slightly once it sets to get an even, lacy golden crust.',
    ],
  },
  pongal: {
    id: 'pongal', name: 'Pongal', emoji: '🍚',
    serves: 4,
    totalTime: '35 min',
    ingredients: [
      { item: 'Rice',              qty: 1,    unit: 'cup',
        subs: ['Sona masuri rice', 'Short-grain rice', 'Basmati — lighter but works'] },
      { item: 'Moong dal',         qty: 0.5,  unit: 'cup',
        subs: ['Toor dal — slightly heavier, earthier flavour'] },
      { item: 'Water',             qty: 4,    unit: 'cups',
        subs: ['Vegetable stock — richer flavour'] },
      { item: 'Ghee',              qty: 3,    unit: 'tbsp',
        subs: ['Coconut oil + pinch of cardamom', 'Butter — same qty'] },
      { item: 'Cumin seeds',       qty: 1,    unit: 'tsp',
        subs: ['Caraway seeds — use ½ qty', 'Skip if absent'] },
      { item: 'Black pepper, crushed', qty: 1, unit: 'tsp',
        subs: ['White pepper — use ½ qty', 'Red chili powder — for a different heat'] },
      { item: 'Ginger, grated',    qty: 1,    unit: 'inch',
        subs: ['½ tsp ginger powder', 'Skip — still tasty'] },
      { item: 'Cashews',           qty: 10,   unit: 'pieces',
        subs: ['Peanuts — roast separately', 'Almonds, chopped'] },
      { item: 'Curry leaves',      qty: 1,    unit: 'sprig',
        subs: ['1 bay leaf — different but aromatic', 'Fresh basil leaves'] },
      { item: 'Salt',              qty: null, unit: 'to taste',
        subs: ['Pink salt or sea salt'] },
    ],
    nutrition: {
      perQty: '1 serving (≈250 g)',
      servingUnits: 1,
      calories: 310,
      protein_g: 9,
      fat_g: 12,
      carbs_g: 42,
      carbs: { complex_g: 38, sugar_g: 1, fiber_g: 3 },
    },
    steps: [
      'Dry roast 1 cup rice and ½ cup moong dal until fragrant.',
      'Pressure cook the rice and dal with 4 cups water until soft.',
      'Heat ghee and crackle cumin, black pepper, ginger and cashews.',
      'Pour the sizzling tempering over the cooked rice and mix well.',
      'Garnish with curry leaves and serve warm.',
    ],
    stepTags: [
      ['roast','roasting','dry','fragrant','rice','dal','moong','start','first'],
      ['pressure','cooker','cook','cooking','soft','water','boil'],
      ['ghee','temper','tempering','cumin','pepper','ginger','cashew','cashews','crackle','spice','tadka'],
      ['pour','mix','sizzling','combine','stir'],
      ['garnish','curry','leaves','serve','last','final','finish'],
    ],
    tips: [
      'Roasting the dal first gives pongal its signature nutty aroma.',
      'Keep it a little loose — it firms up as it sits.',
      'Crushed pepper instead of powder gives gentle bursts of heat.',
      'Be generous with the ghee; it carries all the flavour.',
      'A few extra cashews on top never hurt anyone.',
    ],
  },
  idli: {
    id: 'idli', name: 'Idli', emoji: '🍥',
    serves: 4,
    totalTime: '8 hr ferment + 20 min',
    ingredients: [
      { item: 'Idli rice',        qty: 2,    unit: 'cups',
        subs: ['Parboiled rice — best swap', 'Sona masuri rice — use a bit more water'] },
      { item: 'Urad dal',         qty: 1,    unit: 'cup',
        subs: ['Split urad dal (skin removed) — same qty'] },
      { item: 'Fenugreek seeds',  qty: 0.25, unit: 'tsp',
        subs: ['Skip if unavailable'] },
      { item: 'Salt',             qty: 1,    unit: 'tsp',
        subs: ['Pink salt or sea salt'] },
    ],
    nutrition: {
      perQty: '1 idli (≈40 g)',
      servingUnits: 4,
      calories: 58,
      protein_g: 2,
      fat_g: 0.4,
      carbs_g: 12,
      carbs: { complex_g: 10, sugar_g: 0.5, fiber_g: 1.5 },
    },
    steps: [
      'Soak idli rice and urad dal separately for 5 hours.',
      'Grind to a fluffy batter and let it ferment overnight.',
      'Grease the idli moulds and pour in the batter.',
      'Steam for 10–12 minutes until a tester comes out clean.',
      'Unmould gently and serve hot with chutney.',
    ],
    stepTags: [
      ['soak','soaking','rice','dal','urad','water','first','start'],
      ['grind','grinding','batter','fluffy','ferment','fermenting','overnight','rise'],
      ['mould','mold','moulds','grease','greasing','pour','fill','tray'],
      ['steam','steaming','steamer','minutes','cook'],
      ['unmould','unmold','remove','serve','chutney','last','final','finish'],
    ],
    tips: [
      'Don’t overfill the moulds — the batter rises as it steams.',
      'A well-fermented batter is the secret to soft idlis.',
      'Let the steamed idlis rest a minute before unmoulding.',
      'Test with a damp finger; it shouldn’t stick when done.',
      'Leftover batter makes excellent quick dosas the next day.',
    ],
  },
};

export const RECENT = ['dosa', 'pongal'];

export const PERSONAS = {
  amma:   { id: 'amma',   name: 'Amma',   emoji: '👵', tone: 'Warm, caring',  guide: 'Amma guiding you',       rate: 0.92, pitch: 1.05,
            flavor: 'Take your time, kanna — no rush at all.' },
  chef:   { id: 'chef',   name: 'Chef',   emoji: '👨‍🍳', tone: 'Professional', guide: 'Chef guiding you',        rate: 1.0,  pitch: 0.95,
            flavor: 'Precision here — measure carefully and stay steady.' },
  friend: { id: 'friend', name: 'Friend', emoji: '🧑', tone: 'Casual',        guide: 'Your friend’s got you',  rate: 1.05, pitch: 1.0,
            flavor: 'Easy! You’ve totally got this 👍' },
};

const ORDINALS = ['first','second','third','fourth','fifth','sixth','seventh','eighth','ninth','tenth'];

// ── Shared intent pipeline (voice AND text feed this) ──────────────
// Returns { intent: 'NEXT'|'REPEAT'|'SKIP'|'BACK'|'DONE'|'GOTO'|'QUERY', target?: stepIndex }
export function detectIntent(input, recipe) {
  const s = (input || '').toLowerCase().trim();
  if (!s) return { intent: 'QUERY' };

  // 1. Numeric step jump: "step 3", "go to step 2", "jump to 4", "skip to step 1"
  const numM = s.match(/(?:go to |jump to |skip to |move to |take me to )?step\s+(\d+)/) ||
               s.match(/\b(?:go|jump|skip|move|take me)\s+to\s+(\d+)\b/);
  if (numM && recipe) {
    const n = parseInt(numM[1], 10) - 1;
    if (n >= 0 && n < recipe.steps.length) return { intent: 'GOTO', target: n };
  }

  // 2. Ordinal step: "the first step", "second one", "last step"
  if (recipe) {
    for (let i = 0; i < ORDINALS.length; i++) {
      if (i < recipe.steps.length &&
          new RegExp(`\\b${ORDINALS[i]}\\s+(?:step|one|part)\\b`).test(s)) {
        return { intent: 'GOTO', target: i };
      }
    }
    if (/\b(last|final|end)\s+(?:step|one|part)\b/.test(s)) {
      return { intent: 'GOTO', target: recipe.steps.length - 1 };
    }
  }

  // 3. Tag-based GOTO when input shows navigational phrasing
  const NAV = /\b(go|jump|skip|move|back|come|head|take me|show me|i want|let'?s|do the|start the)\b/;
  function scoreTags() {
    let best = -1, bestScore = 0;
    recipe.stepTags.forEach((tags, i) => {
      let score = 0;
      tags.forEach(tag => {
        const re = new RegExp(`\\b${tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (re.test(s)) score += 1;
      });
      if (score > bestScore) { bestScore = score; best = i; }
    });
    return { best, bestScore };
  }
  if (recipe && recipe.stepTags && NAV.test(s)) {
    const { best, bestScore } = scoreTags();
    if (bestScore >= 1) return { intent: 'GOTO', target: best };
  }

  // 4. Simple navigation intents
  if (/\b(next|forward|continue|go on|proceed|move on)\b/.test(s)) return { intent: 'NEXT' };
  if (/\b(repeat|again|once more|say that again|one more time)\b/.test(s)) return { intent: 'REPEAT' };
  if (/\b(skip)\b/.test(s))    return { intent: 'SKIP' };
  if (/\b(back|previous|go back)\b/.test(s)) return { intent: 'BACK' };
  if (/\b(done|finish|finished|complete|stop)\b/.test(s)) return { intent: 'DONE' };

  // 5. Pure tag match without nav phrasing (e.g. "what about grinding")
  if (recipe && recipe.stepTags) {
    const { best, bestScore } = scoreTags();
    if (bestScore >= 1) return { intent: 'GOTO', target: best };
  }

  return { intent: 'QUERY' };
}

// resolve a typed/spoken recipe phrase to a known recipe id
export function resolveRecipe(input) {
  const s = (input || '').toLowerCase();
  for (const id of Object.keys(RECIPES)) {
    if (s.includes(id) || s.includes(RECIPES[id].name.toLowerCase())) return id;
  }
  return null;
}

// auto-derive step tags from raw step text (for Add Recipe)
const _STOP = new Set(['the','and','for','with','into','this','that','their','about','around','some','will','make','from','onto','over','then','once','your','until','have','after','before','those','these','there','where','when','what','which','also','very','only','more','less','just','each','both','still','sure','tiny','little','large','small','time','well','same','soon','step','take','adds','give','than','need','want','good','keep','plus','many','much','them']);
export function deriveStepTags(stepText) {
  const words = (stepText || '').toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
  return [...new Set(words.filter(w => !_STOP.has(w)))].slice(0, 10);
}

export function shareText(recipe) {
  return `Just made crispy ${recipe.name.toLowerCase()} today! ${recipe.emoji}\nCooking made easy with CookCircle 🎤\n#HomeCooking #CookCircle`;
}
