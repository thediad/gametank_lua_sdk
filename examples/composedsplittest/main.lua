local values = split("10,"..tostr(20.5)..","..sub("x-3",2))
local piped = split("4|5",chr(124))
local digits = split(chr(49,50,51,52),2)

function _update60()
end

function _draw()
  cls(0)
  print(values[1], 44, 2, 7)
  print(values[2], 44, 17, 11)
  print(values[3], 44, 32, 10)
  print(piped[1], 44, 47, 12)
  print(piped[2], 44, 62, 9)
  print(digits[1], 44, 77, 8)
  print(digits[2], 44, 92, 14)
  print(count(values), 44, 107, 6)
end
