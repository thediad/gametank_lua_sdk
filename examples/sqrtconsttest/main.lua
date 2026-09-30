local folded = sqrt(2)
local runtime = 2
local negative = sqrt(-1)

function _init()
  runtime = sqrt(runtime)
end

function _update60()
end

function _draw()
  cls(0)
  print(folded, 34, 29, 7)
  print(runtime, 34, 53, 11)
  print(negative, 34, 77, 10)
end
