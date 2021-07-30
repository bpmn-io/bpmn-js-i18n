import fs from 'fs';

import path from 'path';

import fetch from 'node-fetch';

const translations = fs.readdirSync('translations');

const TRANSLATIONS_FILE = 'https://raw.githubusercontent.com/bpmn-io/bpmn-js/develop/docs/translations.json';


async function run() {

  const errors = [];

  console.log('Fetching translatable strings');

  const messages = await fetch(TRANSLATIONS_FILE).then(r => r.text());

  const availableMessages = JSON.parse(messages).reduce((messages, message) => {
    messages[message] = message;
    return messages;
  }, {});

  if (process.env.UPDATE_TRANSLATIONS) {
    writeTranslation('en.js', availableMessages);
  }

  console.log('Checking translations');

  for (const translation of translations) {

    try {
      const { default: messages } = await import(`../translations/${translation}`);

      const orderedMessages =
        Object.entries(messages)
          .sort((a, b) => a === b ? 0 : a < b ? -1 : 1)
          .reduce((messages, entry) => {
            messages[entry[0]] = entry[1];
            return messages;
          }, {});

      if (process.env.UPDATE_TRANSLATIONS) {
        writeTranslation(translation, orderedMessages);
      }

      const stats = {
        ok: 0,
        missing: 0,
        invalid: 0
      };

      for (const message in availableMessages) {
        if (message in orderedMessages) {
          stats.ok++;
        } else {
          stats.missing++;
        }
      }

      for (const message in orderedMessages) {
        if (!(message in availableMessages)) {
          stats.invalid++;
        }
      }

      if (stats.missing) {
        console.warn(`WARN: ${translation} missing ${stats.missing} entries`);
      }

      if (stats.invalid) {
        console.warn(`WARN: ${translation} invalid ${stats.invalid} entries`);
      }
    } catch (error) {
      console.error(`ERR: <${translation}> Failed to load.`, error);
      errors.push(error);
    }
  }

  return errors;
}

run().then(errors => {
  if (errors.length) {
    process.exit(1);
  }
});

// helpers //////////////

function writeTranslation(file, messages) {
  fs.writeFileSync(`translations/${file}`, `export default ${JSON.stringify(messages, null, '  ')};`, 'utf8');
}