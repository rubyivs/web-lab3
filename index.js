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

// Шукає команду за назвою або teamId 
function findTeam(data, text) {
  for (const team of data.teams) {
    if (team.name.toLowerCase() === text.toLowerCase() || team.teamId.toLowerCase() === text.toLowerCase()) {
      return team;
    }
  }
  return null;
}

//  склад обраної команди, яяку вибрали
program
  .command('squad')
  .description('показати склад обраної команди')
  .argument('<team>', 'назва або код команди, наприклад: Spain або t1')
  .option('-p, --position <position>', 'лише гравці з цією позицією (goalkeeper, midfielder, forward)')
  .option('-c, --captain', 'лише капітан команди')
  .action((teamText, options) => {
    const data = readData();
    const team = findTeam(data, teamText);
    console.log(`Склад команди ${team.name}:`);
    for (const player of team.players) {
      let suitable = true;
      if (options.position && player.position !== options.position) {
        suitable = false;
      }
      if (options.captain && player.isCaptain === false) {
        suitable = false;
      }
      if (suitable) {
        let line = `  №${player.number} ${player.name} — ${player.position}`;
        if (player.isCaptain) {
          line = line + ' (капітан)';
        }
        console.log(line);
      }
    }
  });

// шукає гравця за кодом у всіх командах 
function getPlayerName(data, playerId) 
{
  for (const team of data.teams) 
    {
    for (const player of team.players) {
      if (player.playerId === playerId) {
        return `${player.name} (${team.name})`;
      }
    }
  }
  return playerId;
}

//  один рядок з описом матчу
function printMatch(data, m) 
{
  const home = getTeamName(data, m.homeTeamId);
  const away = getTeamName(data, m.awayTeamId);
  let line = `${m.match} | ${m.date} | ${m.venue} | ${home} ${m.score.home}:${m.score.away} ${away}`;
  if (m.extraTime !== null) 
  {
    line = line + ` (додатковий час: ${m.extraTime} хв)`;
  }
  console.log(line);
}

//  відбір матчів 
program
  .command('matches')
  .description('показати матчі з відбором за командою та/або датою')
  .option('-t, --team <team>', 'лише матчі цієї команди (назва або код)')
  .option('-d, --date <date>', 'лише матчі за цією датою, формат ДД.ММ.РРРР')
  .option('-e, --events', 'додатково показати події матчів')
  .action((options) => {
    const data = readData();
    let teamId = null;
    if (options.team) {
      const team = findTeam(data, options.team);
      teamId = team.teamId;
    }
    for (const m of data.matches) {
      let suitable = true;
      if (teamId !== null && m.homeTeamId !== teamId && m.awayTeamId !== teamId) {
        suitable = false;
      }
      if (options.date && m.date !== options.date) {
        suitable = false;
      }
      if (suitable) {
        printMatch(data, m);
        if (options.events) 
        {
          for (const e of m.events) {
            console.log(`    ${e.minute}' ${e.type} — ${getPlayerName(data, e.playerId)}`);
          }
        }
      }
    }
  });  

program.parse();