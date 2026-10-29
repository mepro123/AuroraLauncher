// OfflineCraft launcher: shows an animated splash instantly, starts the real app, fades out when the UI is ready.
#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <objidl.h>
#include <gdiplus.h>
#include <shlwapi.h>
#include <shellapi.h>
#include <tlhelp32.h>
#include <cmath>
#include <cstdio>
#include <cstdlib>
#include <string>
#include <vector>
#include "logo_data.h"
using namespace Gdiplus;

static HWND g_hwnd; static int W, H, SX, SY; static float S = 1.f;
static Bitmap *g_logo = nullptr, *g_surf = nullptr; static HDC g_mem = nullptr; static HBITMAP g_dib = nullptr; static void* g_bits = nullptr;
static double g_fakeT = -1; static DWORD g_t0, g_readyAt = 0, g_lastSeen = 0, g_lastCheck = 0; static bool g_ready = false; static float g_progAtReady = 0;
static Color cA(255, 52, 211, 153), cB(255, 34, 211, 238); static std::wstring g_dir;
struct Blk { float x, y0, size, speed, t, a; }; static std::vector<Blk> g_blk;
static float frand() { return rand() / (float)RAND_MAX; }
static Color lerpC(const Color& a, const Color& b, float t, int alpha) { return Color((BYTE)alpha, (BYTE)(a.GetR() + (b.GetR() - a.GetR()) * t), (BYTE)(a.GetG() + (b.GetG() - a.GetG()) * t), (BYTE)(a.GetB() + (b.GetB() - a.GetB()) * t)); }
static void rr(GraphicsPath& p, float x, float y, float w, float h, float r) { float d = r * 2; if (d > h) d = h; if (d > w) d = w; p.AddArc(x, y, d, d, 180, 90); p.AddArc(x + w - d, y, d, d, 270, 90); p.AddArc(x + w - d, y + h - d, d, d, 0, 90); p.AddArc(x, y + h - d, d, d, 90, 90); p.CloseFigure(); }

static bool parseHex(const std::string& s, const char* key, Color& out) {
  size_t p = s.find(key); if (p == std::string::npos) return false; p = s.find('#', p); if (p == std::string::npos || p + 7 > s.size()) return false;
  unsigned v = 0; if (sscanf(s.c_str() + p + 1, "%6x", &v) != 1) return false; out = Color(255, (v >> 16) & 255, (v >> 8) & 255, v & 255); return true;
}
static void loadAccent() {
  HANDLE h = CreateFileW((g_dir + L"\\data\\settings.json").c_str(), GENERIC_READ, FILE_SHARE_READ | FILE_SHARE_WRITE, 0, OPEN_EXISTING, 0, 0); if (h == INVALID_HANDLE_VALUE) return;
  char buf[65536]; DWORD n = 0; ReadFile(h, buf, sizeof buf - 1, &n, 0); CloseHandle(h); buf[n] = 0; std::string s(buf);
  Color a, b; if (parseHex(s, "\"accentA\"", a)) { cA = a; cB = a; if (parseHex(s, "\"accentB\"", b)) cB = b; }
}
static std::vector<std::wstring> readyPaths() {
  std::vector<std::wstring> v{g_dir + L"\\data\\.ui-ready"}; wchar_t la[MAX_PATH]; DWORD n = GetEnvironmentVariableW(L"LOCALAPPDATA", la, MAX_PATH); if (n > 0 && n < MAX_PATH) v.push_back(std::wstring(la) + L"\\OfflineCraft\\data\\.ui-ready"); return v;
}
static bool appRunning() {
  HANDLE s = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0); if (s == INVALID_HANDLE_VALUE) return true; PROCESSENTRY32W e{sizeof e}; bool f = false;
  if (Process32FirstW(s, &e)) do { if (_wcsicmp(e.szExeFile, L"OfflineCraft-app.exe") == 0) { f = true; break; } } while (Process32NextW(s, &e)); CloseHandle(s); return f;
}

static bool savePng(const wchar_t* path) {
  UINT n = 0, sz = 0; GetImageEncodersSize(&n, &sz); if (!sz) return false; std::vector<char> buf(sz); ImageCodecInfo* ci = (ImageCodecInfo*)buf.data(); GetImageEncoders(n, sz, ci);
  for (UINT i = 0; i < n; i++) if (wcscmp(ci[i].MimeType, L"image/png") == 0) return g_surf->Save(path, &ci[i].Clsid, 0) == Ok; return false;
}
static void render() {
  DWORD now = GetTickCount(); double t = g_fakeT >= 0 ? g_fakeT : (now - g_t0) / 1000.0; float fade = (float)fmin(1.0, t / 0.22), prog = 0.92f * (1.f - (float)exp(-t / 2.4));
  if (g_ready) { double r = (now - g_readyAt) / 1000.0; fade = (float)fmax(0.0, 1.0 - r / 0.32); prog = g_progAtReady + (1.f - g_progAtReady) * (float)fmin(1.0, r / 0.2); }
  { Graphics g(g_surf); g.SetSmoothingMode(SmoothingModeAntiAlias); g.SetTextRenderingHint(TextRenderingHintAntiAlias); g.SetInterpolationMode(InterpolationModeHighQualityBicubic); g.Clear(Color(0, 0, 0, 0));
    GraphicsPath card; rr(card, 0.5f, 0.5f, W - 1.f, H - 1.f, 26 * S);
    LinearGradientBrush bg(Point(0, 0), Point(0, H), Color(255, 19, 23, 32), Color(255, 10, 12, 17)); g.FillPath(&bg, &card);
    g.SetClip(&card);
    { GraphicsPath gp; gp.AddEllipse(RectF(W / 2.f - 270 * S, H * 0.30f - 175 * S, 540 * S, 350 * S)); PathGradientBrush pg(&gp); pg.SetCenterColor(Color(78, cA.GetR(), cA.GetG(), cA.GetB())); Color sur(0, cA.GetR(), cA.GetG(), cA.GetB()); int n = 1; pg.SetSurroundColors(&sur, &n); g.FillPath(&pg, &gp); }
    for (auto& b : g_blk) { float y = (float)fmod(b.y0 + b.speed * t, H + 40 * S) - 20 * S, x = b.x + sinf((float)t * 0.8f + b.t * 6.28f) * 6 * S, sz = b.size * S;
      float e = fminf(1.f, fminf(y + 20 * S, H - y) / (70 * S)); if (e < 0) e = 0; int al = (int)(b.a * 255 * e); SolidBrush bb(lerpC(cA, cB, b.t, al)); g.FillRectangle(&bb, x, y, sz, sz); SolidBrush hi(Color((BYTE)(al * 0.45), 255, 255, 255)); g.FillRectangle(&hi, x, y, sz, fmaxf(1.5f, sz * 0.2f)); }
    g.ResetClip();
    float cx = W / 2.f, bob = sinf((float)t * 2.2f) * 5 * S, ls = 128 * S, ly = 46 * S + bob, k = 1.f - 0.1f * (bob / (5 * S));
    { SolidBrush sh(Color(64, 0, 0, 0)); g.FillEllipse(&sh, cx - 44 * S * k, 46 * S + ls + 5 * S, 88 * S * k, 11 * S); }
    if (g_logo) g.DrawImage(g_logo, RectF(cx - ls / 2, ly, ls, ls));
    FontFamily ff(L"Segoe UI"); if (ff.GetLastStatus() != Ok) { const FontFamily* gs = FontFamily::GenericSansSerif(); Font f1(gs, 24 * S, FontStyleBold, UnitPixel); (void)f1; }
    const FontFamily* fam = ff.GetLastStatus() == Ok ? &ff : FontFamily::GenericSansSerif(); Font f1(fam, 25 * S, FontStyleBold, UnitPixel), f2(fam, 13 * S, FontStyleRegular, UnitPixel);
    StringFormat sf; sf.SetAlignment(StringAlignmentCenter); SolidBrush wh(Color(255, 240, 243, 250)), dim(Color(255, 138, 147, 168));
    g.DrawString(L"OfflineCraft", -1, &f1, RectF(0, 46 * S + ls + 20 * S, (REAL)W, 34 * S), &sf, &wh);
    const wchar_t* msg = g_ready ? L"Ready!" : t < 1.5 ? L"Starting up…" : t < 3.5 ? L"Loading your library…" : t < 6 ? L"Getting things ready…" : L"Almost there…";
    g.DrawString(msg, -1, &f2, RectF(0, H - 98 * S, (REAL)W, 20 * S), &sf, &dim);
    RectF track(cx - 150 * S, H - 62 * S, 300 * S, 6 * S); { GraphicsPath tp; rr(tp, track.X, track.Y, track.Width, track.Height, 3 * S); SolidBrush tb(Color(34, 255, 255, 255)); g.FillPath(&tb, &tp); }
    if (prog > 0.001f) { RectF fr(track.X, track.Y, track.Width * prog, track.Height); GraphicsPath fp; rr(fp, fr.X, fr.Y, fr.Width, fr.Height, 3 * S);
      LinearGradientBrush fb(track, cA, cB, LinearGradientModeHorizontal); g.FillPath(&fb, &fp);
      g.SetClip(&fp); float sx = track.X + (float)fmod(t * 0.9, 1.5) * track.Width - 60 * S; LinearGradientBrush band(PointF(sx, 0), PointF(sx + 90 * S, 0), Color(0, 255, 255, 255), Color(0, 255, 255, 255));
      Color cols[3] = {Color(0, 255, 255, 255), Color(120, 255, 255, 255), Color(0, 255, 255, 255)}; REAL pos[3] = {0, 0.5f, 1}; band.SetInterpolationColors(cols, pos, 3); g.FillRectangle(&band, sx, track.Y, 90 * S, track.Height); g.ResetClip(); }
    GraphicsPath edge; rr(edge, 0.5f, 0.5f, W - 1.f, H - 1.f, 26 * S); Pen pen(Color(26, 255, 255, 255), 1.f); g.DrawPath(&pen, &edge); }
  BitmapData d; Rect r(0, 0, W, H); if (g_surf->LockBits(&r, ImageLockModeRead, PixelFormat32bppPARGB, &d) == Ok) { for (int y = 0; y < H; y++) memcpy((BYTE*)g_bits + (size_t)y * W * 4, (BYTE*)d.Scan0 + (size_t)y * d.Stride, (size_t)W * 4); g_surf->UnlockBits(&d); }
  POINT pos{SX, SY}, src{0, 0}; SIZE sz{W, H}; BLENDFUNCTION bf{AC_SRC_OVER, 0, (BYTE)(fade * 255), AC_SRC_ALPHA}; HDC sdc = GetDC(0); UpdateLayeredWindow(g_hwnd, sdc, &pos, &sz, g_mem, &src, 0, &bf, ULW_ALPHA); ReleaseDC(0, sdc);
}
static LRESULT CALLBACK WndProc(HWND h, UINT m, WPARAM w, LPARAM l) {
  if (m == WM_TIMER) {
    DWORD now = GetTickCount();
    if (!g_ready) {
      bool rdy = false; for (auto& p : readyPaths()) if (GetFileAttributesW(p.c_str()) != INVALID_FILE_ATTRIBUTES) rdy = true;
      if (rdy) { g_ready = true; g_readyAt = now; double t = (now - g_t0) / 1000.0; g_progAtReady = 0.92f * (1.f - (float)exp(-t / 2.4)); }
      else if (now - g_lastCheck > 250) { g_lastCheck = now; if (appRunning()) g_lastSeen = now; if ((now - g_lastSeen > 4000 && now - g_t0 > 4000) || now - g_t0 > 120000) { DestroyWindow(h); return 0; } }
    } else if (now - g_readyAt > 380) { DestroyWindow(h); return 0; }
    render(); return 0;
  }
  if (m == WM_DESTROY) { PostQuitMessage(0); return 0; }
  return DefWindowProcW(h, m, w, l);
}
int WINAPI wWinMain(HINSTANCE hi, HINSTANCE, LPWSTR, int) {
  SetProcessDPIAware(); wchar_t me[MAX_PATH]; GetModuleFileNameW(0, me, MAX_PATH); g_dir = me; g_dir = g_dir.substr(0, g_dir.find_last_of(L"\\/"));
  std::wstring app = g_dir + L"\\OfflineCraft-app.exe"; if (GetFileAttributesW(app.c_str()) == INVALID_FILE_ATTRIBUTES) { MessageBoxW(0, L"OfflineCraft-app.exe is missing next to this file. Please extract the whole zip again.", L"OfflineCraft", MB_ICONERROR); return 1; }
  for (auto& p : readyPaths()) DeleteFileW(p.c_str());
  const wchar_t* cl = GetCommandLineW(); if (*cl == L'"') { cl++; while (*cl && *cl != L'"') cl++; if (*cl) cl++; } else while (*cl && *cl != L' ') cl++;
  std::wstring cmd = L"\"" + app + L"\"" + cl; STARTUPINFOW si{}; si.cb = sizeof si; PROCESS_INFORMATION pi{};
  if (CreateProcessW(app.c_str(), &cmd[0], 0, 0, FALSE, 0, 0, g_dir.c_str(), &si, &pi)) { CloseHandle(pi.hThread); CloseHandle(pi.hProcess); } else { MessageBoxW(0, L"Could not start OfflineCraft.", L"OfflineCraft", MB_ICONERROR); return 1; }
  SetUnhandledExceptionFilter([](EXCEPTION_POINTERS*) -> LONG { ExitProcess(0); return EXCEPTION_EXECUTE_HANDLER; });   // if the splash ever crashes, just close it; the app keeps running
  GdiplusStartupInput gsi; ULONG_PTR tok; GdiplusStartup(&tok, &gsi, 0); srand(GetTickCount()); loadAccent();
  HDC sdc = GetDC(0); S = GetDeviceCaps(sdc, LOGPIXELSX) / 96.f; ReleaseDC(0, sdc); W = (int)(540 * S); H = (int)(320 * S);
  RECT wa; SystemParametersInfoW(SPI_GETWORKAREA, 0, &wa, 0); SX = wa.left + ((wa.right - wa.left) - W) / 2; SY = wa.top + ((wa.bottom - wa.top) - H) / 2 - (int)(20 * S);
  WNDCLASSW wc{}; wc.lpfnWndProc = WndProc; wc.hInstance = hi; wc.lpszClassName = L"OCSplash"; wc.hCursor = LoadCursor(0, IDC_ARROW); RegisterClassW(&wc);
  g_hwnd = CreateWindowExW(WS_EX_LAYERED | WS_EX_TOOLWINDOW | WS_EX_TOPMOST, L"OCSplash", L"OfflineCraft", WS_POPUP, SX, SY, W, H, 0, 0, hi, 0);
  g_surf = new Bitmap(W, H, PixelFormat32bppPARGB); { BITMAPINFO bi{}; bi.bmiHeader.biSize = sizeof(BITMAPINFOHEADER); bi.bmiHeader.biWidth = W; bi.bmiHeader.biHeight = -H; bi.bmiHeader.biPlanes = 1; bi.bmiHeader.biBitCount = 32; HDC d = GetDC(0); g_mem = CreateCompatibleDC(d); g_dib = CreateDIBSection(d, &bi, DIB_RGB_COLORS, &g_bits, 0, 0); SelectObject(g_mem, g_dib); ReleaseDC(0, d); }
  IStream* st = SHCreateMemStream(LOGO, LOGO_LEN); if (st) { g_logo = Bitmap::FromStream(st); st->Release(); }
  for (int i = 0; i < 34; i++) g_blk.push_back({frand() * W, frand() * (H + 40 * S), 6 + frand() * 10, S * (30 + frand() * 60), frand(), 0.16f + frand() * 0.34f});
  { int ac = 0; wchar_t** av = CommandLineToArgvW(GetCommandLineW(), &ac); if (ac >= 4 && wcscmp(av[1], L"--dump") == 0) { g_fakeT = _wtof(av[2]); g_t0 = GetTickCount(); render(); bool ok = savePng(av[3]); GdiplusShutdown(tok); return ok ? 0 : 2; } }
  g_t0 = g_lastSeen = g_lastCheck = GetTickCount(); render(); ShowWindow(g_hwnd, SW_SHOWNOACTIVATE);
  SetTimer(g_hwnd, 1, 16, 0); MSG msg; while (GetMessageW(&msg, 0, 0, 0)) { TranslateMessage(&msg); DispatchMessageW(&msg); }
  GdiplusShutdown(tok); return 0;
}
