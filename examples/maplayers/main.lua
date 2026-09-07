local changed=0

function _update60()
  if btn(4) then
    -- Sprite 2 gains flags 0+2; sprite 3 keeps only flag 0.
    fset(2,0,true)
    fset(3,2,false)
    changed=1
  end
end

function _draw()
  cls(0)
  print("all",2,4,7)
  map(0,0,40,2,3,1)

  print("flag0",2,28,7)
  map(0,0,40,26,3,1,1)

  print("flag2",2,52,7)
  map(0,0,40,50,3,1,4)

  -- A combined mask is a union: draw tiles carrying flag 0 OR flag 2.
  print("flag0|2",2,76,7)
  map(0,0,40,74,3,1,5)

  print(fget(1),72,4,7)
  print(fget(2),88,4,7)
  print(fget(3),104,4,7)
  if changed ~= 0 then
    print("changed",2,104,7)
  else
    print("press a",2,104,7)
  end
end
