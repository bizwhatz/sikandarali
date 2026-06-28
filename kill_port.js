const { exec } = require('child_process');

console.log("Finding process on port 3000...");
exec('netstat -ano | findstr :3000', (err, stdout, stderr) => {
  if (err || !stdout) {
    console.log("No process found running on port 3000.");
    return;
  }

  const lines = stdout.trim().split('\n');
  const pids = new Set();
  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    const pid = parts[parts.length - 1];
    if (pid && pid !== '0') {
      pids.add(pid);
    }
  }

  if (pids.size === 0) {
    console.log("No valid PIDs found.");
    return;
  }

  console.log(`Found PIDs on port 3000: ${Array.from(pids).join(', ')}. Killing them...`);
  for (const pid of pids) {
    exec(`taskkill /F /PID ${pid}`, (killErr, killStdout, killStderr) => {
      if (killErr) {
        console.error(`Failed to kill PID ${pid}:`, killErr.message);
      } else {
        console.log(`Successfully killed PID ${pid}.`);
      }
    });
  }
});
