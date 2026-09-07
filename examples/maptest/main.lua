local __p8map = hexdata("0102030405060708")

function _init()
  mset(2, 0, 7)
  mset(2, 0, 6)

  mset(4, 0, 8)
  mset(4, 0, 5)

  -- These should be ignored safely.
  mset(-1, 0, 9)
  mset(128, 0, 9)
  mset(0, 64, 9)
end

function _draw()
  cls(0)

  map(0, 0, 0, 0, 8, 1)

  -- Existing behavior
  print(mget(2, 0), 4, 16, 7)
  print(mget(4, 0), 4, 24, 7)
  print(mget(6, 0), 4, 32, 7)

  -- Bounds behavior: all should return 0
  print(mget(-1, 0), 4, 48, 7)
  print(mget(128, 0), 4, 56, 7)
  print(mget(0, 64), 4, 64, 7)
end
