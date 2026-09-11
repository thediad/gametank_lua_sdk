local literal = 0
local composed = 0

function _init()
  literal = #"gametank"
  composed = #("a"..chr(98)..tostr(12.5))
end

function _update60()
end

function _draw()
  cls(0)
  print(literal, 60, 48, 7)
  print(composed, 60, 76, 11)
end
