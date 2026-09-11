local joined = 0.5
local sliced = 0.5
local bytes = 0
local roundtrip = 0.5

function _init()
  joined = tonum("12"..".5")
  sliced = tonum(sub("x-3.5", 2))
  bytes = tonum(chr(52, 50))
  roundtrip = tonum(tostr(0.25))
end

function _update60()
end

function _draw()
  cls(0)
  print(joined, 44, 24, 7)
  print(sliced, 44, 44, 11)
  print(bytes, 44, 64, 10)
  print(roundtrip, 44, 84, 12)
end
