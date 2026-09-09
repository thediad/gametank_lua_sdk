local n = 1
local ps = pool(2)
local bytes = array8(2)

function _update60()
end

function _draw()
  cls(0)
  print(type(n), 36, 18, 7)
  print(type(true), 36, 32, 8)
  print(type("x"), 36, 46, 9)
  print(type(nil), 36, 60, 10)
  print(type(ps), 36, 74, 11)
  print(type(bytes), 36, 88, 12)
  print(type(_draw), 36, 102, 13)
end
