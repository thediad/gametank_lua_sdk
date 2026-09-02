local dedicated=0
local shared=0
local changed=0
local restored=0
local invalid=0

function _init()
  -- map64.map has tile 1 at (0,0) and tile 77 at shared-map cell (3,40).
  dedicated=mget(0,0)
  shared=mget(3,40)

  mset(3,40,88)
  changed=mget(3,40)

  -- Restoring the ROM value removes the RAM overlay entry.
  mset(3,40,77)
  restored=mget(3,40)

  -- y=64 is just outside the complete 128x64 map.
  mset(0,64,99)
  invalid=mget(0,64)
end

function _draw()
  cls(0)

  -- Expected rows: 1, 77, 88, 77, 0.
  print(dedicated,4,8,7)
  print(shared,4,16,7)
  print(changed,4,24,7)
  print(restored,4,32,7)
  print(invalid,4,48,7)
end
