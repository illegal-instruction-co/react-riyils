(for /r src %f in (*) do (
  echo ===== %~nxf =====
  type "%f"
  echo.
)) > summary.txt
