local loaded = -1
local written = -1

function _init()
  -- The test sheet loads four quadrants. Pixel 0,0 is 0 in quadrant 0 and 169
  -- in quadrant 3, which is the last quadrant loaded. sget must relatch NW.
  loaded = sget(0, 0)
  sset(0, 0, 8)
  written = sget(0, 0)
end

function _draw()
  cls(1)
  print("quad0 loaded", 4, 12, 7)
  print(loaded, 80, 12, 7)
  print("quad0 write", 4, 28, 7)
  print(written, 80, 28, 7)
  print("expect 0 91", 4, 48, 7)

  rectfill(16, 68, 47, 99, loaded)
  rectfill(80, 68, 111, 99, written)
end
