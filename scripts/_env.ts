/**
 * Carrega as variáveis de ambiente para os scripts de linha de comando.
 *
 * O Next carrega `.env.local` sozinho, mas `dotenv/config` só olha `.env`.
 * Como as chaves ficam em `.env.local` (que está no .gitignore), os scripts
 * precisam apontar pra lá explicitamente.
 *
 * Importe este módulo ANTES de qualquer outro import que leia env.
 */
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
config({ quiet: true }); // .env, se existir, como fallback
