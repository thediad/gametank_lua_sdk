function _update()
end

function _draw()
  cls(1)

  -- Sprite cell 0 in layers.gtg is entirely color zero. Only the middle
  -- sample in each row should cover the colored background with black.
  palt()
  spr(0,24,34)
  palt(0,false)
  spr(0,60,34)
  palt()
  spr(0,96,34)

  palt()
  sspr(0,0,8,8,20,66,16,16)
  palt(0,false)
  sspr(0,0,8,8,56,66,16,16)
  palt()
  sspr(0,0,8,8,92,66,16,16)

  rect(22,32,33,43,7)
  rect(58,32,69,43,7)
  rect(94,32,105,43,7)
  rect(18,64,37,83,7)
  rect(54,64,73,83,7)
  rect(90,64,109,83,7)
  print("transparent opaque reset",19,12,7)
end
