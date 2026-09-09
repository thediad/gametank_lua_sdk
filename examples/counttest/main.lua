local things = pool(4)
local slots = array8(3)
local phase = 0

function _init()
  add(things, {id=1})
  add(things, {id=2})
end

function _update60()
  if btnp(4) then
    phase = (phase + 1) % 3
    if phase == 1 then
      add(things, {id=3})
    elseif phase == 2 then
      for thing in all(things) do
        del(things, thing)
      end
    elseif phase == 0 then
      add(things, {id=1})
      add(things, {id=2})
    end
  end
end

function _draw()
  cls(0)
  print("count pool", 20, 32, 7)
  print(count(things), 88, 32, 7)
  print("hash pool", 20, 48, 7)
  print(#things, 88, 48, 7)
  print("count array", 20, 64, 7)
  print(count(slots), 88, 64, 7)
  print("press a", 44, 88, 6)
end
