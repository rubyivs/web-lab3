import { readFileSync } from 'node:fs';
import { Command } from 'commander';
 
const program = new Command();

program
  .name('football')
  .description('Програма для перегляду даних футбольного турніру з JSON-файлу')
  .version('1.0.0', '-v, --version', 'показати версію програми')
  .option('-f, --file <path>', 'шлях до JSON з даними', 'data.json')
  .helpOption('-h, --help', 'показати довідку')
  .helpCommand('help [command]', 'показати довідку про команду');

// Читає JSON
function readData() 
{
  const path = program.opts().file;
  const text = readFileSync(path, 'utf8');
  return JSON.parse(text); // повертає об'єкт
}

function getTeamName(data, teamId) 
{
  for (const team of data.teams) {
    if (team.teamId === teamId) {
      return team.name;
    }
  }
  return teamId;
}

program
  .command('list')
  .description('показати стислий список матчів')
  .option('-l, --limit <n>', 'показати не більше n матчів')
  .action((options) => {
    const data = readData();
    let matches = data.matches;
    if (options.limit) {
      matches = data.matches.slice(0, Number(options.limit));
    }
    for (let i = 0; i < matches.length; i++) {
      const m = matches[i];
      const home = getTeamName(data, m.homeTeamId);
      const away = getTeamName(data, m.awayTeamId);
      console.log(`${i + 1}. ${m.match} | ${m.date} | ${home} ${m.score.home}:${m.score.away} ${away}`);
    }
  });

  program
  .command('show')
  .description('показати один матч цілком')
  .argument('<number>', 'номер матчу у списку (починаючи з 1)')
  .action((number) => {
    const data = readData();
    const match = data.matches[Number(number) - 1];
    console.log(JSON.stringify(match, null, 2));
  });


function getField(object, path) {
  let current = object;
  for (const key of path.split('.')) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[key];
  }
  return current;
}

//  значення окремого поля матчу
program
  .command('field')
  .description('показати значення окремого поля матчу')
  .argument('<number>', 'номер матчу у списку ')
  .argument('<path>', 'шлях до поля, наприклад: date, score.home, events.0.type')
  .action((number, path) => {
    const data = readData();
    const match = data.matches[Number(number) - 1];
    const value = getField(match, path);
    if (value === undefined) {
      console.log('Такого поля немає');
    } else if (value === null) {
      console.log('null');
    } else if (typeof value === 'object') {
      console.log(JSON.stringify(value, null, 2));
    } else {
      console.log(value);
    }
  }); 

program.parse();