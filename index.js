import { readFileSync } from 'node:fs';
import { Command } from 'commander';

function fail(message) {
  console.error(`Помилка: ${message}`);
  process.exit(1); // код помилки
}

// якщо це не число — помилка
function toNumber(text) {
  const number = Number(text);
  if (!Number.isInteger(number) || number < 1) {
    fail(`«${text}» не є додатним цілим числом.`);
  }
  return number;
}

// помилка: commander сам помічає неправильний виклик завершує програму з кодом 1.
function showCommandError(text) {
  if (text.includes('unknown option')) {
    fail('невідома опція. Довідка: node index.js --help');
  }
  if (text.includes('unknown command')) {
    fail('невідома команда. Довідка: node index.js --help');
  }
  if (text.includes('missing required argument')) {
    fail("не вказано обов'язковий аргумент. Довідка: node index.js --help");
  }
  if (text.includes('argument missing')) {
    fail('для опції не вказано значення. Довідка: node index.js --help');
  }
  fail('неправильний виклик програми. Довідка: node index.js --help');
}


const program = new Command();

program
  .name('football')
  .description('Програма для перегляду даних футбольного турніру з JSON-файлу')
  .version('1.0.0', '-v, --version', 'показати версію програми')
  .option('-f, --file <path>', 'шлях до JSON-файлу з даними', 'data.json')
  .helpOption('-h, --help', 'показати довідку')
  .helpCommand('help [command]', 'показати довідку про команду')
  .configureOutput({ outputError: showCommandError });

// Читає JSON
function readData() {
  const path = program.opts().file;
  // помилка: неіснуючий файл.
  let text;
  try {
    text = readFileSync(path, 'utf8');
  } catch (err) {
    fail(`файл «${path}» не знайдено.`);
  }
  // помилка: некоректний JSON.
  let data;
  try {
    data = JSON.parse(text);
  } catch (err) {
    fail(`файл «${path}» містить некоректний JSON.`);
  }
  // П: JSON правильний, але це не дані турніру.
  if (data === null || !Array.isArray(data.teams) || !Array.isArray(data.matches)) {
    fail(`файл «${path}» не схожий на дані турніру: потрібні масиви teams і matches.`);
  }
  return data;
}

// помилка:  якщо такого матчу немає 
function getMatch(data, numberText) {
  const number = toNumber(numberText);
  if (number > data.matches.length) {
    fail(`матчу №${number} не існує. Усього матчів: ${data.matches.length}.`);
  }
  return data.matches[number - 1];
}

// Повертає назву команди за її teamId 
function getTeamName(data, teamId) {
  for (const team of data.teams) {
    if (team.teamId === teamId) {
      return team.name;
    }
  }
  return teamId;
}

//   список матчів 
program
  .command('list')
  .description('показати  список матчів')
  .option('-l, --limit <n>', 'показати не більше n матчів')
  .action((options) => {
    const data = readData();
    let matches = data.matches;
    if (options.limit) {
      matches = data.matches.slice(0, toNumber(options.limit));
    }
    for (let i = 0; i < matches.length; i++) {
      const m = matches[i];
      const home = getTeamName(data, m.homeTeamId);
      const away = getTeamName(data, m.awayTeamId);
      console.log(`${i + 1}. ${m.match} | ${m.date} | ${home} ${m.score.home}:${m.score.away} ${away}`);
    }
  });

// один матч цілком
program
  .command('show')
  .description('показати один матч цілком')
  .argument('<number>', 'номер матчу у списку (починаючи з 1)')
  .action((number) => {
    const data = readData();
    const match = getMatch(data, number);
    console.log(JSON.stringify(match, null, 2));
  });

// шлях через крапку: "date", "score.home", "events.0.type".
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

// значення окремого поля матчу 
program
  .command('field')
  .description('показати значення окремого поля матчу')
  .argument('<number>', 'номер матчу у списку (починаючи з 1)')
  .argument('<path>', 'шлях до поля через крапку, наприклад: date, score.home, events.0.type')
  .action((number, path) => {
    const data = readData();
    const match = getMatch(data, number);
    const value = getField(match, path);
    if (value === undefined) {
      fail(`поля «${path}» у матчі №${number} немає.`);
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

// склад команди, яяку вибрали
program
  .command('squad')
  .description('показати склад обраної команди')
  .argument('<team>', 'назва або код команди, наприклад: Spain або t1')
  .option('-p, --position <position>', 'лише гравці з цією позицією (goalkeeper, midfielder, forward)')
  .option('-c, --captain', 'лише капітан команди')
  .action((teamText, options) => {
    const data = readData();
    const team = findTeam(data, teamText);
    if (team === null) {
      fail(`команду «${teamText}» не знайдено.`);
    }
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
function getPlayerName(data, playerId) {
  for (const team of data.teams) {
    for (const player of team.players) {
      if (player.playerId === playerId) {
        return `${player.name} (${team.name})`;
      }
    }
  }
  return playerId;
}

// один рядок з описом матчу.
function printMatch(data, m) {
  const home = getTeamName(data, m.homeTeamId);
  const away = getTeamName(data, m.awayTeamId);
  let line = `${m.match} | ${m.date} | ${m.venue} | ${home} ${m.score.home}:${m.score.away} ${away}`;
  if (m.extraTime !== null) {
    line = line + ` (додатковий час: ${m.extraTime} хв)`;
  }
  console.log(line);
}

// відбір матчів 
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
      if (team === null) {
        fail(`команду «${options.team}» не знайдено.`);
      }
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
        if (options.events) {
          for (const e of m.events) {
            console.log(`    ${e.minute}' ${e.type} — ${getPlayerName(data, e.playerId)}`);
          }
        }
      }
    }
  });

// гравці за кількістю голів -----
program
  .command('scorers')
  .description('показати список бомбардирів за кількістю голів')
  .option('-t, --top <n>', 'показати лише n найкращих бомбардирів')
  .action((options) => {
    const data = readData();
    
    const goals = {};
    for (const m of data.matches) {
      for (const e of m.events) {
        if (e.type === 'goal') {
          if (goals[e.playerId] === undefined) {
            goals[e.playerId] = 0;
          }
          goals[e.playerId] = goals[e.playerId] + 1;
        }
      }
    }
    // Перекладаємо словник у масив, щоб його можна було відсортувати
    const list = [];
    for (const playerId in goals) {
      list.push({ name: getPlayerName(data, playerId), count: goals[playerId] });
    }
    list.sort((a, b) => b.count - a.count);
    let top = list;
    if (options.top) {
      top = list.slice(0, toNumber(options.top));
    }
    for (let i = 0; i < top.length; i++) {
      console.log(`${i + 1}. ${top[i].name} — голів: ${top[i].count}`);
    }
  });


program.parse();