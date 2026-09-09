local quarter = 0.25
local negative = -3.5
local rounded = 1.23456
local minimum = 0x8000.0000

function _update60()
end

function _draw()
  cls(0)
  print("quarter", 12, 24, 7)
  print(quarter, 72, 24, 11)
  print("negative", 12, 44, 7)
  print(negative, 72, 44, 11)
  print("rounded", 12, 64, 7)
  print(rounded, 72, 64, 11)
  print("minimum", 12, 84, 7)
  print(minimum, 72, 84, 11)
end
