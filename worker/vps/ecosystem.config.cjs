/**
 * Configuração do pm2 pro worker na VPS.
 *
 * tsx roda o TypeScript direto — sem etapa de build, atualizar é git pull
 * + pm2 restart. `max_memory_restart` é a rede de segurança contra vazamento
 * em processo que roda semanas.
 */
module.exports = {
  apps: [
    {
      name: "viral-worker",
      cwd: "/opt/viral-farm",
      script: "node_modules/.bin/tsx",
      args: "worker/indice.ts",
      max_memory_restart: "1500M",
      restart_delay: 5000,
      out_file: "/var/log/viral-worker.log",
      error_file: "/var/log/viral-worker-erro.log",
      time: true,
    },
  ],
};
