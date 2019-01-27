
const telegraphBotId = '677463954:AAE6KxrOLXEa4iU8tNBHJ4TEAydI-HknkYw'
const googleSpreadsheetId = '1-UIipQ3Pe3IHTUC27pqo603gcx4CW6CtcQQDfg9LqVM'

const strftime = require('strftime')
const Telegraf = require('telegraf');
const bot = new Telegraf(telegraphBotId);
const GoogleSpreadsheet = require('google-spreadsheet');
const creds = require('./client_secret.json');

// Create a document object using the ID of the spreadsheet - obtained from its URL.
var doc = new GoogleSpreadsheet(googleSpreadsheetId);

const persone = [
  'Andrea',
  'Antonio Santilli',
  'Ferruccio Costantini',
  'Francesco Fusco',
  'Francesco Mazzone',
  'Giuseppe Magnotta',
  'Giuseppe Sannino',
  'Luca',
  'Luciano Coccia',
  'Marta',
  'Matteo D\'Amico',
  'Michele Mastrogiovanni',
  'Teresa Macchia',
  'Giorgio Sestili',
  'Alfredo',
  'Paola Nanci',
]

bot.start((message) => {
  console.log('started:', message.from.id)
  return message.reply(
    'Ciao! Sono il Bot responsabile di segnare le partite di Biliardino. ' +
    'Metti una frase che indichi i componenti della prima squadra, della seconda e il punteggio.\n' +
    'Per esempio: Michele e Luca, Matteo e Sannino 10 a 3.\n' +
    'Puoi usare punteggiatura e congiunzioni se vuoi.\n' +
    'Le persone le cerco come sottstringhe.\n' +
    'Per ora conosco:\n' + persone.map(x => '- ' + x).join('\n') + '\n' +
    'Per esempio Giuseppe è ambiguo: scrivi Sannino o Magnotta invece...\n' + 
    'Se devi aggiungere qualcuno, chiedi a Michele invece!'
  );
})

/**
 * { message: messaggio di errore }
 * { persona: Persona }
 * @param {} text Testo da parsare
 */
function getPersona(text) {
  const filtered = persone.filter(x => x.toLowerCase().indexOf(text.toLowerCase()) >= 0)
  if (filtered.length == 0) {
    return { message: 'Non trovo la persona ' + text }
  }
  if (filtered.length > 1) {
    return { message: 'Non capisco chi devo scegliere: sono indeciso fra ' + JSON.stringify(filtered) }
  }
  return { persona: filtered[0] }
}

function getPersone(components) {
  var result = ''
  for (var i = 0; i < 4; i++) {
    var response = getPersona(components[i])
    if (response.message !== undefined) {
      result += "\n" + response.message
    }
    if (response.persona !== undefined) {
      components[i] = response.persona
    }
  }
  return result
}

function process(text, callback) {

  text = text.replace(/[.,:_]+/g, ' ');
  text = text.replace(/ a /g, ' ');
  text = text.replace(/ e /g, ' ');
  text = text.replace(/\s[\s]+/g, ' ');

  var components = text.split(' ')
  if (components.length !== 6) {
    callback({
      error: 'Le frasi dovrebbero avere due nomi per la prima squadra ' +
        'due per la seconda e due per il punteggio.\n' +
        'Per esempio: Michele e Luca, Matteo e Giovanni 10 a 3.\n' +
        'Puoi usare punteggiatura e congiunzioni se vuoi'
    })
    return;
  }

  if (isNaN(components[4]) || isNaN(components[5])) {
    callback({
      error: 'Gli ultimi due numeri dovrebbero essere il punteggio. Ricontrolla...'
    })
    return;
  }

  var message = getPersone(components)
  message = message.trim()
  if (message !== '') {
    callback({
      error: message
    })
    return;
  }

  callback({
    data: components
  })

}

bot.on('text', message => {

  process(message.message.text, function (response) {
    if (response.error !== undefined) {
      message.reply(response.error);
    }
    else {

      // Authenticate with the Google Spreadsheets API.
      doc.useServiceAccountAuth(creds, function (err) {

        // Get all of the rows from the spreadsheet.
        doc.getRows(1, function (err, rows) {

          doc.addRow(1, {

            idmatch: rows.length + 1,
            datayyyymmdd: strftime('%Y%m%d'),
            'teama-payer1': response.data[0],
            'teama-player2': response.data[1],
            'teamb-player3': response.data[2],
            'teamb-player4': response.data[3],
            teama: response.data[4],
            teamb: response.data[5]

          }, function (err) {
            if (err) {
              message.reply('Ho avuto un problema a registrare i dati: ' + err);
            }
            else {
              message.reply('Dati registrati con successo');
            }
          });
          
        })
      });

    }
  })

})

bot.startPolling();

