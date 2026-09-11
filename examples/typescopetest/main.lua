function helper()
  return 1
end

function _update60()
end

function _draw()
  cls(0)
  print(type(helper), 40, 24, 7)
  print(type(rnd), 40, 44, 11)
  local helper = 2
  local rnd = 3
  print(type(helper), 40, 64, 10)
  print(type(rnd), 40, 84, 12)
end
