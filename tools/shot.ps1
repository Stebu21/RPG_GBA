# Avvia mGBA con una ROM, aspetta, cattura la finestra in un PNG e chiude.
# uso: powershell -File tools/shot.ps1 -Rom build/menace.gba -Out build/shot.png -Wait 6 [-Keys "A:2,START:1"]
param([string]$Rom, [string]$Out, [double]$Wait = 6, [string]$Keys = "")
Add-Type -AssemblyName System.Drawing
Add-Type @"
using System; using System.Runtime.InteropServices;
public class W { [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool GetClientRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool ClientToScreen(IntPtr h, ref POINT p);
  public struct RECT { public int L, T, R, B; } public struct POINT { public int X, Y; } }
"@
$p = Start-Process -FilePath "C:\Program Files\mGBA\mGBA.exe" -ArgumentList "-2", "`"$((Resolve-Path $Rom).Path)`"" -PassThru
Start-Sleep -Seconds $Wait
$p.Refresh()
$h = $p.MainWindowHandle
[W]::SetForegroundWindow($h) | Out-Null
Start-Sleep -Milliseconds 400
$r = New-Object W+RECT; [W]::GetClientRect($h, [ref]$r) | Out-Null
$pt = New-Object W+POINT; [W]::ClientToScreen($h, [ref]$pt) | Out-Null
$w = $r.R - $r.L; $hh = $r.B - $r.T
$bmp = New-Object System.Drawing.Bitmap $w, $hh
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($pt.X, $pt.Y, 0, 0, $bmp.Size)
$bmp.Save((Join-Path (Get-Location) $Out))
Stop-Process -Id $p.Id -Force
Write-Output "catturato $w x $hh"
