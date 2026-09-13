local literal_edge = abs(-32768)
local runtime_edge = -32768
local ordinary = abs(-2.5)

function _init()
  runtime_edge = abs(runtime_edge)
end

function _update60()
end

function _draw()
  cls(0)
  print(literal_edge, 34, 29, 7)
  print(runtime_edge, 34, 53, 11)
  print(ordinary, 34, 77, 10)
end
