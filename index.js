import { readFileSync } from 'node:fs';
import { Command } from 'commander';
 
const program = new Command();

program
  .name('football')
  .description('Програма для перегляду даних футбольного турніру з JSON-файлу')
  .version('1.0.0', '-v, --version', 'показати версію програми')
  .option('-f, --file <path>', 'шлях до JSON-файлу з даними', 'data.json')
  .helpOption('-h, --help', 'показати довідку')
  .helpCommand('help [command]', 'показати довідку про команду');

// Читає JSON
function readData() {
  const path = program.opts().file;
  const text = readFileSync(path, 'utf8');
  return JSON.parse(text); // повертає об'єкт
}


program.parse();