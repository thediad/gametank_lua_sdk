local code = 0

function _init()
  code = ord(chr(65))
end

function _update60()
end

function _draw()
  cls(0)
  print("ord chr", 20, 28, 7)
  print(code, 84, 28, 11)
  print("sub chr", 20, 48, 7)
  print(sub(chr(104,101,108,108,111), 2, 4), 84, 48, 11)
  print("tostr", 20, 68, 7)
  print(tostr(-3.5), 84, 68, 11)
  print("rounded", 20, 88, 7)
  print(tostr(1.23456), 84, 88, 11)
end
