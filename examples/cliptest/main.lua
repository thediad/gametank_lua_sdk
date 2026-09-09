local phase=0

function _init()
end

function _update60()
  if btnp(4) then phase=(phase+1)%3 end
end

function _draw()
  cls(0)

  -- Select the final region before drawing. Earlier versions of this test
  -- drew under the outer region first, leaving valid pixels that looked like
  -- nested clipping failures.
  clip(16,16,96,80)
  if phase==1 then
    clip(32,28,64,48,true)
  elseif phase==2 then
    clip(48,36,32,32,true)
  end

  rectfill(0,0,127,127,1)
  circfill(64,56,45,12)
  line(0,0,127,111,10)
  rect(8,8,119,103,7)
  circ(64,56,38,7)

  clip()
  print("clip phase",34,2,7)
  print(phase,61,9,7)
  print("a: shrink",43,116,6)
end
