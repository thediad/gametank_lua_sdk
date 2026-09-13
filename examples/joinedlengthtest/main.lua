local width = #("game".."tank")
local fraction = #("a"..("b".."c")) + 0.5
local empty = #("".."")
local bytes = array8(#("ab".."cd"))

function _init()
  bytes[4] = 42
end

function _update60()
end

function _draw()
  cls(0)
  print(width, 44, 20, 7)
  print(fraction, 44, 38, 11)
  print(empty, 44, 56, 10)
  print(#bytes, 44, 74, 12)
  print(bytes[4], 44, 92, 9)
end
