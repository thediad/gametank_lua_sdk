local imported10=0
local imported10bit1=0
local imported10bit2=0
local mutated10=0
local mutated10bit1=0
local mutated10bit2=0
local replaced11=0

function _init()
  -- flags.gff contains bytes 0..255, so sprite 10 starts at 10 (00001010).
  imported10=fget(10)
  imported10bit1=fget(10,1)
  imported10bit2=fget(10,2)

  -- Mutate only the RAM copy: set bit 2, then clear bit 1. Result: 12.
  fset(10,2,true)
  fset(10,1,false)
  mutated10=fget(10)
  mutated10bit1=fget(10,1)
  mutated10bit2=fget(10,2)

  -- Whole-byte replacement remains supported.
  fset(11,9)
  replaced11=fget(11)
end

function _draw()
  cls(0)

  -- Expected rows: 10, 1, 0, 12, 0, 1, 9.
  print(imported10,4,8,7)
  print(imported10bit1,4,16,7)
  print(imported10bit2,4,24,7)
  print(mutated10,4,40,7)
  print(mutated10bit1,4,48,7)
  print(mutated10bit2,4,56,7)
  print(replaced11,4,72,7)
end
