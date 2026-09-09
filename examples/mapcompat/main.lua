local original=0
local stage=1

function _init()
  -- The imported map cell (0,40) is in PICO-8's shared lower map and starts 0.
  original=mget(0,40)
  -- Tile 1 has imported flag 0; tile 2 has imported flag 2.
  mset(0,40,1)
end

function _update60()
  if btnp(4) then
    stage+=1
    if stage>2 then stage=0 end
    if stage==0 then
      -- Returning to the imported value removes the RAM overlay entry.
      mset(0,40,original)
    else
      mset(0,40,stage)
    end
  end
end

function _draw()
  cls(0)
  print("row",4,8,7)
  print(40,44,8,7)
  print("original",4,20,7)
  print(original,60,20,7)
  print("mget",4,32,7)
  print(mget(0,40),60,32,7)

  print("flag0",4,52,7)
  map(0,40,72,50,1,1,1)
  print("flag2",4,72,7)
  map(0,40,72,70,1,1,4)

  print("press a: 1 2 0",4,104,7)
end
