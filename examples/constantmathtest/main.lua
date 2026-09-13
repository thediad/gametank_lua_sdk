local floor = flr(-3.25)
local ceiling = ceil(-3.25)
local sign = sgn(0)
local low = min(-2.5,3)
local default_max = max(-4)
local middle = mid(9,4,7)
local bytes = array8(flr(4.9))

function _init()
  bytes[4] = 42
end

function _update60()
end

function _draw()
  cls(0)
  print(floor, 44, 2, 7)
  print(ceiling, 44, 17, 11)
  print(sign, 44, 32, 10)
  print(low, 44, 47, 12)
  print(default_max, 44, 62, 9)
  print(middle, 44, 77, 8)
  print(#bytes, 44, 92, 14)
  print(bytes[4], 44, 107, 6)
end
