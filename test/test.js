import fs from 'fs';

import fetch from 'node-fetch';

const translationPaths = fs.readdirSync('translations');

const translationsUrl = 'https://raw.githubusercontent.com/bpmn-io/bpmn-js/develop/docs/translations.json';


async function run() {

  const errors = [];

  console.log('Fetching translation keys');

  const translationsKeys = await fetch(translationsUrl).then(response => response.text());

  const translationsEnglish = JSON.parse(translationsKeys).reduce((translationsEnglish, key) => {
    return {
      ...translationsEnglish,
      [ key ]: key
    };
  }, {});

  if (process.env.UPDATE_TRANSLATIONS) {
    writeTranslation('en.js', translationsEnglish);
  }

  console.log('Verifying translations');

  for (const translationPath of translationPaths) {
    const name = translationPath.split('.')[ 0 ].toUpperCase();

    console.log(`Verifying ${ name } translations`);

    try {
      const { default: translations } = await import(`../translations/${translationPath}`);

      const translationsOrdered =
        Object.keys(translations)
          .sort((a, b) => a === b ? 0 : a < b ? -1 : 1)
          .reduce((translationsOrdered, key) => {
            translationsOrdered[ key ] = translations[ key ];

            return translationsOrdered;
          }, {});

      if (process.env.UPDATE_TRANSLATIONS) {
        writeTranslation(translationPath, translationsOrdered);
      }

      const stats = {
        ok: 0,
        missing: 0,
        unknown: 0
      };

      for (const key in translationsEnglish) {
        if (key in translationsOrdered) {
          stats.ok++;
        } else {
          stats.missing++;

          process.env.VERBOSE && console.log(`Missing translation <${ key }>`);
        }
      }

      for (const key in translationsOrdered) {
        if (!(key in translationsEnglish)) {
          stats.unknown++;

          process.env.VERBOSE && console.log(`Unknown translation <${ key }>`);
        }
      }

      if (stats.missing) {
        console.warn(`WARN: ${ name} has ${stats.missing} missing translations`);
      }

      if (stats.unknown) {
        console.warn(`WARN: ${ name } has ${stats.unknown} unknown translations`);
      }
    } catch (error) {
      console.error(`ERR: <${ name }> could not be validated`, error);

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
  fs.writeFileSync(`translations/${file}`, `export default ${JSON.stringify(messages, null, 2)};`, 'utf8');
}