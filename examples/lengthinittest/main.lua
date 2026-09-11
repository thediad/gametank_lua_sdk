local width = #"gametank"
local fraction = #"abc" + 0.5
local bytes = array8(#"abcd")

function _init()
  bytes[4] = 42
end

function _update60()
end

function _draw()
  cls(0)
  print(width, 44, 24, 7)
  print(fraction, 44, 44, 11)
  print(#bytes, 44, 64, 10)
  print(bytes[4], 44, 84, 12)
end
