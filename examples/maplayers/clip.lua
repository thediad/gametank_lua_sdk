local phase=0

function _update60()
  if btnp(4) then phase=(phase+1)%3 end
end

function _draw()
  local x=20+phase*16
  local y=24+phase*8
  local w=88-phase*28
  local h=72-phase*20

  cls(0)
  clip(x,y,w,h)

  -- Map and ordinary/flipped sprites cross every edge of the clip region.
  map(0,0,x-4,y+8,3,1)
  spr(1,x-4,y-4,2,2,false,false)
  spr(1,x+w-12,y+24,2,2,true,false)
  spr(1,x+20,y+h-12,2,2,false,true)

  -- A nested clip must restrict later map and sprite draws further.
  clip(x+8,y+8,w-16,h-16,true)
  map(0,0,x,y+h/2-4,3,1)
  spr(2,x+w/2-8,y,2,2,true,true)

  clip()
  print("sprite/map clip",30,3,7)
  print("phase",44,11,7)
  print(phase,68,11,7)
  print("a: shrink",43,116,6)
end
