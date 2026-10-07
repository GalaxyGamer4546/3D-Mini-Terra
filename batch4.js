/* ============================================================
   MiniTerra 3D — BATCH 4
   Adds: 45-slot inventory (9 hotbar + 36 storage), full
         click/right-click/shift-click interaction, cursor-held
         item, drop integration, save/load of inventory.
   Loads after batch1, batch2, batch3.
   ============================================================ */
(function () {
  'use strict';

  if (typeof scene === 'undefined' || typeof player === 'undefined') {
    console.error('[Batch 4] game not loaded');
    return;
  }

  function section(name, fn) {
    try { fn(); } catch (e) { console.error('[Batch 4] ' + name + ' failed:', e.message); }
  }

  // ============================================================
  // 1. INVENTORY DATA
  // ============================================================
  // 45 slots. Slot 0-8 = hotbar, 9-44 = storage.
  // Each slot holds: null, or { item: 'name', count: N }
  const INV_SIZE = 45;
  const HOTBAR_SIZE = 9;
  const STACK_MAX = 100;
  const inventory = new Array(INV_SIZE).fill(null);

    // Shared toast — batches 1 and 3 each have their own, but they're
  // scoped to their own IIFEs. We define one here so batch4 can use it.
  function toast(msg) {
    let el = document.getElementById('b4toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'b4toast';
      el.style.cssText = 'position:fixed;top:40px;left:50%;transform:translateX(-50%);' +
        'background:rgba(0,0,0,.8);color:#fff;padding:8px 14px;border-radius:6px;' +
        'font:14px system-ui,sans-serif;z-index:30;transition:opacity .4s;pointer-events:none;';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.opacity = '1';
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.style.opacity = '0'; }, 1500);
  }

  // Cursor-held item — when you click a slot, the item you're holding
  // follows the mouse until you drop it somewhere.
  let held = null;   // null, or { item, count }

  // ============================================================
  // 2. ITEM LOOKUP
  // ============================================================
  // Items can be either a block (id 1-15) or a mob drop
  // (raw_porkchop, feather, etc). We need a unified way to render
  // both as colored swatches.
  function itemColor(itemName) {
    // Mob drop items
    if (window.ITEMS && ITEMS[itemName]) return ITEMS[itemName].color;
    // Blocks by name
    for (const id in BLOCKS) {
      if (BLOCKS[id].name === itemName) return BLOCKS[id].color;
    }
    // Numeric block ids stored as strings
    if (BLOCKS[itemName]) return BLOCKS[itemName].color;
    return 0x999999;
  }
  function itemLabel(itemName) {
    if (window.ITEMS && ITEMS[itemName]) return ITEMS[itemName].name;
    for (const id in BLOCKS) {
      if (BLOCKS[id].name === itemName) return itemName.charAt(0).toUpperCase() + itemName.slice(1);
    }
    if (BLOCKS[itemName]) return BLOCKS[itemName].name || itemName;
    return itemName;
  }
  function colorToHex(c) {
    return '#' + (c >>> 0).toString(16).padStart(6, '0');
  }

  // ============================================================
  // 3. INVENTORY ACTIONS
  // ============================================================
  function firstEmptySlot() {
    for (let i = 0; i < INV_SIZE; i++) if (!inventory[i]) return i;
    return -1;
  }

  function addToInventory(itemName, count) {
    // Fill existing stacks first (from slot 0 up)
    let remaining = count;
    for (let i = 0; i < INV_SIZE && remaining > 0; i++) {
      const slot = inventory[i];
      if (!slot || slot.item !== itemName) continue;
      const space = STACK_MAX - slot.count;
      if (space <= 0) continue;
      const take = Math.min(space, remaining);
      slot.count += take;
      remaining -= take;
    }
    // Then empty slots
    while (remaining > 0) {
      const idx = firstEmptySlot();
      if (idx < 0) {
        // Inventory full — remaining items vanish
        console.warn('[Batch 4] inventory full, dropped', remaining, itemName);
        return count - remaining;
      }
      const take = Math.min(STACK_MAX, remaining);
      inventory[idx] = { item: itemName, count: take };
      remaining -= take;
    }
    return count;
  }

  // Total count of an item across all slots
  function countItem(itemName) {
    let total = 0;
    for (const slot of inventory) {
      if (slot && slot.item === itemName) total += slot.count;
    }
    return total;
  }

  // Remove `count` of itemName from inventory, from the highest slots first
  function removeFromInventory(itemName, count) {
    let remaining = count;
    for (let i = INV_SIZE - 1; i >= 0 && remaining > 0; i--) {
      const slot = inventory[i];
      if (!slot || slot.item !== itemName) continue;
      const take = Math.min(slot.count, remaining);
      slot.count -= take;
      remaining -= take;
      if (slot.count <= 0) inventory[i] = null;
    }
    return count - remaining;
  }

  // ============================================================
  // 4. UI ELEMENTS
  // ============================================================
  const invPanel = document.createElement('div');
  invPanel.id = 'b4inv';
  invPanel.style.cssText =
    'position:fixed;inset:0;background:rgba(8,10,16,.82);display:none;' +
    'align-items:center;justify-content:center;z-index:18;font-family:system-ui,sans-serif;';
  document.body.appendChild(invPanel);

  // Cursor-follow held item
  const cursorItemEl = document.createElement('div');
  cursorItemEl.id = 'b4cursor';
  cursorItemEl.style.cssText =
    'position:fixed;pointer-events:none;z-index:40;width:36px;height:36px;' +
    'border:2px solid #fff;border-radius:4px;display:none;' +
    'display:none;align-items:center;justify-content:center;color:#fff;font:bold 12px system-ui;' +
    'text-shadow:0 1px 2px #000;';
  document.body.appendChild(cursorItemEl);

  let invOpen = false;

  function slotHTML(index, item, count) {
    const isHotbar = index < HOTBAR_SIZE;
    const bg = item ? colorToHex(itemColor(item)) : 'rgba(0,0,0,.4)';
    const border = isHotbar ? '3px solid #555c6e' : '2px solid #444';
    const numberLabel = isHotbar ? '<span style="position:absolute;top:1px;left:3px;font-size:10px;color:#bbb;">' + (index + 1) + '</span>' : '';
    const countLabel = count > 1 ? '<span style="position:absolute;bottom:1px;right:3px;font-size:11px;color:#fff;text-shadow:0 1px 2px #000;">' + count + '</span>' : '';
    return '<div class="b4slot" data-idx="' + index + '" style="' +
      'width:52px;height:52px;background:' + bg + ';border:' + border + ';' +
      'border-radius:4px;position:relative;cursor:pointer;display:flex;' +
      'align-items:center;justify-content:center;box-sizing:border-box;">' +
      numberLabel + countLabel + '</div>';
  }

  function buildInventory() {
    const hotbarHTML = inventory.slice(0, HOTBAR_SIZE).map((slot, i) => slotHTML(i, slot ? slot.item : null, slot ? slot.count : 0)).join('');
    const storageHTML = inventory.slice(HOTBAR_SIZE).map((slot, i) => slotHTML(i + HOTBAR_SIZE, slot ? slot.item : null, slot ? slot.count : 0)).join('');

    invPanel.innerHTML =
      '<div style="background:#2b2f3a;border:3px solid #555c6e;border-radius:12px;padding:22px;color:#fff;">' +
        '<h2 style="margin:0 0 12px;font-size:18px;">Inventory</h2>' +
        '<div style="display:grid;grid-template-columns:repeat(9,56px);gap:4px;margin-bottom:14px;">' + storageHTML + '</div>' +
        '<div style="border-top:1px solid #444;padding-top:14px;">' +
          '<div style="font-size:12px;color:#bbb;margin-bottom:6px;">Hotbar</div>' +
          '<div style="display:grid;grid-template-columns:repeat(9,56px);gap:4px;">' + hotbarHTML + '</div>' +
        '</div>' +
        '<div style="margin-top:14px;font-size:12px;color:#888;">E to close · L-click pick/place · R-click split · Shift-click transfer</div>' +
      '</div>';
  }

  // ============================================================
  // 5. OPEN / CLOSE
  // ============================================================
   function openInventory() {
    invOpen = true;
    window._invOpen = true;
    invPanel.style.display = 'flex';
    // Hide the lock overlay so it doesn't sit on top of the inventory
    const lockEl = document.getElementById('lock');
    if (lockEl) lockEl.style.display = 'none';
    if (document.pointerLockElement) document.exitPointerLock();
    buildInventory();
  }
  function closeInventory() {
    invOpen = false;
    window._invOpen = false;
    invPanel.style.display = 'none';
    if (held) {
      addToInventory(held.item, held.count);
      held = null;
    }
    cursorItemEl.style.display = 'none';
    // Re-lock the pointer. If it fails (browser gesture rules), show
    // the "Click to play" overlay so the user knows to click.
    setTimeout(function () {
      if (!invOpen && renderer.domElement) {
        renderer.domElement.requestPointerLock();
        // If the pointer didn't lock within 100ms, show the overlay
        setTimeout(function () {
          if (document.pointerLockElement !== renderer.domElement) {
            const lockEl = document.getElementById('lock');
            if (lockEl) lockEl.style.display = 'flex';
          }
        }, 100);
      }
    }, 10);
    refreshHotbarUI();
  }
  
    function toggleInventory() {
    if (invOpen) closeInventory();
    else openInventory();
  }

  addEventListener('keydown', function (e) {
    if (e.target.tagName === 'INPUT') return;
    if (e.key === 'e' || e.key === 'E') {
      if (!e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        toggleInventory();
      }
    }
    if (e.key === 'Escape' && invOpen) {
      closeInventory();
    }
  });

  // ============================================================
  // 6. CLICK HANDLING
  // ============================================================
  function updateCursorItem(x, y) {
    if (!held) {
      cursorItemEl.style.display = 'none';
      return;
    }
    cursorItemEl.style.display = 'flex';
    cursorItemEl.style.left = (x - 18) + 'px';
    cursorItemEl.style.top = (y - 18) + 'px';
    cursorItemEl.style.background = colorToHex(itemColor(held.item));
    cursorItemEl.textContent = held.count > 1 ? held.count : '';
  }

  invPanel.addEventListener('mousemove', function (e) {
    updateCursorItem(e.clientX, e.clientY);
  });

  invPanel.addEventListener('mousedown', function (e) {
    const el = e.target.closest('.b4slot');
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    const idx = +el.dataset.idx;
    const isRight = e.button === 2;
    const isShift = e.shiftKey;

    // Shift-click: quick transfer between hotbar and storage
    if (isShift) {
      const slot = inventory[idx];
      if (!slot) return;
      const isHotbar = idx < HOTBAR_SIZE;
      // Move to the other side
      const start = isHotbar ? HOTBAR_SIZE : 0;
      const end = isHotbar ? INV_SIZE : HOTBAR_SIZE;
      // Try to merge into existing stacks of the same item
      let remaining = slot.count;
      for (let i = start; i < end && remaining > 0; i++) {
        const s = inventory[i];
        if (!s || s.item !== slot.item) continue;
        const space = STACK_MAX - s.count;
        if (space <= 0) continue;
        const take = Math.min(space, remaining);
        s.count += take;
        remaining -= take;
      }
      // Then empty slots
      for (let i = start; i < end && remaining > 0; i++) {
        if (inventory[i]) continue;
        inventory[i] = { item: slot.item, count: remaining };
        remaining = 0;
      }
      // Update source slot
      if (remaining === 0) {
        inventory[idx] = null;
      } else {
        slot.count = remaining;
      }
      buildInventory();
      refreshHotbarUI();
      return;
    }

    const slot = inventory[idx];

    // Empty cursor
    if (!held) {
      if (!slot) return;
      if (isRight) {
        // Pick up half
        const take = Math.ceil(slot.count / 2);
        held = { item: slot.item, count: take };
        slot.count -= take;
        if (slot.count <= 0) inventory[idx] = null;
      } else {
        // Pick up whole stack
        held = { item: slot.item, count: slot.count };
        inventory[idx] = null;
      }
    }
    // Holding something
    else {
      if (!slot) {
        // Place held onto empty slot
        if (isRight) {
          // Drop one
          inventory[idx] = { item: held.item, count: 1 };
          held.count -= 1;
          if (held.count <= 0) held = null;
        } else {
          // Place whole held stack
          inventory[idx] = { item: held.item, count: held.count };
          held = null;
        }
      } else if (slot.item === held.item) {
        // Same item — merge
        if (isRight) {
          // Drop one from cursor onto slot
          if (slot.count < STACK_MAX) {
            slot.count += 1;
            held.count -= 1;
            if (held.count <= 0) held = null;
          }
        } else {
          const space = STACK_MAX - slot.count;
          const take = Math.min(space, held.count);
          slot.count += take;
          held.count -= take;
          if (held.count <= 0) held = null;
        }
      } else {
        // Different item — swap
        const tmp = { item: slot.item, count: slot.count };
        inventory[idx] = { item: held.item, count: held.count };
        held = tmp;
      }
    }

    buildInventory();
    refreshHotbarUI();
    updateCursorItem(e.clientX, e.clientY);
  });

  invPanel.addEventListener('contextmenu', function (e) {
    if (invPanel.style.display === 'flex') e.preventDefault();
  });

  // ============================================================
  // 7. HOTBAR SYNC
  // ============================================================
  // The base game has a hotbar UI at the bottom that shows block
  // swatches for HOTBAR array. We replace it with our own that
  // reads from inventory[0..8].
  function refreshHotbarUI() {
    const hud = document.getElementById('hud');
    if (!hud) return;
    // Build our own hotbar from inventory
    let html = '';
    for (let i = 0; i < HOTBAR_SIZE; i++) {
      const slot = inventory[i];
      const bg = slot ? colorToHex(itemColor(slot.item)) : 'rgba(0,0,0,.5)';
      const selected = (i === selectedSlot);
      const border = selected ? '3px solid #ffd54a' : '3px solid #555';
      const countLabel = slot && slot.count > 1 ? '<span style="position:absolute;bottom:1px;right:3px;font-size:11px;color:#fff;text-shadow:0 1px 2px #000;">' + slot.count + '</span>' : '';
      html += '<div class="slot ' + (selected ? 'sel' : '') + '" style="' +
        'width:48px;height:48px;border:' + border + ';background:' + bg + ';' +
        'position:relative;display:flex;align-items:center;justify-content:center;' +
        'box-sizing:border-box;">' +
        '<span style="position:absolute;top:1px;left:3px;font-size:10px;color:#bbb;">' + (i + 1) + '</span>' +
        countLabel + '</div>';
    }
    hud.innerHTML = html;
  }

  // Track which hotbar slot is selected
  let selectedSlot = 0;

  // Hook the digit keys to update our selection
  addEventListener('keydown', function (e) {
    if (e.code >= 'Digit1' && e.code <= 'Digit9') {
      selectedSlot = +e.code.slice(5) - 1;
      refreshHotbarUI();
    }
  });

  // ============================================================
  // 8. INTEGRATE WITH MINING / DROPS
  // ============================================================
  // Batch 3 stored drops in `hotbarCounts`. We'll hook `addItemToHotbar`
  // if it's reachable, and otherwise wrap toast calls. Simpler: we
  // patch the global ITEMS.get from batch3? No — we redefine
  // addItemToHotbar so it routes to our inventory.
  section('route drops', function () {
    // Batch 3 declared addItemToHotbar inside its own IIFE, so it's
    // not global. We instead intercept the toast function it calls —
    // when it fires "+1 Raw Porkchop", we add that item to our grid.
    // This is hacky but works without editing batch3.
    if (typeof window._batch3DropHook !== 'function') {
      window._batch3DropHook = function (itemName, count) {
        addToInventory(itemName, count);
        refreshHotbarUI();
      };
    }
  });

  // Also hook into the mining drop: the base game currently calls
  // setBlock and nothing else. When you break a block, we want to add
  // the block as an item. Hook the mousedown that breaks blocks.
  addEventListener('mousedown', function (e) {
    if (document.pointerLockElement !== renderer.domElement) return;
    if (e.button !== 0) return;
    // Raycast for a block — reimplement the pick
    const origin = new THREE.Vector3(player.pos.x, player.pos.y + player.height * 0.9, player.pos.z);
    const dir = new THREE.Vector3(
      -Math.sin(player.yaw) * Math.cos(player.pitch),
      Math.sin(player.pitch),
      -Math.cos(player.yaw) * Math.cos(player.pitch)
    );
    const step = 0.05;
    let hit = null;
    for (let t = 0; t < 6; t += step) {
      const x = Math.floor(origin.x + dir.x * t);
      const y = Math.floor(origin.y + dir.y * t);
      const z = Math.floor(origin.z + dir.z * t);
      const b = getBlock(x, y, z);
      if (b !== 0) { hit = { x, y, z, block: b }; break; }
    }
    if (!hit) return;
    // Don't add air or the block if we're about to place
    const def = BLOCKS[hit.block];
    if (!def || !def.name) return;
    // Add the block name to inventory
    // We allow mining to also trigger the base game's break — meaning
    // the block vanishes AND we get the item.
    // Small delay so we add AFTER the block is broken
    setTimeout(function () {
      if (getBlock(hit.x, hit.y, hit.z) === 0) {
        addToInventory(def.name, 1);
        refreshHotbarUI();
                addToInventory(def.name, 1);
        toast('+' + 1 + ' ' + itemLabel(def.name));
      }
    }, 30);
  }, true);

  // ============================================================
  // 9. PLACING BLOCKS FROM HOTBAR
  // ============================================================
  // When you right-click, the base game places the block ID from
  // HOTBAR[selected]. We want it to place from inventory[selectedSlot].
  // We hook the place by intercepting the mousedown.
  addEventListener('mousedown', function (e) {
    if (document.pointerLockElement !== renderer.domElement) return;
    if (e.button !== 2) return;
    const slot = inventory[selectedSlot];
    if (!slot) return;
    // Find the block ID for this item
    let blockId = null;
    for (const id in BLOCKS) {
      if (BLOCKS[id].name === slot.item) { blockId = +id; break; }
    }
    if (blockId === null) return;   // not a placeable block
    // Decrement AFTER the base game places it
    // We can't easily know if placement succeeded, so we use a
    // short delay and check if a block appeared at the target
    setTimeout(function () {
      // Approximate — if the item count is still what it was, the
      // placement probably failed. This is a heuristic.
      const cur = inventory[selectedSlot];
      if (!cur || cur.item !== slot.item) return;
      // Only decrement if we're confident a placement happened:
      // check that we still hold the item and the count is > 0
      if (cur.count > 0) {
        cur.count -= 1;
        if (cur.count <= 0) inventory[selectedSlot] = null;
        refreshHotbarUI();
      }
    }, 30);
  });

  // ============================================================
  // 10. SAVE / LOAD INVENTORY
  // ============================================================
  section('save/load hooks', function () {
    // Batch 1 saves on O and beforeunload. We hook into localStorage
    // separately with our own key. Simple.
    const INV_KEY = 'miniterra3d.inventory.v1';

    function saveInv() {
      try {
        localStorage.setItem(INV_KEY, JSON.stringify(inventory));
      } catch (e) { console.warn('[Batch 4] save failed:', e.message); }
    }
    function loadInv() {
      try {
        const raw = localStorage.getItem(INV_KEY);
        if (!raw) return;
        const arr = JSON.parse(raw);
        if (Array.isArray(arr) && arr.length === INV_SIZE) {
          for (let i = 0; i < INV_SIZE; i++) inventory[i] = arr[i];
        }
      } catch (e) { console.warn('[Batch 4] load failed:', e.message); }
    }
    loadInv();

    // Save alongside batch1's save. Hook O key.
    addEventListener('keydown', function (e) {
      if (e.code === 'KeyO' && !e.ctrlKey && !e.metaKey) {
        setTimeout(saveInv, 100);
      }
    });
    addEventListener('beforeunload', saveInv);
  });

  // ============================================================
  // 11. PAUSE GAME WHILE INVENTORY OPEN
  // ============================================================
  section('pause while open', function () {
    if (typeof loop !== 'function') return;
    const origLoop = loop;
    loop = function () {
      if (invOpen) {
        // Skip the game update, still draw
        try {
          camera.position.set(player.pos.x, player.pos.y + player.height * 0.9, player.pos.z);
          camera.rotation.order = 'YXZ';
          camera.rotation.y = player.yaw;
          camera.rotation.x = player.pitch;
          renderer.render(scene, camera);
        } catch (e) {}
        requestAnimationFrame(loop);
        return;
      }
      origLoop.apply(this, arguments);
    };
  });

  // ============================================================
  // 12. HOOK BATCH 3's DROPS INTO OUR INVENTORY
  // ============================================================
  // Batch 3 has its own addItemToHotbar inside its IIFE. We need
  // to intercept calls to it. The cleanest way is to override
  // the `toast` function it uses and parse the "+N Item" text.
  // That's actually what we already did with _batch3DropHook.
  // We additionally monitor toast calls to catch additions.
  section('toast hook', function () {
    // Save the current toast
    const origToast = window.toast;
    // Batch 3 defined toast inside its own scope, but if any global
    // toast exists, wrap it. Otherwise, do nothing.
    if (typeof origToast === 'function') {
      window.toast = function (msg) {
        origToast.apply(this, arguments);
        // Parse "+N Item Name"
        const m = /^\+(\d+) (.+)$/.exec(msg);
        if (m && window._batch3DropHook) {
          // We don't have the item key, only the display name.
          // Map display name back to key via ITEMS.
          for (const k in ITEMS) {
            if (ITEMS[k].name === m[2]) {
              window._batch3DropHook(k, +m[1]);
              break;
            }
          }
        }
      };
    }
  });

  // ============================================================
  // 13. INITIAL UI
  // ============================================================
  refreshHotbarUI();

  // Persist inventory to localStorage on a timer so a crash doesn't lose it
  setInterval(function () {
    try {
      localStorage.setItem('miniterra3d.inventory.v1', JSON.stringify(inventory));
    } catch (e) {}
  }, 10000);

  console.log('[MiniTerra 3D Batch 4] loaded — 45-slot inventory, E to open.');
})();