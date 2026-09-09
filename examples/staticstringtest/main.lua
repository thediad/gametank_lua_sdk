local code = 0

function _init()
  code = ord("a"..chr(98))
end

function _update60()
end

function _draw()
  cls(0)
  print("concat", 12, 18, 7)
  print("score "..12.5, 76, 18, 11)
  print("ord concat", 12, 38, 7)
  print(code, 76, 38, 11)
  print("sub concat", 12, 58, 7)
  print(sub("x"..tostr(12.5), 2), 76, 58, 11)
  print("tonum const", 12, 78, 7)
  print(tonum(12.5), 76, 78, 11)
  print("empty", 12, 98, 7)
  print("a"..tostr().."b", 76, 98, 11)
end
