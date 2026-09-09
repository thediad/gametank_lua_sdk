local things = pool(4)
local phase = 0

function _init()
  add(things, {id=10})
  add(things, {id=20})
  add(things, {id=30})
end

function _update60()
  if btnp(4) then
    if phase == 0 then
      for thing in all(things) do
        if thing.id == 10 then
          del(things, thing)
          break
        end
      end
      add(things, {id=40})
      phase = 1
    elseif phase == 1 then
      deli(things, 2)
      phase = 2
    elseif phase == 2 then
      add(things, {id=50})
      phase = 3
    end
  end
end

function _draw()
  local y = 38
  cls(0)
  print("phase", 34, 18, 7)
  print(phase, 70, 18, 7)
  for thing in all(things) do
    print(thing.id, 54, y, 7)
    y += 12
  end
  print("press a", 42, 102, 6)
end
