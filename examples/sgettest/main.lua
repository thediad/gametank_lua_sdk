local first = 0
local second = 0
local outside = 1

function _init()
  sset(0, 0, 8)
  first = sget(0, 0)
  sset(0, 0, 9)
  second = sget(0, 0)
  outside = sget(-1, 0)
end

function _draw()
  cls(1)
  print("sget", 4, 4, 7)
  print("first", 4, 20, 7)
  print(first, 52, 20, 7)
  print("second", 4, 32, 7)
  print(second, 52, 32, 7)
  print("outside", 4, 44, 7)
  print(outside, 52, 44, 7)

  rectfill(4, 60, 27, 83, first)
  rectfill(36, 60, 59, 83, second)
  spr(0, 76, 60, 3, 3)
end
