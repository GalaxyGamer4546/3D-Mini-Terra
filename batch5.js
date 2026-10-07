/* ============================================================
   MiniTerra 3D — BATCH 5 (data-only, compact)
   Ores, items, hardness, ore gen, recipes.
   UI lives in batch4. Loads after batch4.
   ============================================================ */
(function () {
  'use strict';
  if (typeof scene === 'undefined' || typeof player === 'undefined') return;
  function section(name, fn) { try { fn(); } catch (e) { console.error('[Batch 5] ' + name + ' failed:', e.message); } }

  // ---- 1. ORE BLOCKS ----
  section('ores-blocks', function () {
    BLOCKS[16] = { name: 'coal_ore',    color: 0x333333, hardness: 3, minTier: 'wood' };
    BLOCKS[17] = { name: 'iron_ore',    color: 0xc09070, hardness: 5, minTier: 'stone' };
    BLOCKS[18] = { name: 'gold_ore',    color: 0xffd700, hardness: 7, minTier: 'iron' };
    BLOCKS[19] = { name: 'diamond_ore', color: 0x40e0ff, hardness: 9, minTier: 'iron' };
  });

  // ---- 2. ITEMS ----
  section('items', function () {
    window.ITEMS = window.ITEMS || {};
    ITEMS.stick = { name: 'Stick', color: 0x8a5a3a };
    ITEMS.coal = { name: 'Coal', color: 0x222222 };
    ITEMS.iron = { name: 'Iron Ingot', color: 0xd9a679 };
    ITEMS.gold = { name: 'Gold Ingot', color: 0xffd700 };
    ITEMS.diamond = { name: 'Diamond', color: 0x40e0ff };
    ITEMS.iron_block = { name: 'Iron Block', color: 0xb0b0b0 };
    ITEMS.gold_block = { name: 'Gold Block', color: 0xffd700 };
    ITEMS.diamond_block = { name: 'Diamond Block', color: 0x40e0ff };
    ITEMS.wool = { name: 'Wool', color: 0xf0f0f0 };
    ITEMS.raw_mutton = { name: 'Raw Mutton', color: 0xff8080 };
    ITEMS.wood_pickaxe  = { name: 'Wood Pickaxe', color: 0x8a5a3a, tier: 'wood', tool: 'pickaxe', speed: 2, damage: 2 };
    ITEMS.stone_pickaxe = { name: 'Stone Pickaxe', color: 0x808080, tier: 'stone', tool: 'pickaxe', speed: 4, damage: 3 };
    ITEMS.iron_pickaxe  = { name: 'Iron Pickaxe', color: 0xd9a679, tier: 'iron', tool: 'pickaxe', speed: 6, damage: 4 };
    ITEMS.wood_axe = { name: 'Wood Axe', color: 0x8a5a3a, tier: 'wood', tool: 'axe', speed: 2, damage: 3 };
    ITEMS.stone_axe = { name: 'Stone Axe', color: 0x808080, tier: 'stone', tool: 'axe', speed: 4, damage: 4 };
    ITEMS.iron_axe = { name: 'Iron Axe', color: 0xd9a679, tier: 'iron', tool: 'axe', speed: 6, damage: 5 };
    ITEMS.wood_sword = { name: 'Wood Sword', color: 0x8a5a3a, tier: 'wood', tool: 'sword', damage: 4 };
    ITEMS.stone_sword = { name: 'Stone Sword', color: 0x808080, tier: 'stone', tool: 'sword', damage: 5 };
    ITEMS.iron_sword = { name: 'Iron Sword', color: 0xd9a679, tier: 'iron', tool: 'sword', damage: 7 };
    ITEMS.bed = { name: 'Bed', color: 0xa03030 };
  });

  // ---- 3. HARDNESS ----
  section('hardness', function () {
    const H = { 1:0.4, 2:0.4, 3:3.0, 4:1.5, 5:1.5, 6:0.3, 7:0.2, 8:2.5, 9:2.5, 10:0.3, 11:0.0, 12:0.3, 13:0.6, 14:4.0, 15:2.5, 16:3.0, 17:5.0, 18:7.0, 19:9.0 };
    for (const id in H) if (BLOCKS[id]) BLOCKS[id].hardness = H[id];
  });

  // ---- 4. ORE GENERATION ----
  section('ore-gen', function () {
    const ORE_STATS = [
      { id: 16, count: 2000, yMin: 5, yMax: 18, cluster: 6 },
      { id: 17, count: 1200, yMin: 3, yMax: 15, cluster: 4 },
      { id: 18, count: 400,  yMin: 1, yMax: 10, cluster: 3 },
      { id: 19, count: 120,  yMin: 1, yMax: 6,  cluster: 3 },
    ];
    let placed = 0;
    for (const stat of ORE_STATS) {
      for (let i = 0; i < stat.count; i++) {
        const x = Math.floor(Math.random() * WORLD_W);
        const z = Math.floor(Math.random() * WORLD_D);
        const y = stat.yMin + Math.floor(Math.random() * (stat.yMax - stat.yMin + 1));
        for (let j = 0; j < stat.cluster; j++) {
          const ox = x + Math.floor(Math.random() * 3) - 1;
          const oy = y + Math.floor(Math.random() * 3) - 1;
          const oz = z + Math.floor(Math.random() * 3) - 1;
          if (ox < 0 || ox >= WORLD_W || oy < 0 || oy >= WORLD_H || oz < 0 || oz >= WORLD_D) continue;
          if (getBlock(ox, oy, oz) === 3) { setBlock(ox, oy, oz, stat.id); placed++; }
        }
      }
    }
    console.log('[Batch 5] placed', placed, 'ore blocks');
    if (typeof rebuildAllChunks === 'function') rebuildAllChunks();
  });

  // ---- 5. RECIPES ----
  const RECIPES = [
    { grid: ['wood',null,null,null,null,null,null,null,null], out: 'planks', count: 4, id: 'planks' },
    { grid: [null,'planks',null,null,'planks',null,null,null,null], out: 'stick', count: 4, id: 'stick' },
    { grid: ['iron','iron','iron','iron','iron','iron','iron','iron','iron'], out: 'iron_block', count: 1, id: 'iron_block' },
    { grid: ['gold','gold','gold','gold','gold','gold','gold','gold','gold'], out: 'gold_block', count: 1, id: 'gold_block' },
    { grid: ['diamond','diamond','diamond','diamond','diamond','diamond','diamond','diamond','diamond'], out: 'diamond_block', count: 1, id: 'diamond_block' },
    { grid: ['planks','planks','planks',null,'stick',null,null,'stick',null], out: 'wood_pickaxe', count: 1, id: 'wood_pickaxe' },
    { grid: ['cobble','cobble','cobble',null,'stick',null,null,'stick',null], out: 'stone_pickaxe', count: 1, id: 'stone_pickaxe' },
    { grid: ['iron','iron','iron',null,'stick',null,null,'stick',null], out: 'iron_pickaxe', count: 1, id: 'iron_pickaxe' },
    { grid: ['planks','planks',null,'planks','stick',null,null,'stick',null], out: 'wood_axe', count: 1, id: 'wood_axe' },
    { grid: ['cobble','cobble',null,'cobble','stick',null,null,'stick',null], out: 'stone_axe', count: 1, id: 'stone_axe' },
    { grid: ['iron','iron',null,'iron','stick',null,null,'stick',null], out: 'iron_axe', count: 1, id: 'iron_axe' },
    { grid: [null,'planks',null,null,'planks',null,null,'stick',null], out: 'wood_sword', count: 1, id: 'wood_sword' },
    { grid: [null,'cobble',null,null,'cobble',null,null,'stick',null], out: 'stone_sword', count: 1, id: 'stone_sword' },
    { grid: [null,'iron',null,null,'iron',null,null,'stick',null], out: 'iron_sword', count: 1, id: 'iron_sword' },
    { grid: [null,'coal',null,null,'stick',null,null,null,null], out: 'torch', count: 4, id: 'torch' },
    { grid: ['wool','wool','wool','planks','planks','planks',null,null,null], out: 'bed', count: 1, id: 'bed' },
    { grid: ['iron_block',null,null,null,null,null,null,null,null], out: 'iron', count: 9, id: 'iron_from_block' },
    { grid: ['gold_block',null,null,null,null,null,null,null,null], out: 'gold', count: 9, id: 'gold_from_block' },
    { grid: ['diamond_block',null,null,null,null,null,null,null,null], out: 'diamond', count: 9, id: 'diamond_from_block' },
    { grid: ['planks',null,null,null,null,null,null,null,null], out: 'wood', count: 1, id: 'planks_to_wood' },
  ];

  // ---- 6. HAND RECIPES TO BATCH 4 ----
  window._batch5Data = {
    recipes: RECIPES,
    items: Object.keys(ITEMS),
    blocks: Object.keys(BLOCKS),
  };

  console.log('[MiniTerra 3D Batch 5] loaded — ores, items, recipes handed to batch4.');
})();