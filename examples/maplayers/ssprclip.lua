local phase=0

function _update60()
  if btnp(4) then phase=(phase+1)%3 end
end

function _draw()
  local scale=phase+1
  local camx=0
  local camy=0
  if phase==2 then camx=5 camy=3 end

  cls(0)
  camera(camx,camy)
  clip(28,24,72,72)
  rectfill(camx,camy,camx+127,camy+127,1)

  -- Each scaled draw crosses a different clip edge. Later phases also verify
  -- flip flags, and phase 2 verifies camera-adjusted destination coordinates.
  sspr(0,0,16,16,20+camx,32+camy,16*scale,16*scale,phase>0,false)
  sspr(0,0,16,16,84+camx,32+camy,16*scale,16*scale,false,phase==2)
  sspr(0,0,16,16,52+camx,84+camy,16*scale,16*scale,phase>0,phase==2)

  camera()
  clip()
  print("sspr clip/flip",30,3,7)
  print("scale",42,11,7)
  print(scale,68,11,7)
  print("a: next",48,116,6)
end
