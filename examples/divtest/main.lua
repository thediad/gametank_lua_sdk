local ai=-9
local bi=2
local af=-9.5
local bf=2

function _update()
end

function _draw()
  cls(0)
  print("-9 fd 2",20,24,7)
  print(ai \ bi,82,24,7)
  print("9 fd -2",20,40,7)
  print((-ai) \ (-bi),82,40,7)
  print("-9.5 fd 2",20,56,7)
  print(af \ bf,82,56,7)
  print("9.5 fd -2",20,72,7)
  print((-af) \ (-bf),82,72,7)
end
