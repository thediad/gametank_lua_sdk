local loaded=0
local count=0
local fraction=0

function _init()
  if cartdata("thediad_gtlua_test") then loaded=1 end
  count=dget(0)
  fraction=dget(1)
  dset(0,count+1)
  dset(1,fraction+0.5)
end

function _update60()
end

function _draw()
  cls(0)
  print("loaded",4,8,7)
  print(loaded,52,8,7)
  print("count",4,24,7)
  print(count,52,24,7)
  print("half x2",4,40,7)
  print(fraction*2,52,40,7)
  print("restart emulator",4,72,7)
end
