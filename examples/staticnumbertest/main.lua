local code = ord(chr(64,65),2)
local decimal = tonum("12"..".5")
local nested = tonum(tostr(-3.5))
local bytes = array8(tonum("4"))

function _init()
  bytes[4] = 42
end

function _update60()
end

function _draw()
  cls(0)
  print(code, 44, 29, 7)
  print(decimal, 44, 47, 11)
  print(nested, 44, 65, 10)
  print(#bytes, 44, 83, 12)
  print(bytes[4], 44, 101, 9)
end
