local values = split("10,20.5,-3")
local digits = split("123", 1)

function _update60()
end

function _draw()
  cls(0)
  print(count(values), 60, 22, 7)
  print(values[1], 48, 42, 8)
  print(values[2], 48, 62, 9)
  print(values[3], 48, 82, 10)
  print(digits[1] + digits[2] + digits[3], 60, 102, 11)
end
