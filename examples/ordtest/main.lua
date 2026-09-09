local first = 0
local second = 0
local last = 0

function _init()
  first = ord("@")
  second = ord("123", 2)
  last = ord("game", 4)
end

function _update60()
end

function _draw()
  cls(0)
  print("ord @", 28, 32, 7)
  print(first, 80, 32, 7)
  print("ord 123 2", 28, 52, 7)
  print(second, 80, 52, 7)
  print("ord game 4", 28, 72, 7)
  print(last, 80, 72, 7)
end
