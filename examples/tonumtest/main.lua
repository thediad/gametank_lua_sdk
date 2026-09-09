local whole = 0
local negative = 0.0
local fraction = 0.0

function _init()
  whole = tonum("42")
  negative = tonum("-3.5")
  fraction = tonum("0.25")
end

function _update60()
end

function _draw()
  cls(0)
  print("whole 42", 20, 28, 7)
  if whole == 42 then rectfill(92, 27, 103, 36, 11)
  else rectfill(92, 27, 103, 36, 8) end

  print("negative -3.5", 20, 52, 7)
  if negative == -3.5 then rectfill(92, 51, 103, 60, 11)
  else rectfill(92, 51, 103, 60, 8) end

  print("fraction .25", 20, 76, 7)
  if fraction == 0.25 then rectfill(92, 75, 103, 84, 11)
  else rectfill(92, 75, 103, 84, 8) end

  print("green = exact", 34, 100, 6)
end
