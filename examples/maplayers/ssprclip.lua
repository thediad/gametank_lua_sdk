local phase=0

function _update60()
  if btnp(4) then phase=(phase+1)%6 end
end

function _draw()
  local scale=2
  if phase==0 then scale=1 end
  if phase==2 then scale=3 end

  cls(0)
  clip(20,26,88,70)
  rectfill(20,26,107,95,1)

  -- The dedicated test sheet has four different top-to-bottom color bands,
  -- each split into distinct left/right halves. The centered copy stays
  -- wholly visible; the second copy crosses the bottom-right clip edges.
  sspr(0,0,16,12,40,40,16*scale,12*scale,phase==3 or phase==5,phase==4 or phase==5)
  sspr(0,0,16,12,92,82,16*scale,12*scale,phase==3 or phase==5,phase==4 or phase==5)

  clip()
  rect(19,25,108,96,7)
  print("sspr clip/flip",30,3,7)
  print("scale",42,11,7)
  print(scale,68,11,7)
  print("state",88,11,7)
  print(phase,108,11,7)
  print("a: next",48,116,6)
end
