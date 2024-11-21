const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const waitOn = require('wait-on');

let flaskProcess = null;

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    }
  });

  win.loadURL('http://127.0.0.1:5000/'); 

  win.on('closed', () => {
    if (flaskProcess) {
      flaskProcess.kill('SIGINT');
      flaskProcess = null;
    }
  });
}

function startFlask() {
  const script = path.join(__dirname, 'app.py');
  flaskProcess = spawn('python', [script], { cwd: __dirname });

  flaskProcess.stdout.on('data', (data) => {
    console.log(`Flask stdout: ${data}`);
  });

  flaskProcess.stderr.on('data', (data) => {
    console.log(`Flask stderr: ${data}`);
  });

  flaskProcess.on('close', (code) => {
    console.log(`Flask process exited with code ${code}`);
  });
}

function startApp() {
  startFlask();
  const opts = {
    resources: ['http://127.0.0.1:5000/'], 
    delay: 500,
    timeout: 15000,
  };

  waitOn(opts, (err) => {
    if (err) {
      console.error('Failed to start Flask server:', err);
      app.quit();
    } else {
      createWindow();
    }
  });
}

app.whenReady().then(startApp);

app.on('before-quit', () => {
  if (flaskProcess) {
    flaskProcess.kill('SIGINT');
    flaskProcess = null;
  }
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
