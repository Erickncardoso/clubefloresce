const { execSync } = require('child_process');

try {
  console.log('Fechando processos nas portas 3000 e 3001...');
  if (process.platform === 'win32') {
    // Busca PIDs das portas 3000 e 3001
    const pids = [];
    const stdout = execSync('netstat -ano').toString();
    stdout.split('\n').forEach(line => {
      if (line.includes(':3000') || line.includes(':3001')) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== '0' && !pids.includes(pid)) {
          pids.push(pid);
        }
      }
    });
    
    for (const pid of pids) {
      console.log(`Matando PID ${pid}`);
      try {
        execSync(`taskkill /F /PID ${pid}`);
      } catch(e) {}
    }
  } else {
    execSync('lsof -ti:3000,3001 | xargs kill -9');
  }
  console.log('Portas liberadas com sucesso!');
} catch (e) {
  console.log('Nenhum processo travando as portas ou erro ao matar: ' + e.message);
}
