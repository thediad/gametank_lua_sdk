local width = #("game".."tank")
local fraction = #("a"..("b".."c")) + 0.5
local empty = #tostr()
local bytes = array8(#sub(chr(97,98,99,100,101),2,5))
local numeric = #("score "..12.5)

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
  print(numeric, 44, 110, 8)
end
