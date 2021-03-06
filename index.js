const proc = require('process')

const telegraphBotId = proc.env.TELEGRAM_BOT_ID
const googleSpreadsheetId = proc.env.SPREADSHEET_ID

const strftime = require('strftime')
const Telegraf = require('telegraf');
const bot = new Telegraf(telegraphBotId);
const GoogleSpreadsheet = require('google-spreadsheet');
const creds = require('/etc/credentials/serviceaccount/client_secret.json');

// Create a document object using the ID of the spreadsheet - obtained from its URL.
var doc = new GoogleSpreadsheet(googleSpreadsheetId);

function getAllPersone() {
  return new Promise(function(accept, reject) {
      doc.useServiceAccountAuth(creds, function (err) {
          if (err) {
              reject(err)
          }
          else {
              doc.getRows(2, function (err, rows) {
                  if (err) {
                      reject(err)
                  }
                  accept(rows.map(row => row.nome))
              })
          }
      })
  })
}

/*
function getAllPersone() {

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

  return persone
}
*/

bot.start((message) => {
  console.log('started:', message.from.id)
  getAllPersone().then(function(persone) {
    message.reply(
      'Ciao! Sono il Bot responsabile di segnare le partite di Biliardino. ' +
      'Metti una frase che indichi i componenti della prima squadra, della seconda e il punteggio.\n' +
      'Per esempio: Michele e Luca, Matteo e Sannino 10 a 3.\n' +
      'Puoi usare punteggiatura e congiunzioni se vuoi.\n' +
      'Le persone le cerco come sottostringhe.\n' +
      'Per ora conosco:\n' + persone.map(x => '- ' + x).join('\n') + '\n' +
      'Per esempio Giuseppe è ambiguo: scrivi Sannino o Magnotta invece...\n' + 
      'Se devi aggiungere qualcuno, chiedi a Michele invece!'
    );
  }).catch(function(err) {

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
  
    message.reply(
      'Ciao! Sono il Bot responsabile di segnare le partite di Biliardino. ' +
      'Metti una frase che indichi i componenti della prima squadra, della seconda e il punteggio.\n' +
      'Per esempio: Michele e Luca, Matteo e Sannino 10 a 3.\n' +
      'Puoi usare punteggiatura e congiunzioni se vuoi.\n' +
      'Le persone le cerco come sottostringhe.\n' +
      'Per ora conosco:\n' + persone.map(x => '- ' + x).join('\n') + '\n' +
      'Per esempio Giuseppe è ambiguo: scrivi Sannino o Magnotta invece...\n' + 
      'Se devi aggiungere qualcuno, chiedi a Michele invece!'
    );

  })
  
})

/**
 * { message: messaggio di errore }
 * { persona: Persona }
 * @param {} text Testo da parsare
 */
function getPersona(text) {
  return new Promise(function(accept, reject) {
    getAllPersone().then(function(persone) {
      const filtered = persone.filter(x => x.toLowerCase().indexOf(text.toLowerCase()) >= 0)
      if (filtered.length == 0) {
        accept({ message: 'Non trovo la persona ' + text })
        return
      }
      if (filtered.length > 1) {
        accept({ message: 'Non capisco chi devo scegliere: sono indeciso fra ' + JSON.stringify(filtered) })
        return
      }
      accept({ persona: filtered[0] })
    }).catch(function(err) {
      reject(err)
    })
  }) 
}

async function getPersone(components) {
  var result = ''
  for (var i = 0; i < 4; i++) {
    var response = await getPersona(components[i])
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

  var message = getPersone(components).then(function(message) {

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
  
  }).catch(function(err) {
    callback({
      error: err
    })
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

