local values = array(3)
local whole = 0
local fraction = 0.5
local direct = 0.5

function _init()
  whole = #values
  fraction = #values + 0.5
  direct = #values
end

function _update60()
end

function _draw()
  cls(0)
  print(whole, 48, 36, 7)
  print(fraction, 48, 60, 11)
  print(direct, 48, 84, 10)
end
