const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1550,
    height: 850,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'), // 나중에 필요하면 추가
    },
    icon: path.join(__dirname, 'public/favicon.ico'), // 아이콘이 있다면 설정
  });

  // 메뉴바 숨기기 (깔끔한 UI를 위해)
  win.setMenuBarVisibility(false);

  // 빌드된 index.html 로드
  win.loadFile(path.join(__dirname, 'dist/index.html'));

  // 개발자 도구 (필요시 주석 해제)
  // win.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
